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
    if [[ -f .sdd/unlock-constitution ]]; then :; else
    echo "blocked: memory/constitution.md is edited only by /sdd-constitution after the user approves the amendment." >&2
    exit 2; fi ;;
  docs/engineering.md)
    if [[ -f .sdd/unlock-engineering ]]; then :; else
    echo "blocked: docs/engineering.md is edited only by /sdd-engineering after the user approves." >&2
    exit 2; fi ;;
  docs/design.md)
    if [[ -f .sdd/unlock-design ]]; then :; else
    echo "blocked: docs/design.md is edited only by /sdd-design (init principles, plan system, loop exit) after the user approves." >&2
    exit 2; fi ;;
  REVIEW.md)
    echo "blocked: REVIEW.md is the user's review policy. Propose the change; do not make it." >&2
    exit 2 ;;
esac

# Top-of-ladder artefacts: written only by the strong model.
# These carry the user's requirements and the judgement everything below them
# trusts. The model is read from the transcript (the assistant message that
# issued this tool call). SDD_STRONG_MODELS is a space-separated list of globs,
# set in .claude/settings.json › env. If the model cannot be determined the
# write is allowed with a warning: never wedge a session on a parsing problem.
# .sdd/unlock-model is the user's explicit consent to write these on another
# model (e.g. the strong one is unavailable); agents never create it.
OWNER=""
case "$REL" in
  changes/*/intent.md)                      OWNER=grill ;;
  changes/*/proposal.md|changes/*/delta/*)  OWNER=sdd-specify ;;
  changes/*/plan.md)                        OWNER=sdd-plan ;;
  changes/*/design/*.html|changes/*/design/rounds.md) OWNER=sdd-design ;;
  docs/intent-product.md|docs/product.md|docs/domain.md|docs/roadmap.md|docs/glossary.md) OWNER=sdd-init ;;
  docs/interviews/*.md)                     OWNER=sdd-continue ;;
  docs/design.md)                           OWNER=sdd-design ;;
  docs/engineering.md)                      OWNER=sdd-engineering ;;
  memory/constitution.md)                   OWNER=sdd-constitution ;;
esac
if [[ -n "$OWNER" && ! -f .sdd/unlock-model ]]; then
  MODEL=$(printf '%s' "$INPUT" | python3 "$(dirname "${BASH_SOURCE[0]}")/../model_of.py" 2>/dev/null || true)
  if [[ -z "$MODEL" ]]; then
    echo "warning: could not tell which model is writing '$REL'; allowed." >&2
    exit 0
  fi
  OK=false
  set -f   # the globs are model patterns, not file names
  for g in ${SDD_STRONG_MODELS:-claude-fable-*}; do
    # shellcheck disable=SC2053
    [[ "$MODEL" == $g ]] && { OK=true; break; }
  done
  set +f
  if ! $OK; then
    cat >&2 <<MSG
blocked: '$REL' is a top-of-ladder artefact (owned by $OWNER) and this turn is running on $MODEL.
Only ${SDD_STRONG_MODELS:-claude-fable-*} may write it (SDD_STRONG_MODELS in .claude/settings.json).
Invoke the \`sdd-continue\` skill (or \`$OWNER\`) to move this turn to the strong model, then retry the same write.
If that does not change the model (the strong model is unavailable to this account), stop and tell the user;
only they may consent to writing it on $MODEL, by creating .sdd/unlock-model.
MSG
    exit 2
  fi
fi

exit 0
