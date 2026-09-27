#!/usr/bin/env bash
# Self-test for the model ladder's enforcement: the write guard, the model
# reader and the phase marker. Builds throwaway transcripts in the real
# Claude Code format and feeds the guard the same JSON a PreToolUse hook gets.
# Touches nothing outside a temp dir and .sdd/ (restored afterwards).
#
#   ./scripts/selftest-models.sh          # all cases; exit 1 on any mismatch
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
FAIL=0; N=0
SAVED_PHASE=""; [[ -f .sdd/phase ]] && SAVED_PHASE=$(cat .sdd/phase)
for u in unlock-model unlock-constitution; do [[ -f .sdd/$u ]] && { echo "refusing to run: .sdd/$u exists"; exit 1; }; done
export SDD_STRONG_MODELS="claude-fable-*"   # the shipped default, whatever the env says

mk() { # file model tool_use_id [later-model]
  python3 - "$@" <<'EOF'
import json, sys
f, model, tid = sys.argv[1:4]
L = [{"type": "user", "message": {"role": "user", "content": "hi"}},
     {"type": "assistant", "message": {"model": "claude-sonnet-5", "content": [{"type": "text", "text": "earlier"}]}},
     {"type": "assistant", "message": {"model": model, "content": [{"type": "tool_use", "id": tid, "name": "Write", "input": {}}]}}]
if len(sys.argv) > 4:
    L.append({"type": "assistant", "message": {"model": sys.argv[4], "content": [{"type": "text", "text": "x"}]}})
open(f, "w").write("\n".join(json.dumps(x) for x in L) + "\n")
EOF
}
guard() { # path transcript tool_use_id -> exit code
  printf '{"tool_name":"Write","tool_input":{"file_path":"%s"},"transcript_path":"%s","tool_use_id":"%s"}' \
    "$PWD/$1" "$2" "$3" | ./scripts/hooks/guard-paths.sh >/dev/null 2>&1; echo $?
}
expect() { # description expected actual
  N=$((N+1))
  if [[ "$2" == "$3" ]]; then echo "  ✅ $1"; else echo "  ❌ $1 (expected $2, got $3)"; FAIL=1; fi
}

mk "$T/fable" claude-fable-5-1 tA
mk "$T/sonnet" claude-sonnet-5 tB
mk "$T/haiku" claude-haiku-4-5-20251001 tC
mk "$T/synth" claude-fable-5-1 tD '<synthetic>'
mk "$T/later" claude-sonnet-5 tE claude-fable-5-1
mk "$T/opus" claude-opus-5 tO
: > "$T/empty"

echo "Write guard"
expect "intent.md on Fable is allowed"                     0 "$(guard changes/001-x/intent.md "$T/fable" tA)"
expect "intent.md on Sonnet is refused"                    2 "$(guard changes/001-x/intent.md "$T/sonnet" tB)"
expect "proposal.md on Haiku is refused"                   2 "$(guard changes/001-x/proposal.md "$T/haiku" tC)"
expect "a delta on Sonnet is refused"                      2 "$(guard changes/001-x/delta/a/b.md "$T/sonnet" tB)"
expect "plan.md on Fable is allowed"                       0 "$(guard changes/001-x/plan.md "$T/fable" tA)"
expect "a wireframe on Sonnet is refused"                  2 "$(guard changes/001-x/design/circle.html "$T/sonnet" tB)"
expect "tasks.md on Sonnet is allowed (not top)"           0 "$(guard changes/001-x/tasks.md "$T/sonnet" tB)"
expect "source code on Haiku is allowed"                   0 "$(guard src/a/b.py "$T/haiku" tC)"
expect "docs/product.md on Sonnet is refused"              2 "$(guard docs/product.md "$T/sonnet" tB)"
expect "an interview record on Sonnet is refused"          2 "$(guard docs/interviews/init.md "$T/sonnet" tB)"
expect "docs/product.md on Opus is refused (Fable only)"   2 "$(guard docs/product.md "$T/opus" tO)"
expect "a <synthetic> entry is skipped"                    0 "$(guard docs/domain.md "$T/synth" tD)"
expect "the calling message wins over a later one"         2 "$(guard docs/roadmap.md "$T/later" tE)"
expect "an unknown call id falls back to the latest"       0 "$(guard docs/roadmap.md "$T/later" tZ)"
expect "an empty transcript fails open"                    0 "$(guard docs/glossary.md "$T/empty" tX)"
expect "a missing transcript fails open"                   0 "$(guard docs/glossary.md /nonexistent tX)"
expect "constitution without its unlock is refused"        2 "$(guard memory/constitution.md "$T/fable" tA)"
mkdir -p .sdd
touch .sdd/unlock-constitution
expect "constitution unlocked but on Sonnet is refused"    2 "$(guard memory/constitution.md "$T/sonnet" tB)"
expect "constitution unlocked on Fable is allowed"         0 "$(guard memory/constitution.md "$T/fable" tA)"
rm -f .sdd/unlock-constitution
touch .sdd/unlock-model
expect "user consent (.sdd/unlock-model) allows Sonnet"    0 "$(guard changes/001-x/intent.md "$T/sonnet" tB)"
rm -f .sdd/unlock-model
TRAP="claude-fable-selftest-$$"; touch "$TRAP"   # a file the model glob would match if globbing were on
expect "model globs are not file globs (Fable still allowed)" 0 "$(guard changes/001-x/intent.md "$T/fable" tA)"
rm -f "$TRAP"
expect "a widened allowlist admits Opus"                   0 "$(SDD_STRONG_MODELS='claude-fable-* claude-opus-*' guard docs/product.md "$T/opus" tO)"
expect "secrets stay blocked on any model"                 2 "$(guard .env "$T/fable" tA)"

echo "Phase marker"
./scripts/phase.sh leave >/dev/null
expect "no phase: the hook prints nothing"                 "" "$(echo '{}' | ./scripts/hooks/phase-model.sh)"
expect "a lower phase cannot be entered"                   1 "$(./scripts/phase.sh enter sdd-tasks >/dev/null 2>&1; echo $?)"
./scripts/phase.sh enter grill >/dev/null
expect "open phase: the hook names sdd-continue"           1 "$(echo '{}' | ./scripts/hooks/phase-model.sh | grep -c 'invoke the `sdd-continue` skill')"
touch -d '13 hours ago' .sdd/phase 2>/dev/null || touch -t "$(date -v-13H +%Y%m%d%H%M 2>/dev/null)" .sdd/phase
expect "a phase idle past the TTL is dropped"              "" "$(./scripts/phase.sh show)"
./scripts/phase.sh leave >/dev/null
[[ -n "$SAVED_PHASE" ]] && ./scripts/phase.sh enter "$SAVED_PHASE" >/dev/null

echo "Configuration"
expect "session default is not the strong model"           1 "$(python3 -c "import json;m=json.load(open('.claude/settings.json')).get('model','');print(int(bool(m) and 'fable' not in m))")"
for s in sdd-init grill sdd-specify sdd-plan sdd-design sdd-constitution sdd-engineering sdd-continue; do
  expect "$s carries model: fable"                         fable "$(./scripts/fm.py get .claude/skills/$s/SKILL.md model 2>/dev/null)"
done
expect "reviewer is pinned to Opus"                        opus "$(./scripts/fm.py get .claude/agents/reviewer.md model 2>/dev/null)"

echo
[[ $FAIL -eq 0 ]] && echo "✅ $N checks passed" || echo "❌ model ladder self-test failed"
exit $FAIL
