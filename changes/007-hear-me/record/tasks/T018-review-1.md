---
type: Task Review
title: Review package — T018 · 007-hear-me
description: The diff produced for T018, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T018.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T018.md
  - resource: git:d444f367d1f19781ab9b218cbe398965da975e7f..9b252b0cf8cddff0eefd13fbbdca54b6edc72314
generated:
  by: process:review-package.sh
  at: 2026-09-28T13:00:08Z
sdd_id: 007-hear-me
---

# Review package — T018 · 007-hear-me

base: `d444f367d1f19781ab9b218cbe398965da975e7f` → head: `9b252b0cf8cddff0eefd13fbbdca54b6edc72314`

## Files changed

- M	src/ui/App.tsx
- M	src/ui/TunerLevel.tsx
- M	src/ui/TunerScreen.tsx
- M	tests/ui/scenarios/selection-persistence.test.tsx
- M	tests/ui/scenarios/tuner-screen.test.tsx

## Diff

```diff
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index cdccf96..d379d6a 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -658,6 +658,7 @@ export function App(props: {
           onPin={handlePinTarget}
           onStep={handleStepTarget}
           onClear={handleClearTarget}
+          onSpellingChange={handleSelectSpelling}
         />
       ) : (
         <>
diff --git a/src/ui/TunerLevel.tsx b/src/ui/TunerLevel.tsx
index 6fafc03..614650d 100644
--- a/src/ui/TunerLevel.tsx
+++ b/src/ui/TunerLevel.tsx
@@ -60,6 +60,12 @@ const OCTAVE_FONT_SIZE = 22;
 const OCTAVE_MARGIN_TOP = 30;
 const EMPTY_FONT_SIZE = 14;
 
+// practice.tuner/REQ-007 — "'–' in place of the big name" while cannot-hear:
+// unconditional, not a fallback for "nothing else to show" (Tuner.dc.html's
+// `cannotHear` sc-if sits beside, not inside, `showName`'s). The dash's own
+// colour, `paper.drawerBorder`, is the reference's `#d5cbb8`.
+const DASH_INK = paper.drawerBorder;
+
 // The line: lineTop = mid - map(cents) - 3.5, clamped to the rule's own
 // ±50 ¢ — a pinned target beyond it stays at the edge.
 const LINE_LEFT = 52;
@@ -165,6 +171,7 @@ export function TunerLevel(props: {
 }): JSX.Element {
   const { tuner: snapshot, spelling } = props;
   const reading = snapshot.reading;
+  const cannotHear = snapshot.listening.kind === "cannot-hear";
 
   // The note the big name shows: the current reading's target (the
   // pinned note, or the nearest note with hysteresis) when there is one,
@@ -352,46 +359,66 @@ export function TunerLevel(props: {
             gap: 8,
           }}
         >
-          {referenceNote !== null && (
+          {cannotHear ? (
             <div
               data-testid="tuner-name"
-              style={{ display: "flex", alignItems: "flex-start", gap: 4 }}
-            >
-              <div
-                style={{
-                  fontFamily: fonts.display,
-                  fontSize: NAME_FONT_SIZE,
-                  lineHeight: 1,
-                  color: nameInk,
-                }}
-              >
-                {pitchClassLabel(referenceNote)}
-              </div>
-              <div
-                style={{
-                  fontFamily: fonts.mono,
-                  fontSize: OCTAVE_FONT_SIZE,
-                  fontWeight: 600,
-                  color: paper.muted,
-                  marginTop: OCTAVE_MARGIN_TOP,
-                }}
-              >
-                {referenceNote.octave}
-              </div>
-            </div>
-          )}
-          {reading === null && (
-            <div
-              data-testid="tuner-empty"
               style={{
-                fontSize: EMPTY_FONT_SIZE,
-                color: paper.faint,
-                background: paper.frame,
-                padding: "4px 10px",
+                fontFamily: fonts.display,
+                fontSize: NAME_FONT_SIZE,
+                lineHeight: 1,
+                color: DASH_INK,
               }}
             >
-              Play a note
+              –
             </div>
+          ) : (
+            <>
+              {referenceNote !== null && (
+                <div
+                  data-testid="tuner-name"
+                  style={{
+                    display: "flex",
+                    alignItems: "flex-start",
+                    gap: 4,
+                  }}
+                >
+                  <div
+                    style={{
+                      fontFamily: fonts.display,
+                      fontSize: NAME_FONT_SIZE,
+                      lineHeight: 1,
+                      color: nameInk,
+                    }}
+                  >
+                    {pitchClassLabel(referenceNote)}
+                  </div>
+                  <div
+                    style={{
+                      fontFamily: fonts.mono,
+                      fontSize: OCTAVE_FONT_SIZE,
+                      fontWeight: 600,
+                      color: paper.muted,
+                      marginTop: OCTAVE_MARGIN_TOP,
+                    }}
+                  >
+                    {referenceNote.octave}
+                  </div>
+                </div>
+              )}
+              {reading === null && (
+                <div
+                  data-testid="tuner-empty"
+                  style={{
+                    fontSize: EMPTY_FONT_SIZE,
+                    color: paper.faint,
+                    background: paper.frame,
+                    padding: "4px 10px",
+                  }}
+                >
+                  Play a note
+                </div>
+              )}
+            </>
           )}
         </div>
         {reading !== null && geometry !== null && (
diff --git a/src/ui/TunerScreen.tsx b/src/ui/TunerScreen.tsx
index 9e6b3a4..6ba697f 100644
--- a/src/ui/TunerScreen.tsx
+++ b/src/ui/TunerScreen.tsx
@@ -57,6 +57,51 @@ const NO_MIC_INK = paper.faint;
 const NO_MIC_DOT = "transparent";
 const NO_MIC_RING = paper.faint;
 
+// The "Can't hear" card (practice.tuner/REQ-007) — geometry and text copied
+// verbatim from the vendored visual reference (Tuner.dc.html, the
+// `cannotHear` sc-if at markup lines 169-172): absolutely positioned over
+// the level/strip/target row rather than replacing them (REQ-007's own
+// text: "visible, non-interrupting, no modal" — the level, strip and
+// footer stay drawn underneath, S1).
+const CARD_TOP = 440;
+const CARD_SIDE = 16;
+const CARD_PADDING = "13px 16px 14px";
+const CARD_RADIUS = 14;
+const CARD_GAP = 5;
+const CARD_TITLE_FONT_SIZE = 14;
+const CARD_BODY_FONT_SIZE = 12.5;
+const CARD_BODY_LINE_HEIGHT = 1.45;
+const CARD_TITLE_TEXT = "Can't hear — no microphone";
+const CARD_BODY_TEXT =
+  "It was refused or isn't there. Allow the microphone for this site, then go back and open the tuner again.";
+
+// The footer (practice.tuner/REQ-002/S5, REQ-007) — geometry copied
+// verbatim from the reference (Tuner.dc.html markup lines 282-287). The
+// ♯/♭ segmented control writes the same `selection.spelling` the circle's
+// own toggle does (App.tsx's `onSpellingChange` — `handleSelectSpelling`),
+// so it carries the circle's own accessible names, "sharp"/"flat"
+// (CircleOfFifths.tsx lines 808-840), not "Sharp spelling"/"Flat spelling"
+// — one preference, one pair of names — and the same `aria-pressed`
+// pattern.
+const FOOTER_PADDING = "14px 16px 20px";
+const FOOTER_GAP = 10;
+const FOOTER_TEXT_FONT_SIZE = 10.5;
+const FOOTER_TEXT_LETTER_SPACING = "0.02em";
+const FOOTER_TEXT = "A4 = 440 Hz · in tune ±5 ¢";
+
+// Border and inactive ink copied from CircleOfFifths.tsx's own
+// PILL_BORDER/PILL_INACTIVE_INK (not named `paper` tokens there either) so
+// the two segmented controls read as the same control.
+const SPELLING_PILL_BORDER = "#e0d7c5";
+const SPELLING_BUTTON_PADDING = "4px 13px 6px";
+const SPELLING_BUTTON_FONT_SIZE = 14;
+const SPELLING_BUTTON_LINE_HEIGHT = 1.2;
+const SPELLING_ACTIVE_BG = paper.pillActive;
+const SPELLING_ACTIVE_INK = paper.inkMid;
+const SPELLING_INACTIVE_INK = "#756c60";
+const SHARP_GLYPH = "♯";
+const FLAT_GLYPH = "♭";
+
 // practice.tuner/REQ-001 — "LISTENING" covers both "starting" (the
 // microphone has been asked for but capture has not begun yet) and
 // "listening" itself; only "cannot-hear" reads "NO MIC" (REQ-007). The
@@ -80,10 +125,22 @@ function TunerScreenComponent(props: {
   readonly onPin: (position: number) => void;
   readonly onStep: (delta: -1 | 1) => void;
   readonly onClear: () => void;
+  readonly onSpellingChange: (preference: SpellingPreference) => void;
 }): JSX.Element {
-  const { tuner, spelling, range, onLeave, onHold, onPin, onStep, onClear } =
-    props;
+  const {
+    tuner,
+    spelling,
+    range,
+    onLeave,
+    onHold,
+    onPin,
+    onStep,
+    onClear,
+    onSpellingChange,
+  } = props;
   const listening = isListening(tuner);
+  const cannotHear = tuner.listening.kind === "cannot-hear";
+  const sharpSelected = spelling === "sharp";
 
   // practice.tuner/REQ-004/S6 — the Target sheet's open/closed state is
   // local to this screen: opening or closing it never touches the session.
@@ -218,8 +275,107 @@ function TunerScreenComponent(props: {
         onStep={onStep}
         onClear={onClear}
       />
-      {/* T018 — the footer */}
-      <div />
+      {cannotHear && (
+        <div
+          data-testid="cannot-hear"
+          style={{
+            position: "absolute",
+            left: CARD_SIDE,
+            right: CARD_SIDE,
+            top: CARD_TOP,
+            padding: CARD_PADDING,
+            background: paper.card,
+            border: `1px solid ${paper.borderSoft}`,
+            borderRadius: CARD_RADIUS,
+            display: "flex",
+            flexDirection: "column",
+            gap: CARD_GAP,
+          }}
+        >
+          <div style={{ fontSize: CARD_TITLE_FONT_SIZE, fontWeight: 600 }}>
+            {CARD_TITLE_TEXT}
+          </div>
+          <div
+            style={{
+              fontSize: CARD_BODY_FONT_SIZE,
+              lineHeight: CARD_BODY_LINE_HEIGHT,
+              color: paper.muted,
+            }}
+          >
+            {CARD_BODY_TEXT}
+          </div>
+        </div>
+      )}
+      <div
+        style={{
+          marginTop: "auto",
+          padding: FOOTER_PADDING,
+          display: "flex",
+          alignItems: "center",
+          justifyContent: "space-between",
+          gap: FOOTER_GAP,
+        }}
+      >
+        <div
+          style={{
+            fontFamily: fonts.mono,
+            fontSize: FOOTER_TEXT_FONT_SIZE,
+            letterSpacing: FOOTER_TEXT_LETTER_SPACING,
+            color: paper.muted,
+          }}
+        >
+          {FOOTER_TEXT}
+        </div>
+        <div
+          style={{
+            display: "flex",
+            border: `1px solid ${SPELLING_PILL_BORDER}`,
+            borderRadius: 999,
+            overflow: "hidden",
+          }}
+        >
+          <button
+            type="button"
+            aria-label="sharp"
+            aria-pressed={sharpSelected}
+            onClick={() => onSpellingChange("sharp")}
+            style={{
+              padding: SPELLING_BUTTON_PADDING,
+              fontSize: SPELLING_BUTTON_FONT_SIZE,
+              fontWeight: 600,
+              lineHeight: SPELLING_BUTTON_LINE_HEIGHT,
+              color: sharpSelected
+                ? SPELLING_ACTIVE_INK
+                : SPELLING_INACTIVE_INK,
+              background: sharpSelected ? SPELLING_ACTIVE_BG : "transparent",
+              border: "none",
+              cursor: "pointer",
+            }}
+          >
+            {SHARP_GLYPH}
+          </button>
+          <button
+            type="button"
+            aria-label="flat"
+            aria-pressed={!sharpSelected}
+            onClick={() => onSpellingChange("flat")}
+            style={{
+              padding: SPELLING_BUTTON_PADDING,
+              fontSize: SPELLING_BUTTON_FONT_SIZE,
+              fontWeight: 600,
+              lineHeight: SPELLING_BUTTON_LINE_HEIGHT,
+              color: !sharpSelected
+                ? SPELLING_ACTIVE_INK
+                : SPELLING_INACTIVE_INK,
+              background: !sharpSelected ? SPELLING_ACTIVE_BG : "transparent",
+              border: "none",
+              cursor: "pointer",
+            }}
+          >
+            {FLAT_GLYPH}
+          </button>
+        </div>
+      </div>
       <TargetSheet
         open={targetSheetOpen}
         tuner={tuner}
diff --git a/tests/ui/scenarios/selection-persistence.test.tsx b/tests/ui/scenarios/selection-persistence.test.tsx
index b56c83c..dd552ae 100644
--- a/tests/ui/scenarios/selection-persistence.test.tsx
+++ b/tests/ui/scenarios/selection-persistence.test.tsx
@@ -141,6 +141,52 @@ test("theory.circle-of-fifths/REQ-008/S3 — corrupt stored state", async () =>
   expect(screen.getByTestId("current-key").textContent).toBe("G major");
 });
 
+// T018 — practice.tuner/REQ-009/S1: nothing tuner-specific is ever stored
+// (no `active`, no target, no listening state); the ♯/♭ preference the
+// tuner's footer changed persists as the circle's own does, and the tuner
+// always reopens on Auto. Seeded as a v5 payload — the shape
+// `localStorageSelectionStore` reads today (`StoredSelection`,
+// `src/ui/selection-store.ts`) — the same way REQ-008/S1 above seeds it,
+// rather than through a `memoryStore` helper this codebase has none of.
+test("practice.tuner/REQ-009/S1 — reopened: the practice screen, the flat spelling, the tuner on Auto", async () => {
+  localStorage.clear();
+  localStorage.setItem(
+    storageKey,
+    JSON.stringify({
+      schemaVersion: 5,
+      variantId: "flute-concert",
+      keyId: "C-major",
+      spelling: "flat",
+      view: "names",
+      degreesEnabled: true,
+      distanceRingEnabled: true,
+      staveNamesEnabled: false,
+      traversal: { direction: "updown", octaves: 1, shape: "scale" },
+      session: {
+        soundMode: "both",
+        loop: true,
+        countIn: true,
+        restBar: false,
+        tempoBpm: 96,
+      },
+      scale: { major: "major", minor: "natural-minor" },
+      drone: { octave: null, sound: "warm" },
+    }),
+  );
+  renderApp();
+
+  expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
+  expect(screen.queryByRole("button", { name: "Practice" })).toBeNull();
+
+  await userEvent.click(screen.getByRole("button", { name: "Tuner" }));
+  expect(screen.getByRole("button", { name: "Target" }).textContent).toContain(
+    "auto · nearest",
+  );
+  expect(
+    screen.getByRole("button", { name: "flat" }).getAttribute("aria-pressed"),
+  ).toBe("true");
+});
+
 test("theory.circle-of-fifths/REQ-008/S4 — stored state from the previous shape", async () => {
   localStorage.clear();
   localStorage.setItem(
diff --git a/tests/ui/scenarios/tuner-screen.test.tsx b/tests/ui/scenarios/tuner-screen.test.tsx
index 742b6c6..73cf45b 100644
--- a/tests/ui/scenarios/tuner-screen.test.tsx
+++ b/tests/ui/scenarios/tuner-screen.test.tsx
@@ -86,3 +86,81 @@ test("practice.tuner/REQ-003/S1 — silence on auto", async () => {
   expect(screen.queryByTestId("tuner-line")).toBeNull();
   expect(screen.queryByTestId("tuner-tag")).toBeNull();
 });
+
+// T018 — the "Can't hear" card and NO MIC state (practice.tuner/REQ-007),
+// the footer's ♯/♭ toggle bound to the circle's own preference
+// (practice.tuner/REQ-002/S5). The footer's segmented control carries the
+// circle's own accessible names ("sharp"/"flat", not "Sharp
+// spelling"/"Flat spelling" — CircleOfFifths.tsx lines 808-840): the two
+// controls share one preference, so they share one name.
+test("practice.tuner/REQ-007/S1 — refused", async () => {
+  const { sessionDeps, listening } = sessionDepsWithFakes();
+  listening.failWith = "refused";
+  localStorage.clear();
+  render(
+    <App
+      catalogue={builtInCatalogue()}
+      selectionStore={localStorageSelectionStore(localStorage)}
+      sessionDeps={sessionDeps}
+    />,
+  );
+  await userEvent.click(screen.getByRole("button", { name: "Tuner" }));
+  await waitFor(() =>
+    expect(screen.getByTestId("mic-indicator").textContent).toBe("NO MIC"),
+  );
+  expect(screen.getByTestId("cannot-hear").textContent).toContain(
+    "Can't hear — no microphone",
+  );
+  expect(screen.getByTestId("cannot-hear").textContent).toContain(
+    "It was refused or isn't there. Allow the microphone for this site, then go back and open the tuner again.",
+  );
+  expect(screen.getByTestId("tuner-name").textContent).toBe("–");
+  expect(screen.queryByRole("dialog")).toBeNull();
+  expect(screen.getByText("A4 = 440 Hz · in tune ±5 ¢")).toBeTruthy();
+  const practiceButton: HTMLButtonElement = screen.getByRole("button", {
+    name: "Practice",
+  });
+  expect(practiceButton.disabled).toBe(false);
+});
+
+test("practice.tuner/REQ-007/S2 — the next entry tries again", async () => {
+  const { sessionDeps, listening } = sessionDepsWithFakes();
+  listening.failWith = "refused";
+  localStorage.clear();
+  render(
+    <App
+      catalogue={builtInCatalogue()}
+      selectionStore={localStorageSelectionStore(localStorage)}
+      sessionDeps={sessionDeps}
+    />,
+  );
+  await userEvent.click(screen.getByRole("button", { name: "Tuner" }));
+  await userEvent.click(screen.getByRole("button", { name: "Practice" }));
+  listening.failWith = null;
+  await userEvent.click(screen.getByRole("button", { name: "Tuner" }));
+  await waitFor(() =>
+    expect(screen.getByTestId("mic-indicator").textContent).toBe("LISTENING"),
+  );
+});
+
+test("practice.tuner/REQ-007/S3 — failed while listening", async () => {
+  const f = await enterAndHear(440.0);
+  act(() => {
+    f.listening.end();
+  });
+  expect(screen.getByTestId("mic-indicator").textContent).toBe("NO MIC");
+  expect(screen.getByTestId("cannot-hear")).toBeTruthy();
+  expect(screen.queryByTestId("tuner-line")).toBeNull();
+});
+
+test("practice.tuner/REQ-002/S5 — the spelling toggle is the circle's preference", async () => {
+  const f = await enterAndHear(466.16);
+  expect(screen.getByTestId("tuner-name").textContent).toBe("A♯4");
+  await userEvent.click(screen.getByRole("button", { name: "flat" }));
+  f.listening.feed(466.16);
+  f.clock.advanceMs(1);
+  await act(async () => {});
+  expect(screen.getByTestId("tuner-name").textContent).toBe("B♭4");
+  await userEvent.click(screen.getByRole("button", { name: "Practice" }));
+  expect(screen.getByRole("button", { name: "G♭ major" })).toBeTruthy(); // the circle now spells flat
+});
```

<!-- recorded 2026-09-28T13:04:35Z by scripts/record.sh -->

## Verdict (from the task-reviewer's returned report)

- SPEC: PASS
- QUALITY: PASS
- Findings: [minor] #e0d7c5 / #756c60 hex literals shared with CircleOfFifths (token candidates). [minor] the ♯/♭ toggle markup duplicated between the circle and the tuner footer. UNVERIFIED: the 500 ms bound of REQ-007/S3.
