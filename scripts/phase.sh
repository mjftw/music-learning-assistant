#!/usr/bin/env bash
# Record which top-of-ladder phase is open, so every turn inside it runs on
# the strong model and no turn outside it does.
#
#   ./scripts/phase.sh enter grill     # the grill skill, first thing it does
#   ./scripts/phase.sh leave           # the gate is passed, or a lower phase starts
#   ./scripts/phase.sh show            # prints the open phase, or nothing
#
# The marker is .sdd/phase (one line: the skill name). The UserPromptSubmit
# hook scripts/hooks/phase-model.sh reads it at the start of each turn and
# tells the agent to invoke `sdd-continue` (model: fable) before replying. A
# marker older than SDD_PHASE_TTL_HOURS (default 12) is ignored and removed:
# a phase left open overnight is almost always a phase that was abandoned.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
M=.sdd/phase
# sdd-finish appears only for its Affects step, which edits top-of-ladder docs.
TOP="sdd-init sdd-constitution sdd-engineering grill sdd-specify sdd-plan sdd-design sdd-finish"

case "${1:-show}" in
  enter)
    skill="${2:?usage: phase.sh enter <skill>}"
    [[ " $TOP " == *" $skill "* ]] || { echo "error: '$skill' is not a top-of-ladder phase ($TOP)" >&2; exit 1; }
    mkdir -p .sdd && printf '%s\n' "$skill" > "$M"
    echo "phase: $skill (strong model until ./scripts/phase.sh leave)" ;;
  leave)
    if [[ -f "$M" ]]; then echo "phase: left $(cat "$M")"; rm -f "$M"; else echo "phase: none open"; fi ;;
  show)
    [[ -f "$M" ]] || exit 0
    ttl=$(( ${SDD_PHASE_TTL_HOURS:-12} * 3600 ))
    age=$(( $(date +%s) - $(stat -c %Y "$M" 2>/dev/null || stat -f %m "$M") ))
    if (( age > ttl )); then rm -f "$M"; exit 0; fi
    touch "$M"   # TTL counts from the last turn in the phase, not from entry
    cat "$M" ;;
  *) echo "usage: phase.sh enter <skill> | leave | show" >&2; exit 1 ;;
esac
