#!/usr/bin/env bash
# One-time instantiation of a repository created from sdd-starter.
#   ./scripts/init.sh "Project Name" "One-line description"
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

NAME="${1:?usage: init.sh \"Project Name\" \"One-line description\"}"
DESC="${2:?usage: init.sh \"Project Name\" \"One-line description\"}"
TODAY=$(date +%Y-%m-%d)
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

if ! grep -q '<!-- sdd-starter-template -->' README.md; then
  echo "already initialised (README.md is no longer the template's README)" >&2
  exit 1
fi

# This repo's README becomes the project's README; the template's own goes.
cp templates/README-project.md README.md

# Seed the project-level docs from templates.
for t in product domain roadmap glossary design; do
  sed -e "s|conversation:YYYY-MM-DD|conversation:${TODAY}|" \
      -e "s|at: YYYY-MM-DDTHH:MM:SSZ|at: ${NOW}|" \
      "templates/${t}-template.md" > "docs/${t}.md"
done

# Engineering preferences: copy the master if one exists. If not, the first
# /sdd-plan interviews for them. Nothing before that needs them.
MASTER="${SDD_ENGINEERING:-$HOME/.config/sdd/engineering.md}"
if [[ -f "$MASTER" ]]; then
  cp "$MASTER" docs/engineering.md
  echo "engineering preferences: copied from $MASTER"
else
  echo "engineering preferences: none yet; the first plan will ask"
fi

# Design taste: cross-project, like engineering preferences but only the
# taste section; everything else in docs/design.md is this product's.
TASTE="${SDD_DESIGN_TASTE:-$HOME/.config/sdd/design-taste.md}"
if [[ -f "$TASTE" ]]; then
  python3 - "$TASTE" <<'PY'
import sys, pathlib
t = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8").strip()
d = pathlib.Path("docs/design.md"); d.write_text(d.read_text(encoding="utf-8").replace("<taste>", t), encoding="utf-8")
PY
  echo "design taste: copied from $TASTE"
fi

# Fill the name and description where they appear.
mkdir -p .sdd && touch .sdd/unlock-index
for f in README.md docs/product.md index.md; do
  [[ -f "$f" ]] || continue
  sed -i -e "s|<PROJECT NAME>|${NAME}|g" -e "s|<ONE LINE>|${DESC}|g" "$f"
done
rm -f .sdd/unlock-index

# Remove the template's own upgrade plans if still present.
rm -f docs/upgrade-plan*.md docs/upgrade-plan*.patch

./scripts/index.sh >/dev/null

# Git.
if [[ ! -d .git ]]; then git init -q -b main; fi
git add -A
git commit -q -m "chore: initialise ${NAME} from sdd-starter" || true

echo "initialised: ${NAME}"
echo "next: open your agent here and run /sdd-init"
