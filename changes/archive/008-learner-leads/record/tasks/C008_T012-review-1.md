---
type: Task Review
title: Review package — C008_T012 · 008-learner-leads
description: The diff produced for C008_T012, with its Verify and check output, for the task reviewer.
resource: /.sdd/reviews/008-learner-leads/C008_T012.md
status: draft
tags: [sdd, review, "change:008-learner-leads"]
sources:
  - resource: /changes/008-learner-leads/tasks/C008_T012.md
  - resource: /.sdd/briefs/008-learner-leads/C008_T012.md
  - resource: git:cb0d9b4bd1ef7409a2e3de8e43b40a7fd5b57831..d094b269dde2a5246d909b1539a2b5bbee4cdcb7
generated:
  by: process:review-package.sh
  at: 2026-10-03T09:40:36Z
sdd_id: 008-learner-leads
---

# Review package — C008_T012 · 008-learner-leads

base: `cb0d9b4bd1ef7409a2e3de8e43b40a7fd5b57831` → head: `d094b269dde2a5246d909b1539a2b5bbee4cdcb7`

## Commands (run by this script)

### Verify

`pnpm vitest run tests/ui/scenarios/transport-card-lead.test.tsx`

```

 RUN  v5.0.1 /home/merlin/projects/music-learning-assistant


 Test Files  1 passed (1)
      Tests  5 passed (5)
   Start at  10:40:36
   Duration  1.23s (tests 36%, transform 28%, environment 21%, import 15%)

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
test tests::a_tone_ending_into_silence_has_no_large_step ... ok
test tests::a_tone_starts_exactly_at_its_onset_frame ... ok
test tone::tests::tone_is_silent_before_its_next_onset ... ok
test drone::tests::retune_reaches_the_target_within_40ms_without_a_step ... ok
test tests::a_stopped_drone_is_silent_within_its_release ... ok
test tests::a_drone_renders_without_large_steps_across_attack_and_stop ... ok
test tests::a_sound_change_crossfade_is_never_silent ... ok
test tests::an_unknown_sound_code_is_refused ... ok
test tests::clicks_only_render_without_large_steps ... ok
test tests::onsets_are_reported_in_the_quantum_they_render ... ok
test tests::render_fills_128_frames_of_silence_before_any_voice ... ok
test tests::retune_ignores_tones_and_unknown_tags ... ok
test tests::stop_all_fades_rather_than_clicks ... ok
test tests::stop_all_silences_within_5ms_plus_one_quantum ... ok
test drone::tests::pure_drone_has_a_single_partial ... ok
test tests::tones_and_clicks_together_render_without_large_steps ... ok
test tests::stop_by_tag_leaves_other_voices_sounding ... ok
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

- M	src/ui/App.tsx
- M	src/ui/TransportCard.tsx
- M	src/ui/theme.ts
- A	tests/ui/scenarios/lead-app-helpers.tsx
- A	tests/ui/scenarios/transport-card-lead.test.tsx
- M	tests/ui/scenarios/transport-card.test.tsx

## Diff

```diff
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index 58b0fb7..28532b5 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -32,6 +32,7 @@ import {
   type SessionSettings,
   type SessionSnapshot,
   type TempoTerm,
+  type Who,
 } from "../practice/published";
 import { findVariantById } from "./catalogue-lookup";
 import { CircleOfFifths, locateSpelledKey } from "./CircleOfFifths";
@@ -473,6 +474,16 @@ export function App(props: {
     }
   }
 
+  // practice.session/REQ-014 — a mode word tapped selects that mode; the
+  // session itself stops a run in progress and shows the new mode idle.
+  function handleWho(who: Who): void {
+    if (session === null || snapshot === null) return;
+    session.setSettings({
+      ...snapshot.settings,
+      lead: { ...snapshot.settings.lead, who },
+    });
+  }
+
   // practice.session/REQ-013 — a names column names a pitch class, not a
   // run index (unlike a stave notehead, which already knows its own): this
   // resolves it to the lowest note of that name in the run — the descent's
@@ -873,6 +884,7 @@ export function App(props: {
                   })
                 }
                 onOpenTempo={handleOpenTempoSheet}
+                onWho={handleWho}
               />
               <TraversalRow
                 summaryLine={snapshot.summaryLine}
diff --git a/src/ui/TransportCard.tsx b/src/ui/TransportCard.tsx
index f0baf91..6c0cdf0 100644
--- a/src/ui/TransportCard.tsx
+++ b/src/ui/TransportCard.tsx
@@ -1,6 +1,6 @@
 import type { CSSProperties, JSX } from "react";
-import type { SessionSnapshot } from "../practice/published";
-import { fonts, paper } from "./theme";
+import type { SessionSnapshot, Who } from "../practice/published";
+import { fonts, modeWords, paper } from "./theme";
 
 // Geometry and colour below are copied verbatim from the vendored visual
 // reference's bottom-panel transport card (changes/003-hear-the-scale/
@@ -69,17 +69,122 @@ function isPlaying(transport: SessionSnapshot["transport"]): boolean {
   return transport.kind !== "idle";
 }
 
+// practice.session/REQ-014 — the Tuner glyph (three bars) drawn in the
+// start circle while I lead is idle, in place of ▶. Rendered at every
+// state — hidden (not unmounted) when not shown — so the card's DOM
+// structure (practice.session/REQ-002/S5) never gains or loses a node as
+// the mode or transport state changes; its bars carry no text, so hiding
+// it this way never affects another element's textContent.
+function TunerGlyph(props: { readonly visible: boolean }): JSX.Element {
+  return (
+    <div
+      data-testid="tuner-glyph"
+      style={{
+        display: props.visible ? "flex" : "none",
+        alignItems: "center",
+        gap: modeWords.glyphGap,
+      }}
+    >
+      {modeWords.glyphHeights.map((height, index) => (
+        <div
+          key={index}
+          style={{
+            width: modeWords.glyphBar,
+            height,
+            borderRadius: modeWords.glyphBar / 2,
+            background: modeWords.glyphCentre,
+            boxShadow: `0 0 0 2px ${modeWords.glyphOuter}`,
+          }}
+        />
+      ))}
+    </div>
+  );
+}
+
+// practice.session/REQ-014 — the two mode words beneath the caption, in
+// place of the progress bar, in every transport state.
+function ModeWords(props: {
+  readonly who: Who;
+  readonly onWho: (who: Who) => void;
+}): JSX.Element {
+  const { who, onWho } = props;
+  return (
+    <div style={{ display: "flex", gap: modeWords.gap }}>
+      <ModeWord
+        testId="mode-word-tool"
+        label="play along"
+        selected={who === "tool"}
+        onClick={() => onWho("tool")}
+      />
+      <ModeWord
+        testId="mode-word-me"
+        label="I lead"
+        selected={who === "me"}
+        onClick={() => onWho("me")}
+      />
+    </div>
+  );
+}
+
+function ModeWord(props: {
+  readonly testId: string;
+  readonly label: string;
+  readonly selected: boolean;
+  readonly onClick: () => void;
+}): JSX.Element {
+  const { testId, label, selected, onClick } = props;
+  return (
+    <button
+      type="button"
+      data-testid={testId}
+      onClick={onClick}
+      style={{
+        display: "flex",
+        flexDirection: "column",
+        alignItems: "center",
+        gap: 0,
+        background: "transparent",
+        border: "none",
+        cursor: "pointer",
+        padding: `${modeWords.padding}px 0`,
+        fontSize: TERM_FONT_SIZE_WORD,
+        fontWeight: TERM_FONT_WEIGHT_WORD,
+        color: selected ? paper.ink : paper.faint,
+      }}
+    >
+      <span>{label}</span>
+      <span
+        style={{
+          marginTop: modeWords.barOffset,
+          width: "100%",
+          height: modeWords.barHeight,
+          borderRadius: modeWords.barHeight / 2,
+          background: selected ? paper.accent : "transparent",
+        }}
+      />
+    </button>
+  );
+}
+
+const TERM_FONT_SIZE_WORD = 12.5;
+const TERM_FONT_WEIGHT_WORD = 600;
+
 export function TransportCard(props: {
   readonly snapshot: SessionSnapshot;
   readonly onTogglePlay: () => void;
   readonly onStepTempo: (delta: -2 | 2) => void;
   readonly onOpenTempo: () => void;
+  readonly onWho: (who: Who) => void;
 }): JSX.Element {
-  const { snapshot, onTogglePlay, onStepTempo, onOpenTempo } = props;
+  const { snapshot, onTogglePlay, onStepTempo, onOpenTempo, onWho } = props;
   const playing = isPlaying(snapshot.transport);
+  const idleLeading =
+    snapshot.lead.who === "me" && snapshot.lead.phase === "idle";
+  const caption = idleLeading ? snapshot.lead.idleCaption : snapshot.caption;
 
   return (
     <div
+      data-testid="transport-card"
       style={{
         display: "flex",
         alignItems: "center",
@@ -92,6 +197,7 @@ export function TransportCard(props: {
     >
       <button
         type="button"
+        data-testid="start-circle"
         aria-label={playing ? "Stop" : "Play"}
         onClick={onTogglePlay}
         style={{
@@ -112,7 +218,8 @@ export function TransportCard(props: {
           flex: "none",
         }}
       >
-        {playing ? "❚❚" : "▶"}
+        <TunerGlyph visible={idleLeading} />
+        {idleLeading ? null : playing ? "❚❚" : "▶"}
       </button>
       <div
         style={{
@@ -135,10 +242,9 @@ export function TransportCard(props: {
             textOverflow: "ellipsis",
           }}
         >
-          {snapshot.caption}
+          {caption}
         </div>
-        {/* practice.session/REQ-002 — the progress bar is removed here (the
-            mode words that replace it, beneath this caption, are T012's). */}
+        <ModeWords who={snapshot.lead.who} onWho={onWho} />
       </div>
       <div
         style={{
diff --git a/src/ui/theme.ts b/src/ui/theme.ts
index 111e260..da9ce9b 100644
--- a/src/ui/theme.ts
+++ b/src/ui/theme.ts
@@ -51,3 +51,17 @@ export const motion = {
 export const lead = {
   holdFill: "oklch(0.80 0.07 150)",
 } as const;
+
+// practice.session/REQ-014 — the mode words beneath the caption, and the
+// Tuner glyph drawn in the start circle while I lead is idle.
+export const modeWords = {
+  gap: 16,
+  barHeight: 2,
+  barOffset: 4,
+  padding: 4,
+  glyphBar: 3,
+  glyphGap: 3,
+  glyphHeights: [10, 20, 10] as const,
+  glyphOuter: "rgba(249,244,233,.6)",
+  glyphCentre: "#f9f4e9",
+} as const;
diff --git a/tests/ui/scenarios/lead-app-helpers.tsx b/tests/ui/scenarios/lead-app-helpers.tsx
new file mode 100644
index 0000000..6cef74d
--- /dev/null
+++ b/tests/ui/scenarios/lead-app-helpers.tsx
@@ -0,0 +1,87 @@
+import { act, render, screen } from "@testing-library/react";
+import userEvent from "@testing-library/user-event";
+import { builtInCatalogue } from "../../../src/theory/published";
+import { App } from "../../../src/ui/App";
+import {
+  firstRunDefaults,
+  localStorageSelectionStore,
+  type StoredSelection,
+} from "../../../src/ui/selection-store";
+import { sessionDepsWithFakes } from "../../practice/fakes";
+
+export const STORAGE_KEY = "music-learning-assistant.selection.v1";
+export const frameOfMs = (ms: number): number =>
+  Math.round((ms * 48000) / 1000);
+export const HOP_MS = 512_000 / 48000;
+
+/** C major on flute Concert, ↑↓ 1 oct — 15 notes · C4–C5 — stored at v6 with `lead` overridden. */
+export function storedCMajor(
+  lead: Partial<StoredSelection["session"]["lead"]> = {},
+  rest: Partial<StoredSelection> = {},
+): StoredSelection {
+  return {
+    ...firstRunDefaults,
+    variantId: "flute-concert",
+    keyId: "C-major",
+    ...rest,
+    session: {
+      ...firstRunDefaults.session,
+      ...rest.session,
+      lead: { ...firstRunDefaults.session.lead, ...lead },
+    },
+  };
+}
+
+export function renderLeadApp(stored: StoredSelection = storedCMajor()) {
+  localStorage.clear();
+  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
+  const fakes = sessionDepsWithFakes();
+  render(
+    <App
+      catalogue={builtInCatalogue()}
+      selectionStore={localStorageSelectionStore(localStorage)}
+      sessionDeps={fakes.sessionDeps}
+    />,
+  );
+  return { ...fakes, user: userEvent.setup() };
+}
+
+export type LeadApp = ReturnType<typeof renderLeadApp>;
+
+export async function flushApp(): Promise<void> {
+  await act(async () => {
+    await Promise.resolve();
+    await Promise.resolve();
+  });
+}
+
+/** Taps "I lead" (if not already) and the start circle, past the session's two awaits. */
+export async function startLeadInApp(app: LeadApp): Promise<void> {
+  if (screen.getByTestId("mode-word-me").style.color !== "rgb(28, 25, 22)")
+    await app.user.click(screen.getByTestId("mode-word-me"));
+  await app.user.click(screen.getByTestId("start-circle"));
+  await flushApp();
+}
+
+export function hearInApp(app: LeadApp, hz: number, atMs: number): void {
+  act(() => {
+    app.listening.frame = frameOfMs(atMs);
+    app.listening.feed(hz, app.listening.frame);
+    app.clock.advance(1);
+  });
+}
+
+export function hearSteadyInApp(
+  app: LeadApp,
+  hz: number,
+  fromMs: number,
+  toMs: number,
+): number {
+  let t = fromMs;
+  for (; t <= toMs; t += HOP_MS) hearInApp(app, hz, t);
+  return t - HOP_MS;
+}
+
+export function silenceInApp(app: LeadApp, ms: number): void {
+  act(() => app.clock.advance(ms));
+}
diff --git a/tests/ui/scenarios/transport-card-lead.test.tsx b/tests/ui/scenarios/transport-card-lead.test.tsx
new file mode 100644
index 0000000..bec52e1
--- /dev/null
+++ b/tests/ui/scenarios/transport-card-lead.test.tsx
@@ -0,0 +1,97 @@
+import { act, cleanup, screen } from "@testing-library/react";
+import { afterEach, expect, test } from "vitest";
+import { flushApp, renderLeadApp, storedCMajor } from "./lead-app-helpers";
+
+afterEach(cleanup);
+
+test("practice.session/REQ-014/S1 (card) — choosing I lead", async () => {
+  const app = renderLeadApp();
+  expect(screen.getByTestId("mode-word-tool").style.color).toBe(
+    "rgb(28, 25, 22)",
+  );
+  expect(screen.getByTestId("mode-word-me").style.color).toBe(
+    "rgb(154, 145, 134)",
+  );
+  await app.user.click(screen.getByTestId("mode-word-me"));
+  expect(screen.getByTestId("mode-word-me").style.color).toBe(
+    "rgb(28, 25, 22)",
+  );
+  expect(screen.getByTestId("mode-word-tool").style.color).toBe(
+    "rgb(154, 145, 134)",
+  );
+  expect(screen.getByTestId("tuner-glyph")).toBeTruthy();
+  expect(screen.getByTestId("start-circle").textContent).not.toContain("▶");
+  expect(screen.getByTestId("position-caption").textContent).toBe(
+    "hold 2 beats · medium tuning",
+  );
+  expect(app.listening.startCalls).toBe(0);
+});
+
+test("practice.session/REQ-014/S2 (card) — and back", async () => {
+  const app = renderLeadApp(storedCMajor({ who: "me" }));
+  expect(screen.getByTestId("tuner-glyph")).toBeTruthy();
+  await app.user.click(screen.getByTestId("mode-word-tool"));
+  expect(screen.getByTestId("start-circle").textContent).toContain("▶");
+  expect(screen.getByTestId("position-caption").textContent).toBe(
+    "15 notes · C4–C5",
+  );
+});
+
+test("practice.session/REQ-014/S4 (card) — one beat, singular", () => {
+  renderLeadApp(
+    storedCMajor({ who: "me", holdBeats: 1, tolerance: "accurate" }),
+  );
+  expect(screen.getByTestId("position-caption").textContent).toBe(
+    "hold 1 beat · accurate tuning",
+  );
+});
+
+test("practice.session/REQ-002/S5 — one card structure, idle and playing, in both modes", async () => {
+  const app = renderLeadApp(
+    storedCMajor(
+      {},
+      { session: { ...storedCMajor().session, countIn: false } },
+    ),
+  );
+  const card = screen.getByTestId("transport-card");
+  const idleIds = [...card.querySelectorAll("[data-testid]")].map((e) =>
+    e.getAttribute("data-testid"),
+  );
+  expect(idleIds).not.toContain("progress-fill");
+  await app.user.click(screen.getByTestId("start-circle"));
+  await flushApp();
+  act(() => app.clock.advance(3000));
+  expect(screen.getByTestId("position-caption").textContent).toMatch(
+    /^[A-G]♯?4 · \d+ of 15$/,
+  );
+  expect(
+    [...card.querySelectorAll("[data-testid]")].map((e) =>
+      e.getAttribute("data-testid"),
+    ),
+  ).toEqual(idleIds);
+  await app.user.click(screen.getByTestId("mode-word-me"));
+  expect(
+    [...card.querySelectorAll("[data-testid]")].map((e) =>
+      e.getAttribute("data-testid"),
+    ),
+  ).toEqual(idleIds);
+});
+
+test("practice.session/REQ-002/S1 · practice.session/REQ-014/S5 (card) — play along is as it was, the words beneath the caption", async () => {
+  const app = renderLeadApp(
+    storedCMajor(
+      {},
+      { session: { ...storedCMajor().session, countIn: false } },
+    ),
+  );
+  await app.user.click(screen.getByTestId("start-circle"));
+  await flushApp();
+  act(() => app.clock.advance(100));
+  expect(screen.getByTestId("position-caption").textContent).toBe(
+    "C4 · 1 of 15",
+  );
+  expect(screen.getByTestId("mode-word-tool").style.color).toBe(
+    "rgb(28, 25, 22)",
+  );
+  expect(screen.getByTestId("start-circle").textContent).toContain("❚❚");
+});
diff --git a/tests/ui/scenarios/transport-card.test.tsx b/tests/ui/scenarios/transport-card.test.tsx
index a2dd79b..8bed4dc 100644
--- a/tests/ui/scenarios/transport-card.test.tsx
+++ b/tests/ui/scenarios/transport-card.test.tsx
@@ -124,6 +124,7 @@ test("practice.session/REQ-002/S1 (UI) — idle transport shows Play, the run ca
       onTogglePlay={noop}
       onStepTempo={noop}
       onOpenTempo={noop}
+      onWho={noop}
     />,
   );
 
@@ -149,6 +150,7 @@ test("practice.session/REQ-002/S1 (UI) — playing transport shows Stop and the
       onTogglePlay={noop}
       onStepTempo={noop}
       onOpenTempo={noop}
+      onWho={noop}
     />,
   );
 
@@ -172,6 +174,7 @@ test("practice.session/REQ-002/S2 (UI) — tapping Stop calls onTogglePlay once"
       onTogglePlay={onTogglePlay}
       onStepTempo={noop}
       onOpenTempo={noop}
+      onWho={noop}
     />,
   );
 
@@ -194,6 +197,7 @@ test("practice.session/REQ-004/S1, S3 (UI) — Faster and Slower step the tempo,
       onTogglePlay={noop}
       onStepTempo={onStepTempo}
       onOpenTempo={onOpenTempo}
+      onWho={noop}
     />,
   );
 
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/008-learner-leads/tasks/C008_T012.md b/changes/008-learner-leads/tasks/C008_T012.md
index 2ba623c..953ab5a 100644
--- a/changes/008-learner-leads/tasks/C008_T012.md
+++ b/changes/008-learner-leads/tasks/C008_T012.md
@@ -12,13 +12,13 @@ generated:
   at: 2026-10-02T21:24:27Z
 sdd_id: 008-learner-leads
 sdd_task: C008_T012
-sdd_phase: todo
+sdd_phase: in-progress
 sdd_requirements: [practice.session/REQ-014, practice.session/REQ-002]
 sdd_depends_on: [C008_T005]
 sdd_parked_on: 
 sdd_group: "Phase 3 — The practice screen"
 sdd_parallel: false
-sdd_attempts: 0
+sdd_attempts: 1
 ---
 
 # C008_T012 · The transport card: the mode words, the I-lead idle card, no progress bar
```

## Verdict

_The task reviewer appends its verdict here._
## Verdict

TASK: C008_T012
SPEC: PASS
QUALITY: PASS
FINDINGS:
- [minor] src/ui/TransportCard.tsx:143-153 — brief's Produces says the mode-word bar is "2 px bar (radius 2, 4 px below)" — the component sets `borderRadius: modeWords.barHeight / 2` (=1), not the literal 2; visually identical (a 2 px-tall bar clamps to the same rounding at either value) but not the literal figure given.
- [minor] src/ui/TransportCard.tsx:163 — the glyph's box-shadow ring width (`2px`) is an inline literal, not hoisted to a named constant like the rest of the file's geometry (`CARD_GAP`, `PLAY_SIZE`, etc.); `scripts/check-design.sh` only scans `*.css` so it doesn't catch this either way.
UNVERIFIED:
- practice.session/REQ-002/S5, REQ-014/S1 (visual) — the task's own Verify line also requires `python3 scripts/design_snapshot.py … --base http://localhost:5173` matching `practice--idle-play-along.png`/`practice--idle-i-lead.png` against canvas phones 01/02; this needs a live dev server and is not in the package's recorded commands (jsdom has no layout, so the vitest run only proves DOM structure, not the glyph's pixel rendering against the two-tone "outer rgba(...) / centre #f9f4e9" design reference) — the brief itself defers the pixel check to the design loop.
COMMANDS:
- `./scripts/check-design.sh` → 3 pre-existing hard-coded values in src/ui/global.css only (confirmed via `git diff cb0d9b4..d094b26 -- src/ui/global.css` empty, and `git log` showing the file last touched in change 002/007, well before this task)
- `./scripts/check-contexts.sh` → "✅ context boundaries respected"
- `grep -rn "progress-fill|progress-track" tests/ src/` → only the new negative assertion in transport-card-lead.test.tsx; no leftover assertions in app-session.test.tsx or elsewhere

<!-- recorded 2026-10-03T09:44:10Z by scripts/record.sh -->
