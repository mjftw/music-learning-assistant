---
type: Task Review
title: Review package — C008_T017 · 008-learner-leads
description: The diff produced for C008_T017, with its Verify and check output, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/C008_T017.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/tasks/C008_T017.md
  - resource: /.sdd/briefs/008-learner-leads/C008_T017.md
  - resource: git:968766bd44cb61ca0ec9cb1be1a630c6f9fdff50..2a2e85d5585ab2d160135c983e3d6c4b89d2e4ff
generated:
  by: process:review-package.sh
  at: 2026-10-04T06:33:31Z
sdd_id: 008-learner-leads
---

# Review package — C008_T017 · 008-learner-leads

base: `968766bd44cb61ca0ec9cb1be1a630c6f9fdff50` → head: `2a2e85d5585ab2d160135c983e3d6c4b89d2e4ff`

## Commands (run by this script)

### Verify

`pnpm vitest run tests/ui/scenarios/app-session.test.tsx`

```

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  18 passed (18)
   Start at  07:33:31
   Duration  4.34s (tests 72%, transform 12%, environment 9%, import 6%)

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
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
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

- M	changes/008-learner-leads/tasks/C008_T017.md
- M	tests/ui/scenarios/app-session.test.tsx
- M	tests/ui/scenarios/lead-app-helpers.tsx
- M	tests/ui/scenarios/traversal-sheet-lead.test.tsx

## Diff

```diff
diff --git a/changes/008-learner-leads/tasks/C008_T017.md b/changes/008-learner-leads/tasks/C008_T017.md
index e51887e..0de9051 100644
--- a/changes/008-learner-leads/tasks/C008_T017.md
+++ b/changes/008-learner-leads/tasks/C008_T017.md
@@ -12,13 +12,13 @@ generated:
   at: 2026-10-02T21:24:27Z
 sdd_id: 008-learner-leads
 sdd_task: C008_T017
-sdd_phase: todo
+sdd_phase: in-progress
 sdd_requirements: [practice.session/REQ-011]
 sdd_depends_on: [C008_T004, C008_T005, C008_T012, C008_T016]
 sdd_parked_on: 
 sdd_group: "Phase 3 — The practice screen"
 sdd_parallel: false
-sdd_attempts: 0
+sdd_attempts: 1
 ---
 
 # C008_T017 · The app restores and stores the lead settings
@@ -86,4 +86,4 @@ sdd_attempts: 0
 - [ ] 4. Run `pnpm vitest run tests/ui` — PASS. `pnpm check` — green.
 - [ ] 5. REFACTOR — none.
 
-**Verify** — `pnpm vitest run tests/ui/scenarios/selection-persistence.test.tsx` → all passed.
+**Verify** — `pnpm vitest run tests/ui/scenarios/app-session.test.tsx` → all passed. (Corrected at implementation: the REQ-011 scenarios live in `app-session.test.tsx`, not `selection-persistence.test.tsx`.)
diff --git a/tests/ui/scenarios/app-session.test.tsx b/tests/ui/scenarios/app-session.test.tsx
index 2bf2d6e..3176dbf 100644
--- a/tests/ui/scenarios/app-session.test.tsx
+++ b/tests/ui/scenarios/app-session.test.tsx
@@ -27,6 +27,13 @@ import {
   sessionDepsWithFakes,
   variantOf,
 } from "../../practice/fakes";
+import {
+  openSheet,
+  pill,
+  pillSelected,
+  renderLeadApp,
+  storedCMajor,
+} from "./lead-app-helpers";
 
 afterEach(() => {
   cleanup();
@@ -58,7 +65,7 @@ test("practice.session/REQ-011/S2 (app) — first run shows the S2 defaults in t
 // recorded, so restoring it exercises the v3→v4 migration path (REQ-011/S4),
 // not S1 (which is about restoring a stored scale choice — see the new S1
 // test below).
-test("practice.session/REQ-011/S4 (app) — a stored v3 payload is restored exactly, idle", () => {
+test("practice.session/REQ-011/S4 (app) — a stored v3 payload is restored exactly, idle", async () => {
   localStorage.clear();
   localStorage.setItem(
     STORAGE_KEY,
@@ -94,6 +101,19 @@ test("practice.session/REQ-011/S4 (app) — a stored v3 payload is restored exac
   expect(screen.getByText("↓ · 2 oct · click only · once")).toBeTruthy();
   expect(screen.getByRole("button", { name: "Allegro" })).toBeTruthy();
   expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
+  // practice.session/REQ-011/S4 — a v3 payload records no lead settings, so
+  // they take the S2 defaults: play along, Hold 2, medium, meter on, tone
+  // off.
+  expect(screen.getByTestId("mode-word-tool").style.color).toBe(
+    "rgb(28, 25, 22)",
+  );
+  const user = userEvent.setup();
+  await user.click(screen.getByTestId("mode-word-me"));
+  await user.click(screen.getByRole("button", { name: "Edit traversal" }));
+  expect(pillSelected("hold", "2")).toBe(true);
+  expect(pillSelected("in-tune", "medium")).toBe(true);
+  expect(pillSelected("cues", "meter")).toBe(true);
+  expect(pillSelected("cues", "tone")).toBe(false);
 });
 
 test("practice.session/REQ-012/S1 (app) — choosing a scale changes the heading, the formula row and the names view", async () => {
@@ -156,6 +176,142 @@ test("practice.session/REQ-011/S1 (app) — Dorian on the minor ring is restored
   expect(screen.getByRole("button", { name: "Allegro" })).toBeTruthy();
 });
 
+test("practice.session/REQ-011/S1 — back where it was, in I lead", async () => {
+  const app = renderLeadApp(
+    storedCMajor(
+      {
+        who: "me",
+        holdBeats: 4,
+        tolerance: "accurate",
+        cueMeter: false,
+        cueTone: true,
+      },
+      {
+        keyId: "E-naturalMinor",
+        traversal: { direction: "down", octaves: 2, shape: "arpeggio" },
+        scale: { major: "major", minor: "dorian" },
+        session: {
+          ...storedCMajor().session,
+          soundMode: "metronome",
+          loop: false,
+          countIn: false,
+          restBar: true,
+          tempoBpm: 132,
+        },
+      },
+    ),
+  );
+  expect(screen.getByRole("button", { name: "Allegro" })).toBeTruthy();
+  expect(screen.getByTestId("position-caption").textContent).toBe(
+    "hold 4 beats · accurate tuning",
+  );
+  expect(screen.getByTestId("mode-word-me").style.color).toBe(
+    "rgb(28, 25, 22)",
+  );
+  expect(screen.getByTestId("tuner-glyph")).toBeTruthy();
+  expect(app.listening.startCalls).toBe(0);
+  await openSheet(app);
+  expect(pillSelected("hold", "4")).toBe(true);
+  expect(pillSelected("in-tune", "accurate")).toBe(true);
+  expect(pillSelected("cues", "tone")).toBe(true);
+  expect(pillSelected("cues", "meter")).toBe(false);
+});
+
+test("practice.session/REQ-011/S2 — first run: play along, the lead defaults behind the sheet", async () => {
+  localStorage.clear();
+  const fakes = sessionDepsWithFakes();
+  render(
+    <App
+      catalogue={builtInCatalogue()}
+      selectionStore={localStorageSelectionStore(localStorage)}
+      sessionDeps={fakes.sessionDeps}
+    />,
+  );
+  const user = userEvent.setup();
+  expect(screen.getByTestId("mode-word-tool").style.color).toBe(
+    "rgb(28, 25, 22)",
+  );
+  expect(screen.getByTestId("start-circle").textContent).toContain("▶");
+  await user.click(screen.getByTestId("mode-word-me"));
+  expect(screen.getByTestId("position-caption").textContent).toBe(
+    "hold 2 beats · medium tuning",
+  );
+  await user.click(screen.getByText("edit ›"));
+  expect(pillSelected("hold", "2")).toBe(true);
+  expect(pillSelected("in-tune", "medium")).toBe(true);
+  expect(pillSelected("cues", "meter")).toBe(true);
+});
+
+// practice.session/REQ-011/S5 — a stored v5 payload (predates lead
+// settings): the same shape `selection-store.test.ts`'s own `v5Document`
+// fixture carries (flute Concert, G major, ↓ 2 oct arpeggio, metronome,
+// loop off, count-in off, rest bar on, 132 bpm, Dorian on the minor ring,
+// drone octave 5 warm) — inlined here rather than imported across test
+// files.
+test("practice.session/REQ-011/S5 — stored state from 007", async () => {
+  localStorage.clear();
+  localStorage.setItem(
+    STORAGE_KEY,
+    JSON.stringify({
+      schemaVersion: 5,
+      variantId: "flute-concert",
+      keyId: "G-major",
+      spelling: "sharp",
+      view: "names",
+      degreesEnabled: true,
+      distanceRingEnabled: true,
+      staveNamesEnabled: false,
+      traversal: { direction: "down", octaves: 2, shape: "arpeggio" },
+      session: {
+        soundMode: "metronome",
+        loop: false,
+        countIn: false,
+        restBar: true,
+        tempoBpm: 132,
+      },
+      scale: { major: "major", minor: "dorian" },
+      drone: { octave: 5, sound: "warm" },
+    }),
+  );
+  const fakes = sessionDepsWithFakes();
+  render(
+    <App
+      catalogue={builtInCatalogue()}
+      selectionStore={localStorageSelectionStore(localStorage)}
+      sessionDeps={fakes.sessionDeps}
+    />,
+  );
+  expect(screen.getByText("132")).toBeTruthy();
+  expect(screen.getByTestId("mode-word-tool").style.color).toBe(
+    "rgb(28, 25, 22)",
+  );
+  await userEvent.setup().click(screen.getByTestId("mode-word-me"));
+  expect(screen.getByTestId("position-caption").textContent).toBe(
+    "hold 2 beats · medium tuning",
+  );
+});
+
+test("practice.session/REQ-011 — a mode or hold change is stored", async () => {
+  const app = renderLeadApp();
+  await app.user.click(screen.getByTestId("mode-word-me"));
+  expect(
+    (JSON.parse(localStorage.getItem(STORAGE_KEY)!) as StoredSelection).session
+      .lead.who,
+  ).toBe("me");
+  await openSheet(app);
+  await app.user.click(pill("hold", "4"));
+  expect(
+    (JSON.parse(localStorage.getItem(STORAGE_KEY)!) as StoredSelection).session
+      .lead,
+  ).toEqual({
+    who: "me",
+    holdBeats: 4,
+    tolerance: "medium",
+    cueMeter: true,
+    cueTone: false,
+  });
+});
+
 test("practice.session/REQ-011/S2 (app) — first run: plain key, no scale suffix", () => {
   localStorage.clear();
   render(
@@ -171,7 +327,7 @@ test("practice.session/REQ-011/S2 (app) — first run: plain key, no scale suffi
   );
 });
 
-test("practice.session/REQ-011/S4 (app) — a v3 payload keeps its settings and takes the default scales", () => {
+test("practice.session/REQ-011/S4 (app) — a v3 payload keeps its settings and takes the default scales", async () => {
   localStorage.clear();
   localStorage.setItem(
     STORAGE_KEY,
@@ -204,9 +360,23 @@ test("practice.session/REQ-011/S4 (app) — a v3 payload keeps its settings and
   expect(screen.getByTestId("current-key").textContent).toBe("G major");
   expect(screen.getByText("↑ · 2 oct · scale · loop")).toBeTruthy();
   expect(screen.getByText("120")).toBeTruthy();
+  // practice.session/REQ-011/S4 — no lead settings recorded either: the S2
+  // defaults again.
+  expect(screen.getByTestId("mode-word-tool").style.color).toBe(
+    "rgb(28, 25, 22)",
+  );
+  {
+    const user = userEvent.setup();
+    await user.click(screen.getByTestId("mode-word-me"));
+    await user.click(screen.getByRole("button", { name: "Edit traversal" }));
+  }
+  expect(pillSelected("hold", "2")).toBe(true);
+  expect(pillSelected("in-tune", "medium")).toBe(true);
+  expect(pillSelected("cues", "meter")).toBe(true);
+  expect(pillSelected("cues", "tone")).toBe(false);
 });
 
-test("practice.session/REQ-011/S3 (app) — a stored v2 payload keeps the selection and takes the S2 defaults for the rest", () => {
+test("practice.session/REQ-011/S3 (app) — a stored v2 payload keeps the selection and takes the S2 defaults for the rest", async () => {
   localStorage.clear();
   localStorage.setItem(
     STORAGE_KEY,
@@ -250,6 +420,20 @@ test("practice.session/REQ-011/S3 (app) — a stored v2 payload keeps the select
   expect(screen.getByText(expectedSummary)).toBeTruthy();
   expect(screen.getByText("96")).toBeTruthy();
   expect(screen.getByRole("button", { name: "Andante" })).toBeTruthy();
+  // practice.session/REQ-011/S3 — a v2 payload carries no lead settings
+  // either: the S2 defaults.
+  expect(screen.getByTestId("mode-word-tool").style.color).toBe(
+    "rgb(28, 25, 22)",
+  );
+  {
+    const user = userEvent.setup();
+    await user.click(screen.getByTestId("mode-word-me"));
+    await user.click(screen.getByRole("button", { name: "Edit traversal" }));
+  }
+  expect(pillSelected("hold", "2")).toBe(true);
+  expect(pillSelected("in-tune", "medium")).toBe(true);
+  expect(pillSelected("cues", "meter")).toBe(true);
+  expect(pillSelected("cues", "tone")).toBe(false);
 });
 
 test("practice.session/REQ-010/S1 (UI) — a notice appears, nothing modal opens, and the run still walks silently", async () => {
diff --git a/tests/ui/scenarios/lead-app-helpers.tsx b/tests/ui/scenarios/lead-app-helpers.tsx
index 6cef74d..0d6f1f9 100644
--- a/tests/ui/scenarios/lead-app-helpers.tsx
+++ b/tests/ui/scenarios/lead-app-helpers.tsx
@@ -1,4 +1,4 @@
-import { act, render, screen } from "@testing-library/react";
+import { act, render, screen, within } from "@testing-library/react";
 import userEvent from "@testing-library/user-event";
 import { builtInCatalogue } from "../../../src/theory/published";
 import { App } from "../../../src/ui/App";
@@ -85,3 +85,25 @@ export function hearSteadyInApp(
 export function silenceInApp(app: LeadApp, ms: number): void {
   act(() => app.clock.advance(ms));
 }
+
+/** Opens the Traversal sheet (REQ-020). */
+export async function openSheet(app: LeadApp): Promise<void> {
+  await app.user.click(screen.getByRole("button", { name: "Edit traversal" }));
+}
+
+/** A sheet row by its `data-row` (REQ-020). */
+export function row(name: string): HTMLElement {
+  return screen
+    .getAllByTestId("sheet-row")
+    .find((r) => r.dataset.row === name)!;
+}
+
+/** A pill labelled `label` within row `name` (REQ-020). */
+export function pill(name: string, label: string): HTMLElement {
+  return within(row(name)).getByText(label);
+}
+
+/** Whether the pill labelled `label` in row `name` is the selected one (REQ-020). */
+export function pillSelected(name: string, label: string): boolean {
+  return pill(name, label).style.background === "rgb(231, 220, 198)";
+}
diff --git a/tests/ui/scenarios/traversal-sheet-lead.test.tsx b/tests/ui/scenarios/traversal-sheet-lead.test.tsx
index da204ec..c1b9007 100644
--- a/tests/ui/scenarios/traversal-sheet-lead.test.tsx
+++ b/tests/ui/scenarios/traversal-sheet-lead.test.tsx
@@ -3,10 +3,13 @@ import { afterEach, expect, test } from "vitest";
 import { cleanup } from "@testing-library/react";
 import type { StoredSelection } from "../../../src/ui/selection-store";
 import {
+  openSheet,
+  pill,
+  pillSelected,
   renderLeadApp,
+  row,
   storedCMajor,
   STORAGE_KEY,
-  type LeadApp,
 } from "./lead-app-helpers";
 
 function storedSelection(): StoredSelection {
@@ -18,32 +21,14 @@ afterEach(() => {
   localStorage.clear();
 });
 
-async function openSheet(app: LeadApp): Promise<void> {
-  await app.user.click(screen.getByRole("button", { name: "Edit traversal" }));
-}
-
 function rows(): (string | undefined)[] {
   return screen.getAllByTestId("sheet-row").map((r) => r.dataset.row);
 }
 
-function row(name: string): HTMLElement {
-  return screen
-    .getAllByTestId("sheet-row")
-    .find((r) => r.dataset.row === name)!;
-}
-
 function hintOf(name: string): string | null {
   return within(row(name)).getByTestId("row-hint").textContent;
 }
 
-function pill(name: string, label: string): HTMLElement {
-  return within(row(name)).getByText(label);
-}
-
-function pillSelected(name: string, label: string): boolean {
-  return pill(name, label).style.background === "rgb(231, 220, 198)";
-}
-
 test("practice.session/REQ-020/S1 — play along's rows", async () => {
   const app = renderLeadApp();
   await openSheet(app);
```

## Verdict

TASK: C008_T017
SPEC: PASS
QUALITY: PASS
FINDINGS:
- [minor] tests/ui/scenarios/app-session.test.tsx:203 — brief's literal RED test used `screen.getByText("Allegro")` — ambiguous against the real DOM (matches both the tempo button and `tempo-term-name`), so the implementer substituted `getByRole("button", { name: "Allegro" })`, matching the file's existing REQ-011/S1 convention; narrower, not loosened.
UNVERIFIED:
- none

<!-- recorded 2026-10-04T06:36:30Z by scripts/record.sh -->
