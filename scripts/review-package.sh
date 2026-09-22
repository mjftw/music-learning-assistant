#!/usr/bin/env bash
# Package a task's diff for the task reviewer. BASE is the commit recorded
# before the implementer was dispatched — never HEAD~1, which is wrong the
# moment the implementer makes two commits or none.
#
#   ./scripts/review-package.sh changes/001-slug T011 <base-sha>
#   → .sdd/reviews/001-slug/T011.md   (path printed)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
SLICE="${1:?usage: review-package.sh changes/NNN-slug T0NN BASE_SHA}"
SLICE="${SLICE%/}"
TID="${2:?usage: review-package.sh changes/NNN-slug T0NN BASE_SHA}"
BASE="${3:?usage: review-package.sh changes/NNN-slug T0NN BASE_SHA}"
NAME=$(basename "$SLICE")
OUT=".sdd/reviews/${NAME}/${TID}.md"
mkdir -p "$(dirname "$OUT")"
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
HEAD_SHA=$(git rev-parse HEAD)

{
  echo "---"
  echo "type: Task Review"
  echo "title: Review package — $TID · $NAME"
  echo "description: The diff produced for $TID, for the task reviewer."
  echo "resource: /$OUT"
  echo "status: draft"
  echo "tags: [sdd, review, \"change:$NAME\"]"
  echo "sources:"
  echo "  - resource: /.sdd/briefs/$NAME/$TID.md"
  echo "  - resource: git:${BASE}..${HEAD_SHA}"
  echo "generated:"
  echo "  by: process:review-package.sh"
  echo "  at: $NOW"
  echo "sdd_id: $NAME"
  echo "---"
  echo
  echo "# Review package — $TID · $NAME"
  echo
  echo "base: \`$BASE\` → head: \`$HEAD_SHA\`"
  echo
  echo "## Files changed"; echo
  git diff --name-status "$BASE" HEAD | sed 's/^/- /'
  echo
  echo "## Diff"; echo
  echo '```diff'
  git diff "$BASE" HEAD
  echo '```'
  if ! git diff --quiet; then
    echo
    echo "## Uncommitted changes (implementer did not commit)"; echo
    echo '```diff'
    git diff
    echo '```'
  fi
} > "$OUT"

echo "$OUT"
