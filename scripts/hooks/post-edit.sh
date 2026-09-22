#!/usr/bin/env bash
# PostToolUse hook for Edit|Write|MultiEdit. Runs the project formatter on the
# changed file so the agent never hand-formats. Fill in during the first
# /sdd-plan.
set -uo pipefail
INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null)
[[ -z "$FILE" || ! -f "$FILE" ]] && exit 0

case "$FILE" in
  *.ts|*.tsx|*.json|*.css|*.html)
    [[ -f node_modules/.bin/prettier ]] && pnpm exec prettier --write "$FILE" >/dev/null 2>&1 || true ;;
esac
exit 0
