#!/usr/bin/env bash
# One file per task. State lives in each task's frontmatter; the generated
# tasks/index.md is the one thing a controller reads to know where it is.
#
#   ./scripts/task.sh changes/NNN next                 # first todo whose depends_on are all done; "none" if nothing
#   ./scripts/task.sh changes/NNN status T011 done     # todo | in-progress | done | parked (parked needs the decision: … parked D003)
#   ./scripts/task.sh changes/NNN park T014 D003       # park T014 and everything that depends on it, transitively
#   ./scripts/task.sh changes/NNN new "<one outcome>" [--after T011] [--reqs a.b/REQ-001,…] [--group "<group>"]
#   ./scripts/task.sh changes/NNN list                 # the index table (what index.sh writes)
#   ./scripts/task.sh changes/NNN split                # migrate a legacy tasks.md (### T0NN blocks) into tasks/
#   ./scripts/task.sh changes/NNN check                # anatomy, placeholders, dangling depends_on; exit 1 on ❌
#
# Frontmatter keys (templates/task-template.md): sdd_task, sdd_phase
# (todo|in-progress|done|parked), sdd_requirements [..], sdd_depends_on [..],
# sdd_parked_on, sdd_group, sdd_attempts.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
CH="${1%/}"; CMD="${2:-list}"
[[ -d "$CH" ]] || { echo "error: $CH is not a change directory" >&2; exit 1; }
ID=$(basename "$CH"); TD="$CH/tasks"; CNUM="C${ID%%-*}"     # change 008-learner-leads → C008
q() { case "$1" in C[0-9]*_T*) printf '%s' "$1" ;; T[0-9]*) printf '%s_%s' "$CNUM" "$1" ;; *) printf '%s' "$1" ;; esac; }   # T005 → C008_T005

get() { ./scripts/fm.py get "$1" "$2" 2>/dev/null; }
lst() { get "$1" "$2" | tr -d '[]' | tr ',' ' ' | xargs 2>/dev/null; }   # yaml flow list → words
tfile() { printf '%s/%s.md' "$TD" "$(q "$1")"; }
tasks() { ls "$TD"/C[0-9]*_T[0-9]*.md 2>/dev/null | xargs -rn1 basename | sed 's/\.md$//' | sort; }
phase() { get "$(tfile "$1")" sdd_phase; }

case "$CMD" in
  next)
    [[ -d "$TD" ]] || { echo "none"; exit 0; }
    for t in $(tasks); do
      [[ "$(phase "$t")" == todo ]] || continue
      ready=true
      for d in $(lst "$(tfile "$t")" sdd_depends_on); do
        [[ "$(phase "$d" 2>/dev/null)" == done ]] || { ready=false; break; }
      done
      $ready && { echo "$t"; exit 0; }
    done
    echo "none" ;;
  status)
    T=$(q "${3:?task id}"); S="${4:?todo|in-progress|done|parked}"; f=$(tfile "$T")
    [[ -f "$f" ]] || { echo "error: no $f" >&2; exit 1; }
    case "$S" in todo|in-progress|done) ;; parked) [[ -n "${5:-}" ]] || { echo "error: parked needs the decision id (D003)" >&2; exit 1; } ;;
      *) echo "error: status must be todo|in-progress|done|parked" >&2; exit 1 ;; esac
    ./scripts/fm.py set "$f" sdd_phase "$S" >/dev/null
    [[ "$S" == parked ]] && ./scripts/fm.py set "$f" sdd_parked_on "$5" >/dev/null
    [[ "$S" == in-progress ]] && ./scripts/fm.py set "$f" sdd_attempts "$(( $(get "$f" sdd_attempts 2>/dev/null || echo 0) + 1 ))" >/dev/null
    echo "$T: $S${5:+ ($5)}" ;;
  park)
    T=$(q "${3:?task id}"); D="${4:?decision id}"
    declare -A SEEN=(); queue=("$T")
    while [[ ${#queue[@]} -gt 0 ]]; do
      cur="${queue[0]}"; queue=("${queue[@]:1}"); [[ -n "${SEEN[$cur]:-}" ]] && continue; SEEN[$cur]=1
      [[ "$(phase "$cur")" == done ]] && continue
      ./scripts/fm.py set "$(tfile "$cur")" sdd_phase parked >/dev/null; ./scripts/fm.py set "$(tfile "$cur")" sdd_parked_on "$D" >/dev/null
      echo "  parked $cur on $D"
      for o in $(tasks); do for d in $(lst "$(tfile "$o")" sdd_depends_on); do [[ "$d" == "$cur" ]] && queue+=("$o"); done; done
    done; true ;;
  new)
    TITLE="${3:?one outcome}"; shift 3; AFTER=""; REQS=""; GROUP="Appended"
    while [[ $# -gt 0 ]]; do case "$1" in --after) AFTER="$2"; shift 2 ;; --reqs) REQS="$2"; shift 2 ;; --group) GROUP="$2"; shift 2 ;; *) shift ;; esac; done
    mkdir -p "$TD"; n=1; last=$(tasks | tail -1); [[ -n "$last" ]] && n=$(( 10#${last##*_T} + 1 ))
    T=$(printf '%s_T%03d' "$CNUM" "$n"); f=$(tfile "$T")
    AFTER=$(for a in ${AFTER//,/ }; do q "$a"; done | paste -sd, -)
    sed -e "s|NNN-slug|$ID|g" -e "s|CNNN_T0NN|$T|g" -e "s|<one outcome>|$TITLE|" -e "s|at: YYYY-MM-DDTHH:MM:SSZ|at: $(date -u +%Y-%m-%dT%H:%M:%SZ)|" \
        -e "s|^sdd_requirements: .*|sdd_requirements: [$(printf '%s' "$REQS" | sed 's/,/, /g')]|" \
        -e "s|^sdd_depends_on: .*|sdd_depends_on: [${AFTER//,/, }]|" -e "s|^sdd_group: .*|sdd_group: \"$GROUP\"|" templates/task-template.md > "$f"
    echo "$f" ;;
  list)
    [[ -d "$TD" ]] || { echo "no tasks/ in $CH"; exit 0; }
    printf '| Task | Status | Depends on | Requirements | Group | Attempts | Outcome |\n|---|---|---|---|---|---|---|\n'
    for t in $(tasks); do f=$(tfile "$t")
      printf '| [%s](%s.md) | %s | %s | %s | %s | %s | %s |\n' "$t" "$t" "$(phase "$t")$( [[ "$(phase "$t")" == parked ]] && printf ' (%s)' "$(get "$f" sdd_parked_on)")" \
        "$(lst "$f" sdd_depends_on | tr ' ' ',' | sed 's/^$/—/')" "$(lst "$f" sdd_requirements | tr ' ' ',' | sed 's/^$/—/')" \
        "$(get "$f" sdd_group)" "$(get "$f" sdd_attempts 2>/dev/null || echo 0)" "$(get "$f" title | sed 's/^C[0-9]*_T[0-9]* — //')"
    done ;;
  coverage)
    [[ -d "$TD" ]] || exit 0
    printf '| Requirement | Tasks |\n|---|---|\n'
    for t in $(tasks); do for r in $(lst "$(tfile "$t")" sdd_requirements); do echo "$r $t"; done; done \
      | sort | awk '{a[$1]=a[$1] (a[$1]?", ":"") $2} END{for(r in a) printf "| %s | %s |\n", r, a[r]}' | sort ;;
  check)
    FAIL=0; [[ -d "$TD" ]] || { echo "  · no tasks/ yet"; exit 0; }
    declare -A IDS=(); for t in $(tasks); do IDS[$t]=1; done
    for t in $(tasks); do f=$(tfile "$t")
      [[ "$(get "$f" sdd_task)" == "$t" ]] || { echo "  ❌ $f: sdd_task is '$(get "$f" sdd_task)', file says $t"; FAIL=1; }
      [[ "$(get "$f" type)" == Task ]] || { echo "  ❌ $f: type must be Task"; FAIL=1; }
      case "$(phase "$t")" in todo|in-progress|done|parked) ;; *) echo "  ❌ $t: sdd_phase '$(phase "$t")'"; FAIL=1 ;; esac
      for d in $(lst "$f" sdd_depends_on); do [[ -n "${IDS[$d]:-}" ]] || { echo "  ❌ $t depends on $d, which does not exist"; FAIL=1; }; done
      for need in '\*\*Files\*\*' '\*\*Steps\*\*' '\*\*Verify\*\*'; do grep -qE "$need" "$f" || echo "  ⚠️  $t is missing $need"; done
      grep -qE 'TBD|TODO|handle (edge|error) |error handling|similar to T|like T[0-9]' "$f" && echo "  ⚠️  $t contains a placeholder phrase"
      [[ "$(phase "$t")" == parked && -z "$(get "$f" sdd_parked_on)" ]] && { echo "  ❌ $t is parked with no sdd_parked_on"; FAIL=1; }
    done
    [[ $FAIL -eq 0 ]] && echo "  ✅ $(tasks | wc -l) task files consistent"
    exit $FAIL ;;
  split)
    SRC="$CH/tasks.md"; [[ -f "$SRC" ]] || { echo "error: no $SRC to split" >&2; exit 1; }
    [[ -d "$TD" ]] && compgen -G "$TD/T*.md" >/dev/null && { echo "error: $TD already has task files" >&2; exit 1; }
    mkdir -p "$TD"
    python3 - "$SRC" "$TD" "$ID" "$CNUM" <<'PY'
import re, sys, pathlib, datetime
src, td, cid, cnum = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), sys.argv[3], sys.argv[4]
Q = lambda t: f"{cnum}_{t}"
text = src.read_text(encoding="utf-8")
fm_end = text.index("\n---", 4); body = text[fm_end+4:]
lines = body.splitlines()
now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
H = re.compile(r"^### (T\d+)\s*(\[P\])?\s*·\s*(.*?)\s*·\s*(.*)$")
group = ""; blocks = []; cur = None; pre = []
for l in lines:
    m = re.match(r"^## (.*)$", l)
    if m and not H.match(l):
        if cur: blocks.append(cur); cur = None
        group = m.group(1).strip()
        if re.match(r"(Coverage|Deferred|Open questions|Self-review)", group, re.I): group = None
        continue
    h = H.match(l)
    if h:
        if cur: blocks.append(cur)
        cur = {"id": h.group(1), "par": bool(h.group(2)), "reqs": h.group(3), "title": h.group(4).strip(), "group": group or "", "lines": []}
        continue
    if cur is not None and group is not None: cur["lines"].append(l)
if cur: blocks.append(cur)
ids = {b["id"] for b in blocks}
for b in blocks:
    blk = "\n".join(b["lines"]).rstrip() + "\n"
    st = re.search(r"\*\*Status:\*\*\s*(\S+)", blk); status = st.group(1) if st else "todo"
    if status == "blocked": status = "parked"
    if status not in ("todo", "in-progress", "done", "parked"): status = "todo"
    blk = re.sub(r"^\*\*Status:\*\*.*\n?", "", blk, flags=re.M)
    parked = re.search(r"Parked on (D\d+)", blk); parked = parked.group(1) if parked else ""
    reqs = [r for r in re.findall(r"[a-z0-9-]+\.[a-z0-9-]+/REQ-\d+", b["reqs"])]
    # dependencies: every earlier task named in the Interfaces › Consumes line(s)
    cons = "\n".join(l for l in b["lines"] if l.lstrip().startswith("- Consumes"))
    deps = sorted({Q(t) for t in re.findall(r"\bT\d{3}\b", cons) if t in ids and t < b["id"]})
    fm = f"""---
type: Task
title: {Q(b['id'])} — {b['title'].replace('"', "'")}
description: One task of {cid}, executed from its brief alone.
resource: /{src.parent}/tasks/{Q(b['id'])}.md
status: draft
tags: [sdd, task, "change:{cid}"]
sources:
  - resource: /{src.parent}/plan.md
generated:
  by: process:task.sh split
  at: {now}
sdd_id: {cid}
sdd_task: {Q(b['id'])}
sdd_phase: {status}
sdd_requirements: [{', '.join(reqs)}]
sdd_depends_on: [{', '.join(deps)}]
sdd_parked_on: {parked}
sdd_group: "{b['group'].replace('"', "'")}"
sdd_parallel: {'true' if b['par'] else 'false'}
sdd_attempts: {1 if status == 'done' else 0}
---

# {Q(b['id'])} · {b['title']}

{blk.strip()}
"""
    (td / f"{Q(b['id'])}.md").write_text(fm, encoding="utf-8")
print(f"  split {len(blocks)} tasks into {td}/ ({sum(1 for b in blocks)} files)")
PY
    # the overview keeps everything that was not a task block: the header, coverage, deferred
    python3 - "$SRC" <<'PY'
import re, sys, pathlib
p = pathlib.Path(sys.argv[1]); t = p.read_text(encoding="utf-8")
fm_end = t.index("\n---", 4); fm, body = t[:fm_end+4], t[fm_end+4:]
out, skip = [], False
groups = []
for l in body.splitlines():
    if re.match(r"^### T\d+", l): skip = True; continue
    if re.match(r"^## ", l):
        skip = False
        if re.match(r"^## (Phase|Group) ", l): groups.append(l[3:].strip()); skip = True; continue
    if not skip: out.append(l)
body = "\n".join(out)
if groups:
    body = body.rstrip() + "\n\n## Groups, in build order\n\n" + "\n".join(f"- {g}" for g in groups) + "\n"
body = re.sub(r"\n{3,}", "\n\n", body)
if "## Tasks" not in body:
    body = body.rstrip() + "\n\n## Tasks\n\nOne file per task under `tasks/`; the live table is `tasks/index.md`.\n"
p.write_text(fm + body.rstrip() + "\n", encoding="utf-8")
PY
    ./scripts/task.sh "$CH" check
    ./scripts/index.sh >/dev/null 2>&1 || true
    echo "  overview kept in $SRC; task bodies in $TD/; next: $(./scripts/task.sh "$CH" next)" ;;
  *) echo "usage: task.sh <change> next | status T0NN S | park T0NN DNNN | new \"title\" [--after T] [--reqs r,r] [--group g] | list | coverage | split | check" >&2; exit 1 ;;
esac
