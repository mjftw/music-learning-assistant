#!/usr/bin/env bash
# Design hygiene. Two jobs:
#
#   ./scripts/check-design.sh                        # standing: docs/design.md state,
#                                                    #   hard-coded values outside the tokens file
#   ./scripts/check-design.sh --change changes/NNN   # plus: the change's Interface table —
#                                                    #   every row's design file and state exist,
#                                                    #   every cited requirement is in the target
#                                                    #   state, every wireframe is referenced, and
#                                                    #   after the loop has exited every row has a
#                                                    #   reference screenshot.
#
# Exit 1 only on a ❌. Warnings do not fail; they are for the gate report.
# Tune STYLE_GLOB / TOKENS_FILE to the stack at the first plan (like
# check-contexts.sh); until docs/design.md is approved the token check is
# skipped.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
FAIL=0
warn() { echo "  ⚠️  $1"; }
bad()  { echo "  ❌ $1"; FAIL=1; }
ok()   { echo "  ✅ $1"; }

STYLE_GLOB="${SDD_STYLE_GLOB:-src/**/*.css}"
TOKENS_FILE="${SDD_TOKENS_FILE:-src/tokens.css}"

echo "Design"
if [[ ! -f docs/design.md ]]; then
  warn "docs/design.md missing — /sdd-init writes it (or the first change that adds a screen)"
  exit $FAIL
fi
IFACE=$(./scripts/fm.py get docs/design.md sdd_interface 2>/dev/null || echo "unknown")
PHASE=$(./scripts/fm.py get docs/design.md sdd_phase 2>/dev/null || echo "draft")
case "$IFACE" in
  no)  ok "no interface (docs/design.md) — design checks skipped"; exit 0 ;;
  yes) echo "  interface: yes · design.md $PHASE v$(./scripts/fm.py get docs/design.md sdd_version 2>/dev/null)" ;;
  *)   warn "docs/design.md has not said whether there is an interface (sdd_interface: $IFACE)" ;;
esac

# --- standing: hard-coded values outside the tokens file -------------------
if [[ "$PHASE" == "approved" ]]; then
  shopt -s globstar nullglob
  files=( $STYLE_GLOB )
  shopt -u globstar nullglob
  if [[ ${#files[@]} -gt 0 ]]; then
    n=0
    for f in "${files[@]}"; do
      [[ "$f" == "$TOKENS_FILE" ]] && continue
      c=$(grep -cE '(#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|font-family:|[0-9]+px)' "$f" 2>/dev/null || true)
      [[ "$c" -gt 0 ]] && { n=$((n+c)); echo "  · $f: $c hard-coded colour/size/font value(s)"; }
    done
    [[ $n -eq 0 ]] && ok "styles use tokens only ($TOKENS_FILE)" || warn "$n hard-coded value(s) outside $TOKENS_FILE — promote to tokens or justify in notes.md"
  fi
fi

[[ "${1:-}" == "--change" ]] || exit $FAIL
CH="${2%/}"; [[ -d "$CH" ]] || { bad "$CH is not a directory"; exit 1; }
ID=$(basename "$CH")
echo
echo "Interface — $ID"

P="$CH/proposal.md"
[[ -f "$P" ]] || { bad "no proposal.md"; exit 1; }
PSTATUS=$(./scripts/fm.py get "$P" sdd_phase 2>/dev/null || echo draft)
SECTION=$(awk '/^## Interface/{p=1;next} /^## /{p=0} p' "$P")
if printf '%s\n' "$SECTION" | grep -qiE '^\s*`?none`?\s*$'; then
  ok "proposal says this change touches no screen"; exit $FAIL
fi
mapfile -t ROWS < <(printf '%s\n' "$SECTION" | grep -E '^\| *`' | grep -v '^| Screen')
if [[ ${#ROWS[@]} -eq 0 ]]; then
  [[ "$PSTATUS" == "draft" ]] && echo "  · Interface table not filled yet (proposal in draft)" || bad "Interface table is empty and does not say 'none'"
  exit $FAIL
fi
if printf '%s\n' "${ROWS[@]}" | grep -q '<screen>'; then
  [[ "$PSTATUS" == "draft" ]] && echo "  · Interface table still the template (proposal in draft)" || bad "Interface table still contains the template row"
  exit $FAIL
fi

# target state for requirement citations
HAVE_TARGET=false
if compgen -G "$CH/delta/*/*.md" >/dev/null; then
  ./scripts/merge_delta.py preview "$CH" >/dev/null 2>&1 && HAVE_TARGET=true
fi
EXITED=false
[[ -f "$CH/design/rounds.md" && "$(./scripts/fm.py get "$CH/design/rounds.md" sdd_phase 2>/dev/null)" == "exited" ]] && EXITED=true

declare -A USED=()
for row in "${ROWS[@]}"; do
  IFS='|' read -r _ screen state route design reqs _ <<<"$row"
  strip() { printf '%s' "$1" | sed -e 's/^ *//' -e 's/ *$//' -e 's/^`//' -e 's/`$//'; }
  screen=$(strip "$screen"); state=$(strip "$state"); design=$(strip "$design"); reqs=$(strip "$reqs")
  label="$screen · $state"
  # design file
  file="${design%%\?*}"; qs="${design#*\?}"; [[ "$qs" == "$design" ]] && qs=""
  if [[ -z "$file" ]]; then
    warn "$label: no design file (imported references go in design/ too)"
  elif [[ ! -f "$CH/$file" ]]; then
    bad "$label: $file not found under $CH/"
  else
    USED["$CH/$file"]=1
    if [[ "$file" == *.html ]]; then
      st="${qs#state=}"; st="${st%%&*}"
      [[ -n "$st" ]] && ! grep -q "data-state=\"$st\"" "$CH/$file" && bad "$label: $file has no data-state=\"$st\""
    fi
  fi
  # requirements
  for q in $(printf '%s' "$reqs" | grep -oE '[a-z0-9-]+\.[a-z0-9-]+/REQ-[0-9]+' | sort -u); do
    if $HAVE_TARGET; then
      cc="${q%%/*}"; r="${q##*/}"; tf=".sdd/target/$ID/${cc%%.*}/${cc##*.}.md"
      [[ -f "$tf" ]] && grep -qE "^### $r:" "$tf" || bad "$label: cites $q which is not in the target state"
    fi
  done
  [[ -z "$reqs" ]] && warn "$label: no requirement is seen on this screen state — is it needed?"
  # reference after exit
  if $EXITED; then
    ref="$CH/design/reference/${screen}--${state}.png"
    [[ -f "$ref" ]] && USED["$ref"]=1 || bad "$label: loop exited but no $ref"
  fi
done
$HAVE_TARGET || echo "  · no delta yet; requirement citations not checked"

# every wireframe referenced
for h in "$CH"/design/*.html; do
  [[ -f "$h" ]] || continue
  [[ -n "${USED[$h]:-}" ]] || warn "$(basename "$h") is in design/ but no Interface row uses it"
done
[[ -f "$CH/design/rounds.md" ]] || warn "no design/rounds.md — new-change.sh seeds one; sdd-design fills Origin"

[[ $FAIL -eq 0 ]] && echo "✅ design checks clean" || echo "❌ design problems"
exit $FAIL
