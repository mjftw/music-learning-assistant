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
  - resource: git:269edd76e1b5806fcedba8f76462742c8c0df786..ca33470817677f609223c82dcc5c27ed2dbc9bc9
generated:
  by: process:review-package.sh
  at: 2026-10-05T12:25:21Z
sdd_id: 008-learner-leads
---

# Review package — C008_T030 · 008-learner-leads

base: `269edd76e1b5806fcedba8f76462742c8c0df786` → head: `ca33470817677f609223c82dcc5c27ed2dbc9bc9`

## Commands (run by this script)

### Verify

`pnpm vitest run tests/listening tests/practice/scenarios/lead-edge-cases.test.ts`

```

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  3 passed (3)
      Tests  20 passed (20)
   Start at  13:25:22
   Duration  912ms (environment 63%, transform 20%, import 11%, tests 6%, worker 1%)

```

exit status: 0 ✅

### check

`pnpm check`

```
test drone::tests::reed_drone_render_cost ... ignored
test click::tests::click_lasts_25_ms ... ok
test click::tests::accent_is_louder_and_lower ... ok
test voices::tests::a_voice_is_reported_only_once ... ok
test voices::tests::stop_fades_only_the_voice_with_that_tag ... ok
test tone::tests::tone_is_silent_before_its_next_onset ... ok
test tests::a_drone_renders_without_large_steps_across_attack_and_stop ... ok
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::a_sound_change_crossfade_is_never_silent ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
test tests::tones_and_clicks_together_render_without_large_steps ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::tones_only_render_without_large_steps ... ok
test tests::clicks_only_render_without_large_steps ... ok
test drone::tests::drone_attack_is_audible_by_30ms_and_full_by_60ms ... ok
test drone::tests::every_drone_sound_peaks_at_most_60_percent_of_a_tone ... ok

test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.08s

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
- M	tests/practice/scenarios/lead-edge-cases.test.ts
- M	tests/practice/scenarios/web-audio-listening.test.ts

## Diff

```diff
diff --git a/src/listening/published/index.ts b/src/listening/published/index.ts
index 7f0812b..54bdfcb 100644
--- a/src/listening/published/index.ts
+++ b/src/listening/published/index.ts
@@ -76,6 +76,14 @@ export async function createListener(
   };
 
   let graph: Graph | null = null;
+  // Bumped by every stop() and dispose(): a start() captures it before it
+  // awaits getUserMedia, and a stream that arrives after it has moved was
+  // asked for before a stop() and must not outlive it (REQ-001/S3).
+  let epoch = 0;
+
+  const releaseStream = (stream: MediaStream): void => {
+    for (const t of stream.getTracks()) t.stop();
+  };
 
   // Shared by stop() and the track's own "ended" handler: stops every
   // track, disconnects the source, and clears the port's handler so that
@@ -115,6 +123,7 @@ export async function createListener(
       if (graph !== null) {
         return { ok: true };
       }
+      const requestedAtEpoch = epoch;
 
       let stream: MediaStream;
       try {
@@ -136,9 +145,29 @@ export async function createListener(
         return { ok: false, error: { reason, detail: String(cause) } };
       }
 
+      // A stop() landed while the microphone was being asked for: this
+      // stream belongs to a request that was ended, so it is released here
+      // and a graph a newer request may already have built is left alone.
+      if (epoch !== requestedAtEpoch) {
+        releaseStream(stream);
+        return {
+          ok: false,
+          error: {
+            reason: "failed",
+            detail: "stopped while the microphone was being asked for",
+          },
+        };
+      }
+      // Two start()s with no stop() between, both pending: the first to
+      // arrive owns the graph, the second hands its stream straight back.
+      if (graph !== null) {
+        releaseStream(stream);
+        return { ok: true };
+      }
+
       const track = stream.getAudioTracks()[0];
       if (track === undefined) {
-        for (const t of stream.getTracks()) t.stop();
+        releaseStream(stream);
         return {
           ok: false,
           error: {
@@ -177,6 +206,7 @@ export async function createListener(
       return { ok: true };
     },
     stop: () => {
+      epoch += 1;
       teardown();
     },
     currentFrame: () => Math.round(context.currentTime * context.sampleRate),
@@ -194,6 +224,7 @@ export async function createListener(
       return () => problemListeners.delete(l);
     },
     dispose: () => {
+      epoch += 1;
       teardown();
       pitchListeners.clear();
       endedListeners.clear();
diff --git a/src/practice/adapters/web-audio-listening.ts b/src/practice/adapters/web-audio-listening.ts
index 57469f0..aa17c7f 100644
--- a/src/practice/adapters/web-audio-listening.ts
+++ b/src/practice/adapters/web-audio-listening.ts
@@ -30,6 +30,7 @@ export function webAudioListening(
 ): ListeningPort & { context(): AudioContext | null } {
   let audioContext: AudioContext | null = null;
   let listener: Listener | null = null;
+  let creating: Promise<ListenerOutcome> | null = null;
   const pitchListeners = new Set<(pitch: PitchDetected) => void>();
   const endedListeners = new Set<(ended: ListeningEnded) => void>();
   // Boundary problems (a malformed pitch report off the worklet's port) are
@@ -57,26 +58,35 @@ export function webAudioListening(
     }
 
     if (listener === null) {
+      // One listener however many requests arrive while it is being built
+      // (start, stop, start): a second createListener() would leave the
+      // first request's microphone on a listener this port's stop() never
+      // reaches (listening.pitch-detection/REQ-001/S3).
+      creating ??= create(audioContext);
       let outcome: ListenerOutcome;
       try {
-        outcome = await create(audioContext);
+        outcome = await creating;
       } catch (cause) {
+        creating = null;
         return {
           ok: false,
           error: { reason: "worklet-failed", detail: String(cause) },
         };
       }
       if (!outcome.ok) {
+        creating = null;
         return { ok: false, error: outcome.error };
       }
-      listener = outcome.listener;
-      listener.onPitch((pitch) => {
-        for (const l of pitchListeners) l(pitch);
-      });
-      listener.onEnded((ended) => {
-        for (const l of endedListeners) l(ended);
-      });
-      listener.onProblem(warnOnce);
+      if (listener === null) {
+        listener = outcome.listener;
+        listener.onPitch((pitch) => {
+          for (const l of pitchListeners) l(pitch);
+        });
+        listener.onEnded((ended) => {
+          for (const l of endedListeners) l(ended);
+        });
+        listener.onProblem(warnOnce);
+      }
     }
 
     // The real Listener.start() is what asks for the microphone
diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
index 36fbf86..fb1ea86 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -2181,6 +2181,22 @@ export function createSession(
   // wakeLock.acquire() await has settled) and the onShown handler above
   // (REQ-008/S1: resumes listening without a tap; the wake lock is
   // untouched here — it was never released while hidden).
+  // listening.pitch-detection/REQ-001/S3 — whether anything now wants the
+  // microphone: a lead run asking for or holding it, or the tuner asking for
+  // or holding it (a hidden tuner keeps `tunerActive` but is "off" — it wants
+  // nothing until shown again). A superseded request whose microphone opens
+  // after it was superseded releases it only when this is false: a newer
+  // request may be pending, or already running, on the very same microphone,
+  // and a stop() would take that one away (or, in the adapter, discard it).
+  function microphoneWanted(): boolean {
+    return (
+      listeningOwner === "lead" ||
+      (tunerActive &&
+        (tunerListeningState.kind === "starting" ||
+          tunerListeningState.kind === "listening"))
+    );
+  }
+
   function startListening(generation: number): void {
     invalidateSnapshot();
     tunerListeningState = { kind: "starting" };
@@ -2189,7 +2205,7 @@ export function createSession(
     void (async () => {
       const result = await listening.start();
       if (tunerGeneration !== generation) {
-        listening.stop();
+        if (!microphoneWanted()) listening.stop();
         return;
       }
       invalidateSnapshot();
@@ -2274,8 +2290,9 @@ export function createSession(
             // Superseded (a stop() or a second startLead()) while the
             // microphone was being asked for — if it actually opened, hand
             // it straight back rather than leaving it open under nobody's
-            // name.
-            if (result.ok) listening.stop();
+            // name, unless a newer request now wants it (a start, stop,
+            // start: the microphone is that request's, not this one's).
+            if (result.ok && !microphoneWanted()) listening.stop();
             return;
           }
           invalidateSnapshot();
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index 5b256f4..e17974d 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -570,10 +570,11 @@ export function App(props: {
   function handleTogglePlay(): void {
     if (session === null || snapshot === null) return;
     // A lead run never touches the transport, so ■ on the live lead card
-    // (shown for the whole `listening` phase, the microphone request
-    // included) is told apart by the lead phase (practice.session/REQ-015);
-    // while the microphone is still being asked for the phase is yet idle
-    // and the lead snapshot says "starting" — the second tap is the stop.
+    // (shown from the `listening` phase on) is told apart by the lead phase
+    // (practice.session/REQ-015). While the microphone is still being asked
+    // for, the phase is yet idle, the lead snapshot says "starting" and the
+    // card still shows the start circle, not ■ — a tap then is nonetheless
+    // the stop.
     const inProgress =
       snapshot.transport.kind !== "idle" ||
       snapshot.lead.phase === "listening" ||
diff --git a/tests/listening/scenarios/pitch-detection.test.ts b/tests/listening/scenarios/pitch-detection.test.ts
index e307af2..6f6ab25 100644
--- a/tests/listening/scenarios/pitch-detection.test.ts
+++ b/tests/listening/scenarios/pitch-detection.test.ts
@@ -200,3 +200,121 @@ test("listening.pitch-detection/REQ-006/S3 — failed mid-way", async () => {
   await listener.start();
   expect(getUserMedia).toHaveBeenCalledTimes(2);
 });
+
+// A getUserMedia that stays pending until the test answers it, one request at
+// a time, each granting its own stream with its own track — so the tests can
+// count the live tracks on the streams themselves, whatever the adapter does.
+function heldMediaDevices() {
+  // One entry per granted request, in the order requests were made; a track
+  // exists (and can be live) only once its request has been answered.
+  const tracks: ({ stopped: boolean } | undefined)[] = [];
+  const answers: (() => void)[] = [];
+  const getUserMedia = vi.fn(
+    () =>
+      new Promise<MediaStream>((resolve) => {
+        const n = answers.length;
+        answers.push(() => {
+          const track = {
+            stopped: false,
+            stop() {
+              this.stopped = true;
+            },
+            getSettings: () => ({}),
+            onended: null as null | (() => void),
+          };
+          tracks[n] = track;
+          resolve({
+            getAudioTracks: () => [track],
+            getTracks: () => [track],
+          } as unknown as MediaStream);
+        });
+      }),
+  );
+  return {
+    mediaDevices: { getUserMedia } as unknown as MediaDevices,
+    tracks,
+    // Answers the nth request (0-based) and lets the adapter's continuation run.
+    async resolve(n: number): Promise<void> {
+      answers[n]?.();
+      await Promise.resolve();
+      await Promise.resolve();
+    },
+    live: () => tracks.filter((t) => t !== undefined && !t.stopped).length,
+  };
+}
+
+// listening.pitch-detection/REQ-001/S3 — a stop that overtakes a pending
+// request still releases its stream (convergence 2, W1)
+test("listening.pitch-detection/REQ-001/S3 — a stop that overtakes a pending request still releases its stream (a: start, stop, resolve)", async () => {
+  const held = heldMediaDevices();
+  const listener = okListener(
+    await createListener(fakeContext(), held.mediaDevices),
+  );
+  const heard: number[] = [];
+  listener.onPitch((pitch) => heard.push(pitch.hz));
+  const pending = listener.start();
+  listener.stop();
+  await held.resolve(0);
+  await pending;
+  expect(held.live()).toBe(0);
+  expect(nodeBox.current).toBeUndefined();
+  expect(heard).toEqual([]);
+});
+
+test("listening.pitch-detection/REQ-001/S3 — a stop that overtakes a pending request still releases its stream (b: start A, stop, start B, resolve A then B)", async () => {
+  const held = heldMediaDevices();
+  const context = fakeContext();
+  const listener = okListener(await createListener(context, held.mediaDevices));
+  const heard: number[] = [];
+  listener.onPitch((pitch) => heard.push(pitch.hz));
+  const a = listener.start();
+  listener.stop();
+  const b = listener.start();
+  await held.resolve(0);
+  await a;
+  expect(held.live()).toBe(0);
+  await held.resolve(1);
+  expect(await b).toEqual({ ok: true });
+  expect(held.live()).toBe(1);
+  expect(held.tracks[1]?.stopped).toBe(false);
+  listener.stop();
+  expect(held.live()).toBe(0);
+  context.lastNode.port.onmessage?.({
+    data: { type: "pitch", hz: 440, confidence: 0.95, atFrame: 100 },
+  } as MessageEvent);
+  expect(heard).toEqual([]);
+});
+
+test("listening.pitch-detection/REQ-001/S3 — a stop that overtakes a pending request still releases its stream (c: start A, stop, start B, resolve B then A)", async () => {
+  const held = heldMediaDevices();
+  const listener = okListener(
+    await createListener(fakeContext(), held.mediaDevices),
+  );
+  const a = listener.start();
+  listener.stop();
+  const b = listener.start();
+  await held.resolve(1);
+  expect(await b).toEqual({ ok: true });
+  await held.resolve(0);
+  await a;
+  expect(held.live()).toBe(1);
+  expect(held.tracks[1]?.stopped).toBe(false);
+  listener.stop();
+  expect(held.live()).toBe(0);
+});
+
+test("listening.pitch-detection/REQ-001/S3 — a stop that overtakes a pending request still releases its stream (d: start, start, resolve both)", async () => {
+  const held = heldMediaDevices();
+  const listener = okListener(
+    await createListener(fakeContext(), held.mediaDevices),
+  );
+  const first = listener.start();
+  const second = listener.start();
+  await held.resolve(0);
+  await held.resolve(1);
+  expect(await first).toEqual({ ok: true });
+  expect(await second).toEqual({ ok: true });
+  expect(held.live()).toBe(1);
+  listener.stop();
+  expect(held.live()).toBe(0);
+});
diff --git a/tests/practice/fakes.ts b/tests/practice/fakes.ts
index 43195d5..f47caa8 100644
--- a/tests/practice/fakes.ts
+++ b/tests/practice/fakes.ts
@@ -300,9 +300,11 @@ export class FakeListening implements ListeningPort {
   failWith: ListeningUnavailable["reason"] | null = null;
   // While set, start() stays pending (the microphone "being asked for") until
   // resolveStart() answers it — a stop() landing in that window is the
-  // supersede path of practice.session/REQ-015.
+  // supersede path of practice.session/REQ-015. Several held starts may be
+  // pending at once (start, stop, start): each is answered by its index among
+  // the held starts, in the order they were made.
   holdStart = false;
-  private answerStart: (() => void) | null = null;
+  private readonly answersToStart: ((() => void) | null)[] = [];
   private readonly pitchListeners = new Set<(pitch: PitchDetected) => void>();
   private readonly endedListeners = new Set<(ended: ListeningEnded) => void>();
 
@@ -316,20 +318,26 @@ export class FakeListening implements ListeningPort {
     }
     if (this.holdStart) {
       return new Promise((resolve) => {
-        this.answerStart = () => {
+        this.answersToStart.push(() => {
           this.listening = true;
           resolve({ ok: true, value: undefined });
-        };
+        });
       });
     }
     this.listening = true;
     return Promise.resolve({ ok: true, value: undefined });
   }
 
-  /** Answers a start() held by `holdStart`: the microphone opens now. */
-  resolveStart(): void {
-    const answer = this.answerStart;
-    this.answerStart = null;
+  /**
+   * Answers a start() held by `holdStart`: the microphone opens now. With no
+   * argument, the oldest one still pending; with `n`, the nth held start
+   * (0-based, in the order they were made) — so two pending starts can be
+   * answered in either order.
+   */
+  resolveStart(n?: number): void {
+    const index = n ?? this.answersToStart.findIndex((a) => a !== null);
+    const answer = this.answersToStart[index] ?? null;
+    this.answersToStart[index] = null;
     answer?.();
   }
 
diff --git a/tests/practice/scenarios/lead-edge-cases.test.ts b/tests/practice/scenarios/lead-edge-cases.test.ts
index 597df0f..fcf76a4 100644
--- a/tests/practice/scenarios/lead-edge-cases.test.ts
+++ b/tests/practice/scenarios/lead-edge-cases.test.ts
@@ -96,6 +96,71 @@ test("edge case — the circle tapped again while the microphone is being asked
   expect(f.wake.acquired).toBe(false);
 });
 
+const settle = async (): Promise<void> => {
+  for (let i = 0; i < 3; i += 1) {
+    await new Promise((resolve) => setTimeout(resolve, 0));
+  }
+};
+
+for (const order of [
+  [0, 1],
+  [1, 0],
+] as const) {
+  test(`edge case — start, stop, start while the microphone is being asked for: one run, one microphone (lead, resolved ${order.join(" then ")})`, async () => {
+    const f = leadFixture();
+    f.listening.holdStart = true;
+    const targets: { position: number }[] = [];
+    f.session.onTargetAdvanced((e) => targets.push(e));
+
+    f.session.start();
+    await settle();
+    f.session.stop();
+    f.session.start();
+    await settle();
+    expect(f.listening.startCalls).toBe(2);
+
+    for (const n of order) {
+      f.listening.resolveStart(n);
+      await settle();
+    }
+
+    expect(f.session.snapshot().lead.phase).toBe("listening");
+    expect(f.session.snapshot().lead.target?.position).toBe(1);
+    expect(targets.map((t) => t.position)).toEqual([1]);
+    expect(f.listening.listening).toBe(true);
+
+    f.session.stop();
+    expect(f.listening.listening).toBe(false);
+    expect(f.session.snapshot().lead.phase).toBe("idle");
+  });
+
+  test(`edge case — enter, leave, enter the tuner while the microphone is being asked for: one tuner, one microphone (resolved ${order.join(" then ")})`, async () => {
+    const f = leadFixture();
+    f.listening.holdStart = true;
+
+    f.session.enterTuner();
+    await settle();
+    f.session.leaveTuner();
+    f.session.enterTuner();
+    await settle();
+    expect(f.listening.startCalls).toBe(2);
+
+    for (const n of order) {
+      f.listening.resolveStart(n);
+      await settle();
+    }
+
+    expect(f.session.snapshot().tuner.active).toBe(true);
+    expect(f.session.snapshot().tuner.listening).toEqual({
+      kind: "listening",
+    });
+    expect(f.listening.listening).toBe(true);
+
+    f.session.leaveTuner();
+    expect(f.listening.listening).toBe(false);
+  });
+}
+
 test("edge case — ■ twice", async () => {
   const f = leadFixture();
   await startLead(f.session);
diff --git a/tests/practice/scenarios/web-audio-listening.test.ts b/tests/practice/scenarios/web-audio-listening.test.ts
index c8f2382..bc109d9 100644
--- a/tests/practice/scenarios/web-audio-listening.test.ts
+++ b/tests/practice/scenarios/web-audio-listening.test.ts
@@ -6,6 +6,7 @@
 // is the model here).
 
 import { expect, test, vi } from "vitest";
+import type { ListenerOutcome } from "../../../src/listening/published";
 import { webAudioListening } from "../../../src/practice/adapters/web-audio-listening";
 
 test("webAudioListening creates the listener once on the first start and maps outcomes to Results", async () => {
@@ -50,3 +51,47 @@ test("webAudioListening reports a failed createListener as the port's error", as
     error: { reason: "wasm-failed", detail: "x" },
   });
 });
+
+// listening.pitch-detection/REQ-001/S3 — the first microphone request is
+// still building the listener when a second one arrives (start, stop, start):
+// both must end up on the one listener, so a stop reaches whichever opened.
+test("listening.pitch-detection/REQ-001/S3 — two requests while the listener is still being built never leave one open out of reach", async () => {
+  const listeners: { open: boolean }[] = [];
+  const answers: (() => void)[] = [];
+  const create = (): Promise<ListenerOutcome> =>
+    new Promise<ListenerOutcome>((resolve) => {
+      const state = { open: false };
+      listeners.push(state);
+      const listener = {
+        start: () => {
+          state.open = true;
+          return Promise.resolve({ ok: true } as const);
+        },
+        stop: () => {
+          state.open = false;
+        },
+        currentFrame: () => 0,
+        sampleRate: () => 48000,
+        onPitch: () => () => {},
+        onEnded: () => () => {},
+        onProblem: () => () => {},
+        dispose: () => {},
+      };
+      answers.push(() => resolve({ ok: true, listener }));
+    });
+  const port = webAudioListening(
+    () => ({ resume: () => Promise.resolve() }) as unknown as AudioContext,
+    create,
+  );
+
+  const a = port.start();
+  await new Promise((resolve) => setTimeout(resolve, 0));
+  port.stop();
+  const b = port.start();
+  await new Promise((resolve) => setTimeout(resolve, 0));
+  for (const answer of answers) answer();
+  await Promise.all([a, b]);
+
+  port.stop();
+  expect(listeners.filter((l) => l.open)).toEqual([]);
+});
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


<!-- recorded 2026-10-05T12:36:31Z by scripts/record.sh -->
