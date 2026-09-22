#!/usr/bin/env bash
# PreToolUse hook for Edit|Write|MultiEdit. Blocks protected paths.
# Exit 0 = allow. Exit 2 = block (stderr is shown to the agent).
#
# This is a boundary around actions, not an instruction the agent may forget.
# The unlock files are speed bumps, not walls: the owning skill creates one
# only after the user approves, and removes it after the commit. The wall is
# the gate and git history.
set -uo pipefail

INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | python3 -c '
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get("tool_input", {}).get("file_path", ""))
except Exception:
    print("")
' 2>/dev/null)

[[ -z "$FILE" ]] && exit 0
REL="${FILE#"$PWD"/}"
BASE=$(basename "$REL")

# Secrets: never, no unlock.
case "$BASE" in
  .env|.env.*|*.pem|*.key|*secret*|*credential*)
    echo "blocked: '$REL' is a protected path (AGENTS.md › Never)." >&2
    exit 2 ;;
esac

# Generated OKF files.
case "$BASE" in
  index.md|log.md)
    if [[ -f .sdd/unlock-index ]]; then exit 0; fi
    echo "blocked: '$REL' is generated — run ./scripts/index.sh or ./scripts/approve.sh." >&2
    exit 2 ;;
esac

case "$REL" in
  specs/*/*.md)
    if [[ -f .sdd/unlock-specs ]]; then exit 0; fi
    echo "blocked: '$REL' is a living spec, merged by scripts/merge_delta.py at sdd-finish. Write a delta under changes/<id>/delta/ instead." >&2
    exit 2 ;;
  memory/constitution.md)
    if [[ -f .sdd/unlock-constitution ]]; then exit 0; fi
    echo "blocked: memory/constitution.md is edited only by /sdd-constitution after the user approves the amendment." >&2
    exit 2 ;;
  docs/engineering.md)
    if [[ -f .sdd/unlock-engineering ]]; then exit 0; fi
    echo "blocked: docs/engineering.md is edited only by /sdd-engineering after the user approves." >&2
    exit 2 ;;
  REVIEW.md)
    echo "blocked: REVIEW.md is the user's review policy. Propose the change; do not make it." >&2
    exit 2 ;;
esac

exit 0
