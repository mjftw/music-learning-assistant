---
type: Implementation Report
title: T005 — implementation report
resource: /.sdd/reports/007-hear-me/T005.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T005.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-28T07:38:29Z
sdd_id: 007-hear-me
---

TASK: T005
STATUS: DONE
COMMIT: none (not requested)
FILES:
src/practice/ports/listening.ts (new)
src/practice/adapters/web-audio-listening.ts (new)
src/practice/ports/visibility.ts (add onShown)
src/practice/adapters/page-visibility.ts (implement onShown)
src/practice/domain/session.ts (SessionDeps gains `listening`; imports ListeningPort)
src/practice/published/index.ts (export ListeningPort, webAudioListening)
tests/practice/fakes.ts (FakeListening; FakeVisibility.onShown/show(); sessionDepsWithFakes and sessionOn wired for listening)
tests/practice/scenarios/web-audio-listening.test.ts (new — the RED/GREEN test from the brief)
src/ui/main.tsx (ripple: SessionDeps.listening is required, so main.tsx's sessionDeps prop needed a value — wired webAudioListening(() => new AudioContext()) with a comment that T014 replaces it with the shared memoised factory)
tests/practice/invariants/target-in-sequence.test.ts (ripple: builds SessionDeps by hand; added FakeListening)
tests/ui/scenarios/edge-cases.test.tsx (ripple: builds SessionDeps by hand in two tests; added FakeListening)

VERIFY:
```
$ pnpm vitest run tests/practice/scenarios/web-audio-listening.test.ts

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  08:36:32
   Duration  485ms (environment 69%, import 16%, transform 13%, tests 1%, worker 1%)
```

Before the GREEN change, the same command failed for the expected reason
(the file did not exist yet):
```
Error: Failed to resolve import "../../../src/practice/adapters/web-audio-listening" from "tests/practice/scenarios/web-audio-listening.test.ts". Does the file exist?
```

CHECK:
```
$ pnpm check   (bash -c "source ~/.cargo/env && pnpm check")

Checking formatting...
All matched files use Prettier code style!

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  61 passed (61)
      Tests  244 passed (244)
   Start at  08:37:19
   Duration  9.80s (tests 46%, environment 36%, import 10%, transform 7%)

...
running 11 tests
test result: ok. 10 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 1.76s

running 25 tests
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.06s

   Doc-tests listening
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
```
(prettier, eslint, tsc, vitest, cargo fmt/clippy/test all passed; eslint and
tsc produce no output on success, which is why the log jumps straight from
prettier to vitest.)

CONCERNS:
- session.ts stores `listening` without destructuring it (`const { sound, clock, wakeLock, visibility } = deps;` unchanged) rather than the brief's literal `const { listening } = deps;`. I tried the literal form first; `@typescript-eslint/no-unused-vars` (part of `pnpm check`'s `eslint .`) fails on an unused destructured binding with no ignore pattern configured in eslint.config.js, and there is no eslint-disable precedent anywhere else in src/. Since `deps` remains a function parameter in scope for the whole of `createSession`, T007 can reach `deps.listening` directly without this task adding a binding that would sit unused until then. I judged this the correct reading of the brief's own "or equivalent," but flagging it since it departs from the literal snippet given.
- Two ripple sites outside the brief's Files list needed a `listening` fake to keep `SessionDeps` satisfied: `tests/practice/invariants/target-in-sequence.test.ts` and `tests/ui/scenarios/edge-cases.test.tsx` (both build `SessionDeps` by hand rather than through `sessionDepsWithFakes`/`sessionOn`). Touched and noted per AGENTS.md's "ripple" guidance rather than left broken.
- `src/ui/main.tsx` needed `listening: webAudioListening(() => new AudioContext())` to keep `sessionDeps` compiling, per the controller's note; kept minimal and commented that T014 replaces it with the shared memoised AudioContext factory (webAudioSound's `context` is not yet exposed to main.tsx for reuse).
- `webAudioListening`'s `start()` calls the underlying `listener.start()` on every call (not just the first), since that's what actually asks for the microphone and REQ-006/S3 requires a later request to try again after a refusal/failure — only `create()` (compiling wasm, adding the worklet module) is memoised to once. The brief's RED test doesn't exercise this distinction directly (it never asserts on `fakeListener.start`'s call count), so this is a design judgement call worth a second look.
- A `resume()` failure is mapped to `ListeningUnavailable`'s `"failed"` reason, since that type has no dedicated "no audio context" reason the way `SoundUnavailable` does (unlike webAudioSound's `"no-audio-context"`). Not exercised by a test (the brief's tests only give a `resume()` that always resolves).

<!-- recorded 2026-09-28T07:42:46Z by scripts/record.sh -->
