#!/usr/bin/env bash
# Allocate the next change number, create changes/NNN-slug/, seed it from
# templates/, and optionally create a git branch. Numbers are never reused:
# archived changes count.
#
#   ./scripts/new-change.sh validate-on-entry
#   ./scripts/new-change.sh validate-on-entry --branch
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

SLUG="${1:-}"; MAKE_BRANCH=false; DESIGN=false
for a in "${@:2}"; do
  case "$a" in
    --branch) MAKE_BRANCH=true ;;
    --design) DESIGN=true ;;
    *) echo "error: unknown flag $a" >&2; exit 1 ;;
  esac
done
if [[ -z "$SLUG" ]]; then
  echo "usage: $0 <kebab-case-slug> [--branch] [--design]" >&2
  echo "  slug describes the change, not the mechanism: validate-on-entry, not add-validator-class" >&2
  echo "  --design: shipped screens that feel wrong; intent + refinement loop only, no plan or tasks" >&2
  exit 1
fi
[[ "$SLUG" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || { echo "error: slug must be kebab-case: got '$SLUG'" >&2; exit 1; }

NEXT=1
HIGHEST=$( { ls -d changes/[0-9][0-9][0-9]-* changes/archive/[0-9][0-9][0-9]-* 2>/dev/null || true; } \
           | xargs -rn1 basename | sed 's/-.*//' | sort -n | tail -1)
[[ -n "${HIGHEST:-}" ]] && NEXT=$((10#$HIGHEST + 1))
NNN=$(printf "%03d" "$NEXT"); ID="${NNN}-${SLUG}"; DIR="changes/${ID}"
[[ -d "$DIR" ]] && { echo "error: $DIR already exists" >&2; exit 1; }

mkdir -p "$DIR/delta" "$DIR/design" "$DIR/record"
TODAY=$(date +%Y-%m-%d); NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
CONST_VER=$(./scripts/fm.py get memory/constitution.md sdd_version 2>/dev/null || echo "0.0.0")

SEED="intent proposal plan tasks"; $DESIGN && SEED="intent proposal"
for t in $SEED; do
  sed -e "s|NNN-slug|${ID}|g" \
      -e "s|conversation:YYYY-MM-DD|conversation:${TODAY}|" \
      -e "s|at: YYYY-MM-DDTHH:MM:SSZ|at: ${NOW}|" \
      -e "s|^sdd_constitution: .*|sdd_constitution: ${CONST_VER}|" \
      "templates/${t}-template.md" > "${DIR}/${t}.md"
done

sed -e "s|NNN-slug|${ID}|g" -e "s|at: YYYY-MM-DDTHH:MM:SSZ|at: ${NOW}|" \
    templates/rounds-template.md > "${DIR}/design/rounds.md"
$DESIGN && ./scripts/fm.py set "${DIR}/proposal.md" sdd_kind design >/dev/null

cat > "${DIR}/notes.md" <<NOTES
---
type: Implementation Notes
title: ${ID} — notes
description: Decisions taken during implementation that the plan did not cover.
resource: /changes/${ID}/notes.md
status: draft
tags: [sdd, notes, "change:${ID}"]
sdd_id: ${ID}
---

# Notes — ${ID}

Decisions taken during implementation that the plan did not cover, and why.
One line each, newest last.

NOTES

./scripts/index.sh >/dev/null
echo "created $DIR"; ls -1 "$DIR" | sed 's/^/  /'
if $MAKE_BRANCH && git rev-parse --git-dir >/dev/null 2>&1; then git checkout -b "$ID"; echo "on branch $ID"; fi
echo; echo "next: ${DIR}/intent.md  (the user's words — grill writes it)"
if $DESIGN; then echo "      then the refinement loop on the live app (sdd-design D); a delta only if behaviour changes"
else echo "      then sdd-design decides whether this change has screens, before the proposal"; fi
