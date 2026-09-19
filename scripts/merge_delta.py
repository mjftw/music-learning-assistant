#!/usr/bin/env python3
"""Merge a change's delta specs into the living capability specs.

  merge_delta.py preview changes/NNN-slug [--out DIR]
      Write the merged result to DIR (default .sdd/target/NNN-slug/) without
      touching specs/. Used by task-brief.sh and the reviewers: the target
      state the change is aiming for.

  merge_delta.py apply changes/NNN-slug
      Merge in place into specs/<context>/<capability>.md. Used by sdd-finish
      after the user has approved and the slice has converged.

Delta format (changes/NNN/delta/<context>/<capability>.md): frontmatter, then
any of the H2 sections ADDED, MODIFIED, REMOVED. Each holds requirement
blocks `### REQ-NNN: title` up to the next `###`/`##`. A MODIFIED block may end
with a `**Was:**` quote; it is dropped on merge. A REMOVED block's body is the
reason.

Stdlib only. Exits 1 with a message on any inconsistency (adding an existing
id, modifying or removing a missing one, a delta with no sections).
"""
import re, sys, os, datetime, pathlib, shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import fm  # noqa: E402  (scripts/fm.py)

REQ_RE = re.compile(r"^### (~~)?(REQ-\d+)(?::\s*(.*?))?(~~)?\s*$")


def die(msg):
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def split_fm(text):
    fmv, body = fm.split(text)
    if fmv is None:
        die("file has no frontmatter")
    return fmv, body


def h2_sections(body_lines):
    """Map H2 heading -> list of lines (excluding the heading)."""
    out, cur = {}, None
    for l in body_lines:
        if l.startswith("## "):
            cur = l[3:].strip()
            out[cur] = []
        elif cur is not None:
            out[cur].append(l)
    return out


def req_blocks(lines):
    """Split lines into requirement blocks. Returns (preamble, [(id, block_lines)])."""
    pre, blocks, cur_id, cur = [], [], None, []
    for l in lines:
        m = REQ_RE.match(l)
        if m:
            if cur_id is not None:
                blocks.append((cur_id, cur))
            cur_id, cur = m.group(2), [l]
        elif cur_id is None:
            pre.append(l)
        else:
            cur.append(l)
    if cur_id is not None:
        blocks.append((cur_id, cur))
    return pre, blocks


def strip_trailing_blank(lines):
    while lines and lines[-1].strip() == "":
        lines.pop()
    return lines


def drop_was(block):
    """Remove a trailing **Was:** quote from a MODIFIED block."""
    for i, l in enumerate(block):
        if l.strip().startswith("**Was:**"):
            return strip_trailing_blank(block[:i])
    return strip_trailing_blank(block)


def title_of(block):
    m = REQ_RE.match(block[0])
    return (m.group(3) or "").strip()


def bump(ver, major):
    a, b, c = [int(x) for x in ver.split(".")]
    return f"{a+1}.0.0" if major else f"{a}.{b+1}.0"


def load_or_create(path, ctx, cap, change, proposal_outcome):
    if path.exists():
        return split_fm(path.read_text(encoding="utf-8")), False
    tpl = (ROOT / "templates" / "capability-template.md").read_text(encoding="utf-8")
    tpl = tpl.replace("<context>", ctx).replace("<capability>", cap)
    tpl = tpl.replace("at: YYYY-MM-DDTHH:MM:SSZ", "at: " + now())
    if proposal_outcome:
        tpl = tpl.replace("<one paragraph>", proposal_outcome)
    return split_fm(tpl), True


def now():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def proposal_outcome(change_dir):
    p = change_dir / "proposal.md"
    if not p.exists():
        return ""
    _, body = fm.split(p.read_text(encoding="utf-8"))
    secs = h2_sections(body or [])
    lines = [l for l in secs.get("Outcome", []) if l.strip() and not l.startswith("<")]
    return " ".join(l.strip() for l in lines)


def merge_one(delta_path, change, out_root, in_place):
    dfm, dbody = split_fm(delta_path.read_text(encoding="utf-8"))
    ctx = fm.scalar(dfm[fm.find_key(dfm, "sdd_context")].split(":", 1)[1]) if fm.find_key(dfm, "sdd_context") >= 0 else None
    cap = fm.scalar(dfm[fm.find_key(dfm, "sdd_capability")].split(":", 1)[1]) if fm.find_key(dfm, "sdd_capability") >= 0 else None
    if not ctx or not cap:
        die(f"{delta_path}: delta frontmatter needs sdd_context and sdd_capability")

    secs = h2_sections(dbody)
    added = req_blocks(secs.get("ADDED", []))[1]
    modified = req_blocks(secs.get("MODIFIED", []))[1]
    removed = req_blocks(secs.get("REMOVED", []))[1]
    if not (added or modified or removed):
        die(f"{delta_path}: no ADDED / MODIFIED / REMOVED requirement blocks")

    living_path = ROOT / "specs" / ctx / f"{cap}.md"
    src_path = living_path
    if not in_place and (out_root / ctx / f"{cap}.md").exists():
        src_path = out_root / ctx / f"{cap}.md"     # a previous delta in this change already touched it
    (lfm, lbody), created = load_or_create(src_path, ctx, cap, change, proposal_outcome(delta_path.parents[2]))

    lsecs_order = [l[3:].strip() for l in lbody if l.startswith("## ")]
    lsecs = h2_sections(lbody)
    head = []
    for l in lbody:
        if l.startswith("## "):
            break
        head.append(l)

    pre, blocks = req_blocks(lsecs.get("Requirements", []))
    index = {rid: i for i, (rid, _) in enumerate(blocks)}
    struck = {rid for rid, blk in blocks if blk[0].startswith("### ~~")}

    for rid, blk in added:
        if rid in index:
            die(f"{delta_path}: ADDED {rid} already exists in {living_path}")
        blk = strip_trailing_blank(list(blk)) + ["", f"_Since {change}_", ""]
        blocks.append((rid, blk))
        index[rid] = len(blocks) - 1
    for rid, blk in modified:
        if rid not in index or rid in struck:
            die(f"{delta_path}: MODIFIED {rid} does not exist (or was removed) in {living_path}")
        blk = drop_was(list(blk)) + ["", f"_Changed by {change}_", ""]
        blocks[index[rid]] = (rid, blk)
    for rid, blk in removed:
        if rid not in index or rid in struck:
            die(f"{delta_path}: REMOVED {rid} does not exist (or was already removed) in {living_path}")
        old_title = title_of(blocks[index[rid]][1])
        reason = " ".join(l.strip() for l in blk[1:] if l.strip()) or "no reason given"
        blocks[index[rid]] = (rid, [f"### ~~{rid}: {old_title}~~", "", f"_Removed by {change}: {reason}_", ""])

    # rebuild Requirements
    req_lines = strip_trailing_blank(list(pre))
    for _, blk in blocks:
        req_lines += [""] + strip_trailing_blank(list(blk))
    req_lines.append("")
    lsecs["Requirements"] = req_lines

    # history row
    date = now()[:10]
    hist = lsecs.get("History", [])
    row = f"| {{ver}} | {date} | {change} | {len(added)} | {len(modified)} | {len(removed)} |"
    # version
    i = fm.find_key(lfm, "sdd_version")
    cur = fm.scalar(lfm[i].split(":", 1)[1]) if i >= 0 else "0.0.0"
    newver = bump(cur, major=bool(removed))
    lfm = fm.cmd_set(lfm, "sdd_version", newver)
    hist = strip_trailing_blank(list(hist)) + [row.format(ver=newver), ""]
    lsecs["History"] = hist

    # sources: add the change's proposal
    src = f"  - resource: /changes/{change}/proposal.md"
    si = fm.find_key(lfm, "sources")
    if si < 0:
        lfm += ["sources:", src]
    else:
        val = lfm[si].split(":", 1)[1].strip()
        if val in ("[]", "~"):
            lfm[si:si + 1] = ["sources:", src]
        else:
            end = fm.block_end(lfm, si)
            if src not in lfm[si:end]:
                lfm[end:end] = [src]
    lfm = fm.cmd_set(lfm, "status", "stable")
    lfm = fm.cmd_set(lfm, "sdd_phase", "current")

    # reassemble body in original section order (new sections appended)
    body = list(head)
    seen = set()
    for name in lsecs_order:
        body += [f"## {name}"] + lsecs[name]
        seen.add(name)
    for name in lsecs:
        if name not in seen:
            body += [f"## {name}"] + lsecs[name]

    text = fm.join(lfm, body)
    if in_place:
        living_path.parent.mkdir(parents=True, exist_ok=True)
        living_path.write_text(text, encoding="utf-8")
        target = living_path
    else:
        target = out_root / ctx / f"{cap}.md"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8")
    verb = "created" if created else "merged into"
    print(f"{verb} {target}  (+{len(added)} ~{len(modified)} -{len(removed)}  v{newver})")


def main(argv):
    if len(argv) < 3 or argv[1] not in ("preview", "apply"):
        print(__doc__)
        return 2
    mode, change_dir = argv[1], pathlib.Path(argv[2].rstrip("/"))
    if not change_dir.is_absolute():
        change_dir = ROOT / change_dir
    if not change_dir.is_dir():
        die(f"{change_dir} is not a directory")
    change = change_dir.name
    out_root = None
    if mode == "preview":
        out_root = ROOT / ".sdd" / "target" / change
        if "--out" in argv:
            out_root = pathlib.Path(argv[argv.index("--out") + 1])
        if out_root.exists():
            shutil.rmtree(out_root)
        # seed the target with every living spec so unchanged capabilities are visible too
        specs = ROOT / "specs"
        if specs.is_dir():
            for p in specs.rglob("*.md"):
                if p.name in ("index.md", "log.md"):
                    continue
                rel = p.relative_to(specs)
                (out_root / rel).parent.mkdir(parents=True, exist_ok=True)
                shutil.copy(p, out_root / rel)
    deltas = sorted((change_dir / "delta").rglob("*.md")) if (change_dir / "delta").is_dir() else []
    deltas = [d for d in deltas if d.name != "index.md"]
    if not deltas:
        die(f"{change_dir}/delta has no delta files")
    for d in deltas:
        merge_one(d, change, out_root, in_place=(mode == "apply"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
