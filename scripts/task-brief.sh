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
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

SLICE="${1:?usage: task-brief.sh changes/NNN-slug T0NN}"
SLICE="${SLICE%/}"
TID="${2:?usage: task-brief.sh changes/NNN-slug T0NN}"
NAME=$(basename "$SLICE")
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

N=$(grep -cE "^### $TID " "$SLICE/tasks.md" || true)
if [[ "$N" -gt 1 ]]; then
  echo "error: $TID appears $N times in $SLICE/tasks.md; fix the duplicate before briefing" >&2; exit 1
fi
TASK=$(section "$SLICE/tasks.md" "### $TID ")
if [[ -z "$TASK" ]]; then
  echo "error: no task '$TID' in $SLICE/tasks.md" >&2; exit 1
fi

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
  echo "  - resource: /$SLICE/tasks.md"
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
  echo "report NEEDS_CONTEXT with the exact question. Do not guess."
  echo
  echo "## Task (verbatim from tasks.md)"; echo
  printf '%s\n' "$TASK"
  echo
  echo "## Requirements cited (verbatim from the target state of the capability)"
  # task heading cites qualified ids: <context>.<capability>/REQ-NNN
  for qr in $(printf '%s\n' "$TASK" | head -1 | grep -oE '[a-z0-9-]+\.[a-z0-9-]+/REQ-[0-9]+' | sort -u); do
    cc="${qr%%/*}"; r="${qr##*/}"; ctx="${cc%%.*}"; cap="${cc##*.}"
    tf="$TARGET/$ctx/$cap.md"
    echo; echo "**$qr** (from \`specs/$ctx/$cap.md\` after this change):"; echo
    if [[ -f "$tf" ]]; then section "$tf" "### $r"; else echo "_target spec $tf not found_"; fi
  done
  echo
  echo "## The delta this change makes (what is new or different)"
  for d in "$SLICE"/delta/*/*.md; do [[ -f "$d" ]] && { echo; echo "### $(basename "$(dirname "$d")").$(basename "$d" .md)"; sed '1,/^---$/{/^---$/!d}' "$d" | sed '1,/^---$/d'; }; done
  echo
  echo "## From plan.md"
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
} > "$OUT"

echo "$OUT"
