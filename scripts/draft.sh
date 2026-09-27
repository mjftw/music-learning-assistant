#!/usr/bin/env bash
# Commit an artefact as a numbered draft before it is shown at a gate, so the
# versions the user sent back are in git history rather than overwritten.
#
#   ./scripts/draft.sh changes/001-x/proposal.md            # → "docs(proposal): draft 1 — 001-x"
#   ./scripts/draft.sh changes/001-x/proposal.md changes/001-x/delta   # several paths, one draft
#
# The draft number is one more than the number of draft commits already
# touching the first path. Nothing else is staged. If the paths have no
# changes since the last commit, says so and exits 0.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
[[ $# -ge 1 ]] || { echo "usage: draft.sh <path> [path...]" >&2; exit 1; }
FIRST="${1%/}"
kind=$(basename "$FIRST" .md); [[ -d "$FIRST" ]] && kind=$(basename "$FIRST")
case "$FIRST" in
  changes/*/*) id=$(printf '%s' "$FIRST" | cut -d/ -f2) ;;
  *)           id="$FIRST" ;;
esac
n=$(( $(git log --oneline --grep="^docs($kind): draft " -- "$FIRST" | wc -l) + 1 ))
PATHS=()
for p in "$@"; do   # an empty directory (delta/ before the first delta) is not a pathspec git accepts
  if [[ -f "$p" ]] || { [[ -d "$p" ]] && [[ -n "$(find "$p" -type f -print -quit)" ]]; }; then PATHS+=("$p"); fi
done
[[ ${#PATHS[@]} -gt 0 ]] || { echo "draft: nothing at $*"; exit 0; }
git add -- "${PATHS[@]}"
if git diff --cached --quiet -- "${PATHS[@]}"; then echo "draft: no changes in $FIRST since last commit"; exit 0; fi
git commit -q -m "docs($kind): draft $n — $id" -- "${PATHS[@]}"
echo "draft $n committed: $(git log -1 --format=%h) docs($kind): draft $n — $id"
