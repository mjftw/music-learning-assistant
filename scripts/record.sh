#!/usr/bin/env bash
# Keep the thinking. Copies the ephemeral working files under .sdd/ into the
# change's committed record, so nothing that explains why the code is the way
# it is dies with the session.
#
#   ./scripts/record.sh changes/NNN task T0NN      # implementer report + task review → record/tasks/
#   ./scripts/record.sh changes/NNN converge       # convergence report → record/converge-N.md
#   ./scripts/record.sh changes/NNN design-round N # this round's screenshots → design/rounds/round-N/
#   ./scripts/record.sh changes/NNN decision FILE  # a decider verdict → record/decisions/DNNN.md
#   ./scripts/record.sh changes/NNN decisions      # the digest: one line per decision
#   ./scripts/record.sh changes/NNN amendments     # decisions whose amendment is not yet in the delta
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
    case "$T" in T[0-9]*) T="C${ID%%-*}_$T" ;; esac      # short id → C008_T011
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
  decision)
    src="${3:?usage: record.sh <change> decision <verdict-file>}"
    [[ -f "$src" ]] || { echo "error: no verdict at $src" >&2; exit 1; }
    for k in sdd_verdict sdd_door sdd_amends sdd_task; do
      ./scripts/fm.py get "$src" "$k" >/dev/null 2>&1 || { echo "error: $src has no $k (see .claude/agents/decider.md)" >&2; exit 1; }
    done
    v=$(./scripts/fm.py get "$src" sdd_verdict); d=$(./scripts/fm.py get "$src" sdd_door)
    [[ "$v" == decided || "$v" == escalated ]] || { echo "error: sdd_verdict must be decided|escalated, got '$v'" >&2; exit 1; }
    [[ "$d" == two-way || "$d" == one-way ]] || { echo "error: sdd_door must be two-way|one-way, got '$d'" >&2; exit 1; }
    [[ "$v" == decided && "$d" == one-way ]] && { echo "error: a one-way door is escalated, never decided (AUTONOMY.md)" >&2; exit 1; }
    mkdir -p "$REC/decisions"
    n=1; while [[ -e $(printf '%s/decisions/D%03d.md' "$REC" "$n") ]]; do n=$((n+1)); done
    dst=$(printf '%s/decisions/D%03d.md' "$REC" "$n")
    sed "s|D<NNN>|$(printf 'D%03d' "$n")|" "$src" > "$dst"; stamp "$dst"; echo "  $dst ($v, $d)" ;;
  decisions)
    shopt -s nullglob; files=("$REC"/decisions/D*.md); shopt -u nullglob
    [[ ${#files[@]} -gt 0 ]] || { echo "no decisions recorded for $ID"; exit 0; }
    printf '| # | Task | Verdict | Door | Decision | Amends | Applied |\n|---|---|---|---|---|---|---|\n'
    for f in "${files[@]}"; do
      printf '| %s | %s | %s | %s | %s | %s | %s |\n' "$(basename "$f" .md)" \
        "$(./scripts/fm.py get "$f" sdd_task)" "$(./scripts/fm.py get "$f" sdd_verdict)" \
        "$(./scripts/fm.py get "$f" sdd_door)" "$(./scripts/fm.py get "$f" title)" \
        "$(./scripts/fm.py get "$f" sdd_amends)" "$(./scripts/fm.py get "$f" sdd_applied 2>/dev/null || echo false)"
    done ;;
  amendments)
    shopt -s nullglob; n=0
    for f in "$REC"/decisions/D*.md; do
      a=$(./scripts/fm.py get "$f" sdd_amends); ap=$(./scripts/fm.py get "$f" sdd_applied 2>/dev/null || echo false)
      if [[ "$(./scripts/fm.py get "$f" sdd_verdict)" == decided && "$a" != none && "$ap" != true ]]; then echo "$f  → $a"; n=$((n+1)); fi
    done
    if [[ $n -eq 0 ]]; then echo "no amendments pending for $ID"; fi ;;
  list)
    [[ -d "$REC" ]] || { echo "no record yet for $ID"; exit 0; }
    find "$REC" "$CH/design/rounds" -type f ! -name index.md 2>/dev/null | sort ;;
  *) echo "usage: record.sh <change> task T0NN | converge | design-round N | decision FILE | decisions | amendments | list" >&2; exit 1 ;;
esac
