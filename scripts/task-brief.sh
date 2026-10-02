#!/usr/bin/env bash
# Build the self-contained brief for one task, so the implementer never reads
# the whole plan and the controller never pastes exact values by hand.
#
#   ./scripts/task-brief.sh changes/001-slug T011
#   → .sdd/briefs/001-slug/T011.md   (path printed)
#
# Requirements are taken from the TARGET state (living specs with this
# change's delta applied, via merge_delta.py preview), so the implementer sees
# what the capability must do after the change, not the delta alone.
#
# The brief is read in full by the implementer and the task reviewer on every
# attempt, so it carries only what the task cites: the deltas of the cited
# capabilities (all of them for a task that cites none), the plan's mapping
# rows for the cited requirements plus its Interfaces, Data model, Structure
# and Test strategy, and from AUTONOMY.md only "Who decides".
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

SLICE="${1:?usage: task-brief.sh changes/NNN-slug T0NN}"
SLICE="${SLICE%/}"
TID="${2:?usage: task-brief.sh changes/NNN-slug T0NN}"
NAME=$(basename "$SLICE")
CNUM="C${NAME%%-*}"; case "$TID" in T[0-9]*) TID="${CNUM}_$TID" ;; esac   # T011 → C008_T011, as record.sh expects
OUT=".sdd/briefs/${NAME}/${TID}.md"
mkdir -p "$(dirname "$OUT")"

# Section extractor: from a "### <prefix>" heading to the next "### " or "## ".
section() { # file prefix
  awk -v t="$2" '
    index($0, t) == 1 { p = 1; print; next }
    p && (/^### / || /^## /) { exit }
    p { print }' "$1"
}
h2() { # file "## Heading"
  awk -v t="$2" '
    index($0, t) == 1 { p = 1; print; next }
    p && /^## / { exit }
    p { print }' "$1"
}

TARGET=".sdd/target/$NAME"
./scripts/merge_delta.py preview "$SLICE" >/dev/null || { echo "error: could not build target state for $SLICE" >&2; exit 1; }

TASKFILE="$SLICE/tasks/$TID.md"
SHORT="${TID#${CNUM}_}"
if [[ -f "$TASKFILE" ]]; then
  TASK=$(sed '1,/^---$/{/^---$/!d}' "$TASKFILE" | sed '1,/^---$/d')   # body only: the anatomy, no frontmatter
  N=1
else
N=$(grep -cE "^### $SHORT " "$SLICE/tasks.md" 2>/dev/null || true)
if [[ "$N" -gt 1 ]]; then
  echo "error: $SHORT appears $N times in $SLICE/tasks.md; fix the duplicate before briefing" >&2; exit 1
fi
TASK=$(section "$SLICE/tasks.md" "### $SHORT ")
if [[ -z "$TASK" ]]; then
  echo "error: no task '$TID' in $SLICE/tasks/ or $SLICE/tasks.md" >&2; exit 1
fi
fi

# The requirements this task cites: frontmatter for a task file, the heading for a legacy block.
if [[ -f "$TASKFILE" ]]; then QRS=$(./scripts/fm.py get "$TASKFILE" sdd_requirements | tr -d '[],'); else QRS=$(printf '%s\n' "$TASK" | head -1 | grep -oE '[a-z0-9-]+\.[a-z0-9-]+/REQ-[0-9]+' || true); fi
QRS=$(printf '%s\n' $QRS | sort -u)
CAPS=$(printf '%s\n' $QRS | cut -d/ -f1 | sort -u)

NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
STALE=$(date -u -d '+7 days' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v+7d +%Y-%m-%dT%H:%M:%SZ)

{
  echo "---"
  echo "type: Task Brief"
  echo "title: Brief — $TID · $NAME"
  echo "description: Everything needed to implement $TID, and nothing else."
  echo "resource: /$OUT"
  echo "status: draft"
  echo "tags: [sdd, brief, \"change:$NAME\"]"
  echo "sources:"
  echo "  - resource: /${TASKFILE#./}"
  echo "  - resource: /$SLICE/proposal.md"
  echo "  - resource: /$SLICE/plan.md"
  echo "  - resource: /docs/engineering.md"
  echo "generated:"
  echo "  by: process:task-brief.sh"
  echo "  at: $NOW"
  echo "stale_after: $STALE"
  echo "sdd_id: $NAME"
  echo "---"
  echo
  echo "# Brief — $TID · $NAME"
  echo
  echo "You have this brief and nothing else. Exact values below are the"
  echo "requirements; use them verbatim. If something you need is missing,"
  echo "report DECISION_NEEDED with the exact question. Do not guess."
  echo
  echo "## Task (verbatim from the task file)"; echo
  printf '%s\n' "$TASK"
  echo
  echo "## Requirements cited (verbatim from the target state of the capability)"
  for qr in $QRS; do
    cc="${qr%%/*}"; r="${qr##*/}"; ctx="${cc%%.*}"; cap="${cc##*.}"
    tf="$TARGET/$ctx/$cap.md"
    echo; echo "**$qr** (from \`specs/$ctx/$cap.md\` after this change):"; echo
    if [[ -f "$tf" ]]; then section "$tf" "### $r"; else echo "_target spec $tf not found_"; fi
  done
  echo
  echo "## The delta this change makes (what is new or different)"
  # Only the capabilities this task cites. A task that cites none (Foundations,
  # Hardening) gets every delta, since it serves all of them.
  for d in "$SLICE"/delta/*/*.md; do
    [[ -f "$d" ]] || continue
    cc="$(basename "$(dirname "$d")").$(basename "$d" .md)"
    if [[ -n "$CAPS" ]] && ! grep -qxF "$cc" <<<"$CAPS"; then continue; fi
    echo; echo "### $cc"; sed '1,/^---$/{/^---$/!d}' "$d" | sed '1,/^---$/d'
  done
  echo
  echo "## From plan.md"
  echo
  echo "### Requirement → design mapping (rows for the cited requirements)"; echo
  h2 "$SLICE/plan.md" "## Requirement → design mapping" | grep -E '^\|' | head -2
  for qr in $QRS; do
    h2 "$SLICE/plan.md" "## Requirement → design mapping" | grep -F "$qr" || true
  done
  for h in "## Interfaces" "## Data model" "## Structure" "## Test strategy"; do
    echo; h2 "$SLICE/plan.md" "$h"
  done
  echo
  echo "## Engineering preferences (docs/engineering.md)"; echo
  if [[ -f docs/engineering.md ]]; then cat docs/engineering.md; else echo "_none recorded_"; fi
  echo
  echo "## Commands (AGENTS.md)"; echo
  h2 AGENTS.md "## Commands"
  echo
  echo "## Constitution"; echo
  cat memory/constitution.md
  echo
  echo "## Autonomy (AUTONOMY.md › Who decides) — the user is away; decide craft, escalate the rest as DECISION_NEEDED"; echo
  # Only the section that tells the implementer what is its call. The rest of
  # AUTONOMY.md is for the controller and the decider.
  if [[ -f AUTONOMY.md ]]; then h2 AUTONOMY.md "## Who decides" | tail -n +2; fi
} > "$OUT"

echo "$OUT"
