#!/usr/bin/env bash
# Keep the thinking. Copies the ephemeral working files under .sdd/ into the
# change's committed record, so nothing that explains why the code is the way
# it is dies with the session.
#
#   ./scripts/record.sh changes/NNN task T0NN      # implementer report + task review → record/tasks/
#   ./scripts/record.sh changes/NNN converge       # convergence report → record/converge-N.md
#   ./scripts/record.sh changes/NNN design-round N # this round's screenshots → design/rounds/round-N/
#   ./scripts/record.sh changes/NNN list           # what the record holds
#
# Attempts are numbered, never overwritten: a task that went round the fix
# loop twice leaves T011-report-1.md, T011-review-1.md, T011-report-2.md,
# T011-review-2.md. Briefs and the target preview are not recorded: both are
# regenerated from the tasks file and the deltas.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

CH="${1%/}"; [[ -d "$CH" ]] || { echo "error: $CH is not a change directory" >&2; exit 1; }
ID=$(basename "$CH"); WHAT="${2:-list}"
REC="$CH/record"

next() { # dir prefix ext -> next free numbered path
  local n=1
  while [[ -e "$1/$2-$n$3" ]]; do n=$((n+1)); done
  printf '%s/%s-%s%s' "$1" "$2" "$n" "$3"
}
stamp() { # file: append a footer saying when it was recorded, so a reader knows the copy is final
  printf '\n<!-- recorded %s by scripts/record.sh -->\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$1"
}

case "$WHAT" in
  task)
    T="${3:?usage: record.sh <change> task T0NN}"
    mkdir -p "$REC/tasks"
    n=0
    for kind in report review; do
      src=".sdd/${kind}s/$ID/$T.md"
      [[ -f "$src" ]] || { echo "  · no $kind for $T (.sdd/${kind}s/$ID/$T.md)"; continue; }
      dst=$(next "$REC/tasks" "$T-$kind" .md)
      cp "$src" "$dst"; stamp "$dst"; echo "  $dst"; n=$((n+1))
    done
    [[ $n -gt 0 ]] || { echo "error: nothing to record for $T" >&2; exit 1; } ;;
  converge)
    src=".sdd/reports/$ID/converge.md"
    [[ -f "$src" ]] || { echo "error: no convergence report at $src" >&2; exit 1; }
    mkdir -p "$REC"
    dst=$(next "$REC" converge .md)
    cp "$src" "$dst"; stamp "$dst"; echo "  $dst" ;;
  design-round)
    N="${3:?usage: record.sh <change> design-round N}"
    src=".sdd/design/$ID/live"
    [[ -d "$src" ]] && compgen -G "$src/*.png" >/dev/null || { echo "error: no screenshots under $src" >&2; exit 1; }
    dst="$CH/design/rounds/round-$N"
    mkdir -p "$dst"; cp "$src"/*.png "$dst/"
    ls -1 "$dst" | sed "s|^|  $dst/|" ;;
  list)
    [[ -d "$REC" ]] || { echo "no record yet for $ID"; exit 0; }
    find "$REC" "$CH/design/rounds" -type f 2>/dev/null | sort ;;
  *) echo "usage: record.sh <change> task T0NN | converge | design-round N | list" >&2; exit 1 ;;
esac
