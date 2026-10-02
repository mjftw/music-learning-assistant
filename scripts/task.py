#!/usr/bin/env python3
"""One file per task. State lives in each task's frontmatter; the generated
tasks/index.md is the one thing a controller reads to know where it is.

  task.py changes/NNN next                 # first todo whose depends_on are all done; "none" if nothing
  task.py changes/NNN status T011 done     # todo | in-progress | done | parked (parked needs the decision: … parked D003)
  task.py changes/NNN park T014 D003       # park T014 and everything that depends on it, transitively
  task.py changes/NNN new "<one outcome>" [--after T011] [--reqs a.b/REQ-001,…] [--group "<group>"] [--class standard|trivial]
  task.py changes/NNN list                 # the index table (what index.sh writes)
  task.py changes/NNN coverage             # requirement → tasks table
  task.py changes/NNN split                # migrate a legacy tasks.md (### T0NN blocks) into tasks/
  task.py changes/NNN check                # anatomy, placeholders, dangling depends_on; exit 1 on ❌

Task ids are qualified: C008_T005 is task 5 of change 008. Every command
accepts the short form (T005) and qualifies it.

Frontmatter keys (templates/task-template.md): sdd_task, sdd_phase
(todo|in-progress|done|parked), sdd_requirements [..], sdd_depends_on [..],
sdd_parked_on, sdd_group, sdd_parallel, sdd_class (standard|trivial),
sdd_attempts. Stdlib only.
"""
import datetime
import os
import pathlib
import re
import subprocess
import sys
from collections import deque

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import fm  # noqa: E402  (scripts/fm.py: the one frontmatter reader and writer)

PHASES = ("todo", "in-progress", "done", "parked")
PLACEHOLDER = re.compile(r"TBD|TODO|handle (edge|error) |error handling|similar to T|like T[0-9]")


def now():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def flow_list(raw):
    """`[a, b]` → ['a', 'b']"""
    return [x.strip() for x in raw.strip().strip("[]").split(",") if x.strip()]


class Task:
    """One task file: its frontmatter as a dict of scalars, written back through fm."""

    def __init__(self, path):
        self.path = path
        self.id = path.stem
        self.text = path.read_text(encoding="utf-8")
        self.fm, self.body = fm.split(self.text)
        self.meta = {}
        for line in self.fm or []:
            if re.match(r"^[A-Za-z_][\w-]*:", line):
                k, v = line.split(":", 1)
                self.meta[k] = fm.scalar(v) if v.strip() else ""

    def get(self, key, default=""):
        return self.meta.get(key, default)

    @property
    def phase(self):
        return self.get("sdd_phase")

    @property
    def depends_on(self):
        return flow_list(self.get("sdd_depends_on"))

    @property
    def requirements(self):
        return flow_list(self.get("sdd_requirements"))

    def set(self, **values):
        for k, v in values.items():
            self.fm = fm.cmd_set(self.fm, k, v)
            self.meta[k] = str(v)
        self.path.write_text(fm.join(self.fm, self.body), encoding="utf-8")


class Change:
    def __init__(self, path):
        self.dir = pathlib.Path(path.rstrip("/"))
        self.id = self.dir.name
        self.cnum = "C" + self.id.split("-", 1)[0]  # 008-learner-leads → C008
        self.td = self.dir / "tasks"

    def q(self, t):
        """T005 → C008_T005; a qualified id is left as it is."""
        return f"{self.cnum}_{t}" if re.match(r"^T\d", t) else t

    def tasks(self):
        if not self.td.is_dir():
            return {}
        files = sorted(p for p in self.td.glob("C[0-9]*_T[0-9]*.md"))
        return {p.stem: Task(p) for p in files}

    def task(self, t):
        p = self.td / f"{self.q(t)}.md"
        if not p.is_file():
            die(f"error: no {p}")
        return Task(p)


def die(msg, code=1):
    print(msg, file=sys.stderr)
    sys.exit(code)


# ── commands ────────────────────────────────────────────────────────────────────────────

def cmd_next(ch, _args):
    tasks = ch.tasks()
    for t in tasks.values():
        if t.phase == "todo" and all(d in tasks and tasks[d].phase == "done" for d in t.depends_on):
            print(t.id)
            return 0
    print("none")
    return 0


def cmd_status(ch, args):
    if len(args) < 2:
        die("usage: task.py <change> status T0NN todo|in-progress|done|parked [DNNN]")
    t, s, decision = ch.task(args[0]), args[1], (args[2] if len(args) > 2 else "")
    if s not in PHASES:
        die("error: status must be todo|in-progress|done|parked")
    if s == "parked" and not decision:
        die("error: parked needs the decision id (D003)")
    values = {"sdd_phase": s}
    if s == "parked":
        values["sdd_parked_on"] = decision
    if s == "in-progress":
        values["sdd_attempts"] = int(t.get("sdd_attempts", "0") or 0) + 1
    t.set(**values)
    print(f"{t.id}: {s}" + (f" ({decision})" if decision else ""))
    return 0


def cmd_park(ch, args):
    if len(args) < 2:
        die("usage: task.py <change> park T0NN DNNN")
    start, decision = ch.q(args[0]), args[1]
    tasks = ch.tasks()
    if start not in tasks:
        die(f"error: no {ch.td / (start + '.md')}")
    dependants = {}
    for t in tasks.values():
        for d in t.depends_on:
            dependants.setdefault(d, []).append(t.id)
    seen, queue = set(), deque([start])
    while queue:
        cur = queue.popleft()
        if cur in seen:
            continue
        seen.add(cur)
        if tasks[cur].phase == "done":
            continue
        tasks[cur].set(sdd_phase="parked", sdd_parked_on=decision)
        print(f"  parked {cur} on {decision}")
        queue.extend(dependants.get(cur, []))
    return 0


def cmd_new(ch, args):
    if not args:
        die('usage: task.py <change> new "<one outcome>" [--after T] [--reqs r,r] [--group g] [--class standard|trivial]')
    title, opts, i = args[0], {"--after": "", "--reqs": "", "--group": "Appended", "--class": "standard"}, 1
    while i < len(args):
        if args[i] in opts and i + 1 < len(args):
            opts[args[i]] = args[i + 1]
            i += 2
        else:
            i += 1
    ch.td.mkdir(parents=True, exist_ok=True)
    existing = list(ch.tasks())
    n = int(existing[-1].rsplit("_T", 1)[1]) + 1 if existing else 1
    tid = f"{ch.cnum}_T{n:03d}"
    after = ", ".join(ch.q(a.strip()) for a in opts["--after"].split(",") if a.strip())
    reqs = ", ".join(r.strip() for r in opts["--reqs"].split(",") if r.strip())
    text = (ROOT / "templates/task-template.md").read_text(encoding="utf-8")
    text = (text.replace("NNN-slug", ch.id).replace("CNNN_T0NN", tid)
                .replace("<one outcome>", title)
                .replace("at: YYYY-MM-DDTHH:MM:SSZ", f"at: {now()}"))
    text = re.sub(r"^sdd_requirements: .*$", f"sdd_requirements: [{reqs}]", text, flags=re.M)
    text = re.sub(r"^sdd_depends_on: .*$", f"sdd_depends_on: [{after}]", text, flags=re.M)
    text = re.sub(r"^sdd_group: .*$", f'sdd_group: "{opts["--group"]}"', text, flags=re.M)
    if opts["--class"] not in ("standard", "trivial"):
        die("error: --class must be standard or trivial")
    text = re.sub(r"^sdd_class: .*$", f'sdd_class: {opts["--class"]}', text, flags=re.M)
    path = ch.td / f"{tid}.md"
    path.write_text(text, encoding="utf-8")
    print(path)
    return 0


def cmd_list(ch, _args):
    if not ch.td.is_dir():
        print(f"no tasks/ in {ch.dir}")
        return 0
    print("| Task | Status | Depends on | Requirements | Group | Attempts | Outcome |")
    print("|---|---|---|---|---|---|---|")
    for t in ch.tasks().values():
        status = t.phase + (f" ({t.get('sdd_parked_on')})" if t.phase == "parked" else "")
        outcome = re.sub(r"^C\d+_T\d+ — ", "", t.get("title"))
        print(f"| [{t.id}]({t.id}.md) | {status} | {','.join(t.depends_on) or '—'} | "
              f"{','.join(t.requirements) or '—'} | {t.get('sdd_group')} | {t.get('sdd_attempts', '0') or '0'} | {outcome} |")
    return 0


def cmd_coverage(ch, _args):
    tasks = ch.tasks()
    if not tasks:
        return 0
    by_req = {}
    for t in tasks.values():
        for r in t.requirements:
            by_req.setdefault(r, []).append(t.id)
    print("| Requirement | Tasks |")
    print("|---|---|")
    for r in sorted(by_req):
        print(f"| {r} | {', '.join(by_req[r])} |")
    return 0


def cmd_check(ch, _args):
    if not ch.td.is_dir():
        print("  · no tasks/ yet")
        return 0
    tasks, fail = ch.tasks(), False

    def bad(msg):
        nonlocal fail
        print(f"  ❌ {msg}")
        fail = True

    for t in tasks.values():
        if t.get("sdd_task") != t.id:
            bad(f"{t.path}: sdd_task is '{t.get('sdd_task')}', file says {t.id}")
        if t.get("type") != "Task":
            bad(f"{t.path}: type must be Task")
        if t.phase not in PHASES:
            bad(f"{t.id}: sdd_phase '{t.phase}'")
        for d in t.depends_on:
            if d not in tasks:
                bad(f"{t.id} depends on {d}, which does not exist")
        for need in ("**Files**", "**Steps**", "**Verify**"):
            if need not in t.text:
                print(f"  ⚠️  {t.id} is missing {need}")
        if PLACEHOLDER.search(t.text):
            print(f"  ⚠️  {t.id} contains a placeholder phrase")
        if t.get("sdd_class", "standard") not in ("standard", "trivial"):
            bad(f"{t.id}: sdd_class '{t.get('sdd_class')}' (standard | trivial)")
        if t.get("sdd_class") == "trivial" and re.search(r"\bRED\b", "\n".join(t.body)):
            print(f"  ⚠️  {t.id} is trivial but has a RED step: a task that proves a scenario is standard")
        if t.phase == "parked" and not t.get("sdd_parked_on"):
            bad(f"{t.id} is parked with no sdd_parked_on")
    if not fail:
        print(f"  ✅ {len(tasks)} task files consistent")
    return 1 if fail else 0


# ── split: a legacy single-file tasks.md → tasks/CNNN_TNNN.md ───────────────────

HEADING = re.compile(r"^### (T\d+)\s*(\[P\])?\s*·\s*(.*?)\s*·\s*(.*)$")
NOT_A_GROUP = re.compile(r"(Coverage|Deferred|Open questions|Self-review)", re.I)


def parse_legacy(body):
    """The task blocks of a legacy tasks.md, each with the `## Phase` group it sat under."""
    group, blocks, cur = "", [], None
    for line in body.splitlines():
        h = HEADING.match(line)
        if line.startswith("## ") and not h:
            if cur:
                blocks.append(cur)
                cur = None
            group = line[3:].strip()
            if NOT_A_GROUP.match(group):
                group = None
            continue
        if h:
            if cur:
                blocks.append(cur)
            cur = {"id": h.group(1), "par": bool(h.group(2)), "reqs": h.group(3),
                   "title": h.group(4).strip(), "group": group or "", "lines": []}
            continue
        if cur is not None and group is not None:
            cur["lines"].append(line)
    if cur:
        blocks.append(cur)
    return blocks


def task_file(ch, src, b, ids):
    blk = "\n".join(b["lines"]).rstrip() + "\n"
    st = re.search(r"^\*\*Status:\*\*[ \t]*(.*)$", blk, re.M)
    said = st.group(1).strip() if st else ""
    status = said.split()[0] if said else "todo"
    status = "parked" if status == "blocked" else status
    status = status if status in PHASES else "todo"
    blk = re.sub(r"^\*\*Status:\*\*.*\n?", "", blk, flags=re.M)
    # a status line that said more than its keyword ("done — superseded by T023 …") keeps what it said
    note = f"> **Status note, from the original task list:** {said}\n\n" if len(said.split()) > 1 else ""
    parked = re.search(r"Parked on (D\d+)", blk)
    reqs = re.findall(r"[a-z0-9-]+\.[a-z0-9-]+/REQ-\d+", b["reqs"])
    # dependencies: every earlier task named in the Interfaces › Consumes line(s)
    consumes = "\n".join(l for l in b["lines"] if l.lstrip().startswith("- Consumes"))
    deps = sorted({ch.q(t) for t in re.findall(r"\bT\d{3}\b", consumes) if t in ids and t < b["id"]})
    tid, rel = ch.q(b["id"]), src.parent.as_posix()
    title = b["title"].replace('"', "'")
    group = b["group"].replace('"', "'")
    return f"""---
type: Task
title: {tid} — {title}
description: One task of {ch.id}, executed from its brief alone.
resource: /{rel}/tasks/{tid}.md
status: draft
tags: [sdd, task, "change:{ch.id}"]
sources:
  - resource: /{rel}/plan.md
generated:
  by: process:task.py split
  at: {now()}
sdd_id: {ch.id}
sdd_task: {tid}
sdd_phase: {status}
sdd_requirements: [{', '.join(reqs)}]
sdd_depends_on: [{', '.join(deps)}]
sdd_parked_on: {parked.group(1) if parked else ''}
sdd_group: "{group}"
sdd_parallel: {'true' if b['par'] else 'false'}
sdd_attempts: {1 if status == 'done' else 0}
---

# {tid} · {b['title']}

{note}{blk.strip()}
"""


def paragraphs(lines):
    out, cur = [], []
    for x in lines:
        if x.strip():
            cur.append(x.strip())
        elif cur:
            out.append(" ".join(cur))
            cur = []
    if cur:
        out.append(" ".join(cur))
    return out


def overview(body):
    """Everything that was not a task block: the header, coverage, deferrals. `## Phase`
    headings become the Groups list, each keeping the prose it had (its summary, shared conventions)."""
    out, groups, skip, collecting = [], [], False, None
    for line in body.splitlines():
        if re.match(r"^### T\d+", line):
            skip, collecting = True, None
            continue
        if line.startswith("## "):
            skip, collecting = False, None
            if re.match(r"^## (Phase|Group) ", line):
                groups.append((line[3:].strip(), []))
                skip, collecting = True, groups[-1][1]
                continue
        if collecting is not None:
            collecting.append(line)
        elif not skip:
            out.append(line)
    text = "\n".join(out)
    if groups:
        items = []
        for g, lines in groups:
            ps = paragraphs(lines)
            items.append("- " + g + "".join(("\n\n  " if i else "\n  ") + p for i, p in enumerate(ps)))
        text = text.rstrip() + "\n\n## Groups, in build order\n\n" + "\n".join(items) + "\n"
    text = re.sub(r"\n{3,}", "\n\n", text)
    if "## Tasks" not in text:
        text = text.rstrip() + "\n\n## Tasks\n\nOne file per task under `tasks/`; the live table is `tasks/index.md`.\n"
    return text.rstrip() + "\n"


def cmd_split(ch, _args):
    src = ch.dir / "tasks.md"
    if not src.is_file():
        die(f"error: no {src} to split")
    if ch.tasks():
        die(f"error: {ch.td} already has task files")
    text = src.read_text(encoding="utf-8")
    head, body = fm.split(text)
    if head is None:
        die(f"error: {src} has no frontmatter")
    body = "\n".join(body)
    blocks = parse_legacy(body)
    ids = {b["id"] for b in blocks}
    ch.td.mkdir(parents=True, exist_ok=True)
    for b in blocks:
        (ch.td / f"{ch.q(b['id'])}.md").write_text(task_file(ch, src, b, ids), encoding="utf-8")
    print(f"  split {len(blocks)} tasks into {ch.td}/ ({len(blocks)} files)")
    src.write_text(fm.join(head, overview(body).split("\n")), encoding="utf-8")
    code = cmd_check(ch, [])
    subprocess.run([str(ROOT / "scripts/index.sh")], cwd=ROOT,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    tasks = ch.tasks()
    nxt = next((t.id for t in tasks.values() if t.phase == "todo"
                and all(d in tasks and tasks[d].phase == "done" for d in t.depends_on)), "none")
    print(f"  overview kept in {src}; task bodies in {ch.td}/; next: {nxt}")
    return code


COMMANDS = {"next": cmd_next, "status": cmd_status, "park": cmd_park, "new": cmd_new,
            "list": cmd_list, "coverage": cmd_coverage, "check": cmd_check, "split": cmd_split}


def main(argv):
    os.chdir(ROOT)
    if len(argv) < 2 or argv[1] in ("-h", "--help"):
        print(__doc__)
        return 2
    ch = Change(argv[1])
    if not ch.dir.is_dir():
        die(f"error: {ch.dir} is not a change directory")
    cmd = argv[2] if len(argv) > 2 else "list"
    if cmd not in COMMANDS:
        die("usage: task.py <change> next | status T0NN S [DNNN] | park T0NN DNNN | "
            'new "title" [--after T] [--reqs r,r] [--group g] | list | coverage | split | check')
    return COMMANDS[cmd](ch, argv[3:])


if __name__ == "__main__":
    sys.exit(main(sys.argv))
