---
type: Convergence Report
title: 008-learner-leads — convergence report
resource: /.sdd/reports/008-learner-leads/converge.md
status: draft
tags: [sdd, converge, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/proposal.md
  - resource: /REVIEW.md
generated:
  by: claude-code/claude-opus-5-5
  at: 2026-10-05T12:55:32Z
sdd_id: 008-learner-leads
---

## Convergence report — 008-learner-leads
Run: 2026-10-05 · Commit: 5ee270b (branch `008-learner-leads`) · Cycle 3, incremental. It started from converge-2's commit **55c80e6** (`record/converge-2.md`, "Not converged — 0 critical, 1 warning"). I audited `git diff 55c80e6..5ee270b`: ca33470 and 86bad3b, plus the record commits 269edd7 and 5ee270b. I ran the suite, lint, typecheck, the three harnesses and the three scripts in full on 5ee270b.

**Secrets:** none. No file the diff adds or changes matches `.env*`/`*.pem`/`*.key`/`*secret*`/`*credential*`. A pattern scan of the whole diff found no AWS, GitHub or OpenAI key shapes, no PEM private keys, and no `password|secret|token|api_key = "<16+ chars>"`. The diff adds no `fetch`, XHR, WebSocket or `sendBeacon` under `src/`, `tests/` or `scripts/`.

### Converge-2 findings re-verified

| Finding | Status | Evidence |
|---|---|---|
| W1: tap → stop → tap while the first `getUserMedia` is pending can leave the microphone open after ■ | **fixed** | **Adapter.** src/listening/published/index.ts:87 adds `epoch`. :131 captures it before the await. :214 (`stop`) and :232 (`dispose`) bump it. :156-166: a stream that arrives after a stop is released and resolves not-ok `failed`. :167-171: a second concurrent start with no stop between releases its own stream and returns ok, so `graph` is never overwritten. **Wrapper.** src/practice/adapters/web-audio-listening.ts:65 memoises `creating`, so start, stop, start before the listener exists builds one listener, and :80 guards the assignment. **Session.** src/practice/domain/session.ts:2181-2188 adds `microphoneWanted()`. :2212 and :2300: a superseded continuation stops only when nothing wants the microphone. :2216 and :2337: a failed request releases a stream an earlier request kept. I traced both resolution orders by hand for start/stop/start, start/start (no stop), enter/leave/enter (tuner), hidden→shown, and lead→Tuner pill, through the adapter and through the wrapper while `listener === null`. Every one ends with exactly one live track reachable from `teardown()`, or none when nothing wants it. Tests: pitch-detection.test.ts:248, :264, :288, :306 (orders a–d on the real `createListener`, counting live tracks); web-audio-listening.test.ts:58; lead-edge-cases.test.ts:108, :136 (both orders), :166, :189, :211 |
| Info items (REQ-016/S10 recommended; stretched scenario citations; key change leaves cannot-hear; probe attributes; identity-check fidelity; carried-over items) | stand as recorded | No file they cite was touched, except as noted below |
| Info: the comment above `handleTogglePlay` is inaccurate | **fixed** | App.tsx:572-577 now says ■ shows from `listening` on, and that during the request the card still shows the start circle, where a tap is the stop. The diff to App.tsx is this comment only |

### This cycle's diff through the passes

| Requirement | Implemented | Tested | All criteria met |
|---|---|---|---|
| practice.session/REQ-015 "WHEN ■ is tapped … end listening (the microphone released within 200 ms)" (T030) | ✅ session.ts:2181-2188, 2212, 2216, 2300, 2337; web-audio-listening.ts:61-90; listening/published/index.ts:87-171, 214, 232 | ✅ lead-edge-cases.test.ts:108-233; pitch-detection.test.ts:248-320; web-audio-listening.test.ts:58 | ✅ |
| listening.pitch-detection/REQ-001 (shipped in 007; not in 008's delta) | ✅ the adapter now conforms on the overtaken-request path | ✅ the four new REQ-001/S3 tests | ✅ |
| All other practice.session REQ-001…REQ-022 | untouched by the diff (converge-1/2 ✅) | ✅ check-scenarios: 106 tested | ✅ |

| Scenario | Test | Through public interface? |
|---|---|---|
| every practice.session scenario | ✅ `check-scenarios.sh`: "✅ scenario coverage complete" | ✅. The new session tests drive `practice/published` and `FakeListening` (a port fake). The listening tests drive `createListener` from `listening/published` with a fake `MediaDevices` and count the tracks on the streams themselves. web-audio-listening.test.ts tests the practice adapter with an injected `create` (an existing pattern in that file) and asserts on fake listener state, not on calls |

No `.skip`, `.only`, `.todo`, TODO or FIXME appears in any changed source or test file. No commented-out code.

**Pass 2, Constitution.** No article is touched adversely. Article VII: no egress, no server. Article V's budgets still pass (below). The fix releases the microphone in more cases and opens it in none, which strengthens the "never send or store captured audio" line.

**Pass 2b, Engineering.** The diff follows docs/engineering.md. Errors stay `Result`s: the overtaken start resolves `{ ok: false, error: { reason: "failed" } }` and nothing is thrown. Each IO fix sits in its adapter, and the session logic is a pure predicate over existing state.

**Pass 3, Plan.** No new dependency, file, type or error shape. `Listener`/`ListeningStartOutcome` types are unchanged; only the doc comment's contract widens (see Info). plan.md › Structure does not list `src/listening/published/index.ts` or `src/practice/adapters/web-audio-listening.ts`. They are ripples of fixing REQ-015's release criterion on the shared pipeline, which the plan says 008 builds on. Info, not a finding.

**Pass 3b, Domain.** `check-contexts.sh` ✅. The edits to `src/listening/` stay inside its own `published/`, which is the adapter's home. Practice imports only `listening/published`. No event schema changed. The never-both invariant was not re-enumerated here. The session changes only alter *whether* `listening.stop()` is called on a superseded or failed request, and the reviewer's recorded enumerations (notes.md T030) back that. The suite's never-both and hold invariants pass.

**Pass 3c, Design.** See below.

**Pass 4, Bugs.** Beyond W1's re-verification, I checked that every `listening.stop()` call in session.ts either bumps the owning generation first (:955, :1705, :2418) or runs where no other request can be pending (:1119 complete, :2216/:2337 the current request's own failure, :2212/:2300 guarded by `microphoneWanted()`, :2532/:2534 dispose). So the adapter's new not-ok `failed` for an overtaken start can only reach a continuation that is already superseded and discards it. It never shows a learner a spurious "cannot hear". No new defect found.

**Pass 5, Security.** No new input boundary or surface, and no egress.

**Pass 6, Scope.** The listening-context edit satisfies listening.pitch-detection/REQ-001/S3 ("within 200 ms the microphone is released") and practice.session/REQ-015. It is a bug fix on a path 008 made reachable (T029's second-tap stop), not new behaviour. No delta is needed: neither spec's text changes, and the spec says nothing about a start that a stop overtakes. In scope.

**Pass 7, Hygiene.** See Commands. Everything is green, 476 tests (464 + 12 new), and nothing is skipped.

**Pass 7b, Decisions.** `record/decisions/` still holds D001–D003, unchanged by this diff and judged in cycle 1. **4a:** no escalated verdicts and no parked tasks. `tasks/index.md` shows 30/30 done.

**Pass 8, Notes fold-back.** There are two new notes.md lines. "Converge 2 …" is local. "T030 …" is local, and its "unverified by construction: real concurrent permission prompts on a device" is a test-coverage limit (see Info), not ADR-worthy. It suggests one engineering-preference refinement (propose, never apply): "an adapter that awaits a platform request keeps a cancellation token that its stop bumps; a result arriving after it moved is released, never adopted".

Design fidelity (3c). `design_snapshot.py changes/008-learner-leads live --base https://localhost:5174` (scratchpad venv) wrote all twelve shots under `.sdd/design/008-learner-leads/live/`. `cmp` against `design/reference/` found all twelve **byte-identical**. I Read `practice--no-microphone.png`: it renders the no-mic card as designed. Vite serves the working tree, which is clean at 5ee270b. The diff touches no screen code: the App.tsx change is a comment only, and StaveView, TransportCard, the theme and the tuner views are untouched. The pass confirms that.

| Screen · state | Reference | Live | Matches | Untouched screens unchanged |
|---|---|---|---|---|
| practice · all twelve Interface rows | design/reference/practice--<state>.png | .sdd/design/008-learner-leads/live/practice--<state>.png | ✅ byte-identical (an identity check, see Info) | — |
| practice · way-in, tuner · all states (unlisted) | docs/design/screens/ | not shot | — | ✅ by diff: no file any of them renders changed since 55c80e6. The session's tuner path changes only when the microphone is released, not what is drawn |

Design: `check-design.sh --change` ✅. Its only warning is the 3 pre-existing literals in `src/ui/global.css`, the same as cycle 2.

### Critical (0)

### Warning (0)

### Info (4)

- **The `Listener` contract widened without a listening delta.** src/listening/published/index.ts:19-27 now promises two things. A start that a stop overtakes resolves not-ok with reason `failed`. A concurrent second start resolves ok without owning a graph. listening.pitch-detection REQ-006 uses `failed` to mean "the microphone failed", and this overloads it for "cancelled". Today nothing observes it: only superseded continuations receive it (pass 4). Recommendation: when 007's spec is next touched, either name the cancelled case, for example a `stopped` reason or a scenario "a stop overtakes the request", or record that `failed` covers it. Not needed for this change.
- **Session tests model the worst-case adapter, not the real one.** `FakeListening` (tests/practice/fakes.ts:300-357) has no epoch, so an overtaken start in the fake resolves ok. That is the stricter case for the session's `microphoneWanted()` guard, and the adapter's own tests cover the epoch. No test composes session + `webAudioListening` + `createListener`, and notes.md T030 says real concurrent permission prompts are unverified on a device. Acceptable. A phone check (tap, stop, tap during the first prompt, then ■; the browser's microphone indicator goes out) would close it.
- **Scenario citations stretched again.** The four new pitch-detection tests (:248, :264, :288, :306) and web-audio-listening.test.ts:58 cite `listening.pitch-detection/REQ-001/S3`, whose Given is "listening is in progress". Their Given is "listening is being requested". This is the same pattern as cycle 2's Info, and the same recommendation applies: a scenario for "a stop overtakes the request".
- **Carried over and untouched by this diff:** all of converge-2's Info items (REQ-016/S10 recommended; stretched REQ-015/S3, REQ-022/S1 and REQ-014/S2 citations; a key/traversal change leaves the cannot-hear card; probe attributes on the `stave-note` group; references shot from the final build; octave inline; caption ellipsized at 390 px; `leadListeningState` after complete; `targetAt` on an empty sequence; the stale comment at session.ts:130-134; two `#[ignore]`d cargo benchmarks). The App.tsx comment item is closed.

### Commands

`pnpm check` (`source ~/.cargo/env`; real node from asdf), exit 0:
```
> prettier --check . && eslint . && tsc --noEmit && vitest run && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test
Checking formatting...
All matched files use Prettier code style!
 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant
 Test Files  93 passed (93)
      Tests  476 passed (476)
   Start at  13:47:17
   Duration  24.50s (tests 61%, environment 27%, import 8%, transform 4%)
...
test result: ok. 13 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 4.29s
...
test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.07s
...
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s
EXIT 0
```
eslint, tsc, cargo fmt and clippy print nothing on success. The `&&` chain reached `cargo test`, so all of them passed.

`pnpm test:timing`, exit 0. 200 bpm passed with 0.67 ms margin; the rerun rule applies only to a miss, so I did not rerun.
```
measuring 3 tempos sequentially, 60 s each
pre-flight: AudioContexts constructed: 1 (expected 1) — PASS
bpm  onsets  max onset dev (ms)  drift (ms, |slope·span|)  highlights  vs audible (ms)  vs scheduled (ms)  status
40   82      0.00                0.00                      40          24.00            34.67              PASS
96   194     0.00                0.00                      94          26.90            40.67              PASS
200  402     0.00                0.00                      195         29.33            44.10              PASS
test:timing: PASS — every onset ≤5 ms, drift (|slope·span|) ≤1 ms, |highlight − audible onset| ≤30 ms
```

`pnpm test:tuner`, exit 0 (the adapter is on its path):
```
feeding the microphone from the page's own AudioContext
case                 tones  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  cents err max  shown err max  status
sine E2–C7           57     68.00                   61.31                 21.35               92.86           0.09           0              PASS
flute-like E2–C7     57     67.10                   61.31                 18.69               92.86           0.65           1              PASS
hand-over glissando  1      57.70                   55.98                 5.35                93.57           —              —              PASS
silence              —      —                       —                     —                   0.00            —              —              PASS
white noise          —      —                       —                     —                   0.00            —              —              PASS
  worst: first readout E2 68.00 ms · arrival age E2 61.31 ms · cents err A♯6 0.09 ¢ · shown err E2 0 ¢
  worst: first readout E3 67.10 ms · arrival age G4 61.31 ms · cents err B6 0.65 ¢ · shown err A♯6 1 ¢
test:tuner: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, |cents error| ≤2, shown offset within ±2 ¢, nothing for silence or noise
```

`pnpm test:lead`, exit 0:
```
driving the lead run straight off window.__session — no UI, the microphone fed from the page's own AudioContext
case               targets  first readout max (ms)  arrival age max (ms)  paint age max (ms)  readings/s min  max gap (ms)  advance lateness max (frames)  shown lateness max (ms)  status
lead run C4–C5     15       70.33                   5.35                  8.02                94.21           10.67         0                              16.02                    PASS
tone cue fed back  3        62.33                   8.02                  8.02                83.40           10.67         0                              8.02                     PASS
test:lead: PASS — first readout ≤100 ms, arrival age ≤100 ms, ≥20 readings/s, no gap over 50 ms, advance within one hop and never early, shown ≤100 ms, nothing judged during the tone
```

`./scripts/check-scenarios.sh --change changes/008-learner-leads`, exit 0. It prints `practice.session`, then 106 lines from `✅ practice.session/REQ-001/S1 tested` to `✅ practice.session/REQ-022/S4 tested`, ending:
```
✅ scenario coverage complete
```

`./scripts/check-contexts.sh`, exit 0:
```
✅ context boundaries respected
```

`./scripts/check-design.sh --change changes/008-learner-leads`, exit 0:
```
Design
  interface: yes · design.md approved v1.2.0
  · src/ui/global.css: 3 hard-coded colour/size/font value(s)
  ⚠️  3 hard-coded value(s) outside src/ui/theme.ts — promote to tokens or justify in notes.md

Interface — 008-learner-leads
✅ design checks clean
```

`design_snapshot.py changes/008-learner-leads live --base https://localhost:5174` wrote all twelve shots. `cmp` against `design/reference/`: all twelve IDENTICAL. I did not run `pnpm design:shots` or `reference` mode. The :5174 server was left running.

### Verdict
Converged — 0 critical, 0 warning

<!-- recorded 2026-10-05T12:56:52Z by scripts/record.sh -->
