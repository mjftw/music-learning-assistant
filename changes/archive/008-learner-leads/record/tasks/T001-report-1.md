---
type: Implementation Report
title: T001 — implementation report
resource: /.sdd/reports/008-learner-leads/T001.md
status: draft
tags: [sdd, report, "change:008-learner-leads"]
sources:
  - resource: /.sdd/briefs/008-learner-leads/T001.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-10-02T16:39:07Z
sdd_id: 008-learner-leads
---

TASK: T001
STATUS: DONE
COMMIT: none (controller commits)
FILES:
src/practice/domain/lead.ts
src/practice/domain/settings.ts
src/practice/domain/tuner.ts
src/practice/published/index.ts
src/ui/App.tsx
tests/practice/scenarios/lead-settings.test.ts
VERIFY:
> pnpm vitest run tests/practice/scenarios/lead-settings.test.ts

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  17:38:56
   Duration  639ms (environment 45%, transform 37%, import 16%, tests 1%, worker 1%)

> pnpm check (source ~/.cargo/env first)  → exit 0

Checking formatting...
All matched files use Prettier code style!
 Test Files  78 passed (78)
      Tests  351 passed (351)
   Start at  17:38:27
   Duration  12.47s (tests 53%, environment 31%, import 9%, transform 6%)
...
test result: ok. 13 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 4.28s (listening)
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.06s (sound)
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s (doc-tests listening)
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s (doc-tests sound)
CHECK:
Checking formatting...
All matched files use Prettier code style!
(eslint, tsc --noEmit: clean, no output)
 Test Files  78 passed (78)
      Tests  351 passed (351)
   Start at  17:38:27
   Duration  12.47s (tests 53%, environment 31%, import 9%, transform 6%)
cargo fmt --check: clean
cargo clippy --all-targets -- -D warnings: clean
cargo test: listening 13 passed, sound 24 passed, doc-tests 0/0 — all ok
Process exit code: 0
CONCERNS: none
CHOICES MADE:
- RED test file committed exactly as given in the brief's Step 1 verbatim block; Prettier reformatted multi-line `expect(...)` calls on save (wraps long argument lists) — content/assertions unchanged.
- `lead.ts` doc comment at the top names the governing requirements (REQ-016/018/020) per this codebase's existing convention of a one-paragraph file header (e.g. tuner.ts).
- `verdictOf`'s updated doc comment explains the new `bandCents` parameter and keeps noting the sharp/flat/in-tune rule, matching the original comment's style.
- `published/index.ts`: placed the new `lead.ts` export block directly after `settings.ts`'s (its natural neighbour — `SessionSettings.lead` is a `LeadSettings`) rather than at the end of the file, and added `verdictOf` into the existing `tuner.ts` export group alphabetically with the others.
- Ripple beyond the brief's Files list: `src/ui/App.tsx`'s `initialSettingsOf` builds a `SessionSettings` from the stored (v5) session, which has no `lead` field (the v6 schema with lead persistence is a later task per plan.md's Structure section). Fixed by merging in `defaultLeadSettings` there, with a comment explaining why, per REQ-011/S3 ("every traversal, scale, session and lead setting takes its S2 default" when nothing is stored for it) — this is exactly the semantics required, not a stand-in. Extracted nothing new; just added `defaultLeadSettings` to App.tsx's existing import from `practice/published`.
- Confirmed via `grep -rn "tempoBpm:" src tests` and a follow-up read of every non-`defaultSessionSettings`-spread hit that the rest are `StoredSelection`/stored-JSON literals (schema v5, no `lead` field — unrelated type, a later task's concern) or already spreads of `defaultSessionSettings`/`snapshot.settings` that automatically gained `lead`; no further literal needed `lead: defaultLeadSettings` added by hand.
QUESTION: none
OPTIONS: none

<!-- recorded 2026-10-02T16:43:12Z by scripts/record.sh -->
