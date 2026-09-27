#!/usr/bin/env bash
# Regenerate OKF index.md files from frontmatter. Idempotent. Run after any
# gate; check-specs.sh warns when an index is stale.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

row() { # file relpath
  local f="$1" rel="$2" t ty ph d
  t=$(./scripts/fm.py get "$f" title 2>/dev/null || basename "$f" .md)
  ty=$(./scripts/fm.py get "$f" type 2>/dev/null || echo "")
  ph=$(./scripts/fm.py get "$f" sdd_phase 2>/dev/null || echo "")
  d=$(./scripts/fm.py get "$f" description 2>/dev/null || echo "")
  printf -- '- [%s](%s) — %s%s%s\n' "$t" "$rel" "$ty" "${ph:+ · $ph}" "${d:+ — $d}"
}

gen() { # dir title
  local dir="$1" title="$2" out="$1/index.md" f sub
  {
    echo "# $title"
    echo
    for f in "$dir"/*.md; do
      [[ -e "$f" ]] || continue
      case "$(basename "$f")" in index.md|log.md) continue ;; esac
      row "$f" "$(basename "$f")"
    done
    for sub in "$dir"/*/; do
      [[ -d "$sub" && -f "${sub}index.md" ]] || continue
      printf -- '- [%s/](%s/index.md)\n' "$(basename "$sub")" "$(basename "$sub")"
    done
  } > "$out"
  echo "wrote $out"
}

# living specs: one index per context, one for specs/
for c in specs/*/; do
  [[ -d "$c" ]] && gen "${c%/}" "Capabilities: $(basename "$c")"
done
gen specs "Current specifications, by bounded context"
# changes: one index per change, one for archive, one for changes/
for ch in changes/[0-9][0-9][0-9]-*/ changes/archive/[0-9][0-9][0-9]-*/; do
  [[ -d "$ch" ]] && gen "${ch%/}" "Change $(basename "$ch")"
done
[[ -d changes/archive ]] && gen changes/archive "Shipped changes"
[[ -d changes ]] && gen changes "Changes in flight"
[[ -d docs/adr ]] && gen docs/adr "Architecture Decision Records"
[[ -d docs/interviews ]] && gen docs/interviews "Interview records"
for rec in changes/[0-9][0-9][0-9]-*/record changes/archive/[0-9][0-9][0-9]-*/record; do
  [[ -d "$rec" ]] || continue
  id=$(basename "$(dirname "$rec")")
  [[ -d "$rec/tasks" ]] && gen "$rec/tasks" "Task attempts: $id"
  gen "$rec" "Record: $id"
done
gen docs "Project documents"
