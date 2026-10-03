---
type: Task Review
title: Review package — C008_T013 · 008-learner-leads
description: The diff produced for C008_T013, with its Verify and check output, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/C008_T013.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/tasks/C008_T013.md
  - resource: /.sdd/briefs/008-learner-leads/C008_T013.md
  - resource: git:3bfa7c58761e12318102d19022cb7c0fb04fb41b..d1fad8fd6790911d8714d015b1d7632c19b7e0cc
  - resource: /changes/008-learner-leads/record/tasks/C008_T013-review-1.md
generated:
  by: process:review-package.sh
  at: 2026-10-03T23:26:17Z
sdd_id: 008-learner-leads
---

# Review package — C008_T013 · 008-learner-leads

base: `3bfa7c58761e12318102d19022cb7c0fb04fb41b` → head: `d1fad8fd6790911d8714d015b1d7632c19b7e0cc`

**Incremental review.** The previous attempt (head `35658fe3eb0b42086b1386128417d6f1bddc59ec`) was
reviewed in full; its verdict is below. Re-check each of its findings
against the diff since, and review the new diff through every stage.
The earlier diff is listed by file only: it was already reviewed.

## Previous verdict




TASK: C008_T013
SPEC: FAIL
QUALITY: SKIPPED (spec failed)
FINDINGS:
- [important] src/ui/TransportCard.tsx:299-312,428-429 (LiveCard) — practice.session/REQ-014 requires the mode words "in every transport state" and REQ-002 (MODIFIED) requires "in every state the card SHALL carry the mode words beneath the caption where the progress bar was, and no progress bar" — the live (listening) card renders only the judgement line in that slot and never the mode words (confirmed in the diff: `LiveCard`'s second row is `judgement !== null && <div data-testid="judgement">…` with no `ModeWords` fallback).
- [important] src/ui/TransportCard.tsx:244,299-300 (IdleCard, complete phase) — same REQ-014/REQ-002 requirement — the complete card likewise shows only "All held" (`judgement`) in that row, never the mode words, confirmed by `IdleCard`'s `judgement === null ? <ModeWords/> : <div data-testid="judgement">…`, which only shows mode words when `judgement` is null (never true once `complete`).
- [important] src/ui/TransportCard.tsx:278-534 — the brief's Step 5 explicitly requires "the card's three layouts … are three small components in the same file, each under 60 lines"; measured from the diff, `IdleCard` is 77 lines, `LiveCard` is 105 lines, and `NoMicCard` is 74 lines — none meets the 60-line bound.
UNVERIFIED:
- practice.session/REQ-015/S1, REQ-017/S1–S8 (card visuals) — the task's Verify line also requires `design_snapshot.py` screenshots (`practice--listening-silent.png`, `practice--heard-out-of-tune.png`, `practice--holding.png`, `practice--advanced.png`, `practice--complete.png`, `practice--no-microphone.png`) to match canvas phones 03–08; the package records only the vitest run, not this visual check, and it cannot be judged from the diff.
COMMANDS:
package only


## Commands (run by this script)

### Verify

`pnpm vitest run tests/ui/scenarios/transport-card-lead.test.tsx`

```

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  12 passed (12)
   Start at  00:26:17
   Duration  3.65s (tests 77%, transform 10%, environment 7%, import 6%)

```

exit status: 0 ✅

### check

`pnpm check`

```
test drone::tests::reed_drone_render_cost ... ignored
test tests::an_unknown_sound_code_is_refused ... ok
test click::tests::accent_is_louder_and_lower ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test click::tests::click_lasts_25_ms ... ok
test voices::tests::stop_fades_only_the_voice_with_that_tag ... ok
test voices::tests::a_voice_is_reported_only_once ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tone::tests::tone_is_silent_before_its_next_onset ... ok
test tests::a_sound_change_crossfade_is_never_silent ... ok
test tests::a_drone_renders_without_large_steps_across_attack_and_stop ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::tones_and_clicks_together_render_without_large_steps ... ok
test tests::clicks_only_render_without_large_steps ... ok
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::tones_only_render_without_large_steps ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
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

- M	src/ui/TransportCard.tsx
- M	src/ui/cents-label.ts
- M	src/ui/theme.ts
- M	tests/ui/scenarios/transport-card-lead.test.tsx

## Diff since the previous attempt (`35658fe3eb0b42086b1386128417d6f1bddc59ec` → head)

```diff
diff --git a/src/ui/TransportCard.tsx b/src/ui/TransportCard.tsx
index d5f867f..a9317d4 100644
--- a/src/ui/TransportCard.tsx
+++ b/src/ui/TransportCard.tsx
@@ -174,11 +174,157 @@ const TERM_FONT_WEIGHT_WORD = 600;
 const JUDGEMENT_FONT_SIZE = 12.5;
 const JUDGEMENT_FONT_WEIGHT = 600;
 
+const MODE_WORDS_ROW_MARGIN_TOP = 1;
+
 const NO_MIC_GAP = 4;
 const NO_MIC_TOP_MARGIN = 10;
 const NO_MIC_TITLE_WEIGHT = 600;
 const NO_MIC_BODY_INK = paper.muted;
 
+// practice.session/REQ-002, REQ-014 — the mode words, in every transport
+// state, as their own sibling row beneath the target line or caption.
+function ModeWordsRow(props: {
+  readonly who: Who;
+  readonly onWho: (who: Who) => void;
+}): JSX.Element {
+  return (
+    <div style={{ marginTop: MODE_WORDS_ROW_MARGIN_TOP }}>
+      <ModeWords who={props.who} onWho={props.onWho} />
+    </div>
+  );
+}
+
+// practice.session/REQ-016, REQ-017 — the judgement line, shared by the
+// idle card's complete sub-caption and the live card's target line.
+function JudgementLine(props: {
+  readonly judgement: { readonly text: string; readonly ink: string };
+}): JSX.Element {
+  return (
+    <div
+      data-testid="judgement"
+      style={{
+        fontSize: JUDGEMENT_FONT_SIZE,
+        fontWeight: JUDGEMENT_FONT_WEIGHT,
+        color: props.judgement.ink,
+      }}
+    >
+      {props.judgement.text}
+    </div>
+  );
+}
+
+// practice.session/REQ-015 — the target's letter, octave and the hidden Hz
+// span, shared by the live card's target line.
+function TargetLetterOctave(props: {
+  readonly target: LeadTarget;
+}): JSX.Element {
+  const { target } = props;
+  return (
+    <>
+      <span
+        data-testid="target-letter"
+        style={{
+          fontFamily: fonts.display,
+          fontSize: leadCard.targetLetterSize,
+          color: paper.accent,
+          lineHeight: 1,
+        }}
+      >
+        {pitchClassLabel(target.note)}
+      </span>
+      <span
+        data-testid="target-octave"
+        style={{
+          fontFamily: fonts.mono,
+          fontSize: leadCard.octaveSize,
+          fontWeight: 600,
+          color: paper.muted,
+        }}
+      >
+        {target.note.octave}
+      </span>
+      <span
+        data-testid="target-hz"
+        aria-hidden="true"
+        style={{ display: "none" }}
+      >
+        {pitchHzOf(target.note).toFixed(1)}
+      </span>
+    </>
+  );
+}
+
+// practice.session/REQ-022 — the no-mic message block, shared by NoMicCard
+// alone but kept apart so the card stays under 60 lines.
+function NoMicMessage(): JSX.Element {
+  return (
+    <div
+      data-testid="no-mic-card"
+      style={{
+        display: "flex",
+        flexDirection: "column",
+        gap: NO_MIC_GAP,
+        marginTop: NO_MIC_TOP_MARGIN,
+      }}
+    >
+      <div
+        style={{
+          fontSize: leadCard.noMicTitleSize,
+          fontWeight: NO_MIC_TITLE_WEIGHT,
+          color: paper.ink,
+        }}
+      >
+        Can&apos;t hear — no microphone
+      </div>
+      <div
+        style={{
+          fontSize: leadCard.noMicBodySize,
+          lineHeight: leadCard.noMicLineHeight,
+          color: NO_MIC_BODY_INK,
+        }}
+      >
+        It was refused or isn&apos;t there. Allow the microphone for this site,
+        then press I lead again.
+      </div>
+    </div>
+  );
+}
+
+// practice.session/REQ-015, REQ-017 — the live card's small column beside
+// the target letter: the "<k> of <N>" caption over the judgement.
+function TargetCaptionAndJudgement(props: {
+  readonly caption: string;
+  readonly judgement: { readonly text: string; readonly ink: string } | null;
+}): JSX.Element {
+  return (
+    <div
+      style={{
+        display: "flex",
+        flexDirection: "column",
+        gap: MIDDLE_GAP,
+        minWidth: 0,
+      }}
+    >
+      <div data-testid="position-caption" style={captionStyle()}>
+        {props.caption}
+      </div>
+      {props.judgement !== null && (
+        <JudgementLine judgement={props.judgement} />
+      )}
+    </div>
+  );
+}
+
+function middleColumnStyle(): CSSProperties {
+  return {
+    display: "flex",
+    flexDirection: "column",
+    gap: MIDDLE_GAP,
+    minWidth: 0,
+    flex: 1,
+  };
+}
+
 // The tempo stepper and term button, shared by every card layout — it never
 // changes with the mode or the lead phase (practice.session/REQ-014:
 // "the page unchanged otherwise").
@@ -272,9 +418,8 @@ function cardShellStyle(): CSSProperties {
 }
 
 // practice.session/REQ-002, REQ-014, REQ-015 — play along idle/playing, and
-// I lead idle and complete: all four share one start circle (▶/❚❚ or the
-// Tuner glyph), one caption, and a second line that is either the mode
-// words or (once the run has completed) the judgement "All held".
+// I lead idle and complete: one start circle (▶/❚❚ or the Tuner glyph), one
+// caption, the judgement once complete, and the mode words beneath — always.
 function IdleCard(props: {
   readonly snapshot: SessionSnapshot;
   readonly onTogglePlay: () => void;
@@ -313,32 +458,12 @@ function IdleCard(props: {
         <TunerGlyph visible={tunerGlyphShown} />
         {tunerGlyphShown ? null : playing ? "❚❚" : "▶"}
       </button>
-      <div
-        style={{
-          display: "flex",
-          flexDirection: "column",
-          gap: MIDDLE_GAP,
-          minWidth: 0,
-          flex: 1,
-        }}
-      >
+      <div style={middleColumnStyle()}>
         <div data-testid="position-caption" style={captionStyle()}>
           {caption}
         </div>
-        {judgement === null ? (
-          <ModeWords who={snapshot.lead.who} onWho={onWho} />
-        ) : (
-          <div
-            data-testid="judgement"
-            style={{
-              fontSize: JUDGEMENT_FONT_SIZE,
-              fontWeight: JUDGEMENT_FONT_WEIGHT,
-              color: judgement.ink,
-            }}
-          >
-            {judgement.text}
-          </div>
-        )}
+        {judgement !== null && <JudgementLine judgement={judgement} />}
+        <ModeWordsRow who={snapshot.lead.who} onWho={onWho} />
       </div>
       <TempoStepper
         snapshot={snapshot}
@@ -349,17 +474,19 @@ function IdleCard(props: {
   );
 }
 
-// practice.session/REQ-015, REQ-017 — the live card: ■ in place of the
-// start circle, the target's letter large in the accent with its octave,
-// the "<k> of <N>" caption and the judgement line.
+// practice.session/REQ-015, REQ-017 — the live card: ■ in place of the start
+// circle, the target line (letter, octave, caption and judgement) and the
+// mode words beneath it as their own row, in every state.
 function LiveCard(props: {
   readonly snapshot: SessionSnapshot;
   readonly target: LeadTarget;
   readonly onTogglePlay: () => void;
   readonly onStepTempo: (delta: -2 | 2) => void;
   readonly onOpenTempo: () => void;
+  readonly onWho: (who: Who) => void;
 }): JSX.Element {
-  const { snapshot, target, onTogglePlay, onStepTempo, onOpenTempo } = props;
+  const { snapshot, target, onTogglePlay, onStepTempo, onOpenTempo, onWho } =
+    props;
   const judgement = judgementLabelOf(snapshot.lead);
 
   return (
@@ -380,70 +507,17 @@ function LiveCard(props: {
       >
         ■
       </button>
-      <div
-        style={{
-          display: "flex",
-          alignItems: "center",
-          gap: MIDDLE_GAP,
-          minWidth: 0,
-          flex: 1,
-        }}
-      >
-        <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
-          <span
-            data-testid="target-letter"
-            style={{
-              fontFamily: fonts.display,
-              fontSize: leadCard.targetLetterSize,
-              color: paper.accent,
-              lineHeight: 1,
-            }}
-          >
-            {pitchClassLabel(target.note)}
-          </span>
-          <span
-            data-testid="target-octave"
-            style={{
-              fontFamily: fonts.mono,
-              fontSize: leadCard.octaveSize,
-              fontWeight: 600,
-              color: paper.muted,
-            }}
-          >
-            {target.note.octave}
-          </span>
-          <span
-            data-testid="target-hz"
-            aria-hidden="true"
-            style={{ display: "none" }}
-          >
-            {pitchHzOf(target.note).toFixed(1)}
-          </span>
-        </div>
+      <div style={middleColumnStyle()}>
         <div
-          style={{
-            display: "flex",
-            flexDirection: "column",
-            gap: MIDDLE_GAP,
-            minWidth: 0,
-          }}
+          style={{ display: "flex", alignItems: "baseline", gap: MIDDLE_GAP }}
         >
-          <div data-testid="position-caption" style={captionStyle()}>
-            {`${target.position} of ${snapshot.sequence.length}`}
-          </div>
-          {judgement !== null && (
-            <div
-              data-testid="judgement"
-              style={{
-                fontSize: JUDGEMENT_FONT_SIZE,
-                fontWeight: JUDGEMENT_FONT_WEIGHT,
-                color: judgement.ink,
-              }}
-            >
-              {judgement.text}
-            </div>
-          )}
+          <TargetLetterOctave target={target} />
+          <TargetCaptionAndJudgement
+            caption={`${target.position} of ${snapshot.sequence.length}`}
+            judgement={judgement}
+          />
         </div>
+        <ModeWordsRow who={snapshot.lead.who} onWho={onWho} />
       </div>
       <TempoStepper
         snapshot={snapshot}
@@ -478,15 +552,7 @@ function NoMicCard(props: {
         >
           <TunerGlyph visible />
         </button>
-        <div
-          style={{
-            display: "flex",
-            flexDirection: "column",
-            gap: MIDDLE_GAP,
-            minWidth: 0,
-            flex: 1,
-          }}
-        >
+        <div style={middleColumnStyle()}>
           <div data-testid="position-caption" style={captionStyle()}>
             {snapshot.lead.idleCaption}
           </div>
@@ -498,35 +564,7 @@ function NoMicCard(props: {
           onOpenTempo={onOpenTempo}
         />
       </div>
-      <div
-        data-testid="no-mic-card"
-        style={{
-          display: "flex",
-          flexDirection: "column",
-          gap: NO_MIC_GAP,
-          marginTop: NO_MIC_TOP_MARGIN,
-        }}
-      >
-        <div
-          style={{
-            fontSize: leadCard.noMicTitleSize,
-            fontWeight: NO_MIC_TITLE_WEIGHT,
-            color: paper.ink,
-          }}
-        >
-          Can&apos;t hear — no microphone
-        </div>
-        <div
-          style={{
-            fontSize: leadCard.noMicBodySize,
-            lineHeight: leadCard.noMicLineHeight,
-            color: NO_MIC_BODY_INK,
-          }}
-        >
-          It was refused or isn&apos;t there. Allow the microphone for this
-          site, then press I lead again.
-        </div>
-      </div>
+      <NoMicMessage />
     </div>
   );
 }
diff --git a/tests/ui/scenarios/transport-card-lead.test.tsx b/tests/ui/scenarios/transport-card-lead.test.tsx
index 5dc01b6..2a65d1b 100644
--- a/tests/ui/scenarios/transport-card-lead.test.tsx
+++ b/tests/ui/scenarios/transport-card-lead.test.tsx
@@ -115,6 +115,11 @@ test("practice.session/REQ-015/S1 (card) — the live card", async () => {
   expect(screen.getByTestId("judgement").style.color).toBe(
     "rgb(154, 145, 134)",
   );
+  expect(screen.getByTestId("mode-word-tool")).toBeTruthy();
+  expect(screen.getByTestId("mode-word-me")).toBeTruthy();
+  expect(screen.getByTestId("mode-word-me").style.color).toBe(
+    "rgb(28, 25, 22)",
+  );
 });
 
 test("practice.session/REQ-017/S2 (card) — flat and sharp", async () => {
@@ -198,6 +203,8 @@ test("practice.session/REQ-015/S3 (card) — the complete card", async () => {
     "15 of 15 held · C4–C5",
   );
   expect(screen.getByTestId("judgement").textContent).toBe("All held");
+  expect(screen.getByTestId("mode-word-tool")).toBeTruthy();
+  expect(screen.getByTestId("mode-word-me")).toBeTruthy();
   expect(app.listening.stopCalls).toBe(1);
 }, 15000);
 
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/008-learner-leads/tasks/C008_T013.md b/changes/008-learner-leads/tasks/C008_T013.md
index 5cf2f04..24e4cf8 100644
--- a/changes/008-learner-leads/tasks/C008_T013.md
+++ b/changes/008-learner-leads/tasks/C008_T013.md
@@ -12,13 +12,13 @@ generated:
   at: 2026-10-02T21:24:27Z
 sdd_id: 008-learner-leads
 sdd_task: C008_T013
-sdd_phase: todo
+sdd_phase: in-progress
 sdd_requirements: [practice.session/REQ-015, practice.session/REQ-017, practice.session/REQ-022]
 sdd_depends_on: []
 sdd_parked_on: 
 sdd_group: "Phase 3 — The practice screen"
 sdd_parallel: false
-sdd_attempts: 0
+sdd_attempts: 1
 ---
 
 # C008_T013 · The live lead card, the judgement copy, the complete card, the no-mic card
```

## Verdict

_The task reviewer appends its verdict here._
TASK: C008_T013
SPEC: PASS
QUALITY: PASS
FINDINGS:
(none)
UNVERIFIED:
- practice.session/REQ-015/S1, REQ-017/S1–S8 (card visuals) — the task's Verify line also requires design_snapshot.py screenshots (practice--listening-silent.png, practice--heard-out-of-tune.png, practice--holding.png, practice--advanced.png, practice--complete.png, practice--no-microphone.png) to match canvas phones 03–08; the package records only the vitest run, not this visual check, and it cannot be judged from the diff.
COMMANDS:
./scripts/check-contexts.sh → "✅ context boundaries respected"

<!-- recorded 2026-10-03T23:27:55Z by scripts/record.sh -->
