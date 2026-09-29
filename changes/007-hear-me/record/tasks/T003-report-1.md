---
type: Implementation Report
title: T003 — implementation report
resource: /.sdd/reports/007-hear-me/T003.md
status: draft
tags: [sdd, report, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T003.md
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-27T23:27:22Z
sdd_id: 007-hear-me
---

TASK: T003
STATUS: DONE
COMMIT: none
FILES:
src/listening/published/pitch-detected.schema.ts
src/listening/published/processor.ts
src/listening/published/index.ts
tests/listening/scenarios/pitch-detection.test.ts

VERIFY:
```
$ pnpm vitest run tests/listening

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  00:25:43
   Duration  453ms (environment 65%, import 18%, transform 14%, tests 2%, worker 1%)
```

CHECK:
```
$ pnpm check   (exit 0)
...
 Test Files  59 passed (59)
      Tests  237 passed (237)
   Start at  00:26:22
   Duration  8.44s (tests 45%, environment 37%, import 11%, transform 7%)

    Finished `test` profile [unoptimized + debuginfo] target(s) in 0.02s
     Running unittests src/lib.rs (listening) ... test result: ok. 10 passed; 0 failed; 1 ignored
     Running unittests src/lib.rs (sound)     ... test result: ok. 24 passed; 0 failed; 1 ignored
   Doc-tests listening ... test result: ok. 0 passed; 0 failed
   Doc-tests sound     ... test result: ok. 0 passed; 0 failed
```
Also ran `./scripts/check-contexts.sh` directly: `✅ context boundaries respected`.

CONCERNS:
- `fetch(wasmUrl)` (wasmUrl resolves to a root-relative dev path like
  `/src/listening/pkg/listening.wasm`) rejects under Node's global `fetch`
  in the jsdom test environment (no browser location to resolve against —
  never exercised before, since sound's equivalent `createSoundEngine` is
  never called directly by any existing test; `web-audio-sound.ts` always
  injects a fake `createEngine`). Left as literally `vi.fn(() =>
  Promise.resolve(...))` per the brief's prose, that abandoned rejected
  promise surfaced as a Node "unhandled rejection" per test (6 of them),
  which failed `pnpm check`'s `vitest run` step (non-zero exit) even
  though every assertion passed. Fixed entirely inside the test file: the
  `WebAssembly.compileStreaming` stub now does `Promise.resolve(source)
  .then(onFulfilled, onRejected)` instead of ignoring its argument, so the
  underlying fetch promise's rejection is observed and marked handled.
  Production `index.ts` is untouched and still calls
  `WebAssembly.compileStreaming(fetch(wasmUrl))` exactly as `sound` does —
  in a real browser this resolves fine against `document`'s location.
  Flagging this because it's a real gap in the brief's test-infrastructure
  note ("`WebAssembly.compileStreaming` is stubbed to resolve" was stated
  as sufficient; `fetch` needed handling too), not something I inferred
  from nothing — happy to be pointed at a different fix if this isn't the
  intended one.
- `numberOfOutputs: 0` is passed to `AudioWorkletNode` per the brief; per
  the Web Audio spec a zero-output node is processed as a graph sink once
  its input is connected (like `AudioDestinationNode`), so I did not add a
  further downstream `.connect()` — documented in a comment at the call
  site in `index.ts`. Untested directly (jsdom has no real audio graph to
  observe this against); flagging in case the reviewer wants this
  double-checked against a real browser during acceptance.
- `ListeningEnded` is defined with a `detail: string` field per the
  Interfaces › Produces block in the brief (used literally: `{ reason:
  "failed", detail: "track ended" }`), which differs from the plan.md
  Data-model section's earlier `{ reason: "failed" }` (no `detail`). I
  followed the brief's verbatim Interfaces section as authoritative for
  this task.
- Found and removed a stray scratch file I'd created at
  `tests/listening_fetch_check.test.ts` while diagnosing the `fetch` issue
  above, before it was ever staged — mentioning it since it briefly
  inflated the local (uncommitted) test count to 2 files / 7 tests.

No other concerns; all six brief scenarios (REQ-001/S1–S3, REQ-006/S1–S3)
pass through `createListener`'s published interface only, no internals of
`src/listening/` are reached from the test, and `check-contexts.sh` stays
clean.

<!-- recorded 2026-09-27T23:35:12Z by scripts/record.sh -->
