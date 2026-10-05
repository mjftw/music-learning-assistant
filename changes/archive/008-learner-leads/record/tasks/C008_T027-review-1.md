---
type: Task Review
title: Review package — C008_T027 · 008-learner-leads
description: The diff produced for C008_T027, with its Verify and check output, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/C008_T027.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/tasks/C008_T027.md
  - resource: /.sdd/briefs/008-learner-leads/C008_T027.md
  - resource: git:82752465150f7182f2ef6c4161a0061449fe4246..11642a3f9a13cb9ec9c53f6d20fdf398cb77e45c
generated:
  by: process:review-package.sh
  at: 2026-10-05T11:33:55Z
sdd_id: 008-learner-leads
---

# Review package — C008_T027 · 008-learner-leads

base: `82752465150f7182f2ef6c4161a0061449fe4246` → head: `11642a3f9a13cb9ec9c53f6d20fdf398cb77e45c`

## Commands (run by this script)

### Verify

`pnpm vitest run tests/ui/scenarios/stave-view.test.tsx`

```

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  13 passed (13)
   Start at  12:33:56
   Duration  2.52s (tests 56%, transform 22%, environment 13%, import 10%)

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
test tests::a_drone_renders_without_large_steps_across_attack_and_stop ... ok
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::a_sound_change_crossfade_is_never_silent ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test tests::clicks_only_render_without_large_steps ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
test tests::tones_and_clicks_together_render_without_large_steps ... ok
test tests::tones_only_render_without_large_steps ... ok
test drone::tests::every_drone_sound_peaks_at_most_60_percent_of_a_tone ... ok
test drone::tests::drone_attack_is_audible_by_30ms_and_full_by_60ms ... ok

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

- M	src/ui/StaveView.tsx
- M	tests/ui/scenarios/stave-view.test.tsx

## Diff

```diff
diff --git a/src/ui/StaveView.tsx b/src/ui/StaveView.tsx
index c5c34e6..fd472f0 100644
--- a/src/ui/StaveView.tsx
+++ b/src/ui/StaveView.tsx
@@ -529,15 +529,16 @@ export const StaveView = memo(function StaveView(props: {
             data-testid="stave-note"
             data-note={noteLabel(head.note)}
             data-root={head.isRoot ? "true" : "false"}
-            // cx/cy/rx/fill/opacity mirror the notehead ellipse below —
-            // read-only probes so a test (and `onTargetBox`) can reach the
-            // head's own geometry and styling without `querySelector`;
-            // they carry no visual meaning on a `<g>`.
+            // cx/cy/rx/fill mirror the notehead ellipse below — read-only
+            // probes so a test can reach the head's own geometry and
+            // styling without `querySelector`; they carry no visual meaning
+            // on a `<g>`. The note's opacity is NOT set here: opacity
+            // multiplies down an SVG tree, so it is set once, on the stem and
+            // the ellipse, as it was before the lead run.
             cx={head.x}
             cy={head.y}
             rx={head.rx}
             fill={head.ink}
-            opacity={head.opacity}
           >
             <line
               x1={head.stemX}
diff --git a/tests/ui/scenarios/stave-view.test.tsx b/tests/ui/scenarios/stave-view.test.tsx
index 2c302ed..26af2b1 100644
--- a/tests/ui/scenarios/stave-view.test.tsx
+++ b/tests/ui/scenarios/stave-view.test.tsx
@@ -525,17 +525,10 @@ test("theory.circle-of-fifths/REQ-003/S7 — the stave after a scale change is e
 test("practice.session/REQ-017/S8 — ink behind, faint ahead", () => {
   renderStave({ leadTarget: { runIndex: 4 } });
   const heads = screen.getAllByTestId("stave-note");
-  expect(heads.slice(0, 4).map((h) => h.getAttribute("opacity"))).toEqual([
-    "1",
-    "1",
-    "1",
-    "1",
-  ]);
-  expect(heads.slice(5).map((h) => h.getAttribute("opacity"))).toEqual([
-    "0.3",
-    "0.3",
-    "0.3",
-  ]);
+  const opacityOf = (h: HTMLElement) =>
+    h.querySelector("ellipse")!.getAttribute("opacity");
+  expect(heads.slice(0, 4).map(opacityOf)).toEqual(["1", "1", "1", "1"]);
+  expect(heads.slice(5).map(opacityOf)).toEqual(["0.3", "0.3", "0.3"]);
   expect(screen.getAllByTestId("sounding-halo")).toHaveLength(1);
   expect(Number(heads[4]!.getAttribute("rx"))).toBeGreaterThan(
     Number(heads[3]!.getAttribute("rx")),
@@ -562,3 +555,81 @@ test("practice.session/REQ-017 — onTargetBox reports the target head's centre"
     y: Number(head.getAttribute("cy")),
   });
 });
+
+// The effective opacity of an element as drawn: the product of the opacity
+// of the element and of every ancestor up to the document (an `opacity`
+// attribute on SVG, a style on HTML; absent = 1). SVG and CSS both multiply
+// nested opacities, so a value set twice would render squared.
+const effectiveOpacityOf = (element: Element): number => {
+  let product = 1;
+  for (
+    let node: Element | null = element;
+    node !== null;
+    node = node.parentElement
+  ) {
+    const attribute = node.getAttribute("opacity");
+    const style = (node as HTMLElement).style?.opacity ?? "";
+    if (attribute !== null && attribute !== "") product *= Number(attribute);
+    if (style !== "") product *= Number(style);
+  }
+  return product;
+};
+
+const renderBluesStave = (
+  extra: Partial<ComponentProps<typeof StaveView>> = {},
+) => {
+  const aMinor: Key = {
+    tonic: { letter: "A", accidental: "natural" },
+    mode: "naturalMinor",
+  };
+  const notes = traversalOf(aMinor, flute(), scaleById("blues"), {
+    direction: "up",
+    octaves: { kind: "count", count: 1 },
+    shape: "scale",
+  }).run;
+  return render(
+    <StaveView
+      key_={aMinor}
+      variant={flute()}
+      notes={notes}
+      staveNamesEnabled={false}
+      soundingRunIndex={null}
+      playing={false}
+      onTapNote={() => {}}
+      tapsEnabled={false}
+      {...extra}
+    />,
+  );
+};
+
+const effectiveOpacities = () =>
+  screen.getAllByTestId("stave-note").map((head) => ({
+    ellipse: effectiveOpacityOf(head.querySelector("ellipse")!),
+    stem: effectiveOpacityOf(head.querySelector("line")!),
+  }));
+
+test("practice.session/REQ-017/S8 — a note's opacity is applied once", () => {
+  // Leading, target 4: ink behind (1), highlighted target (1), faint ahead (0.3).
+  const { unmount } = renderBluesStave({ leadTarget: { runIndex: 4 } });
+  const lead = effectiveOpacities();
+  expect(lead.map((o) => o.ellipse)).toEqual([1, 1, 1, 1, 1, 0.3, 0.3]);
+  expect(lead.map((o) => o.stem)).toEqual([1, 1, 1, 1, 1, 0.3, 0.3]);
+  const accidentals = screen.getAllByTestId("inline-accidental");
+  expect(accidentals.length).toBeGreaterThan(0);
+  for (const accidental of accidentals) {
+    const runIndex = Number(accidental.getAttribute("data-run-index"));
+    expect(effectiveOpacityOf(accidental)).toBe(runIndex > 4 ? 0.3 : 1);
+  }
+  unmount();
+
+  // Play along, note 2 sounding: the others dim to the shipped 0.72.
+  renderBluesStave({ playing: true, soundingRunIndex: 2 });
+  const playing = effectiveOpacities();
+  const dimmed = [0.72, 0.72, 1, 0.72, 0.72, 0.72, 0.72];
+  expect(playing.map((o) => o.ellipse)).toEqual(dimmed);
+  expect(playing.map((o) => o.stem)).toEqual(dimmed);
+  for (const accidental of screen.getAllByTestId("inline-accidental")) {
+    const runIndex = Number(accidental.getAttribute("data-run-index"));
+    expect(effectiveOpacityOf(accidental)).toBe(dimmed[runIndex]);
+  }
+});
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/008-learner-leads/design/rounds/shots/advanced.app.png b/changes/008-learner-leads/design/rounds/shots/advanced.app.png
index 415a4a7..49fcd92 100644
Binary files a/changes/008-learner-leads/design/rounds/shots/advanced.app.png and b/changes/008-learner-leads/design/rounds/shots/advanced.app.png differ
diff --git a/changes/008-learner-leads/design/rounds/shots/heard-out-of-tune.app.png b/changes/008-learner-leads/design/rounds/shots/heard-out-of-tune.app.png
index 2bf96a1..252453f 100644
Binary files a/changes/008-learner-leads/design/rounds/shots/heard-out-of-tune.app.png and b/changes/008-learner-leads/design/rounds/shots/heard-out-of-tune.app.png differ
diff --git a/changes/008-learner-leads/design/rounds/shots/holding-meter-off.app.png b/changes/008-learner-leads/design/rounds/shots/holding-meter-off.app.png
index ea07a4f..149d72b 100644
Binary files a/changes/008-learner-leads/design/rounds/shots/holding-meter-off.app.png and b/changes/008-learner-leads/design/rounds/shots/holding-meter-off.app.png differ
diff --git a/changes/008-learner-leads/design/rounds/shots/holding.app.png b/changes/008-learner-leads/design/rounds/shots/holding.app.png
index bcf3400..f692e60 100644
Binary files a/changes/008-learner-leads/design/rounds/shots/holding.app.png and b/changes/008-learner-leads/design/rounds/shots/holding.app.png differ
diff --git a/changes/008-learner-leads/design/rounds/shots/listening-silent.app.png b/changes/008-learner-leads/design/rounds/shots/listening-silent.app.png
index 94faecc..40fd45d 100644
Binary files a/changes/008-learner-leads/design/rounds/shots/listening-silent.app.png and b/changes/008-learner-leads/design/rounds/shots/listening-silent.app.png differ
diff --git a/changes/008-learner-leads/design/rounds/shots/playing-play-along.app.png b/changes/008-learner-leads/design/rounds/shots/playing-play-along.app.png
index 350d1f3..bd5a8fd 100644
Binary files a/changes/008-learner-leads/design/rounds/shots/playing-play-along.app.png and b/changes/008-learner-leads/design/rounds/shots/playing-play-along.app.png differ
diff --git a/changes/008-learner-leads/tasks/C008_T027.md b/changes/008-learner-leads/tasks/C008_T027.md
index c970a44..381f2d2 100644
--- a/changes/008-learner-leads/tasks/C008_T027.md
+++ b/changes/008-learner-leads/tasks/C008_T027.md
@@ -12,14 +12,14 @@ generated:
   at: 2026-10-05T11:19:36Z
 sdd_id: 008-learner-leads
 sdd_task: C008_T027
-sdd_phase: todo           # todo | in-progress | done | parked — set with scripts/task.py, never by hand
+sdd_phase: in-progress
 sdd_requirements: [practice.session/REQ-017]
 sdd_depends_on: []
 sdd_parked_on:            # D003 when parked
 sdd_group: "Converge 1"
 sdd_parallel: false       # true: independent of its neighbours, may run alongside them
 sdd_class: standard
-sdd_attempts: 0
+sdd_attempts: 1
 ---
 
 # C008_T027 · The stave applies each note's opacity once (converge W1)
```

## Verdict

_The task reviewer appends its verdict here._

<!-- recorded 2026-10-05T11:35:29Z by scripts/record.sh -->
