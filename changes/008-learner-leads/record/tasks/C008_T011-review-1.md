---
type: Task Review
title: Review package — C008_T011 · 008-learner-leads
description: The diff produced for C008_T011, with its Verify and check output, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/C008_T011.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/tasks/C008_T011.md
  - resource: /.sdd/briefs/008-learner-leads/C008_T011.md
  - resource: git:89856833ba60822e8591c54f3ec61b361500c3fe..75e62dcad2cb04796b3295847aa950726708c9a5
generated:
  by: process:review-package.sh
  at: 2026-10-03T09:32:01Z
sdd_id: 008-learner-leads
---

# Review package — C008_T011 · 008-learner-leads

base: `89856833ba60822e8591c54f3ec61b361500c3fe` → head: `75e62dcad2cb04796b3295847aa950726708c9a5`

## Commands (run by this script)

### Verify

`pnpm vitest run tests/practice/scenarios/lead-cues.test.ts tests/practice/scenarios/lead-meter.test.ts`

```

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  2 passed (2)
      Tests  8 passed (8)
   Start at  10:32:02
   Duration  598ms (environment 49%, transform 30%, import 16%, tests 5%, worker 1%)

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
test tests::a_sound_change_crossfade_is_never_silent ... ok
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::a_drone_renders_without_large_steps_across_attack_and_stop ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test tests::clicks_only_render_without_large_steps ... ok
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
test tests::tones_and_clicks_together_render_without_large_steps ... ok
test tests::tones_only_render_without_large_steps ... ok
test drone::tests::every_drone_sound_peaks_at_most_60_percent_of_a_tone ... ok
test drone::tests::drone_attack_is_audible_by_30ms_and_full_by_60ms ... ok

test result: ok. 24 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 0.06s

   Doc-tests listening

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

   Doc-tests sound

running 0 tests

test result: ok. 0 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s

```

exit status: 0 ✅

## Files changed

- M	src/practice/domain/session.ts
- A	tests/practice/scenarios/lead-cues.test.ts
- M	tests/practice/scenarios/lead-meter.test.ts

## Diff

```diff
diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
index c7ba83f..dca147d 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -47,8 +47,11 @@ import type { LeadPhase, LeadSettings, LeadTarget, Who } from "./lead";
 import {
   applyJudgement,
   applySilence,
+  CUE_TAIL_MS,
+  CUE_TONE_MS,
   emptyHold,
   heldFractionOf,
+  HELD_TICK_MS,
   LEAD_GAP_MS,
   requiredHoldMs,
   targetAt,
@@ -216,6 +219,11 @@ const DRONE_TAG_BASE = 3_000_000;
 // tag.
 const TAP_TAG_BASE = 2_000_000;
 
+// practice.session/REQ-018 — the tone cue's own tag, one per target shown;
+// well clear of the other three bases and never colliding with a position
+// tag.
+const CUE_TAG_BASE = 4_000_000;
+
 // practice.session/REQ-008 — the very first tick of a run (a fresh start()
 // or a REQ-007 restart) is scheduled this many milliseconds after
 // `sound.currentFrame()`, not at it: the audio thread's first renders lag
@@ -242,6 +250,13 @@ export const HIGHLIGHT_LEAD_MS = 20;
 // drone to fall silent before the first click or note sounds).
 export const DRONE_RELEASE_MS = 80;
 
+// practice.session/REQ-018 — mirrors `RELEASE_S` in src/sound/src/tone.rs:
+// how long a tone voice (the cue, a tapped note, a sequence note) takes to
+// fade to true silence once its duration ends. The tone cue's mute window
+// (below) runs until the cue's release has finished, not merely until its
+// nominal duration ends, so a resonant tail is never heard as the learner.
+const TONE_RELEASE_MS = 40;
+
 // The run's extremes by pitch, not by array position (T008) — a
 // written-out split-direction run (e.g. classical melodic minor's ↑↓,
 // REQ-012/S6) ends on the tonic it started on, so `run[0]`/`run[last]`
@@ -448,6 +463,9 @@ export function createSession(
   // drone voice.
   let tappedTag: number | null = null;
   let tapCounter = 0;
+  // practice.session/REQ-018 — the tone cue's own tag counter, one per
+  // target shown while the cue is on.
+  let cueCounter = 0;
   // Bumped by tapNote() itself (every call, sync or async) and by
   // enterTuner() — mirrors droneGeneration: a first-ever tapNote() still
   // awaiting sound.start() compares this after its await and posts nothing
@@ -585,6 +603,19 @@ export function createSession(
   // `tunerCommitCancel`/`tunerGapCancel` above.
   let leadCommitCancel: (() => void) | null = null;
   let leadGapCancel: (() => void) | null = null;
+  // practice.session/REQ-017 — "<previous note> held ✓": the note just
+  // advanced away from, or null the rest of the time. Set on an advance
+  // (the hold branch of onPitchDetected), cleared by the next surviving
+  // detection (judged against the new target — a muted or stale one never
+  // reaches that code) or by `leadJustHeldCancel` firing HELD_TICK_MS after
+  // the advance with no reading, whichever is first.
+  let leadJustHeld: Note | null = null;
+  let leadJustHeldCancel: (() => void) | null = null;
+  // practice.session/REQ-018 — the tone cue currently sounding (or just
+  // posted, mid-release), or null while none is — needed to stop it (`stop`
+  // with its tag) wherever a lead run ends or restarts, the same way
+  // `tappedTag`/`droneTag` stop their own voice.
+  let cueTag: number | null = null;
 
   let run: readonly KeyViewNote[] = [];
   let sequence: readonly SequenceNote[] = [];
@@ -707,6 +738,10 @@ export function createSession(
     return Math.round((FIRST_TICK_LEAD_MS * sound.sampleRate()) / 1000);
   }
 
+  function framesOfMs(ms: number): number {
+    return Math.round((ms * sound.sampleRate()) / 1000);
+  }
+
   function nextClickTag(): number {
     const tag = CLICK_TAG_BASE + clickCounter;
     clickCounter += 1;
@@ -725,6 +760,38 @@ export function createSession(
     return tag;
   }
 
+  function nextCueTag(): number {
+    const tag = CUE_TAG_BASE + cueCounter;
+    cueCounter += 1;
+    return tag;
+  }
+
+  // practice.session/REQ-013, REQ-018 — posts one tone command, shared by a
+  // tapped note and the lead tone cue (T011's refactor: the two used to
+  // build the command inline, separately): the onset is always
+  // `sound.currentFrame() + FIRST_TICK_LEAD_MS` ahead (REQ-008's reasoning
+  // applies here too), and the duration is given in ms, converted to frames
+  // the same way `firstTickLeadFrames()` converts its own constant. Returns
+  // the onset frame actually used, so a caller that needs to reason about
+  // when the tone ends (the cue's mute window) uses the same value the
+  // command itself carries, rather than recomputing it and risking the two
+  // disagreeing.
+  function scheduleOneTone(
+    hz: number,
+    durationMs: number,
+    tag: number,
+  ): number {
+    const onsetFrame = sound.currentFrame() + firstTickLeadFrames();
+    sound.post({
+      kind: "tone",
+      tag,
+      hz,
+      onsetFrame,
+      durationFrames: framesOfMs(durationMs),
+    });
+    return onsetFrame;
+  }
+
   // A playing tick's tag packs the run's generation with the sequence
   // position: generation · GENERATION_TAG_MULTIPLIER + position — the tag
   // that labels the resulting `OnsetReport` for anyone reading it (T031:
@@ -952,16 +1019,23 @@ export function createSession(
     if (isTooOld(pitch)) return;
 
     const atMs = (pitch.atFrame / listening.sampleRate()) * 1000;
-    // practice.session/REQ-018 (wired by T011) — a detection inside the
-    // tone cue's mute window is dropped the same way a stale one is, except
-    // the smoothing resets too, so the first reading once the window ends
-    // is shown as detected rather than blended across it. `mutedUntilMs` is
-    // null until T011 sets it, so this branch is never taken yet.
+    // practice.session/REQ-018 — a detection inside the tone cue's mute
+    // window is dropped the same way a stale one is, except the smoothing
+    // resets too, so the first reading once the window ends is shown as
+    // detected rather than blended across it. Dropped entirely: it is never
+    // judged, so it never clears `justHeld` either (below).
     if (leadPhase.mutedUntilMs !== null && atMs < leadPhase.mutedUntilMs) {
       leadSmoothing = initialSmoothingState;
       return;
     }
 
+    // practice.session/REQ-017 — every surviving detection (not dropped as
+    // too old or muted, above) is a reading against the *current* target —
+    // clears "<note> held ✓" the instant the first one after an advance
+    // reaches here, before the hold rule (below) might advance again and
+    // set a fresh one.
+    clearLeadJustHeld();
+
     // practice.session/REQ-016, REQ-017 — judged against the target's own
     // pitch, pinned (never auto): the smoothing and the judgement are the
     // tuner's own pure functions, called with a pinned target and no shown
@@ -997,6 +1071,8 @@ export function createSession(
     // reaches here, not only the one later committed for display: a burst
     // coalesced away for `NoteJudged` still counts, and still can reset or
     // complete the hold.
+    const previousTarget =
+      leadPhase.kind === "listening" ? leadPhase.target : null;
     const { phase, advanced } = applyJudgement(
       leadPhase,
       reading,
@@ -1024,6 +1100,14 @@ export function createSession(
         for (const listener of targetAdvancedListeners) {
           listener(advancedEvent);
         }
+        // practice.session/REQ-017 — "<previous note> held ✓" from this
+        // advance until the first reading against the new target or
+        // HELD_TICK_MS of silence, whichever first (armLeadJustHeldTimer,
+        // below).
+        if (previousTarget !== null) armLeadJustHeld(previousTarget.note);
+        // practice.session/REQ-018 — the tone cue for the new target, the
+        // first included at startLead()/restartLeadIfRunning() too.
+        armCueTone(phase.target);
       } else if (phase.kind === "complete") {
         // practice.session/REQ-015/S3 — the last note of a non-looping run
         // held: listening ends here, the same release stop()'s lead branch
@@ -1138,6 +1222,113 @@ export function createSession(
     leadPendingReading = null;
   }
 
+  // practice.session/REQ-017 — "<previous note> held ✓" cleared, and its
+  // HELD_TICK_MS timer cancelled: a no-op when nothing is held. Called by
+  // the first surviving detection after an advance (onPitchDetected, above)
+  // and by every place a lead run's own state is otherwise forgotten
+  // (stop(), restartLeadIfRunning(), a mid-run failure) so a stale timer
+  // never fires after the run it belonged to has moved on.
+  function clearLeadJustHeld(): void {
+    if (leadJustHeld === null) return;
+    leadJustHeldCancel?.();
+    leadJustHeldCancel = null;
+    invalidateSnapshot();
+    leadJustHeld = null;
+  }
+
+  // practice.session/REQ-017 — sets "<note> held ✓" on an advance and arms
+  // the HELD_TICK_MS timer that clears it again if no reading against the
+  // new target arrives first (clearLeadJustHeld, above, called by the
+  // first one that does).
+  function armLeadJustHeld(note: Note): void {
+    invalidateSnapshot();
+    leadJustHeld = note;
+    leadJustHeldCancel?.();
+    leadJustHeldCancel = clock.setTimeout(() => {
+      leadJustHeldCancel = null;
+      invalidateSnapshot();
+      leadJustHeld = null;
+      notifyChange();
+    }, HELD_TICK_MS);
+  }
+
+  // practice.session/REQ-018 — stops a sounding (or still-releasing) cue
+  // tone, the same way `endTapIfSounding` stops a tapped note — called
+  // wherever a lead run ends or restarts, so a cue never outlasts the run
+  // or target it was sounding for.
+  function stopCueIfSounding(): void {
+    if (cueTag === null) return;
+    sound.post({ kind: "stop", tag: cueTag });
+    cueTag = null;
+  }
+
+  // practice.session/REQ-018 — the tone cue: sounds `target` as it becomes
+  // the target (the first on start, every advance, every restart of
+  // REQ-019), a no-op when the cue is off. `await sound.start()` once, as
+  // `tapNote` does (noticeFromSoundStart's own comment explains why that
+  // stays written inline rather than through a shared async helper); once
+  // sound is confirmed usable, posts the tone and sets `mutedUntilMs` on
+  // `leadPhase` from the same onset `scheduleOneTone` actually used, so the
+  // two can never disagree. Guarded against a run that has moved on (a
+  // stop(), a second advance, a restart) by the time sound.start() settles
+  // — `leadPhase.target !== target` catches a second/different target
+  // becoming current in the meantime, the same reference-identity reasoning
+  // `targetEqual`/`sameNote` elsewhere in this file avoid relying on for
+  // value types, but `LeadTarget` here is compared to the very object this
+  // closure captured, never reconstructed.
+  function armCueTone(target: LeadTarget): void {
+    if (!currentSettings.lead.cueTone) return;
+    const tag = nextCueTag();
+    const atGeneration = leadGeneration;
+
+    function postAndMute(): void {
+      if (
+        listeningOwner !== "lead" ||
+        leadGeneration !== atGeneration ||
+        leadPhase.kind !== "listening" ||
+        leadPhase.target !== target
+      ) {
+        return;
+      }
+      const onsetFrame = scheduleOneTone(
+        pitchHzOf(target.note),
+        CUE_TONE_MS,
+        tag,
+      );
+      cueTag = tag;
+      const onsetMs = (onsetFrame * 1000) / sound.sampleRate();
+      invalidateSnapshot();
+      leadPhase = {
+        ...leadPhase,
+        mutedUntilMs: onsetMs + CUE_TONE_MS + TONE_RELEASE_MS + CUE_TAIL_MS,
+      };
+      notifyChange();
+    }
+
+    if (soundReady) {
+      postAndMute();
+      return;
+    }
+
+    void (async () => {
+      let result: Result<void, SoundUnavailable>;
+      try {
+        result = await sound.start();
+      } catch (cause) {
+        result = {
+          ok: false,
+          error: { reason: "no-audio-context", detail: String(cause) },
+        };
+      }
+      if (!noticeFromSoundStart(result)) {
+        invalidateSnapshot();
+        notifyChange();
+        return;
+      }
+      postAndMute();
+    })();
+  }
+
   // practice.tuner/REQ-002 — subscribed once, for the session's whole
   // lifetime (not per enterTuner()/leaveTuner()): onPitchDetected itself
   // checks tunerActive and the listening state, the same shape as
@@ -1174,6 +1365,8 @@ export function createSession(
     leadReading = null;
     leadSmoothing = initialSmoothingState;
     cancelLeadTimers();
+    stopCueIfSounding();
+    clearLeadJustHeld();
     releaseWakeLockIfSilent();
     notifyChange();
   });
@@ -1372,10 +1565,9 @@ export function createSession(
               )
             : 0,
         // commitLeadReading() commits a judged reading onto this field the
-        // same way commitTunerReading() does for the tuner. T011 sets
-        // justHeld on an advance — it does not exist yet.
+        // same way commitTunerReading() does for the tuner.
         reading: leadReading,
-        justHeld: null,
+        justHeld: leadJustHeld,
         idleCaption: leadIdleCaptionOf(currentSettings.lead),
         completeCaption: leadCompleteCaptionOf(leadPhase),
       },
@@ -1506,6 +1698,10 @@ export function createSession(
       leadReading = null;
       leadSmoothing = initialSmoothingState;
       cancelLeadTimers();
+      // practice.session/REQ-018 — a sounding (or still-releasing) cue tone
+      // stops here too — "nothing sounds" once the run has stopped.
+      stopCueIfSounding();
+      clearLeadJustHeld();
       releaseWakeLockIfSilent();
       notifyChange();
       return;
@@ -1742,18 +1938,11 @@ export function createSession(
     // cast.
     function post(note: Note): void {
       const tag = nextTapTag();
-      const onsetFrame = sound.currentFrame() + firstTickLeadFrames();
-      sound.post({
-        kind: "tone",
-        tag,
-        hz: pitchHzOf(note),
-        onsetFrame,
-        durationFrames: tickFramesOf(),
-      });
+      const beatMs = (tickFramesOf() * 1000) / sound.sampleRate();
+      const onsetFrame = scheduleOneTone(pitchHzOf(note), beatMs, tag);
       tappedTag = tag;
 
       const msUntilOnset = msUntilAudible(onsetFrame);
-      const beatMs = (tickFramesOf() * 1000) / sound.sampleRate();
 
       tapHighlightCancel = clock.setTimeout(() => {
         tapHighlightCancel = null;
@@ -1833,6 +2022,8 @@ export function createSession(
     leadSmoothing = initialSmoothingState;
     cancelLeadTimers();
     leadReading = null;
+    stopCueIfSounding();
+    clearLeadJustHeld();
     const target = targetAt(sequence, 1);
     leadPhase = {
       kind: "listening",
@@ -1847,6 +2038,10 @@ export function createSession(
       atFrame: listening.currentFrame(),
     };
     for (const listener of targetAdvancedListeners) listener(advancedEvent);
+    // practice.session/REQ-018, REQ-019 — "a cue changes THE SYSTEM SHALL
+    // apply it at once": the restarted run's own first target gets the cue
+    // too, the same as startLead()'s.
+    armCueTone(target);
   }
 
   function restartIfPlaying(): void {
@@ -2072,6 +2267,9 @@ export function createSession(
             for (const listener of targetAdvancedListeners) {
               listener(advancedEvent);
             }
+            // practice.session/REQ-018 — the tone cue, the first target
+            // included.
+            armCueTone(target);
           } else {
             // practice.session/REQ-022 — the attempt ends here rather than
             // leaving `listeningOwner` claimed: nothing is actually
diff --git a/tests/practice/scenarios/lead-cues.test.ts b/tests/practice/scenarios/lead-cues.test.ts
new file mode 100644
index 0000000..cedcf49
--- /dev/null
+++ b/tests/practice/scenarios/lead-cues.test.ts
@@ -0,0 +1,67 @@
+import { expect, test } from "vitest";
+import type { NoteJudged } from "../../../src/practice/published";
+import { CUE_TAIL_MS, CUE_TONE_MS } from "../../../src/practice/published";
+import { isTone } from "../fakes";
+import {
+  frameOfMs,
+  hearAt,
+  hearSteady,
+  leadFixture,
+  leadSettings,
+  letGapPass,
+  startLead,
+} from "../lead-helpers";
+
+test("practice.session/REQ-018/S2 — the tone sounds each target", async () => {
+  const f = leadFixture(leadSettings({ cueTone: true }));
+  await startLead(f.session);
+  await Promise.resolve();
+  await Promise.resolve();
+  const tones = f.sound.posted.filter(isTone);
+  expect(tones).toHaveLength(1);
+  expect(tones[0]!.hz).toBeCloseTo(261.63, 1);
+  expect(tones[0]!.durationFrames).toBe(frameOfMs(CUE_TONE_MS));
+  expect(tones[0]!.tag).toBeGreaterThanOrEqual(4_000_000);
+  const windowMs = CUE_TONE_MS + CUE_TAIL_MS + 200; // past the tone, its release and the tail
+  hearSteady(f, 262.5, windowMs, windowMs + 1300);
+  const after = f.sound.posted.filter(isTone);
+  expect(after).toHaveLength(2);
+  expect(after[1]!.hz).toBeCloseTo(293.66, 1);
+});
+test("practice.session/REQ-018/S3 — the tone is never the learner", async () => {
+  const f = leadFixture({
+    ...leadSettings({ cueTone: true, holdBeats: 1 }),
+    tempoBpm: 150,
+  }); // a 400 ms hold
+  const judged: NoteJudged[] = [];
+  f.session.onNoteJudged((e) => judged.push(e));
+  await startLead(f.session);
+  await Promise.resolve();
+  await Promise.resolve();
+  hearSteady(f, 261.63, 20, 20 + CUE_TONE_MS + CUE_TAIL_MS); // the tool's own tone, fed back, in tune
+  expect(judged).toEqual([]);
+  expect(f.session.snapshot().lead.heldFraction).toBe(0);
+  expect(f.session.snapshot().lead.target?.position).toBe(1);
+  expect(f.session.snapshot().lead.reading).toBeNull();
+  hearAt(f, 262.5, 20 + CUE_TONE_MS + CUE_TAIL_MS + 200);
+  expect(judged).toHaveLength(1);
+  expect(judged[0]!.cents).toBe(6); // as detected after the window
+});
+test("practice.session/REQ-018/S4 — tone off", async () => {
+  const f = leadFixture();
+  await startLead(f.session);
+  hearSteady(f, 262.5, 0, 1300);
+  letGapPass(f);
+  hearSteady(f, 293.66, 1700, 3000);
+  letGapPass(f);
+  hearSteady(f, 329.63, 3400, 4700);
+  expect(f.session.snapshot().lead.target?.position).toBe(4);
+  expect(f.sound.posted.filter(isTone)).toEqual([]);
+});
+test("practice.session/REQ-018/S1 — meter off still judges and advances", async () => {
+  const f = leadFixture(leadSettings({ cueMeter: false }));
+  await startLead(f.session);
+  hearSteady(f, 262.5, 0, 1300);
+  expect(f.session.snapshot().lead.target?.position).toBe(2);
+  expect(f.session.snapshot().settings.lead.cueMeter).toBe(false);
+});
diff --git a/tests/practice/scenarios/lead-meter.test.ts b/tests/practice/scenarios/lead-meter.test.ts
index 98a6b0c..c322378 100644
--- a/tests/practice/scenarios/lead-meter.test.ts
+++ b/tests/practice/scenarios/lead-meter.test.ts
@@ -29,3 +29,26 @@ test("practice.session/REQ-017/S1 — silent: no reading, the target highlighted
   expect(f.session.snapshot().lead.target?.runIndex).toBe(0);
   expect(f.session.snapshot().soundingPosition).toBeNull();
 });
+test("practice.session/REQ-017/S4 — 'held ✓' until the first reading on the new target", async () => {
+  const f = leadFixture();
+  await startLead(f.session);
+  hearSteady(f, 262.5, 0, 1240);
+  hearAt(f, 262.5, 1260); // completes the hold → D4
+  expect(f.session.snapshot().lead.target?.position).toBe(2);
+  expect(f.session.snapshot().lead.justHeld).toMatchObject({
+    letter: "C",
+    octave: 4,
+  });
+  hearAt(f, 293.66, 1300);
+  expect(f.session.snapshot().lead.justHeld).toBeNull();
+});
+test("practice.session/REQ-017/S4 — 'held ✓' goes after 0.4 s of silence", async () => {
+  const f = leadFixture();
+  await startLead(f.session);
+  hearSteady(f, 262.5, 0, 1240);
+  hearAt(f, 262.5, 1260);
+  letGapPass(f);
+  expect(f.session.snapshot().lead.justHeld).not.toBeNull();
+  f.clock.advanceMs(100);
+  expect(f.session.snapshot().lead.justHeld).toBeNull();
+});
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/008-learner-leads/tasks/C008_T011.md b/changes/008-learner-leads/tasks/C008_T011.md
index 4659799..325bf8e 100644
--- a/changes/008-learner-leads/tasks/C008_T011.md
+++ b/changes/008-learner-leads/tasks/C008_T011.md
@@ -12,13 +12,13 @@ generated:
   at: 2026-10-02T21:24:27Z
 sdd_id: 008-learner-leads
 sdd_task: C008_T011
-sdd_phase: todo
+sdd_phase: in-progress
 sdd_requirements: [practice.session/REQ-018, practice.session/REQ-017]
 sdd_depends_on: [C008_T002, C008_T005, C008_T010]
 sdd_parked_on: 
 sdd_group: "Phase 2 — The lead run in the Session aggregate"
 sdd_parallel: false
-sdd_attempts: 0
+sdd_attempts: 1
 ---
 
 # C008_T011 · The tone cue and its mute window; "held ✓"
```

## Verdict

_The task reviewer appends its verdict here._

## Verdict

TASK: C008_T011
SPEC: PASS
QUALITY: PASS
FINDINGS:
- none
UNVERIFIED:
- none

<!-- recorded 2026-10-03T09:34:20Z by scripts/record.sh -->
