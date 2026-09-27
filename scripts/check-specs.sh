#!/usr/bin/env bash
# Static hygiene check over the artefact tree. Not a substitute for
# /sdd-converge, which reads the code; this only lints the artefacts.
#
#   ./scripts/check-specs.sh
#
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

FAIL=0
warn() { echo "  ⚠️  $1"; }
bad()  { echo "  ❌ $1"; FAIL=1; }

artefacts() {
  find docs specs memory -name '*.md' \
    ! -name index.md ! -name log.md 2>/dev/null | sort
}

echo "Constitution"
if grep -q "PLACEHOLDER" memory/constitution.md 2>/dev/null; then
  bad "memory/constitution.md still has PLACEHOLDER articles — run /sdd-constitution"
elif [[ "$(./scripts/fm.py get memory/constitution.md sdd_phase 2>/dev/null)" != "ratified" ]]; then
  warn "constitution is not ratified"
else
  echo "  ✅ ratified v$(./scripts/fm.py get memory/constitution.md sdd_version)"
fi

echo
echo "Engineering preferences"
if [[ ! -f docs/engineering.md ]]; then
  warn "docs/engineering.md missing — run /sdd-engineering before any plan"
elif [[ "$(./scripts/fm.py get docs/engineering.md sdd_phase 2>/dev/null)" != "approved" ]]; then
  warn "docs/engineering.md is not approved"
else
  echo "  ✅ approved v$(./scripts/fm.py get docs/engineering.md sdd_version 2>/dev/null)"
fi

echo
echo "Domain map"
if [[ ! -f docs/domain.md ]]; then
  warn "docs/domain.md missing — /sdd-init step 4"
elif [[ "$(./scripts/fm.py get docs/domain.md sdd_phase 2>/dev/null)" != "approved" ]]; then
  warn "docs/domain.md is not approved"
else
  nctx=$(awk -F'|' '/^## Contexts/{p=1;next} p&&/^## /{exit} p&&NF>6&&$2!~/Context|---/{n++} END{print n+0}' docs/domain.md)
  echo "  ✅ approved ($nctx contexts)"
fi

echo
./scripts/check-design.sh | sed -n '1,20p'

echo
echo "Model ladder"
echo "  session default: $(python3 -c "import json;print(json.load(open('.claude/settings.json')).get('model','(unset)'))" 2>/dev/null) · strong: ${SDD_STRONG_MODELS:-$(python3 -c "import json;print(json.load(open('.claude/settings.json')).get('env',{}).get('SDD_STRONG_MODELS','claude-fable-*'))" 2>/dev/null)}"
PH=$(./scripts/phase.sh show 2>/dev/null || true)
[[ -n "$PH" ]] && echo "  phase open: $PH (every turn moves to the strong model until ./scripts/phase.sh leave)" || echo "  no phase open"
[[ -f .sdd/unlock-model ]] && warn ".sdd/unlock-model exists: top-of-ladder artefacts can be written on any model. Remove it when done."

echo
echo "AGENTS.md"
if grep -q "FILL THIS IN" AGENTS.md 2>/dev/null; then
  warn "AGENTS.md Commands/Conventions/Architecture still unfilled"
else
  echo "  ✅ commands and conventions recorded"
fi

echo
echo "OKF conformance"
FAILS=0
for f in $(artefacts); do
  ./scripts/fm.py check "$f" >/dev/null 2>&1 || { bad "$f: no frontmatter or no type"; FAILS=$((FAILS+1)); }
done
[[ "$FAILS" -eq 0 ]] && echo "  ✅ every artefact has a type"
for f in $(artefacts); do
  st=$(./scripts/fm.py get "$f" status 2>/dev/null || echo "")
  ph=$(./scripts/fm.py get "$f" sdd_phase 2>/dev/null || echo "")
  case "$ph" in
    approved|ratified|resolved|implemented|complete|accepted)
      [[ "$st" == "stable" ]] || warn "$f: sdd_phase=$ph but status=$st — use scripts/approve.sh"
      grep -q 'by: human:' "$f" || warn "$f: $ph but no human verified entry" ;;
  esac
done
./scripts/index.sh >/dev/null 2>&1 || warn "index.sh failed"

echo
echo "Living specs (specs/<context>/<capability>.md)"
NLIVE=0
for f in $(find specs -mindepth 2 -name '*.md' ! -name index.md 2>/dev/null | sort); do
  NLIVE=$((NLIVE+1))
  ctx=$(./scripts/fm.py get "$f" sdd_context 2>/dev/null || echo ""); cap=$(./scripts/fm.py get "$f" sdd_capability 2>/dev/null || echo "")
  ty=$(./scripts/fm.py get "$f" type 2>/dev/null || echo "")
  [[ "$ty" == "Capability Spec" ]] || bad "$f: type is '$ty', expected Capability Spec"
  [[ "$f" == "specs/$ctx/$cap.md" ]] || bad "$f: frontmatter says $ctx/$cap but path disagrees"
  if [[ -f docs/domain.md ]] && ! grep -qE "^\| *\`?$ctx\`? *\|" docs/domain.md; then
    bad "$f: context '$ctx' is not in docs/domain.md"
  fi
  for r in $(grep -oE '^### REQ-[0-9]+' "$f" | sed 's/### //'); do
    grep -qE "$r/S[0-9]+" "$f" || warn "$f: $r has no scenario"
  done
  if grep -niE '\b(postgres|mysql|sqlite|redis|kafka|react|vue|svelte|django|flask|fastapi|express|docker|kubernetes|graphql|grpc)\b' "$f" | grep -qv '^\s*[0-9]*:\s*>'; then
    warn "$f names a technology — that belongs in a plan"
  fi
  n=$(grep -cE '^### REQ-[0-9]+' "$f" || true); x=$(grep -cE '^### ~~REQ-[0-9]+' "$f" || true)
  echo "  $ctx.$cap  v$(./scripts/fm.py get "$f" sdd_version 2>/dev/null)  $n live, $x removed"
done
[[ $NLIVE -eq 0 ]] && echo "  (none yet — the first change creates them at sdd-finish)"

echo
if ! compgen -G "changes/[0-9][0-9][0-9]-*" > /dev/null; then
  echo "No changes in flight. ./scripts/new-change.sh <slug>"
  exit $FAIL
fi

echo "Changes in flight (changes/NNN-slug/)"
for d in changes/[0-9][0-9][0-9]-*/; do
  d="${d%/}"; id=$(basename "$d")
  echo "$id"

  [[ -f "$d/proposal.md" ]] || { bad "no proposal.md"; continue; }
  status=$(./scripts/fm.py get "$d/proposal.md" sdd_phase 2>/dev/null || echo "unset")
  echo "  proposal phase: $status"

  CUR_CONST=$(./scripts/fm.py get memory/constitution.md sdd_version 2>/dev/null || echo "")
  SPEC_CONST=$(./scripts/fm.py get "$d/proposal.md" sdd_constitution 2>/dev/null || echo "")
  if [[ -n "$CUR_CONST" && -n "$SPEC_CONST" && "$CUR_CONST" != "$SPEC_CONST" ]]; then
    warn "proposal written against constitution $SPEC_CONST; current is $CUR_CONST — re-check compliance"
  fi

  if [[ "$status" != "draft" && "$status" != "unset" ]]; then
    if [[ ! -f "$d/intent.md" ]]; then bad "no intent.md — the user's words were never recorded"
    elif [[ "$(./scripts/fm.py get "$d/intent.md" sdd_phase 2>/dev/null)" != "resolved" ]]; then warn "intent.md is not resolved but proposal is $status"; fi
  fi

  if [[ -f docs/roadmap.md ]] && ! grep -q "$id" docs/roadmap.md; then warn "$id is not listed in docs/roadmap.md"; fi

  ctx=$(./scripts/fm.py get "$d/proposal.md" sdd_context 2>/dev/null || echo "")
  if [[ -z "$ctx" || "$ctx" == "<context>" ]]; then
    [[ "$status" == "draft" ]] || warn "proposal has no sdd_context"
  elif [[ -f docs/domain.md ]] && ! grep -qE "^\| *\`?$ctx\`? *\|" docs/domain.md; then
    bad "sdd_context '$ctx' is not a context in docs/domain.md"
  fi

  # deltas
  ndelta=$(find "$d/delta" -name '*.md' 2>/dev/null | wc -l)
  if [[ "$ndelta" -eq 0 ]]; then
    [[ "$status" == "draft" ]] && echo "  · no delta yet (proposal in draft)" || bad "no delta files under $d/delta/"
  else
    echo "  ✅ $ndelta delta file(s)"
    for df in $(find "$d/delta" -name '*.md' | sort); do
      [[ "$(./scripts/fm.py get "$df" type 2>/dev/null)" == "Spec Delta" ]] || bad "$df: type must be Spec Delta"
      grep -qE '^## (ADDED|MODIFIED|REMOVED)' "$df" || bad "$df: no ADDED/MODIFIED/REMOVED section"
      for r in $(awk '/^## ADDED|^## MODIFIED/{p=1;next} /^## /{p=0} p' "$df" | grep -oE '^### REQ-[0-9]+' | sed 's/### //'); do
        grep -qE "$r/S[0-9]+" "$df" || warn "$df: $r has no scenario"
      done
      if grep -niE '\b(postgres|mysql|sqlite|redis|kafka|react|vue|svelte|django|flask|fastapi|express|docker|kubernetes|graphql|grpc)\b' "$df" | grep -qv '^\s*[0-9]*:\s*>'; then
        warn "$df names a technology — that belongs in plan.md"
      fi
    done
    # does it merge cleanly?
    if [[ "$status" != "draft" ]]; then
      ./scripts/merge_delta.py preview "$d" >/dev/null 2>/tmp/md.err || bad "delta does not merge: $(tail -1 /tmp/md.err)"
    fi
  fi

  if [[ -f docs/design.md && "$(./scripts/fm.py get docs/design.md sdd_interface 2>/dev/null)" == "yes" ]]; then
    ./scripts/check-design.sh --change "$d" | sed -n '/^Interface/,$p' | grep -vE '^(✅|❌) design' | sed 's/^/  /'
    ./scripts/check-design.sh --change "$d" >/dev/null 2>&1 || FAIL=1
  fi

  UNTOUCHED=false
  grep -qE '<[A-Za-z][^>]*>' "$d/proposal.md" && { warn "proposal.md still contains template placeholders"; UNTOUCHED=true; }
  if $UNTOUCHED; then echo; continue; fi

  if [[ "$status" == "approved" ]] && awk '/^## Open questions/,/^## /' "$d/proposal.md" | grep -qE '^\| [0-9]+ \|[^|]*[A-Za-z]'; then
    warn "approved proposal still lists open questions"
  fi

  if [[ -f "$d/tasks.md" ]]; then
    for t in $(awk '/^### T[0-9]+/{t=$2} /\*\*Status:\*\* *done/{if(t)print t; t=""}' "$d/tasks.md" | sort -u); do
      compgen -G "$d/record/tasks/$t-review-*.md" >/dev/null || warn "$t is done but has no review in $d/record/tasks/ — run ./scripts/record.sh $d task $t"
    done
    dupes=$(grep -oE '^### T[0-9]+' "$d/tasks.md" | sed 's/### //' | sort | uniq -d)
    [[ -n "$dupes" ]] && bad "tasks.md has duplicate task IDs: $(echo $dupes | tr '\n' ' ') — the brief would pick the first"
    for t in $(grep -oE '^### T[0-9]+' "$d/tasks.md" | sed 's/### //' | sort -u); do
      blk=$(awk -v t="### $t " 'index($0,t)==1{p=1;print;next} p&&(/^### /||/^## /){exit} p{print}' "$d/tasks.md")
      for need in '\*\*Status:\*\*' '\*\*Files\*\*' '\*\*Steps\*\*' '\*\*Verify\*\*'; do
        printf '%s' "$blk" | grep -qE "$need" || warn "$t is missing $need"
      done
      printf '%s' "$blk" | grep -qE 'TBD|TODO|handle (edge|error) |error handling|similar to T|like T[0-9]' && warn "$t contains a placeholder phrase"
    done
  fi
  echo
done

if [[ $FAIL -eq 0 ]]; then
  echo "✅ artefact tree clean"
else
  echo "❌ problems found"
fi
exit $FAIL
