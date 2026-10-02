#!/usr/bin/env bash
# The end-of-run report: what the user reads when they come back to an
# unattended run. Written to changes/<id>/record/run-report.md and printed.
#
#   ./scripts/report.sh changes/NNN-slug
#
# Sections, in the order the user needs them:
#   1. Needs you       — escalated one-way doors, parked tasks, and the visual
#                        check if the change has screens. Empty means nothing.
#   2. Decided for you — the decision digest (record.sh decisions).
#   3. Spec amendments — which were applied to the delta.
#   4. Result          — task counts and the latest convergence verdict.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
CH="${1:?usage: report.sh changes/NNN-slug}"; CH="${CH%/}"
[[ -d "$CH" ]] || { echo "error: $CH is not a change directory" >&2; exit 1; }
ID=$(basename "$CH"); REC="$CH/record"; OUT="$REC/run-report.md"
mkdir -p "$REC"

fmget() { ./scripts/fm.py get "$1" "$2" 2>/dev/null || true; }
shopt -s nullglob
DEC=("$REC"/decisions/D*.md)
ESC=(); for f in "${DEC[@]}"; do [[ "$(fmget "$f" sdd_verdict)" == escalated ]] && ESC+=("$f"); done
PARKED=$(awk '/^### T[0-9]+/{t=$2} /\*\*Status:\*\* *parked/{if(t)print t; t=""}' "$CH/tasks.md" 2>/dev/null | sort -u | tr '\n' ' ' | sed 's/ *$//')
DONE=$(grep -cE '\*\*Status:\*\* *done' "$CH/tasks.md" 2>/dev/null || true)
TODO=$(grep -cE '\*\*Status:\*\* *todo' "$CH/tasks.md" 2>/dev/null || true)
CONV=("$REC"/converge-*.md); LASTCONV=""
[[ ${#CONV[@]} -gt 0 ]] && LASTCONV=$(ls -1 "${CONV[@]}" | sort -V | tail -1)
VERDICT="not run"
[[ -n "$LASTCONV" ]] && VERDICT=$(grep -m1 -E '^(Converged|Not converged)' "$LASTCONV" || echo "see $(basename "$LASTCONV")")

# Screens: the Interface table, if the change has one that is not "none".
SCREENS=()
if [[ -f "$CH/proposal.md" ]]; then
  while IFS= read -r row; do SCREENS+=("$row"); done < <(
    awk '/^## Interface/{p=1;next} /^## /{p=0} p' "$CH/proposal.md" \
      | grep -E '^\| *`' | grep -v '<screen>' || true)
fi

{
  echo "---"
  echo "type: Run Report"
  echo "title: $ID — run report"
  echo "description: What an unattended run did, what it decided, and what needs the user."
  echo "resource: /$OUT"
  echo "status: stable"
  echo "tags: [sdd, report, \"change:$ID\"]"
  echo "generated:"
  echo "  by: process:report.sh"
  echo "  at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "sdd_id: $ID"
  echo "---"
  echo
  echo "# Run report — $ID"
  echo
  echo "## Needs you"
  echo
  NEED=0
  if [[ ${#ESC[@]} -gt 0 ]]; then
    NEED=1
    echo "**One-way doors, escalated.** Each is the user's call; the run parked what depended on it and built the rest."
    echo
    for f in "${ESC[@]}"; do echo "- $(basename "$f" .md) · $(fmget "$f" sdd_task) · $(fmget "$f" title) — [decisions/$(basename "$f")](decisions/$(basename "$f"))"; done
    echo
  fi
  if [[ -n "${PARKED// /}" ]]; then
    NEED=1
    echo "**Parked tasks:** $PARKED — waiting on the escalations above."
    echo
  fi
  if [[ ${#SCREENS[@]} -gt 0 ]]; then
    NEED=1
    echo "**Visual check.** This change added or altered the screens below. Look at each on the real device"
    echo "(docs/design.md §2 says where it is used). Reply with what you want different, or \"looks right\"."
    echo "Changes become design rounds on this branch before merge (sdd-design D), or a --design change after."
    echo
    echo "| Screen | State | Route | Live screenshot | Wireframe |"
    echo "|---|---|---|---|---|"
    for row in "${SCREENS[@]}"; do
      IFS='|' read -r _ sc st rt ds _ <<<"$row"
      strip() { printf '%s' "$1" | sed -e 's/^ *//' -e 's/ *$//' -e 's/^`//' -e 's/`$//'; }
      sc=$(strip "$sc"); st=$(strip "$st"); rt=$(strip "$rt"); ds=$(strip "$ds")
      shot=".sdd/design/$ID/live/${sc}--${st}.png"; [[ -f "$shot" ]] || shot="(run design_snapshot.py $CH live)"
      echo "| $sc | $st | ${rt:-—} | $shot | ${ds:-—} |"
    done
    echo
  fi
  [[ $NEED -eq 0 ]] && echo "Nothing. The change is ready for you to merge." && echo
  echo "## Decided for you"
  echo
  if [[ ${#DEC[@]} -gt 0 ]]; then ./scripts/record.sh "$CH" decisions; else echo "No decisions needed beyond the tasks' own craft."; fi
  echo
  echo "Each is in \`record/decisions/\` with its options, the four-question judgement, and how to undo it."
  echo
  echo "## Spec amendments"
  echo
  AM=0
  for f in "${DEC[@]}"; do
    a=$(fmget "$f" sdd_amends); [[ "$a" == none || -z "$a" ]] && continue
    AM=1; echo "- $a — $(fmget "$f" title) — applied: $(fmget "$f" sdd_applied)"
  done
  [[ $AM -eq 0 ]] && echo "None. The delta is as you approved it."
  echo
  echo "## Result"
  echo
  echo "- Tasks: $DONE done, $TODO todo${PARKED:+, parked: $PARKED}"
  echo "- Convergence: $VERDICT${LASTCONV:+ ($(basename "$LASTCONV"))}"
} > "$OUT"

cat "$OUT"
