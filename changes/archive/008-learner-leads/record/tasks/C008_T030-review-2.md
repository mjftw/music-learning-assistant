---
type: Task Review
title: Review package — C008_T030 · 008-learner-leads
description: The diff produced for C008_T030, with its Verify and check output, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/C008_T030.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/tasks/C008_T030.md
  - resource: /.sdd/briefs/008-learner-leads/C008_T030.md
  - resource: git:269edd76e1b5806fcedba8f76462742c8c0df786..86bad3b1a7c2a33cdb2478ab247d789a75c8fc6b
  - resource: /changes/008-learner-leads/record/tasks/C008_T030-review-1.md
generated:
  by: process:review-package.sh
  at: 2026-10-05T12:40:37Z
sdd_id: 008-learner-leads
---

# Review package — C008_T030 · 008-learner-leads

base: `269edd76e1b5806fcedba8f76462742c8c0df786` → head: `86bad3b1a7c2a33cdb2478ab247d789a75c8fc6b`

**Incremental review.** The previous attempt (head `ca33470817677f609223c82dcc5c27ed2dbc9bc9`) was
reviewed in full; its verdict is below. Re-check each of its findings
against the diff since, and review the new diff through every stage.
The earlier diff is listed by file only: it was already reviewed.

## Previous verdict


TASK: C008_T030
SPEC: PASS
QUALITY: PASS

Method: beyond the package, two scratch enumerations (outside the repo, in the session scratchpad; no repo file touched).
(1) Adapter: the real createListener with a held getUserMedia, every sequence of start / stop / resolve k / reject k over up to 5 operations (19,607 sequences, the rest resolved ok at the end): 0 violations of the three invariants on the head code, 4,315 on the base code (start,start already leaves 2 live).
(2) Session end to end: the real createSession over a model port with the wrapper's pre-await gate and the adapter's epoch, operations lead start / stop / enterTuner / leaveTuner / hidden / shown / resolve-or-reject the oldest or newest gate, depth 4 (32,208 runs), 5 (354,310) and 6 (3,897,432), each settled oldest-first and newest-first, checked for: listening => exactly one live track; not listening => zero; never more than one; stop + leaveTuner => zero. Depth 4 and 5: 0 violations on head, 2,432 on base. Depth 6: 24 violations, all one pattern (finding 1 below).

FINDINGS:
- [minor] src/practice/domain/session.ts (lead failure branch ~2331, startListening cannot-hear ~2212) — the stated residual is real and reachable, but only when two concurrent microphone requests get different outcomes — A resolves ok first and is kept (superseded but wanted), then the newer B fails (a refusal, or the wrapper's resume() rejecting): A's stream stays open under a "can't hear" card with owner none. Exact sequences (model, depth 6): "enterTuner, enterTuner, [both pass the wrapper], A ok, B refused" and "lead start, Tuner pill, [pass], A ok, B refused" (the second is the first-ever permission prompt, since a stop() before the wrapper has a listener is a no-op there). The adapter's epoch does not close it: no stop() lies between A and B, so neither is discarded. Not blocking: browsers answer concurrent prompts for one origin together, so A-ok/B-refused is practically unreachable; the leak is bounded (tuner: leaveTuner() calls listening.stop(); lead: the next tap reuses the graph, since start() with a graph returns ok, and ■ releases; nothing is published into the session while owner is none). Cheap closure for a follow-up: call listening.stop() in the lead failure branch and the tuner cannot-hear branch (nothing else wants the microphone at that point).
- [minor] src/practice/domain/session.ts:2174-2200 — the existing startListening doc block ("... whatever was just opened is released again instead — safe either way") now sits above the new microphoneWanted block, detached from startListening, and its claim is no longer unconditional (release only when !microphoneWanted()). Move microphoneWanted above that block and amend the sentence.
- [minor] tests/practice/fakes.ts resolveStart(n?) — with nothing pending, findIndex returns -1 and `answersToStart[-1] = null` writes a stray array property (harmless). Guard it. Also tests/practice/scenarios/lead-edge-cases.test.ts defines a local `settle` that duplicates the unexported `flush` of tests/practice/lead-helpers.ts; export and reuse.
- [minor] src/listening/published/index.ts (Listener interface doc) — start()/stop() comments do not state the new contract (a start overtaken by stop() releases its stream and resolves not-ok "failed"). One sentence would do.

CHECKS ANSWERED
1. Adapter alone: invariant holds for every interleaving enumerated, including refused-while-pending/live, dispose (epoch bump; pending start released), and track.onended (a discarded stream never gets the handler; releasing via track.stop() fires no ended event). Unchanged published schemas (reason "failed" already existed). One theoretical gap: onended tears down without bumping the epoch, so a second pending start can open a fresh graph after an ended event; it is reachable by stop() and the session ignores it (owner/ended handler), so not a leak.
2. Wrapper: stop() while the first-ever creation or a resume() is pending is a no-op or bumps the epoch before listener.start() captures it, so the later request does open the microphone with no stop after it at the port level. The session covers it: the superseded continuation runs after its own listening.start() resolves and calls listening.stop() when !microphoneWanted(); verified in the session enumeration (the model gates the wrapper), 0 violations through depth 5. The port alone does not satisfy the invariant; it depends on the session. Acceptable (the session is the only consumer), worth knowing.
3. microphoneWanted(): correct for lead starting/listening, tuner starting/listening, hidden tuner (owner tuner, state off => not wanted; shown again => state starting => wanted, the old stream is kept or discarded by the epoch and the new request is the one that settles), cannot-hear and complete (not wanted). Lead <-> tuner cross cases in both resolve orders: covered by the enumeration. The brief's literal "owner is none" rule would have let a hidden-tuner continuation skip a needed release or, conversely, killed a re-requested tuner; the refinement is sound.
4. See finding 1.
5. check-contexts.sh: "context boundaries respected" (run). No existing test assertion edited (test diffs are additions only; fakes.ts resolveStart() with no argument still answers the oldest). The listed ripples (web-audio-listening.ts, App.tsx comment per step 5) are disclosed and necessary. The lead-edge tests fail without the session change in the [1,0] order and the wrapper test fails without the memoised promise (two Listeners created), so they are not vacuous.

UNVERIFIED:
- listening.pitch-detection/REQ-001/S3 and practice.session/REQ-015 on a real device — the diff and my models use stub getUserMedia/worklet; the real browser behaviour (concurrent prompts answered together) is assumed, not observed.
- `pnpm test:tuner` and `pnpm test:lead` PASS (the implementer's claim) — not in the package; the controller re-runs them at converge.

COMMANDS:
./scripts/check-contexts.sh -> context boundaries respected; scratch vitest enumerations as above (outside the repo, results only)



## Commands (run by this script)

### Verify

`pnpm vitest run tests/listening tests/practice/scenarios/lead-edge-cases.test.ts`

```

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  3 passed (3)
      Tests  23 passed (23)
   Start at  13:40:37
   Duration  736ms (environment 59%, transform 19%, import 12%, tests 10%, worker 1%)

```

exit status: 0 ✅

### check

`pnpm check`

```
test drone::tests::reed_drone_render_cost ... ignored
test click::tests::accent_is_louder_and_lower ... ok
test click::tests::click_lasts_25_ms ... ok
test voices::tests::a_voice_is_reported_only_once ... ok
test voices::tests::stop_fades_only_the_voice_with_that_tag ... ok
test tone::tests::tone_is_silent_before_its_next_onset ... ok
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::a_sound_change_crossfade_is_never_silent ... ok
test tests::a_drone_renders_without_large_steps_across_attack_and_stop ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::clicks_only_render_without_large_steps ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
test tests::tones_and_clicks_together_render_without_large_steps ... ok
test tests::tones_only_render_without_large_steps ... ok
test drone::tests::drone_attack_is_audible_by_30ms_and_full_by_60ms ... ok
test drone::tests::every_drone_sound_peaks_at_most_60_percent_of_a_tone ... ok

test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.07s

   Doc-tests listening

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

```

exit status: 0 ✅

## Files changed

- M	src/listening/published/index.ts
- M	src/practice/adapters/web-audio-listening.ts
- M	src/practice/domain/session.ts
- M	src/ui/App.tsx
- M	tests/listening/scenarios/pitch-detection.test.ts
- M	tests/practice/fakes.ts
- M	tests/practice/lead-helpers.ts
- M	tests/practice/scenarios/lead-edge-cases.test.ts
- M	tests/practice/scenarios/web-audio-listening.test.ts

## Diff since the previous attempt (`ca33470817677f609223c82dcc5c27ed2dbc9bc9` → head)

```diff
diff --git a/src/listening/published/index.ts b/src/listening/published/index.ts
index 54bdfcb..92bd00f 100644
--- a/src/listening/published/index.ts
+++ b/src/listening/published/index.ts
@@ -16,10 +16,15 @@ export type ListeningStartOutcome =
 export interface Listener {
   // Asks for the microphone now — never before — with echo cancellation,
   // noise suppression and automatic gain control all off (the tuner reads
-  // the raw signal). Idempotent while already listening.
+  // the raw signal). Idempotent while already listening. A start() that a
+  // stop() (or dispose()) overtakes while the microphone is still being asked
+  // for releases the stream it is then given and resolves not-ok ("failed");
+  // a second start() with no stop() between releases its own stream and
+  // resolves ok, leaving the first one's graph as it is.
   start(): Promise<ListeningStartOutcome>;
   // Stops every track, disconnects the source node; nothing is published
-  // afterwards.
+  // afterwards. Also cancels any start() still waiting on the microphone: its
+  // stream is released the moment it arrives, never connected.
   stop(): void;
   currentFrame(): number;
   sampleRate(): number;
diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
index fb1ea86..133e19f 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -2171,16 +2171,6 @@ export function createSession(
       : reason;
   }
 
-  // practice.tuner/REQ-001, REQ-008 — the shared second half of "starting
-  // to listen": state → "starting", notify, then request the microphone;
-  // settles on "listening" or "cannot-hear" once it resolves, unless
-  // `tunerGeneration` has moved past `generation` in the meantime (a
-  // leaveTuner() or a hidden event landing mid-await), in which case
-  // whatever was just opened is released again instead — safe either way, a
-  // no-op if start() failed. Shared by enterTuner() (called once its own
-  // wakeLock.acquire() await has settled) and the onShown handler above
-  // (REQ-008/S1: resumes listening without a tap; the wake lock is
-  // untouched here — it was never released while hidden).
   // listening.pitch-detection/REQ-001/S3 — whether anything now wants the
   // microphone: a lead run asking for or holding it, or the tuner asking for
   // or holding it (a hidden tuner keeps `tunerActive` but is "off" — it wants
@@ -2197,6 +2187,20 @@ export function createSession(
     );
   }
 
+  // practice.tuner/REQ-001, REQ-008 — the shared second half of "starting
+  // to listen": state → "starting", notify, then request the microphone;
+  // settles on "listening" or "cannot-hear" once it resolves, unless
+  // `tunerGeneration` has moved past `generation` in the meantime (a
+  // leaveTuner() or a hidden event landing mid-await), in which case
+  // whatever was just opened is released again instead — unless a newer
+  // request wants the microphone (`microphoneWanted()`), in which case it is
+  // that request's. A request that itself fails also calls stop(): an
+  // earlier, superseded request may have opened the microphone and been kept
+  // for this one, which will now never use it — a no-op when nothing is
+  // open. Shared by enterTuner() (called once its own wakeLock.acquire()
+  // await has settled) and the onShown handler above (REQ-008/S1: resumes
+  // listening without a tap; the wake lock is untouched here — it was never
+  // released while hidden).
   function startListening(generation: number): void {
     invalidateSnapshot();
     tunerListeningState = { kind: "starting" };
@@ -2209,6 +2213,7 @@ export function createSession(
         return;
       }
       invalidateSnapshot();
+      if (!result.ok) listening.stop();
       tunerListeningState = result.ok
         ? { kind: "listening" }
         : {
@@ -2329,6 +2334,7 @@ export function createSession(
             // is sounding or listening at this point) — released the same
             // way stop()'s lead branch releases it.
             listeningOwner = "none";
+            listening.stop();
             const reason = cannotHearReasonOf(result.error.reason);
             leadListeningState = { kind: "cannot-hear", reason };
             leadPhase = { kind: "cannot-hear", reason };
diff --git a/tests/practice/fakes.ts b/tests/practice/fakes.ts
index f47caa8..33eedf1 100644
--- a/tests/practice/fakes.ts
+++ b/tests/practice/fakes.ts
@@ -304,7 +304,9 @@ export class FakeListening implements ListeningPort {
   // pending at once (start, stop, start): each is answered by its index among
   // the held starts, in the order they were made.
   holdStart = false;
-  private readonly answersToStart: ((() => void) | null)[] = [];
+  private readonly answersToStart: (
+    ((refuseWith: ListeningUnavailable["reason"] | null) => void) | null
+  )[] = [];
   private readonly pitchListeners = new Set<(pitch: PitchDetected) => void>();
   private readonly endedListeners = new Set<(ended: ListeningEnded) => void>();
 
@@ -318,7 +320,14 @@ export class FakeListening implements ListeningPort {
     }
     if (this.holdStart) {
       return new Promise((resolve) => {
-        this.answersToStart.push(() => {
+        this.answersToStart.push((refuseWith) => {
+          if (refuseWith !== null) {
+            resolve({
+              ok: false,
+              error: { reason: refuseWith, detail: "fake" },
+            });
+            return;
+          }
           this.listening = true;
           resolve({ ok: true, value: undefined });
         });
@@ -332,13 +341,19 @@ export class FakeListening implements ListeningPort {
    * Answers a start() held by `holdStart`: the microphone opens now. With no
    * argument, the oldest one still pending; with `n`, the nth held start
    * (0-based, in the order they were made) — so two pending starts can be
-   * answered in either order.
+   * answered in either order. With `refuseWith`, that start fails with the
+   * reason instead of opening the microphone (it leaves `listening` as it
+   * was). Nothing pending: nothing happens.
    */
-  resolveStart(n?: number): void {
+  resolveStart(
+    n?: number,
+    refuseWith: ListeningUnavailable["reason"] | null = null,
+  ): void {
     const index = n ?? this.answersToStart.findIndex((a) => a !== null);
-    const answer = this.answersToStart[index] ?? null;
+    if (index < 0 || index >= this.answersToStart.length) return;
+    const answer = this.answersToStart[index];
     this.answersToStart[index] = null;
-    answer?.();
+    answer?.(refuseWith);
   }
 
   stop(): void {
diff --git a/tests/practice/lead-helpers.ts b/tests/practice/lead-helpers.ts
index 3860773..bf8af9c 100644
--- a/tests/practice/lead-helpers.ts
+++ b/tests/practice/lead-helpers.ts
@@ -51,7 +51,7 @@ export function leadFixture(
   return sessionOn("C", "flute-concert", oneOctaveUpdown, settings);
 }
 
-const flush = (): Promise<void> =>
+export const flush = (): Promise<void> =>
   new Promise((resolve) => setTimeout(resolve, 0));
 
 /** start() with who = "me", driven past wakeLock.acquire() and listening.start(). */
diff --git a/tests/practice/scenarios/lead-edge-cases.test.ts b/tests/practice/scenarios/lead-edge-cases.test.ts
index fcf76a4..2856e8d 100644
--- a/tests/practice/scenarios/lead-edge-cases.test.ts
+++ b/tests/practice/scenarios/lead-edge-cases.test.ts
@@ -34,6 +34,7 @@ import { expect, test } from "vitest";
 import { defaultSessionSettings } from "../../../src/practice/published";
 import { pitchHzOf } from "../../../src/theory/published";
 import {
+  flush,
   hearSteady,
   leadFixture,
   sessionWithEmptyRun,
@@ -97,9 +98,7 @@ test("edge case — the circle tapped again while the microphone is being asked
 });
 
 const settle = async (): Promise<void> => {
-  for (let i = 0; i < 3; i += 1) {
-    await new Promise((resolve) => setTimeout(resolve, 0));
-  }
+  for (let i = 0; i < 3; i += 1) await flush();
 };
 
 for (const order of [
@@ -161,6 +160,76 @@ for (const order of [
   });
 }
 
+// listening.pitch-detection/REQ-001/S3 — an earlier request whose microphone
+// opened and was kept (a newer request wanted it), then the newer request
+// failed: nothing owns the microphone, so it must be released.
+test("edge case — an earlier request opens the microphone, the newer is refused: nothing is left listening (lead)", async () => {
+  const f = leadFixture();
+  f.listening.holdStart = true;
+
+  f.session.start();
+  await settle();
+  f.session.stop();
+  f.session.start();
+  await settle();
+  expect(f.listening.startCalls).toBe(2);
+
+  f.listening.resolveStart(0);
+  await settle();
+  f.listening.resolveStart(1, "refused");
+  await settle();
+
+  expect(f.session.snapshot().lead.listening).toEqual({
+    kind: "cannot-hear",
+    reason: "refused",
+  });
+  expect(f.listening.listening).toBe(false);
+});
+
+test("edge case — an earlier request opens the microphone, the newer is refused: nothing is left listening (tuner)", async () => {
+  const f = leadFixture();
+  f.listening.holdStart = true;
+
+  f.session.enterTuner();
+  await settle();
+  f.session.enterTuner();
+  await settle();
+  expect(f.listening.startCalls).toBe(2);
+
+  f.listening.resolveStart(0);
+  await settle();
+  f.listening.resolveStart(1, "refused");
+  await settle();
+
+  expect(f.session.snapshot().tuner.listening).toEqual({
+    kind: "cannot-hear",
+    reason: "refused",
+  });
+  expect(f.listening.listening).toBe(false);
+});
+
+test("edge case — a lead request opens the microphone, the Tuner pill's request is refused: nothing is left listening", async () => {
+  const f = leadFixture();
+  f.listening.holdStart = true;
+
+  f.session.start();
+  await settle();
+  f.session.enterTuner();
+  await settle();
+  expect(f.listening.startCalls).toBe(2);
+
+  f.listening.resolveStart(0);
+  await settle();
+  f.listening.resolveStart(1, "refused");
+  await settle();
+
+  expect(f.session.snapshot().tuner.listening).toEqual({
+    kind: "cannot-hear",
+    reason: "refused",
+  });
+  expect(f.listening.listening).toBe(false);
+});
+
 test("edge case — ■ twice", async () => {
   const f = leadFixture();
   await startLead(f.session);
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/008-learner-leads/tasks/C008_T030.md b/changes/008-learner-leads/tasks/C008_T030.md
index 8ce4ddb..2e6916d 100644
--- a/changes/008-learner-leads/tasks/C008_T030.md
+++ b/changes/008-learner-leads/tasks/C008_T030.md
@@ -12,14 +12,14 @@ generated:
   at: 2026-10-05T12:14:35Z
 sdd_id: 008-learner-leads
 sdd_task: C008_T030
-sdd_phase: todo           # todo | in-progress | done | parked — set with scripts/task.py, never by hand
+sdd_phase: in-progress
 sdd_requirements: [practice.session/REQ-015]
 sdd_depends_on: []
 sdd_parked_on:            # D003 when parked
 sdd_group: "Converge 2"
 sdd_parallel: false       # true: independent of its neighbours, may run alongside them
 sdd_class: standard
-sdd_attempts: 0
+sdd_attempts: 1
 ---
 
 # C008_T030 · A second microphone request never orphans the first: stop releases every stream (converge 2 W1)
```

## Verdict

TASK: C008_T030
SPEC: PASS
QUALITY: PASS

Re-review (incremental, head 86bad3b).
1. Residual closed: the previous session enumeration (scratchpad) re-run on this tree, depth 6, both settle orders, 3,897,432 runs: 0 violations (previous head: 24, all the A-ok/B-refused pattern). The two named sequences are also now the new tests, which fail only without the stop() (A kept, B refused leaves the fake listening).
2. Unconditional stop() on failure cannot take a newer request's microphone: the failing continuation is by construction the newest request. Tuner branch is reached only if tunerGeneration === generation; every later enterTuner / leaveTuner / hidden / shown bumps it. A lead start cannot be newer while the tuner is active (start() returns at `if (tunerActive)`), and leaving the tuner bumps the generation first. Lead branch is reached only if listeningOwner === "lead" and leadGeneration === startedAtGeneration; stop(), a second startLead() and enterTuner() (stopAnyRun -> stop()) all bump leadGeneration, and the ended handler bumps it too. So no newer request exists to be pending or live, and gating on !microphoneWanted() would be redundant. The stop() also bumps the adapter epoch, which discards any older superseded start still in flight, which is the right outcome.
3. Test diffs: additions plus non-assertion helper edits only (FakeListening answer type/resolveStart guard, flush export, local settle body now calls flush). No expectation changed.
4. Minors: doc block now sits on startListening with microphoneWanted above it and the sentence amended; resolveStart guards index<0 / out of range; flush exported and reused; Listener start()/stop() docs state the overtaken-start contract. All addressed.

FINDINGS:
- (none blocking) [minor] tests/practice/scenarios/lead-edge-cases.test.ts — a local `settle` (3 x flush) remains; it is a different helper from flush, so acceptable.

UNVERIFIED:
- listening.pitch-detection/REQ-001/S3, practice.session/REQ-015 on a real device — models use stub getUserMedia; concurrent-prompt behaviour assumed.
- pnpm test:tuner / test:lead PASS — not in the package; controller re-runs at converge.

COMMANDS:
scratch session enumeration, IMPL=new DEPTH=6 (sess.test.ts in the session scratchpad): count 3897432, bad 0


<!-- recorded 2026-10-05T12:46:08Z by scripts/record.sh -->
