#!/usr/bin/env bash
# Package a task's diff for the task reviewer, and run the task's Verify line
# and the project's check command so the package carries their output. BASE
# is the commit recorded before the implementer was dispatched — never
# HEAD~1, which is wrong the moment the implementer makes two commits or none.
#
#   ./scripts/review-package.sh changes/001-slug T011 <base-sha>
#   → .sdd/reviews/001-slug/T011.md   (path printed)
#
#   ./scripts/review-package.sh changes/001-slug T011 <base-sha> --incremental
#     for a fix loop: the previous attempt's verdict (from the change's
#     record) and the full diff only since that attempt's head; the earlier
#     diff is summarised as changed files. The reviewer re-checks the open
#     findings and what the new diff touches, not the whole task again.
#
#   --check "<cmd>"   the check command, if AGENTS.md › Commands does not name
#                     it on a `# check…` line (or the line after it)
#
# The command output here is produced by this script, not pasted by an agent,
# so the controller and the reviewer treat it as evidence and do not run the
# commands again. Exit status is recorded next to each output.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
SLICE="${1:?usage: review-package.sh changes/NNN-slug T0NN BASE_SHA [--incremental] [--check CMD]}"
SLICE="${SLICE%/}"
TID="${2:?usage: review-package.sh changes/NNN-slug T0NN BASE_SHA [--incremental] [--check CMD]}"
BASE="${3:?usage: review-package.sh changes/NNN-slug T0NN BASE_SHA [--incremental] [--check CMD]}"
INCREMENTAL=false; CHECK_CMD=""
shift 3
while [[ $# -gt 0 ]]; do
  case "$1" in
    --incremental) INCREMENTAL=true ;;
    --check) CHECK_CMD="${2:?--check needs a command}"; shift ;;
    *) echo "error: unknown flag $1" >&2; exit 1 ;;
  esac
  shift
done
NAME=$(basename "$SLICE")
CNUM="C${NAME%%-*}"; case "$TID" in T[0-9]*) TID="${CNUM}_$TID" ;; esac   # T011 → C008_T011, as record.sh expects
OUT=".sdd/reviews/${NAME}/${TID}.md"
mkdir -p "$(dirname "$OUT")"
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
HEAD_SHA=$(git rev-parse HEAD)

section() { # file prefix — from a "### <prefix>" heading to the next "### " or "## "
  awk -v t="$2" '
    index($0, t) == 1 { p = 1; print; next }
    p && (/^### / || /^## /) { exit }
    p { print }' "$1"
}

# The Verify line: the first backticked command on the task's **Verify** line,
# from the task file (tasks/CNNN_TNNN.md) or, for a legacy list, its tasks.md block.
TASKFILE="$SLICE/tasks/$TID.md"
if [[ -f "$TASKFILE" ]]; then
  TASK=$(cat "$TASKFILE")
else
  TASK=$(section "$SLICE/tasks.md" "### ${TID#${CNUM}_} " 2>/dev/null || true)
fi
VERIFY_CMD=$(printf '%s\n' "$TASK" | grep -m1 -E '^\*\*Verify\*\*' | grep -oE '`[^`]+`' | head -1 | tr -d '`' || true)

# The check command: AGENTS.md › Commands, a `# check…: <cmd>` line or the
# first non-comment line after `# check…`.
if [[ -z "$CHECK_CMD" ]]; then
  CHECK_CMD=$(awk '
    /^## Commands/ { s = 1; next }
    s && /^## / { exit }
    s && /^```/ { f = !f; next }
    f && /^# check/ { if (match($0, /:[[:space:]]*[^[:space:]].*$/)) { c = substr($0, RSTART + 1); sub(/^[[:space:]]+/, "", c); print c; exit } want = 1; next }
    f && want && /^[[:space:]]*$/ { next }
    f && want && /^#/ { want = 0; next }
    f && want { print; exit }' AGENTS.md 2>/dev/null || true)
fi

run() { # title cmd — run in a subshell, capture the tail, record the exit status
  local title="$1" cmd="$2" tmp rc
  echo "### $title"; echo
  if [[ -z "$cmd" ]]; then
    echo "_not found — the controller must run it and append the output here_"; echo; return
  fi
  echo "\`$cmd\`"; echo
  tmp=$(mktemp)
  set +e; (bash -c "$cmd") >"$tmp" 2>&1; rc=$?; set -e
  echo '```'; tail -n 40 "$tmp"; echo '```'
  echo; echo "exit status: $rc$( (( rc == 0 )) && echo ' ✅' || echo ' ❌')"; echo
  rm -f "$tmp"
}

# Incremental: the previous attempt's verdict and head, from the record.
PREV=""; PREV_HEAD=""
if $INCREMENTAL; then
  PREV=$(ls -1 "$SLICE"/record/tasks/"$TID"-review-*.md 2>/dev/null | sort -V | tail -1 || true)
  if [[ -z "$PREV" ]]; then
    echo "error: --incremental but no recorded review for $TID under $SLICE/record/tasks/ (run record.sh after every review)" >&2; exit 1
  fi
  PREV_HEAD=$(grep -m1 -oE 'head: `[0-9a-f]+`' "$PREV" | grep -oE '[0-9a-f]{7,}' || true)
  [[ -n "$PREV_HEAD" ]] || { echo "error: $PREV records no head sha" >&2; exit 1; }
  git cat-file -e "$PREV_HEAD^{commit}" 2>/dev/null || { echo "error: previous head $PREV_HEAD is not a commit here" >&2; exit 1; }
fi

{
  echo "---"
  echo "type: Task Review"
  echo "title: Review package — $TID · $NAME"
  echo "description: The diff produced for $TID, with its Verify and check output, for the task reviewer."
  echo "resource: /$OUT"
  echo "status: draft"
  echo "tags: [sdd, review, \"change:$NAME\"]"
  echo "sources:"
  [[ -f "$TASKFILE" ]] && echo "  - resource: /$TASKFILE"
  echo "  - resource: /.sdd/briefs/$NAME/$TID.md"
  echo "  - resource: git:${BASE}..${HEAD_SHA}"
  [[ -n "$PREV" ]] && echo "  - resource: /$PREV"
  echo "generated:"
  echo "  by: process:review-package.sh"
  echo "  at: $NOW"
  echo "sdd_id: $NAME"
  echo "---"
  echo
  echo "# Review package — $TID · $NAME"
  echo
  echo "base: \`$BASE\` → head: \`$HEAD_SHA\`"
  if $INCREMENTAL; then
    echo
    echo "**Incremental review.** The previous attempt (head \`$PREV_HEAD\`) was"
    echo "reviewed in full; its verdict is below. Re-check each of its findings"
    echo "against the diff since, and review the new diff through every stage."
    echo "The earlier diff is listed by file only: it was already reviewed."
    echo
    echo "## Previous verdict"; echo
    awk '/^## Verdict/ { p = 1; next } p' "$PREV" | sed -e '/^<!-- recorded /d' -e '/^_The task reviewer appends its verdict here._$/d'
  fi
  echo
  echo "## Commands (run by this script)"; echo
  run "Verify" "$VERIFY_CMD"
  run "check" "$CHECK_CMD"
  echo "## Files changed"; echo
  git diff --name-status "$BASE" HEAD | sed 's/^/- /'
  echo
  if $INCREMENTAL; then
    echo "## Diff since the previous attempt (\`$PREV_HEAD\` → head)"; echo
    echo '```diff'
    git diff "$PREV_HEAD" HEAD
    echo '```'
  else
    echo "## Diff"; echo
    echo '```diff'
    git diff "$BASE" HEAD
    echo '```'
  fi
  if ! git diff --quiet; then
    echo
    echo "## Uncommitted changes (implementer did not commit)"; echo
    echo '```diff'
    git diff
    echo '```'
  fi
  echo
  echo "## Verdict"; echo
  echo "_The task reviewer appends its verdict here._"
} > "$OUT"

echo "$OUT"
