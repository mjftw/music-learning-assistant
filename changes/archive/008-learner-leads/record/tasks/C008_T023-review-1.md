---
type: Task Review
title: Review package — C008_T023 · 008-learner-leads
description: The diff produced for C008_T023, with its Verify and check output, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/C008_T023.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/tasks/C008_T023.md
  - resource: /.sdd/briefs/008-learner-leads/C008_T023.md
  - resource: git:dc9d5395f4bdd9093fd512045b44c35ddd4af936..c8bec276951c8c49010453393791577071158a0d
generated:
  by: process:review-package.sh
  at: 2026-10-04T09:14:54Z
sdd_id: 008-learner-leads
---

# Review package — C008_T023 · 008-learner-leads

base: `dc9d5395f4bdd9093fd512045b44c35ddd4af936` → head: `c8bec276951c8c49010453393791577071158a0d`

## Commands (run by this script)

### Verify

`pnpm vitest run tests/ui/scenarios/transport-card-lead.test.tsx tests/practice/scenarios/lead-meter.test.ts`

```

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  2 passed (2)
      Tests  21 passed (21)
   Start at  10:14:55
   Duration  4.55s (tests 66%, environment 15%, transform 12%, import 8%)

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
test tests::a_sound_change_crossfade_is_never_silent ... ok
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::clicks_only_render_without_large_steps ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
test tests::tones_and_clicks_together_render_without_large_steps ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
test tests::tones_only_render_without_large_steps ... ok
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

- M	scripts/design_snapshot.py
- M	src/practice/domain/session.ts
- M	src/ui/TransportCard.tsx
- M	tests/practice/scenarios/lead-meter.test.ts
- M	tests/ui/scenarios/transport-card-lead.test.tsx

## Diff

```diff
diff --git a/scripts/design_snapshot.py b/scripts/design_snapshot.py
index 86ce632..ff7cd64 100755
--- a/scripts/design_snapshot.py
+++ b/scripts/design_snapshot.py
@@ -24,8 +24,11 @@ and the microphone fed by scripts/design-shots-page.mjs, shared with
 design-shots.mjs). A row with no driver is opened at its path and shot as is.
 
 Needs Playwright for Python (pip install playwright; playwright install
-chromium). Stdlib otherwise. A row with no design file (wireframes) or no
-route (live/reference) is skipped with a note, not an error.
+chromium). Stdlib otherwise. Playwright for Python must be the same version as
+the repo's node Playwright (see package.json), otherwise the AudioWorklet
+module load hangs and every microphone state times out. A row with no design
+file (wireframes) or no route (live/reference) is skipped with a note, not an
+error.
 """
 import re, sys, pathlib, argparse
 
@@ -278,7 +281,7 @@ def main(argv):
     try:
         from playwright.sync_api import sync_playwright
     except ImportError:
-        print("error: Playwright for Python not installed: pip install playwright && playwright install chromium", file=sys.stderr)
+        print("error: Playwright for Python not installed: pip install playwright && playwright install chromium (it must be the same version as the repo's node Playwright, see package.json, or the AudioWorklet module load hangs and every microphone state times out)", file=sys.stderr)
         return 1
 
     drivers = LIVE_DRIVERS.get(cid, {}) if a.mode != "wireframes" else {}
diff --git a/src/practice/domain/session.ts b/src/practice/domain/session.ts
index dca147d..2d29c6e 100644
--- a/src/practice/domain/session.ts
+++ b/src/practice/domain/session.ts
@@ -599,6 +599,10 @@ export function createSession(
   // burst of detections within one tick commits only the newest).
   let leadReading: NoteJudged | null = null;
   let leadPendingReading: NoteJudged | null = null;
+  // practice.session/REQ-017 — true when `leadPendingReading` is the reading
+  // that completed the hold: it was judged against the target just left, so
+  // it is emitted as NoteJudged but never shown on the new target.
+  let leadPendingCompleted = false;
   // Cancels for the lead run's own two timers — mirrors
   // `tunerCommitCancel`/`tunerGapCancel` above.
   let leadCommitCancel: (() => void) | null = null;
@@ -1119,6 +1123,7 @@ export function createSession(
     }
 
     leadPendingReading = reading;
+    leadPendingCompleted = advanced;
     if (leadCommitCancel === null) {
       leadCommitCancel = clock.setTimeout(commitLeadReading, 0);
     }
@@ -1152,9 +1157,10 @@ export function createSession(
     leadCommitCancel = null;
     if (leadPendingReading === null) return;
     invalidateSnapshot();
-    leadReading = leadPendingReading;
+    const committed = leadPendingReading;
+    leadReading = leadPendingCompleted ? null : committed;
     leadPendingReading = null;
-    for (const listener of noteJudgedListeners) listener(leadReading);
+    for (const listener of noteJudgedListeners) listener(committed);
     notifyChange();
   }
 
diff --git a/src/ui/TransportCard.tsx b/src/ui/TransportCard.tsx
index a9317d4..c18d141 100644
--- a/src/ui/TransportCard.tsx
+++ b/src/ui/TransportCard.tsx
@@ -76,14 +76,15 @@ function isPlaying(transport: SessionSnapshot["transport"]): boolean {
 // state — hidden (not unmounted) when not shown — so the card's DOM
 // structure (practice.session/REQ-002/S5) never gains or loses a node as
 // the mode or transport state changes; its bars carry no text, so hiding
-// it this way never affects another element's textContent.
+// it this way never affects another element's textContent. Three bare
+// bars, bottom-aligned, the outer two dimmer than the centre.
 function TunerGlyph(props: { readonly visible: boolean }): JSX.Element {
   return (
     <div
       data-testid="tuner-glyph"
       style={{
         display: props.visible ? "flex" : "none",
-        alignItems: "center",
+        alignItems: "flex-end",
         gap: modeWords.glyphGap,
       }}
     >
@@ -93,9 +94,8 @@ function TunerGlyph(props: { readonly visible: boolean }): JSX.Element {
           style={{
             width: modeWords.glyphBar,
             height,
-            borderRadius: modeWords.glyphBar / 2,
-            background: modeWords.glyphCentre,
-            boxShadow: `0 0 0 2px ${modeWords.glyphOuter}`,
+            background:
+              index === 1 ? modeWords.glyphCentre : modeWords.glyphOuter,
           }}
         />
       ))}
@@ -176,8 +176,6 @@ const JUDGEMENT_FONT_WEIGHT = 600;
 
 const MODE_WORDS_ROW_MARGIN_TOP = 1;
 
-const NO_MIC_GAP = 4;
-const NO_MIC_TOP_MARGIN = 10;
 const NO_MIC_TITLE_WEIGHT = 600;
 const NO_MIC_BODY_INK = paper.muted;
 
@@ -254,38 +252,34 @@ function TargetLetterOctave(props: {
   );
 }
 
-// practice.session/REQ-022 — the no-mic message block, shared by NoMicCard
-// alone but kept apart so the card stays under 60 lines.
-function NoMicMessage(): JSX.Element {
+// practice.session/REQ-022 — the no-mic title, in the middle column beside
+// the start circle in place of the caption.
+function NoMicTitle(): JSX.Element {
   return (
     <div
-      data-testid="no-mic-card"
       style={{
-        display: "flex",
-        flexDirection: "column",
-        gap: NO_MIC_GAP,
-        marginTop: NO_MIC_TOP_MARGIN,
+        fontSize: leadCard.noMicTitleSize,
+        fontWeight: NO_MIC_TITLE_WEIGHT,
+        color: paper.ink,
       }}
     >
-      <div
-        style={{
-          fontSize: leadCard.noMicTitleSize,
-          fontWeight: NO_MIC_TITLE_WEIGHT,
-          color: paper.ink,
-        }}
-      >
-        Can&apos;t hear — no microphone
-      </div>
-      <div
-        style={{
-          fontSize: leadCard.noMicBodySize,
-          lineHeight: leadCard.noMicLineHeight,
-          color: NO_MIC_BODY_INK,
-        }}
-      >
-        It was refused or isn&apos;t there. Allow the microphone for this site,
-        then press I lead again.
-      </div>
+      Can&apos;t hear — no microphone
+    </div>
+  );
+}
+
+// practice.session/REQ-022 — the no-mic explanation, below the card's top row.
+function NoMicBody(): JSX.Element {
+  return (
+    <div
+      style={{
+        fontSize: leadCard.noMicBodySize,
+        lineHeight: leadCard.noMicLineHeight,
+        color: NO_MIC_BODY_INK,
+      }}
+    >
+      It was refused or isn&apos;t there. Allow the microphone for this site,
+      then press I lead again.
     </div>
   );
 }
@@ -405,6 +399,10 @@ function TempoStepper(props: {
   );
 }
 
+function cardShellColumnStyle(): CSSProperties {
+  return { display: "flex", flexDirection: "column", gap: CARD_GAP };
+}
+
 function cardShellStyle(): CSSProperties {
   return {
     display: "flex",
@@ -542,29 +540,29 @@ function NoMicCard(props: {
 
   return (
     <div data-testid="transport-card" style={cardShellStyle()}>
-      <div style={{ display: "flex", alignItems: "center", gap: CARD_GAP }}>
-        <button
-          type="button"
-          data-testid="start-circle"
-          aria-label="Play"
-          onClick={onTogglePlay}
-          style={circleStyle()}
-        >
-          <TunerGlyph visible />
-        </button>
-        <div style={middleColumnStyle()}>
-          <div data-testid="position-caption" style={captionStyle()}>
-            {snapshot.lead.idleCaption}
+      <div data-testid="no-mic-card" style={cardShellColumnStyle()}>
+        <div style={{ display: "flex", alignItems: "center", gap: CARD_GAP }}>
+          <button
+            type="button"
+            data-testid="start-circle"
+            aria-label="Play"
+            onClick={onTogglePlay}
+            style={circleStyle()}
+          >
+            <TunerGlyph visible />
+          </button>
+          <div style={middleColumnStyle()}>
+            <NoMicTitle />
+            <ModeWordsRow who={snapshot.lead.who} onWho={onWho} />
           </div>
-          <ModeWords who={snapshot.lead.who} onWho={onWho} />
+          <TempoStepper
+            snapshot={snapshot}
+            onStepTempo={onStepTempo}
+            onOpenTempo={onOpenTempo}
+          />
         </div>
-        <TempoStepper
-          snapshot={snapshot}
-          onStepTempo={onStepTempo}
-          onOpenTempo={onOpenTempo}
-        />
+        <NoMicBody />
       </div>
-      <NoMicMessage />
     </div>
   );
 }
diff --git a/tests/practice/scenarios/lead-meter.test.ts b/tests/practice/scenarios/lead-meter.test.ts
index c322378..cc1f4e6 100644
--- a/tests/practice/scenarios/lead-meter.test.ts
+++ b/tests/practice/scenarios/lead-meter.test.ts
@@ -52,3 +52,17 @@ test("practice.session/REQ-017/S4 — 'held ✓' goes after 0.4 s of silence", a
   f.clock.advanceMs(100);
   expect(f.session.snapshot().lead.justHeld).toBeNull();
 });
+test("practice.session/REQ-017/S4 (reading) — the completing reading is not drawn on the new target", async () => {
+  const f = leadFixture();
+  await startLead(f.session);
+  hearSteady(f, 262.5, 0, 1240);
+  hearAt(f, 262.5, 1260); // completes the hold → D4
+  f.clock.advanceMs(100); // silence, under the 300 ms gap
+  expect(f.session.snapshot().lead.target?.position).toBe(2);
+  expect(f.session.snapshot().lead.reading).toBeNull();
+  hearAt(f, 293.66, 1400);
+  expect(f.session.snapshot().lead.reading).toMatchObject({
+    cents: 0,
+    verdict: "in-tune",
+  });
+});
diff --git a/tests/ui/scenarios/transport-card-lead.test.tsx b/tests/ui/scenarios/transport-card-lead.test.tsx
index a5bd68f..3d46628 100644
--- a/tests/ui/scenarios/transport-card-lead.test.tsx
+++ b/tests/ui/scenarios/transport-card-lead.test.tsx
@@ -35,6 +35,22 @@ test("practice.session/REQ-014/S1 (card) — choosing I lead", async () => {
   expect(app.listening.startCalls).toBe(0);
 });
 
+test("practice.session/REQ-014/S1 (card) — the Tuner glyph is three bare bottom-aligned bars", () => {
+  renderLeadApp(storedCMajor({ who: "me" }));
+  const glyph = screen.getByTestId("tuner-glyph");
+  expect(glyph.style.display).toBe("flex");
+  expect(glyph.style.alignItems).toBe("flex-end");
+  const bars = [...glyph.children] as HTMLElement[];
+  expect(bars.map((bar) => bar.style.width)).toEqual(["3px", "3px", "3px"]);
+  expect(bars.map((bar) => bar.style.height)).toEqual(["10px", "20px", "10px"]);
+  expect(bars.map((bar) => bar.style.background)).toEqual([
+    "rgba(249, 244, 233, 0.6)",
+    "rgb(249, 244, 233)",
+    "rgba(249, 244, 233, 0.6)",
+  ]);
+  expect(bars.map((bar) => bar.style.boxShadow)).toEqual(["", "", ""]);
+});
+
 test("practice.session/REQ-014/S2 (card) — and back", async () => {
   const app = renderLeadApp(storedCMajor({ who: "me" }));
   expect(screen.getByTestId("tuner-glyph")).toBeTruthy();
@@ -223,6 +239,23 @@ test("practice.session/REQ-022/S1 (card) — the no-mic card", async () => {
   expect(screen.queryByRole("dialog")).toBeNull();
 });
 
+test("practice.session/REQ-022/S1 (card) — the title sits beside the circle, in place of the caption", async () => {
+  const app = renderLeadApp(storedCMajor({ who: "me" }));
+  app.listening.failWith = "refused";
+  await startLeadInApp(app);
+  expect(screen.queryByTestId("position-caption")).toBeNull();
+  const column = screen.getByText("Can't hear — no microphone").parentElement!;
+  expect(column.contains(screen.getByTestId("mode-word-me"))).toBe(true);
+  expect(column.contains(screen.getByTestId("mode-word-tool"))).toBe(true);
+  expect(column.textContent).not.toContain("It was refused");
+  expect(screen.getByTestId("no-mic-card").textContent).toContain(
+    "It was refused or isn't there. Allow the microphone for this site, then press I lead again.",
+  );
+  expect(
+    column.parentElement!.contains(screen.getByTestId("start-circle")),
+  ).toBe(true);
+});
+
 test("practice.session/REQ-018/S1 (app) — meter off: no band, fill or line; the highlight stays", async () => {
   const app = renderLeadApp(
     storedCMajor({ who: "me", cueMeter: false }, { view: "stave" }),
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/008-learner-leads/design/rounds/shots/advanced.app.png b/changes/008-learner-leads/design/rounds/shots/advanced.app.png
index 2240efe..415a4a7 100644
Binary files a/changes/008-learner-leads/design/rounds/shots/advanced.app.png and b/changes/008-learner-leads/design/rounds/shots/advanced.app.png differ
diff --git a/changes/008-learner-leads/design/rounds/shots/complete.app.png b/changes/008-learner-leads/design/rounds/shots/complete.app.png
index 28f337b..3e6ea0f 100644
Binary files a/changes/008-learner-leads/design/rounds/shots/complete.app.png and b/changes/008-learner-leads/design/rounds/shots/complete.app.png differ
diff --git a/changes/008-learner-leads/design/rounds/shots/idle-i-lead.app.png b/changes/008-learner-leads/design/rounds/shots/idle-i-lead.app.png
index f34ce22..022f78d 100644
Binary files a/changes/008-learner-leads/design/rounds/shots/idle-i-lead.app.png and b/changes/008-learner-leads/design/rounds/shots/idle-i-lead.app.png differ
diff --git a/changes/008-learner-leads/design/rounds/shots/no-microphone.app.png b/changes/008-learner-leads/design/rounds/shots/no-microphone.app.png
index 9c28fce..4aabcef 100644
Binary files a/changes/008-learner-leads/design/rounds/shots/no-microphone.app.png and b/changes/008-learner-leads/design/rounds/shots/no-microphone.app.png differ
diff --git a/changes/008-learner-leads/record/tasks/index.md b/changes/008-learner-leads/record/tasks/index.md
index 2f4aba5..c15cfd6 100644
--- a/changes/008-learner-leads/record/tasks/index.md
+++ b/changes/008-learner-leads/record/tasks/index.md
@@ -37,6 +37,8 @@
 - [C008_T019 — implementation report (fixer round)](C008_T019-report-2.md) — Implementation Report
 - [Review package — C008_T019 · 008-learner-leads](C008_T019-review-1.md) — Task Review — The diff produced for C008_T019, with its Verify and check output, for the task reviewer.
 - [Review package — C008_T019 · 008-learner-leads](C008_T019-review-2.md) — Task Review — The diff produced for C008_T019, with its Verify and check output, for the task reviewer.
+- [C008_T020 — implementation report](C008_T020-report-1.md) — Implementation Report
+- [Review package — C008_T020 · 008-learner-leads](C008_T020-review-1.md) — Task Review — The diff produced for C008_T020, with its Verify and check output, for the task reviewer.
 - [T001 — implementation report](T001-report-1.md) — Implementation Report
 - [Review package — T001 · 008-learner-leads](T001-review-1.md) — Task Review — The diff produced for T001, for the task reviewer.
 - [T002 — implementation report](T002-report-1.md) — Implementation Report
diff --git a/changes/008-learner-leads/tasks/C008_T023.md b/changes/008-learner-leads/tasks/C008_T023.md
index d6e0683..031cfd6 100644
--- a/changes/008-learner-leads/tasks/C008_T023.md
+++ b/changes/008-learner-leads/tasks/C008_T023.md
@@ -12,14 +12,14 @@ generated:
   at: 2026-10-04T09:06:11Z
 sdd_id: 008-learner-leads
 sdd_task: C008_T023
-sdd_phase: todo           # todo | in-progress | done | parked — set with scripts/task.py, never by hand
+sdd_phase: in-progress
 sdd_requirements: [practice.session/REQ-014, practice.session/REQ-022, practice.session/REQ-017]
 sdd_depends_on: [C008_T020]
 sdd_parked_on:            # D003 when parked
 sdd_group: "Appended"
 sdd_parallel: false       # true: independent of its neighbours, may run alongside them
 sdd_class: standard
-sdd_attempts: 0
+sdd_attempts: 1
 ---
 
 # C008_T023 · First screenshot pass: the Tuner glyph drawn as designed, the no-mic title beside the circle, no stale line across a new target
```

## Verdict

TASK: C008_T023
SPEC: PASS
QUALITY: PASS
FINDINGS:
- [minor] src/practice/domain/session.ts:1125-1161 — REQ-017/S4: reading must not be shown on the new target — the clear happens in commitLeadReading (setTimeout 0), so between the synchronous advance and that tick a snapshot would carry target D4 with the old C4 reading. Nothing notifies in that window and `pnpm test:lead` passes, so it is not observable today; clearing `leadReading = null` in the advance branch too would make "target and reading never disagree" hold at every snapshot.
- [minor] src/ui/TransportCard.tsx:402-404,543 — cardShellColumnStyle() repeats what cardShellStyle() already is (column, CARD_GAP); the `no-mic-card` wrapper exists only to carry the testid. Fine functionally. The `no-mic-card` testid now wraps the circle, words and tempo stepper as well as the message; I consider that acceptable (only text-contained assertions and design-shots' waitFor use it) but the name is now broader than the message.
- [minor] src/ui/TransportCard.tsx:97 — `index === 1` picks the centre bar; a magic index (acceptable, glyphHeights is a fixed triple).
UNVERIFIED:
- REQ-021/S1 — the 100 ms shown-reading budget is measured by pnpm test:lead (implementer: PASS, advance lateness 0); the package does not include that run. The diff does not touch NoteJudged emission, timing or the paint-age path, and the null reading reports no paint age.
- Screenshot closure of the four states — not reviewed, per instruction.
COMMANDS:
package only (plus ./scripts/check-contexts.sh: "context boundaries respected")

Notes by item:
1. Glyph: bars 3 px, gap 3, flex-end, heights 10/20/10, outer glyphOuter by index, centre glyphCentre, no radius/shadow/border; theme.ts unchanged; tuner-glyph container always mounted (display toggles). New test asserts exact values and would fail on alignItems before.
2. No-mic: title 14/600 in the middle column in place of position-caption (absent), mode words beneath, body (12.5/muted/1.45 tokens) below the top row, start-circle and tempo stepper present. Line counts: NoMicCard 36, IdleCard 56, LiveCard 42 (all under 60). StaveView props untouched.
3. Stale reading: `leadPendingCompleted` is assigned on every `leadPendingReading = reading` (the only assignment), read only when pending is non-null, so it cannot go stale: stop, REQ-019 restart, mid-run failure all null pending via cancelLeadTimers and also null leadReading; onEnded/gap timer null leadReading; a following reading overwrites both. A completing reading coalesced with a later one in the same tick is replaced by it with advanced=false and shows normally (smoothing was reset at the advance, so it is a first reading, REQ-016/S9). Completing reading still emitted as NoteJudged, hold/advance/TargetAdvanced/just-held untouched. The 'complete' (non-loop last note) path also gets null, harmless. Existing tests asserting lead.reading (lead-meter S7/S1, lead-budget, lead-hold:88, lead-cues:45, lead-run:44, lead-cannot-hear:56) none assert survival across an advance; the grep and the implementer's no-STOP are right.
4. REQ-017/S4 is self-contradictory as written: the pinned line at -194 is exactly the first reading against D4 (REQ-016/S9), and that reading is also what clears 'held ✓', so they cannot both be on screen. (Also: with 'the same note still sounding' and ~12 ms hops, the state lasts about one hop.) Cleanest wording-only amendment: replace 'D4 is highlighted with its band and the line pinned at the band box's bottom edge in the flat colour' with 'D4 is highlighted with its band, no fill and no pitch line yet (the first reading against D4 draws the line, pinned at the band box's bottom edge in the flat colour, as REQ-016/S9)'; keep 'until the first reading against D4' for 'C4 held ✓'. This agrees with REQ-017's 'hidden while nothing is detected'.
5. design_snapshot.py: the Playwright-version line is in both the docstring and the ImportError message.
6. Hygiene: no TODO/dead code; NO_MIC_GAP/NO_MIC_TOP_MARGIN removed along with their use; test names carry the full scenario ID with a suffix; the lead-meter test goes only through the published snapshot and fakes; the UI layout test uses parentElement/contains (DOM-structure coupling, acceptable for a layout scenario).


<!-- recorded 2026-10-04T09:17:30Z by scripts/record.sh -->
