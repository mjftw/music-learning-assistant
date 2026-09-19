#!/usr/bin/env bash
# Scenario coverage against the living specs (the current truth):
#   every REQ in specs/<ctx>/<cap>.md has ≥1 scenario, every scenario has a
#   test citing it, and no test cites a scenario of a removed requirement.
#
#   ./scripts/check-scenarios.sh                       # living specs (standing check)
#   ./scripts/check-scenarios.sh --change changes/NNN  # the target state of one change:
#                                                      #   its ADDED/MODIFIED scenarios need tests,
#                                                      #   its REMOVED ones must have none
#
# A test cites a scenario by its qualified id, either form:
#   readings.recording/REQ-003/S1     (in a comment or docstring)
#   readings_recording_REQ_003_S1     (in the test name)
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
FAIL=0
TESTDIR="${SDD_TEST_DIR:-tests}"
ROOT_SPECS="specs"
ONLY_CHANGE=""

if [[ "${1:-}" == "--change" ]]; then
  ONLY_CHANGE="${2%/}"
  ./scripts/merge_delta.py preview "$ONLY_CHANGE" >/dev/null || { echo "❌ preview failed"; exit 1; }
  ROOT_SPECS=".sdd/target/$(basename "$ONLY_CHANGE")"
fi

cited() { # qualified id -> 0 if some test cites it, in either form
  local q="$1" u
  u=$(printf '%s' "$1" | tr './-' '___')
  [[ -d "$TESTDIR" ]] && grep -rqF -e "$q" -e "$u" "$TESTDIR" 2>/dev/null
}

# Which capabilities does this change touch? (all, for the standing check)
if [[ -n "$ONLY_CHANGE" ]]; then
  mapfile -t FILES < <(find "$ONLY_CHANGE/delta" -name '*.md' ! -name index.md 2>/dev/null | sed "s|^$ONLY_CHANGE/delta/|$ROOT_SPECS/|" | sort)
else
  mapfile -t FILES < <(find "$ROOT_SPECS" -mindepth 2 -name '*.md' ! -name index.md 2>/dev/null | sort)
fi
[[ ${#FILES[@]} -eq 0 ]] && { echo "no capability specs yet"; exit 0; }

for f in "${FILES[@]}"; do
  [[ -f "$f" ]] || continue
  ctx=$(./scripts/fm.py get "$f" sdd_context 2>/dev/null); cap=$(./scripts/fm.py get "$f" sdd_capability 2>/dev/null)
  q="$ctx.$cap"
  echo "$q"
  # live requirements
  for r in $(grep -oE '^### REQ-[0-9]+' "$f" | sed 's/### //' | sort -u); do
    scen=$(grep -oE "$r/S[0-9]+" "$f" | sort -u)
    if [[ -z "$scen" ]]; then echo "  ❌ $r has no scenario"; FAIL=1; continue; fi
    for s in $scen; do
      if cited "$q/$s"; then echo "  ✅ $q/$s tested"
      else echo "  ❌ $q/$s has no test citing it"; FAIL=1; fi
    done
  done
  # removed requirements must have no test left
  for r in $(grep -oE '^### ~~REQ-[0-9]+' "$f" | sed 's/### ~~//' | sort -u); do
    for s in $(grep -oE "$r/S[0-9]+" "$f" | sort -u); do
      if cited "$q/$s"; then echo "  ❌ $q/$s is removed but a test still cites it"; FAIL=1; fi
    done
    # removed blocks carry no scenarios (struck through), so also check by id
    if cited "$q/$r"; then echo "  ❌ $q/$r is removed but a test still cites it"; FAIL=1; fi
  done
done
[[ $FAIL -eq 0 ]] && echo "✅ scenario coverage complete" || echo "❌ scenario gaps"
exit $FAIL
