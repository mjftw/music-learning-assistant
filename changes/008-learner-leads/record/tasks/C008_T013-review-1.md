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
  - resource: git:3bfa7c58761e12318102d19022cb7c0fb04fb41b..35658fe3eb0b42086b1386128417d6f1bddc59ec
generated:
  by: process:review-package.sh
  at: 2026-10-03T09:56:26Z
sdd_id: 008-learner-leads
---

# Review package — C008_T013 · 008-learner-leads

base: `3bfa7c58761e12318102d19022cb7c0fb04fb41b` → head: `35658fe3eb0b42086b1386128417d6f1bddc59ec`

## Commands (run by this script)

### Verify

`pnpm vitest run tests/ui/scenarios/transport-card-lead.test.tsx`

```

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  12 passed (12)
   Start at  10:56:27
   Duration  3.27s (tests 76%, transform 11%, environment 8%, import 6%)

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
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test tests::clicks_only_render_without_large_steps ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
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

- M	src/ui/TransportCard.tsx
- M	src/ui/cents-label.ts
- M	src/ui/theme.ts
- M	tests/ui/scenarios/transport-card-lead.test.tsx

## Diff

```diff
diff --git a/src/ui/TransportCard.tsx b/src/ui/TransportCard.tsx
index 6c0cdf0..d5f867f 100644
--- a/src/ui/TransportCard.tsx
+++ b/src/ui/TransportCard.tsx
@@ -1,6 +1,8 @@
 import type { CSSProperties, JSX } from "react";
-import type { SessionSnapshot, Who } from "../practice/published";
-import { fonts, modeWords, paper } from "./theme";
+import type { LeadTarget, SessionSnapshot, Who } from "../practice/published";
+import { pitchClassLabel, pitchHzOf } from "../theory/published";
+import { judgementLabelOf } from "./cents-label";
+import { fonts, leadCard, modeWords, paper } from "./theme";
 
 // Geometry and colour below are copied verbatim from the vendored visual
 // reference's bottom-panel transport card (changes/003-hear-the-scale/
@@ -169,7 +171,111 @@ function ModeWord(props: {
 const TERM_FONT_SIZE_WORD = 12.5;
 const TERM_FONT_WEIGHT_WORD = 600;
 
-export function TransportCard(props: {
+const JUDGEMENT_FONT_SIZE = 12.5;
+const JUDGEMENT_FONT_WEIGHT = 600;
+
+const NO_MIC_GAP = 4;
+const NO_MIC_TOP_MARGIN = 10;
+const NO_MIC_TITLE_WEIGHT = 600;
+const NO_MIC_BODY_INK = paper.muted;
+
+// The tempo stepper and term button, shared by every card layout — it never
+// changes with the mode or the lead phase (practice.session/REQ-014:
+// "the page unchanged otherwise").
+function TempoStepper(props: {
+  readonly snapshot: SessionSnapshot;
+  readonly onStepTempo: (delta: -2 | 2) => void;
+  readonly onOpenTempo: () => void;
+}): JSX.Element {
+  const { snapshot, onStepTempo, onOpenTempo } = props;
+  return (
+    <div
+      style={{
+        display: "flex",
+        flexDirection: "column",
+        alignItems: "center",
+        gap: RIGHT_GAP,
+        flex: "none",
+      }}
+    >
+      <div
+        style={{
+          display: "flex",
+          alignItems: "center",
+          gap: STEPPER_GAP,
+          border: `1px solid ${STEPPER_BORDER}`,
+          borderRadius: 999,
+          padding: STEPPER_PADDING,
+          background: STEPPER_BACKGROUND,
+        }}
+      >
+        <button
+          type="button"
+          aria-label="Slower"
+          onClick={() => onStepTempo(-2)}
+          style={stepButtonStyle()}
+        >
+          −
+        </button>
+        <div
+          style={{
+            fontFamily: fonts.mono,
+            fontSize: TEMPO_FONT_SIZE,
+            fontWeight: TEMPO_FONT_WEIGHT,
+            minWidth: TEMPO_MIN_WIDTH,
+            textAlign: "center",
+            lineHeight: 1,
+          }}
+        >
+          {snapshot.settings.tempoBpm}
+        </div>
+        <button
+          type="button"
+          aria-label="Faster"
+          onClick={() => onStepTempo(2)}
+          style={stepButtonStyle()}
+        >
+          +
+        </button>
+      </div>
+      <button
+        type="button"
+        onClick={onOpenTempo}
+        style={{
+          fontSize: TERM_FONT_SIZE,
+          fontWeight: TERM_FONT_WEIGHT,
+          lineHeight: 1,
+          color: TERM_INK,
+          whiteSpace: "nowrap",
+          background: "transparent",
+          border: "none",
+          cursor: "pointer",
+          padding: 0,
+        }}
+      >
+        {snapshot.tempoTerm.name}
+      </button>
+    </div>
+  );
+}
+
+function cardShellStyle(): CSSProperties {
+  return {
+    display: "flex",
+    flexDirection: "column",
+    gap: CARD_GAP,
+    padding: CARD_PADDING,
+    background: CARD_BACKGROUND,
+    border: CARD_BORDER,
+    borderRadius: CARD_RADIUS,
+  };
+}
+
+// practice.session/REQ-002, REQ-014, REQ-015 — play along idle/playing, and
+// I lead idle and complete: all four share one start circle (▶/❚❚ or the
+// Tuner glyph), one caption, and a second line that is either the mode
+// words or (once the run has completed) the judgement "All held".
+function IdleCard(props: {
   readonly snapshot: SessionSnapshot;
   readonly onTogglePlay: () => void;
   readonly onStepTempo: (delta: -2 | 2) => void;
@@ -178,21 +284,23 @@ export function TransportCard(props: {
 }): JSX.Element {
   const { snapshot, onTogglePlay, onStepTempo, onOpenTempo, onWho } = props;
   const playing = isPlaying(snapshot.transport);
-  const idleLeading =
-    snapshot.lead.who === "me" && snapshot.lead.phase === "idle";
-  const caption = idleLeading ? snapshot.lead.idleCaption : snapshot.caption;
+  const complete = snapshot.lead.phase === "complete";
+  const tunerGlyphShown =
+    snapshot.lead.who === "me" && (snapshot.lead.phase === "idle" || complete);
+  const caption = complete
+    ? (snapshot.lead.completeCaption ?? "")
+    : snapshot.lead.phase === "idle" && snapshot.lead.who === "me"
+      ? snapshot.lead.idleCaption
+      : snapshot.caption;
+  const judgement = complete ? judgementLabelOf(snapshot.lead) : null;
 
   return (
     <div
       data-testid="transport-card"
       style={{
-        display: "flex",
+        ...cardShellStyle(),
+        flexDirection: "row",
         alignItems: "center",
-        gap: CARD_GAP,
-        padding: CARD_PADDING,
-        background: CARD_BACKGROUND,
-        border: CARD_BORDER,
-        borderRadius: CARD_RADIUS,
       }}
     >
       <button
@@ -200,119 +308,276 @@ export function TransportCard(props: {
         data-testid="start-circle"
         aria-label={playing ? "Stop" : "Play"}
         onClick={onTogglePlay}
+        style={circleStyle()}
+      >
+        <TunerGlyph visible={tunerGlyphShown} />
+        {tunerGlyphShown ? null : playing ? "❚❚" : "▶"}
+      </button>
+      <div
         style={{
-          width: PLAY_SIZE,
-          height: PLAY_SIZE,
-          borderRadius: 999,
-          background: PLAY_BACKGROUND,
-          color: PLAY_INK,
           display: "flex",
-          alignItems: "center",
-          justifyContent: "center",
-          fontSize: PLAY_FONT_SIZE,
-          fontWeight: PLAY_FONT_WEIGHT,
-          lineHeight: 1,
-          border: "none",
-          cursor: "pointer",
-          padding: 0,
-          flex: "none",
+          flexDirection: "column",
+          gap: MIDDLE_GAP,
+          minWidth: 0,
+          flex: 1,
         }}
       >
-        <TunerGlyph visible={idleLeading} />
-        {idleLeading ? null : playing ? "❚❚" : "▶"}
+        <div data-testid="position-caption" style={captionStyle()}>
+          {caption}
+        </div>
+        {judgement === null ? (
+          <ModeWords who={snapshot.lead.who} onWho={onWho} />
+        ) : (
+          <div
+            data-testid="judgement"
+            style={{
+              fontSize: JUDGEMENT_FONT_SIZE,
+              fontWeight: JUDGEMENT_FONT_WEIGHT,
+              color: judgement.ink,
+            }}
+          >
+            {judgement.text}
+          </div>
+        )}
+      </div>
+      <TempoStepper
+        snapshot={snapshot}
+        onStepTempo={onStepTempo}
+        onOpenTempo={onOpenTempo}
+      />
+    </div>
+  );
+}
+
+// practice.session/REQ-015, REQ-017 — the live card: ■ in place of the
+// start circle, the target's letter large in the accent with its octave,
+// the "<k> of <N>" caption and the judgement line.
+function LiveCard(props: {
+  readonly snapshot: SessionSnapshot;
+  readonly target: LeadTarget;
+  readonly onTogglePlay: () => void;
+  readonly onStepTempo: (delta: -2 | 2) => void;
+  readonly onOpenTempo: () => void;
+}): JSX.Element {
+  const { snapshot, target, onTogglePlay, onStepTempo, onOpenTempo } = props;
+  const judgement = judgementLabelOf(snapshot.lead);
+
+  return (
+    <div
+      data-testid="transport-card"
+      style={{
+        ...cardShellStyle(),
+        flexDirection: "row",
+        alignItems: "center",
+      }}
+    >
+      <button
+        type="button"
+        data-testid="stop-circle"
+        aria-label="Stop"
+        onClick={onTogglePlay}
+        style={circleStyle()}
+      >
+        ■
       </button>
       <div
         style={{
           display: "flex",
-          flexDirection: "column",
+          alignItems: "center",
           gap: MIDDLE_GAP,
           minWidth: 0,
           flex: 1,
         }}
       >
+        <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
+          <span
+            data-testid="target-letter"
+            style={{
+              fontFamily: fonts.display,
+              fontSize: leadCard.targetLetterSize,
+              color: paper.accent,
+              lineHeight: 1,
+            }}
+          >
+            {pitchClassLabel(target.note)}
+          </span>
+          <span
+            data-testid="target-octave"
+            style={{
+              fontFamily: fonts.mono,
+              fontSize: leadCard.octaveSize,
+              fontWeight: 600,
+              color: paper.muted,
+            }}
+          >
+            {target.note.octave}
+          </span>
+          <span
+            data-testid="target-hz"
+            aria-hidden="true"
+            style={{ display: "none" }}
+          >
+            {pitchHzOf(target.note).toFixed(1)}
+          </span>
+        </div>
         <div
-          data-testid="position-caption"
           style={{
-            fontFamily: fonts.mono,
-            fontSize: CAPTION_FONT_SIZE,
-            letterSpacing: CAPTION_LETTER_SPACING,
-            color: CAPTION_INK,
-            whiteSpace: "nowrap",
-            overflow: "hidden",
-            textOverflow: "ellipsis",
+            display: "flex",
+            flexDirection: "column",
+            gap: MIDDLE_GAP,
+            minWidth: 0,
           }}
         >
-          {caption}
+          <div data-testid="position-caption" style={captionStyle()}>
+            {`${target.position} of ${snapshot.sequence.length}`}
+          </div>
+          {judgement !== null && (
+            <div
+              data-testid="judgement"
+              style={{
+                fontSize: JUDGEMENT_FONT_SIZE,
+                fontWeight: JUDGEMENT_FONT_WEIGHT,
+                color: judgement.ink,
+              }}
+            >
+              {judgement.text}
+            </div>
+          )}
         </div>
-        <ModeWords who={snapshot.lead.who} onWho={onWho} />
+      </div>
+      <TempoStepper
+        snapshot={snapshot}
+        onStepTempo={onStepTempo}
+        onOpenTempo={onOpenTempo}
+      />
+    </div>
+  );
+}
+
+// practice.session/REQ-022 — "Can't hear — no microphone" with its
+// explanation, the start circle and the mode words still shown; nothing
+// modal.
+function NoMicCard(props: {
+  readonly snapshot: SessionSnapshot;
+  readonly onTogglePlay: () => void;
+  readonly onStepTempo: (delta: -2 | 2) => void;
+  readonly onOpenTempo: () => void;
+  readonly onWho: (who: Who) => void;
+}): JSX.Element {
+  const { snapshot, onTogglePlay, onStepTempo, onOpenTempo, onWho } = props;
+
+  return (
+    <div data-testid="transport-card" style={cardShellStyle()}>
+      <div style={{ display: "flex", alignItems: "center", gap: CARD_GAP }}>
+        <button
+          type="button"
+          data-testid="start-circle"
+          aria-label="Play"
+          onClick={onTogglePlay}
+          style={circleStyle()}
+        >
+          <TunerGlyph visible />
+        </button>
+        <div
+          style={{
+            display: "flex",
+            flexDirection: "column",
+            gap: MIDDLE_GAP,
+            minWidth: 0,
+            flex: 1,
+          }}
+        >
+          <div data-testid="position-caption" style={captionStyle()}>
+            {snapshot.lead.idleCaption}
+          </div>
+          <ModeWords who={snapshot.lead.who} onWho={onWho} />
+        </div>
+        <TempoStepper
+          snapshot={snapshot}
+          onStepTempo={onStepTempo}
+          onOpenTempo={onOpenTempo}
+        />
       </div>
       <div
+        data-testid="no-mic-card"
         style={{
           display: "flex",
           flexDirection: "column",
-          alignItems: "center",
-          gap: RIGHT_GAP,
-          flex: "none",
+          gap: NO_MIC_GAP,
+          marginTop: NO_MIC_TOP_MARGIN,
         }}
       >
         <div
           style={{
-            display: "flex",
-            alignItems: "center",
-            gap: STEPPER_GAP,
-            border: `1px solid ${STEPPER_BORDER}`,
-            borderRadius: 999,
-            padding: STEPPER_PADDING,
-            background: STEPPER_BACKGROUND,
+            fontSize: leadCard.noMicTitleSize,
+            fontWeight: NO_MIC_TITLE_WEIGHT,
+            color: paper.ink,
           }}
         >
-          <button
-            type="button"
-            aria-label="Slower"
-            onClick={() => onStepTempo(-2)}
-            style={stepButtonStyle()}
-          >
-            −
-          </button>
-          <div
-            style={{
-              fontFamily: fonts.mono,
-              fontSize: TEMPO_FONT_SIZE,
-              fontWeight: TEMPO_FONT_WEIGHT,
-              minWidth: TEMPO_MIN_WIDTH,
-              textAlign: "center",
-              lineHeight: 1,
-            }}
-          >
-            {snapshot.settings.tempoBpm}
-          </div>
-          <button
-            type="button"
-            aria-label="Faster"
-            onClick={() => onStepTempo(2)}
-            style={stepButtonStyle()}
-          >
-            +
-          </button>
+          Can&apos;t hear — no microphone
         </div>
-        <button
-          type="button"
-          onClick={onOpenTempo}
+        <div
           style={{
-            fontSize: TERM_FONT_SIZE,
-            fontWeight: TERM_FONT_WEIGHT,
-            lineHeight: 1,
-            color: TERM_INK,
-            whiteSpace: "nowrap",
-            background: "transparent",
-            border: "none",
-            cursor: "pointer",
-            padding: 0,
+            fontSize: leadCard.noMicBodySize,
+            lineHeight: leadCard.noMicLineHeight,
+            color: NO_MIC_BODY_INK,
           }}
         >
-          {snapshot.tempoTerm.name}
-        </button>
+          It was refused or isn&apos;t there. Allow the microphone for this
+          site, then press I lead again.
+        </div>
       </div>
     </div>
   );
 }
+
+function circleStyle(): CSSProperties {
+  return {
+    width: PLAY_SIZE,
+    height: PLAY_SIZE,
+    borderRadius: 999,
+    background: PLAY_BACKGROUND,
+    color: PLAY_INK,
+    display: "flex",
+    alignItems: "center",
+    justifyContent: "center",
+    fontSize: PLAY_FONT_SIZE,
+    fontWeight: PLAY_FONT_WEIGHT,
+    lineHeight: 1,
+    border: "none",
+    cursor: "pointer",
+    padding: 0,
+    flex: "none",
+  };
+}
+
+function captionStyle(): CSSProperties {
+  return {
+    fontFamily: fonts.mono,
+    fontSize: CAPTION_FONT_SIZE,
+    letterSpacing: CAPTION_LETTER_SPACING,
+    color: CAPTION_INK,
+    whiteSpace: "nowrap",
+    overflow: "hidden",
+    textOverflow: "ellipsis",
+  };
+}
+
+export function TransportCard(props: {
+  readonly snapshot: SessionSnapshot;
+  readonly onTogglePlay: () => void;
+  readonly onStepTempo: (delta: -2 | 2) => void;
+  readonly onOpenTempo: () => void;
+  readonly onWho: (who: Who) => void;
+}): JSX.Element {
+  const { snapshot } = props;
+  const { lead } = snapshot;
+
+  if (lead.phase === "listening" && lead.target !== null) {
+    return <LiveCard {...props} target={lead.target} />;
+  }
+  if (lead.phase === "cannot-hear") {
+    return <NoMicCard {...props} />;
+  }
+  return <IdleCard {...props} />;
+}
diff --git a/src/ui/cents-label.ts b/src/ui/cents-label.ts
index 0a5d91a..75e618a 100644
--- a/src/ui/cents-label.ts
+++ b/src/ui/cents-label.ts
@@ -1,3 +1,7 @@
+import type { LeadSnapshot } from "../practice/published";
+import { noteLabel } from "../theory/published";
+import { paper, tuner } from "./theme";
+
 // "+12" / "−16" / "0" — U+2212 MINUS SIGN, not a hyphen (matches the
 // vendored reference's own `k > 0 ? "+"+k : "−"+(-k)`). Shared by every
 // tuner view that writes a signed cents value (TunerLevel's tag, TunerStave's
@@ -9,3 +13,35 @@ export function formatCents(cents: number): string {
   if (cents < 0) return `−${-cents}`;
   return "0";
 }
+
+// practice.session/REQ-017, REQ-015/S3, REQ-022 — the live card's judgement
+// line: "Play <target>" muted while nothing is detected, the signed cents
+// out of tune, "in tune · holding" in tune, "<previous note> held ✓" from an
+// advance until the first reading against the new target, and "All held"
+// once the run completes. `null` while idle or cannot-hear — those cards
+// show no judgement line at all.
+export function judgementLabelOf(
+  lead: LeadSnapshot,
+): { readonly text: string; readonly ink: string } | null {
+  if (lead.phase === "complete") {
+    return { text: "All held", ink: tuner.inTune };
+  }
+  if (lead.phase !== "listening" || lead.target === null) return null;
+  if (lead.justHeld !== null) {
+    return { text: `${noteLabel(lead.justHeld)} held ✓`, ink: tuner.inTune };
+  }
+  if (lead.reading === null) {
+    return { text: `Play ${noteLabel(lead.target.note)}`, ink: paper.faint };
+  }
+  const { cents, verdict } = lead.reading;
+  if (verdict === "in-tune") {
+    return { text: "in tune · holding", ink: tuner.inTune };
+  }
+  if (verdict === "flat") {
+    return {
+      text: `↓ ${Math.abs(Math.round(cents))} ¢ flat`,
+      ink: tuner.flat,
+    };
+  }
+  return { text: `↑ ${Math.round(cents)} ¢ sharp`, ink: tuner.sharp };
+}
diff --git a/src/ui/theme.ts b/src/ui/theme.ts
index da9ce9b..dbde864 100644
--- a/src/ui/theme.ts
+++ b/src/ui/theme.ts
@@ -52,6 +52,16 @@ export const lead = {
   holdFill: "oklch(0.80 0.07 150)",
 } as const;
 
+// practice.session/REQ-015, REQ-017, REQ-022 — the live lead card's target
+// letter and octave, and the no-mic card's title and body copy.
+export const leadCard = {
+  targetLetterSize: 40,
+  octaveSize: 12,
+  noMicTitleSize: 14,
+  noMicBodySize: 12.5,
+  noMicLineHeight: 1.45,
+} as const;
+
 // practice.session/REQ-014 — the mode words beneath the caption, and the
 // Tuner glyph drawn in the start circle while I lead is idle.
 export const modeWords = {
diff --git a/tests/ui/scenarios/transport-card-lead.test.tsx b/tests/ui/scenarios/transport-card-lead.test.tsx
index bec52e1..5dc01b6 100644
--- a/tests/ui/scenarios/transport-card-lead.test.tsx
+++ b/tests/ui/scenarios/transport-card-lead.test.tsx
@@ -1,6 +1,14 @@
 import { act, cleanup, screen } from "@testing-library/react";
 import { afterEach, expect, test } from "vitest";
-import { flushApp, renderLeadApp, storedCMajor } from "./lead-app-helpers";
+import {
+  flushApp,
+  hearInApp,
+  hearSteadyInApp,
+  renderLeadApp,
+  silenceInApp,
+  startLeadInApp,
+  storedCMajor,
+} from "./lead-app-helpers";
 
 afterEach(cleanup);
 
@@ -95,3 +103,115 @@ test("practice.session/REQ-002/S1 · practice.session/REQ-014/S5 (card) — play
   );
   expect(screen.getByTestId("start-circle").textContent).toContain("❚❚");
 });
+
+test("practice.session/REQ-015/S1 (card) — the live card", async () => {
+  const app = renderLeadApp(storedCMajor({ who: "me" }));
+  await startLeadInApp(app);
+  expect(screen.getByTestId("stop-circle").textContent).toBe("■");
+  expect(screen.getByTestId("target-letter").textContent).toBe("C");
+  expect(screen.getByTestId("target-octave").textContent).toBe("4");
+  expect(screen.getByTestId("position-caption").textContent).toBe("1 of 15");
+  expect(screen.getByTestId("judgement").textContent).toBe("Play C4");
+  expect(screen.getByTestId("judgement").style.color).toBe(
+    "rgb(154, 145, 134)",
+  );
+});
+
+test("practice.session/REQ-017/S2 (card) — flat and sharp", async () => {
+  const app = renderLeadApp(storedCMajor({ who: "me" }));
+  await startLeadInApp(app);
+  hearInApp(app, 258.92, 0);
+  expect(screen.getByTestId("judgement").textContent).toBe("↓ 18 ¢ flat");
+  expect(screen.getByTestId("judgement").style.color).toBe(
+    "oklch(0.55 0.11 258)",
+  );
+  silenceInApp(app, 300);
+  hearInApp(app, 263.45, 500);
+  expect(screen.getByTestId("judgement").textContent).toBe("↑ 12 ¢ sharp");
+  expect(screen.getByTestId("judgement").style.color).toBe(
+    "oklch(0.55 0.11 28)",
+  );
+});
+
+test("practice.session/REQ-017/S3 (card) — holding", async () => {
+  const app = renderLeadApp(storedCMajor({ who: "me" }));
+  await startLeadInApp(app);
+  hearSteadyInApp(app, 262.5, 0, 750);
+  expect(screen.getByTestId("judgement").textContent).toBe("in tune · holding");
+  expect(screen.getByTestId("judgement").style.color).toBe(
+    "oklch(0.55 0.11 150)",
+  );
+});
+
+test("practice.session/REQ-017/S4 (card) — advanced", async () => {
+  const app = renderLeadApp(storedCMajor({ who: "me" }));
+  await startLeadInApp(app);
+  // Steady to 1240 ms, then one further reading at 1260 ms that completes
+  // the hold (still C4's own judgement, committed before the advance) —
+  // mirrors tests/practice/scenarios/lead-meter.test.ts's own REQ-017/S4,
+  // which stops here for the same reason: one more continuous reading past
+  // this point is itself "the first reading against the new target"
+  // (session.ts's clearLeadJustHeld, called on every surviving detection)
+  // and would clear "held ✓" before this assertion ever saw it.
+  hearSteadyInApp(app, 262.5, 0, 1240);
+  hearInApp(app, 262.5, 1260);
+  expect(screen.getByTestId("target-letter").textContent).toBe("D");
+  expect(screen.getByTestId("position-caption").textContent).toBe("2 of 15");
+  expect(screen.getByTestId("judgement").textContent).toBe("C4 held ✓");
+  expect(screen.getByTestId("judgement").style.color).toBe(
+    "oklch(0.55 0.11 150)",
+  );
+  hearInApp(app, 293.66, 1300);
+  expect(screen.getByTestId("judgement").textContent).toBe("in tune · holding");
+});
+
+test("practice.session/REQ-017/S5 (card) — pinned beyond ±50 ¢", async () => {
+  const app = renderLeadApp(storedCMajor({ who: "me" }));
+  await startLeadInApp(app);
+  hearInApp(app, 523.25, 0);
+  expect(screen.getByTestId("judgement").textContent).toBe("↑ 1200 ¢ sharp");
+});
+
+// Driving all 15 notes of the run, each a full 1300 ms hold plus a 300 ms
+// gap, means ~1800 hearInApp/act() calls — comfortably under 5 s alone, but
+// past vitest's default per-test timeout under full-suite load; given its
+// own budget rather than a shorter, looser scenario (docs/engineering.md's
+// test-through-the-published-interface rule leaves no cheaper way to reach
+// "run complete" than playing the whole run through).
+test("practice.session/REQ-015/S3 (card) — the complete card", async () => {
+  const app = renderLeadApp(
+    storedCMajor(
+      { who: "me" },
+      { session: { ...storedCMajor().session, loop: false } },
+    ),
+  );
+  await startLeadInApp(app);
+  let t = 0;
+  for (let n = 0; n < 15; n += 1) {
+    const hz = Number(screen.getByTestId("target-hz").textContent);
+    hearSteadyInApp(app, hz, t, t + 1300);
+    silenceInApp(app, 300);
+    t += 1700;
+  }
+  expect(screen.getByTestId("tuner-glyph")).toBeTruthy();
+  expect(screen.getByTestId("position-caption").textContent).toBe(
+    "15 of 15 held · C4–C5",
+  );
+  expect(screen.getByTestId("judgement").textContent).toBe("All held");
+  expect(app.listening.stopCalls).toBe(1);
+}, 15000);
+
+test("practice.session/REQ-022/S1 (card) — the no-mic card", async () => {
+  const app = renderLeadApp(storedCMajor({ who: "me" }));
+  app.listening.failWith = "refused";
+  await startLeadInApp(app);
+  expect(screen.getByTestId("no-mic-card").textContent).toContain(
+    "Can't hear — no microphone",
+  );
+  expect(screen.getByTestId("no-mic-card").textContent).toContain(
+    "It was refused or isn't there. Allow the microphone for this site, then press I lead again.",
+  );
+  expect(screen.getByTestId("start-circle")).toBeTruthy();
+  expect(screen.getByTestId("mode-word-me")).toBeTruthy();
+  expect(screen.queryByRole("dialog")).toBeNull();
+});
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

## Verdict

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

<!-- recorded 2026-10-03T09:59:21Z by scripts/record.sh -->
