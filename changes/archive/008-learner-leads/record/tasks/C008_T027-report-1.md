---
type: Implementation Report
title: C008_T027 — implementation report
resource: /.sdd/reports/008-learner-leads/C008_T027.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/C008_T027.md
generated:
  by: claude-code/claude-sonnet-5-5
  at: 2026-10-05T12:45:00Z
sdd_id: 008-learner-leads
---

TASK: C008_T027
STATUS: DONE_WITH_CONCERNS
COMMIT: 11642a3
FILES:
src/ui/StaveView.tsx
tests/ui/scenarios/stave-view.test.tsx
VERIFY:
stave-view.test.tsx: Test Files 1 passed (1), Tests 13 passed (13)
pnpm vitest run tests/ui: Test Files 29 passed (29), Tests 193 passed (193)
CHECK:
pnpm check green end to end: vitest Test Files 93 passed (93), Tests 462 passed (462); cargo fmt, clippy -D warnings, cargo test: "test result: ok. 24 passed; 0 failed; 1 ignored" and doc-tests ok.
RED seen first: effective opacity [1,1,1,1,1,0.09,0.09] vs expected 0.3.
CONCERNS:
- `pnpm design:shots` reused the running :5173 server (stopDevServer(null) is a no-op) and overwrote six tracked `*.app.png` files under changes/008-learner-leads/design/rounds/shots/ (advanced, heard-out-of-tune, holding-meter-off, holding, listening-silent, playing-play-along). They are left modified and unstaged; the controller may commit them or `git checkout` them. listening-silent.app.png shows the notes ahead faint but clearly visible.
- The T014 tests' read: S8 (REQ-017/S8, stave-view.test.tsx) now reads opacity from the notehead ellipse instead of the group (expected values unchanged).
CHOICES MADE:
- Opacity is applied on the children, none on the group: stem line and notehead ellipse carry `opacity={head.opacity}`, the `<g data-testid="stave-note">` keeps only cx/cy/rx/fill probes. This restores main's structure, so shipped tests (stave-tap, 177/189/207) are untouched; the alternative (opacity on the group) would have needed those adapted.
- The accidental is an HTML div outside the svg and keeps its own single `opacity: acc.opacity`; same value as its notehead, as on main. Halo, hit rect, ledger lines and note names carry none (as on main: ledgers/names never dimmed).
- Effective values: lead run - behind 1, target 1, ahead 0.3 for notehead, stem and accidental alike; play along - sounding note 1, others 0.72 (as main) for notehead, stem, accidental; idle - 1.
- New test uses an A natural-minor blues run (has an inline accidental, E-flat) and a local effectiveOpacityOf helper (product of opacity attributes and styles up the ancestor chain). Named exactly as the brief: `practice.session/REQ-017/S8 — a note's opacity is applied once` (sits beside the existing `REQ-017/S8 — ink behind, faint ahead`).

<!-- recorded 2026-10-05T11:35:29Z by scripts/record.sh -->
