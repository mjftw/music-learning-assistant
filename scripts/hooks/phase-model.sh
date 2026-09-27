#!/usr/bin/env bash
# UserPromptSubmit hook. If a top-of-ladder phase is open (.sdd/phase), tell
# the agent to invoke the `sdd-continue` skill before anything else this turn.
# That skill carries `model: fable` in its frontmatter, and a skill's model
# applies for the rest of the turn in which it is invoked, so every turn of an
# interview runs on the strong model while the session default stays cheap.
#
# Stdout from a UserPromptSubmit hook that exits 0 is added to the turn's
# context. Nothing is printed outside a phase, so ordinary turns cost nothing.
set -uo pipefail
cat >/dev/null   # the prompt JSON; not needed
cd "$(dirname "${BASH_SOURCE[0]}")/../.." || exit 0

PHASE=$(./scripts/phase.sh show 2>/dev/null || true)
[[ -z "$PHASE" ]] && exit 0

cat <<EOF
[sdd] The top-of-ladder phase \`$PHASE\` is open. Before you reply to this
message, invoke the \`sdd-continue\` skill (it switches this turn to the
strong model), then carry on with \`$PHASE\` exactly where it left off. Do not
restart the phase or re-ask anything already answered. If the user has moved
on to something outside this phase, run \`./scripts/phase.sh leave\` instead.
EOF
exit 0
