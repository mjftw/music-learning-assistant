---
type: Task Review
title: Review package — T014 · 007-hear-me
description: The diff produced for T014, for the task reviewer.
resource: /.sdd/reviews/007-hear-me/T014.md
status: draft
tags: [sdd, review, "change:007-hear-me"]
sources:
  - resource: /.sdd/briefs/007-hear-me/T014.md
  - resource: git:84fe0ff0a1b21d0e45c9bf3ff5dbaba54cd8b342..84fe0ff0a1b21d0e45c9bf3ff5dbaba54cd8b342
generated:
  by: process:review-package.sh
  at: 2026-09-28T10:54:02Z
sdd_id: 007-hear-me
---

# Review package — T014 · 007-hear-me

base: `84fe0ff0a1b21d0e45c9bf3ff5dbaba54cd8b342` → head: `84fe0ff0a1b21d0e45c9bf3ff5dbaba54cd8b342`

## Files changed


## Diff

```diff
```

## Uncommitted changes (implementer did not commit)

```diff
diff --git a/changes/007-hear-me/notes.md b/changes/007-hear-me/notes.md
index 1712a04..fcf7100 100644
--- a/changes/007-hear-me/notes.md
+++ b/changes/007-hear-me/notes.md
@@ -195,3 +195,29 @@ holds in practice.
 - Minor, recorded: the test duplicates `TAP_TAG_BASE = 2_000_000` (private
   to session.ts; the session-tap test does the same). A stale "(500 ms)"
   comment gloss corrected to 80 ms by the controller (trivial).
+
+## T014 — the phone's track settings
+
+Pending the user's phone check.
+
+## T014 — notes (2026-09-28)
+
+- Real-browser check (headless Chromium, `--use-fake-ui-for-media-stream`,
+  the real worklet): clicking Tuner logs `listening: track settings
+  {autoGainControl: false, channelCount: 2, deviceId: default,
+  echoCancellation: false, groupId: …}` to the console, and no
+  `PitchDetected`-related error appears — T003's "first fix if LISTENING
+  shows but no reading ever arrives" note is not needed yet.
+- Ripple beyond the brief's Files list (AGENTS.md rule): `tests/ui/
+  scenarios/circle-interaction.test.tsx`'s Tab-order test — the new Tuner
+  pill adds a tab stop before the circle, so its comment/tab count moved
+  from three tabs to four.
+- The brief's verbatim RED test code uses jest-dom matchers
+  (`toHaveTextContent`, `toBeInTheDocument`) that are not installed/
+  configured in this repo (no `@testing-library/jest-dom` dependency, no
+  vitest `setupFiles`) — confirmed by grep and by running the literal
+  code (`Invalid Chai property: toHaveTextContent`). Adapted to the
+  convention every other UI scenario test already uses instead
+  (`.textContent`/`toBeTruthy()` — see app-drone.test.tsx, app-session.
+  test.tsx); the scenario IDs, structure and assertions are otherwise
+  unchanged.
diff --git a/src/ui/App.tsx b/src/ui/App.tsx
index f490e1a..0bcd35e 100644
--- a/src/ui/App.tsx
+++ b/src/ui/App.tsx
@@ -57,6 +57,7 @@ import { fonts, paper } from "./theme";
 import { TransportCard } from "./TransportCard";
 import { TraversalRow } from "./TraversalRow";
 import { TraversalSheet } from "./TraversalSheet";
+import { TunerScreen } from "./TunerScreen";
 
 const DEFAULT_VARIANT_ID = "flute-concert";
 const DEFAULT_KEY_ID = "C-major";
@@ -242,6 +243,12 @@ export function App(props: {
   const [tempoSheetOpen, setTempoSheetOpen] = useState(false);
   const [scaleSheetOpen, setScaleSheetOpen] = useState(false);
   const [droneSheetOpen, setDroneSheetOpen] = useState(false);
+  // practice.tuner/REQ-001 — which screen is showing. Not part of the
+  // session's own snapshot (that carries `tuner.active`, which this tracks
+  // in lockstep): a plain UI state so TunerScreen can be swapped in for the
+  // practice column without threading the session's async enterTuner()/
+  // leaveTuner() through a render decision.
+  const [screen, setScreen] = useState<"practice" | "tuner">("practice");
 
   const position = circleOfFifths()[selection.positionIndex];
   if (position === undefined) {
@@ -484,6 +491,21 @@ export function App(props: {
     (runIndex: number) => session?.tapNote(runIndex),
     [session],
   );
+  // practice.tuner/REQ-001 — the way in and out: enterTuner()/leaveTuner()
+  // stop playback/the drone and start/stop listening (session.ts owns all
+  // of that); this only additionally swaps which screen is showing. Guarded
+  // on `session` (only ever null for the render before the session-creating
+  // effect completes, before the Tuner pill can be reached) so `screen`
+  // never flips to "tuner" without a session behind it.
+  const handleOpenTuner = useCallback(() => {
+    if (session === null) return;
+    session.enterTuner();
+    setScreen("tuner");
+  }, [session]);
+  const handleLeaveTuner = useCallback(() => {
+    session?.leaveTuner();
+    setScreen("practice");
+  }, [session]);
 
   const handleSelectKey = useCallback((selectedWedgeKey: Key) => {
     setSelection((current) => {
@@ -604,160 +626,167 @@ export function App(props: {
         fontFamily: fonts.body,
       }}
     >
-      <Header
-        variantLabel={
-          variant === undefined ? "" : headerInstrumentLabel(variant)
-        }
-        rangeLabel={variant === undefined ? "" : headerRangeLabel(variant)}
-        onOpenPicker={handleOpenInstrumentSheet}
-        onOpenSettings={handleOpenSettings}
-      />
-      <Notices
-        notices={catalogue.notices}
-        soundUnavailable={
-          snapshot !== null && snapshot.notice === "sound-unavailable"
-        }
-      />
-      <div
-        style={{
-          position: "relative",
-          width: 378,
-          margin: CIRCLE_WRAPPER_MARGIN,
-          flex: "none",
-        }}
-      >
-        <CircleOfFifths
-          selectedKeyId={keyIdOf(selectedKey)}
-          spelling={selection.spelling}
-          degreesEnabled={selection.degreesEnabled}
-          distanceRingEnabled={selection.distanceRingEnabled}
-          onSelectKey={handleSelectKey}
-          onSelectSpelling={handleSelectSpelling}
-        />
-        {snapshot !== null && (
-          <DronePill
-            noteLabel={noteLabel(snapshot.drone.note)}
-            on={snapshot.drone.on}
-            canStepDown={snapshot.drone.canStepDown}
-            canStepUp={snapshot.drone.canStepUp}
-            onToggle={handleToggleDrone}
-            onStepOctave={handleStepDroneOctave}
-            onOpenSheet={handleOpenDroneSheet}
+      {screen === "tuner" && snapshot !== null ? (
+        <TunerScreen tuner={snapshot.tuner} onLeave={handleLeaveTuner} />
+      ) : (
+        <>
+          <Header
+            variantLabel={
+              variant === undefined ? "" : headerInstrumentLabel(variant)
+            }
+            rangeLabel={variant === undefined ? "" : headerRangeLabel(variant)}
+            onOpenPicker={handleOpenInstrumentSheet}
+            onOpenSettings={handleOpenSettings}
+            onOpenTuner={handleOpenTuner}
+          />
+          <Notices
+            notices={catalogue.notices}
+            soundUnavailable={
+              snapshot !== null && snapshot.notice === "sound-unavailable"
+            }
           />
-        )}
-      </div>
-      {snapshot !== null && (
-        <div
-          style={{
-            display: "flex",
-            flexDirection: "column",
-            alignItems: "center",
-            gap: KEY_NAME_ROW_GAP,
-            padding: KEY_NAME_ROW_PADDING,
-          }}
-        >
-          <button
-            type="button"
-            data-testid="current-key"
-            // A distinct action label, not the displayed text (which
-            // duplicates a circle wedge's own aria-label whenever the
-            // chosen scale is the ring's home one — "G major", "E minor" —
-            // ambiguous for anything querying by role+name; every other
-            // sheet-opening button in this app names the action, not its
-            // current value: "Edit traversal", "Instrument", "Settings").
-            aria-label="Edit scale"
-            onClick={handleOpenScaleSheet}
+          <div
             style={{
-              fontFamily: fonts.display,
-              fontSize: keyNameFontSizeOf(
-                keyLabel(selectedKey, snapshot.scale),
-              ),
-              lineHeight: 1,
-              color: paper.ink,
-              border: "none",
-              background: "none",
-              padding: 0,
-              cursor: "pointer",
+              position: "relative",
+              width: 378,
+              margin: CIRCLE_WRAPPER_MARGIN,
+              flex: "none",
             }}
           >
-            {keyLabel(selectedKey, snapshot.scale)}
-          </button>
-          <ScaleRow
-            formulaLine={snapshot.spelledScale.formulaLine}
-            onOpen={handleOpenScaleSheet}
-          />
-        </div>
-      )}
-      <KeyPanel
-        view={selection.view}
-        onSelectView={(selectedView) =>
-          setSelection((current) => ({ ...current, view: selectedView }))
-        }
-        rangeSummary={view === undefined ? "" : rangeSummaryText(view)}
-      >
-        {selection.view === "names" ? (
-          <NamesView
-            key_={selectedKey}
-            scale={
-              // No session, no chosen scale yet — the mode's own default
-              // stands in for the single render before the session-creating
-              // effect completes, mirroring `notes`' `[]` fallback on the
-              // StaveView branch below.
-              snapshot === null
-                ? scaleById(
-                    chosenScaleIdFor(defaultScaleChoice, selection.mode),
-                  )
-                : snapshot.scale
-            }
-            direction={
-              snapshot === null ? "updown" : snapshot.traversal.direction
-            }
-            degreesEnabled={selection.degreesEnabled}
-            soundingPitchClass={soundingPitchClass}
-            onTapColumn={handleTapColumn}
-            tapsEnabled={tapsEnabled}
-          />
-        ) : (
-          variant !== undefined && (
-            <StaveView
-              key_={selectedKey}
-              variant={variant}
-              notes={snapshot === null ? [] : snapshot.run}
-              staveNamesEnabled={selection.staveNamesEnabled}
-              soundingRunIndex={soundingRunIndex}
-              playing={playing}
-              onTapNote={handleTapNote}
-              tapsEnabled={tapsEnabled}
+            <CircleOfFifths
+              selectedKeyId={keyIdOf(selectedKey)}
+              spelling={selection.spelling}
+              degreesEnabled={selection.degreesEnabled}
+              distanceRingEnabled={selection.distanceRingEnabled}
+              onSelectKey={handleSelectKey}
+              onSelectSpelling={handleSelectSpelling}
             />
-          )
-        )}
-      </KeyPanel>
-      {snapshot !== null && session !== null && (
-        <div
-          style={{
-            marginTop: SESSION_AREA_MARGIN_TOP,
-            padding: SESSION_AREA_PADDING,
-            display: "flex",
-            flexDirection: "column",
-            gap: SESSION_AREA_GAP,
-          }}
-        >
-          <TransportCard
-            snapshot={snapshot}
-            onTogglePlay={handleTogglePlay}
-            onStepTempo={(delta) =>
-              session.setSettings({
-                ...snapshot.settings,
-                tempoBpm: steppedTempo(snapshot.settings.tempoBpm, delta),
-              })
+            {snapshot !== null && (
+              <DronePill
+                noteLabel={noteLabel(snapshot.drone.note)}
+                on={snapshot.drone.on}
+                canStepDown={snapshot.drone.canStepDown}
+                canStepUp={snapshot.drone.canStepUp}
+                onToggle={handleToggleDrone}
+                onStepOctave={handleStepDroneOctave}
+                onOpenSheet={handleOpenDroneSheet}
+              />
+            )}
+          </div>
+          {snapshot !== null && (
+            <div
+              style={{
+                display: "flex",
+                flexDirection: "column",
+                alignItems: "center",
+                gap: KEY_NAME_ROW_GAP,
+                padding: KEY_NAME_ROW_PADDING,
+              }}
+            >
+              <button
+                type="button"
+                data-testid="current-key"
+                // A distinct action label, not the displayed text (which
+                // duplicates a circle wedge's own aria-label whenever the
+                // chosen scale is the ring's home one — "G major", "E minor" —
+                // ambiguous for anything querying by role+name; every other
+                // sheet-opening button in this app names the action, not its
+                // current value: "Edit traversal", "Instrument", "Settings").
+                aria-label="Edit scale"
+                onClick={handleOpenScaleSheet}
+                style={{
+                  fontFamily: fonts.display,
+                  fontSize: keyNameFontSizeOf(
+                    keyLabel(selectedKey, snapshot.scale),
+                  ),
+                  lineHeight: 1,
+                  color: paper.ink,
+                  border: "none",
+                  background: "none",
+                  padding: 0,
+                  cursor: "pointer",
+                }}
+              >
+                {keyLabel(selectedKey, snapshot.scale)}
+              </button>
+              <ScaleRow
+                formulaLine={snapshot.spelledScale.formulaLine}
+                onOpen={handleOpenScaleSheet}
+              />
+            </div>
+          )}
+          <KeyPanel
+            view={selection.view}
+            onSelectView={(selectedView) =>
+              setSelection((current) => ({ ...current, view: selectedView }))
             }
-            onOpenTempo={handleOpenTempoSheet}
-          />
-          <TraversalRow
-            summaryLine={snapshot.summaryLine}
-            onOpen={handleOpenTraversalSheet}
-          />
-        </div>
+            rangeSummary={view === undefined ? "" : rangeSummaryText(view)}
+          >
+            {selection.view === "names" ? (
+              <NamesView
+                key_={selectedKey}
+                scale={
+                  // No session, no chosen scale yet — the mode's own default
+                  // stands in for the single render before the session-creating
+                  // effect completes, mirroring `notes`' `[]` fallback on the
+                  // StaveView branch below.
+                  snapshot === null
+                    ? scaleById(
+                        chosenScaleIdFor(defaultScaleChoice, selection.mode),
+                      )
+                    : snapshot.scale
+                }
+                direction={
+                  snapshot === null ? "updown" : snapshot.traversal.direction
+                }
+                degreesEnabled={selection.degreesEnabled}
+                soundingPitchClass={soundingPitchClass}
+                onTapColumn={handleTapColumn}
+                tapsEnabled={tapsEnabled}
+              />
+            ) : (
+              variant !== undefined && (
+                <StaveView
+                  key_={selectedKey}
+                  variant={variant}
+                  notes={snapshot === null ? [] : snapshot.run}
+                  staveNamesEnabled={selection.staveNamesEnabled}
+                  soundingRunIndex={soundingRunIndex}
+                  playing={playing}
+                  onTapNote={handleTapNote}
+                  tapsEnabled={tapsEnabled}
+                />
+              )
+            )}
+          </KeyPanel>
+          {snapshot !== null && session !== null && (
+            <div
+              style={{
+                marginTop: SESSION_AREA_MARGIN_TOP,
+                padding: SESSION_AREA_PADDING,
+                display: "flex",
+                flexDirection: "column",
+                gap: SESSION_AREA_GAP,
+              }}
+            >
+              <TransportCard
+                snapshot={snapshot}
+                onTogglePlay={handleTogglePlay}
+                onStepTempo={(delta) =>
+                  session.setSettings({
+                    ...snapshot.settings,
+                    tempoBpm: steppedTempo(snapshot.settings.tempoBpm, delta),
+                  })
+                }
+                onOpenTempo={handleOpenTempoSheet}
+              />
+              <TraversalRow
+                summaryLine={snapshot.summaryLine}
+                onOpen={handleOpenTraversalSheet}
+              />
+            </div>
+          )}
+        </>
       )}
       <SettingsDrawer
         open={settingsOpen}
diff --git a/src/ui/Header.tsx b/src/ui/Header.tsx
index f0785b3..f7fe52e 100644
--- a/src/ui/Header.tsx
+++ b/src/ui/Header.tsx
@@ -7,6 +7,10 @@ import { paper } from "./theme";
 const ROW_PADDING = "14px 16px 2px";
 const ROW_GAP = 10;
 
+// The Tuner pill + gear wrapper (changes/007-hear-me/design/Practice.dc.html
+// markup line 21's `<div style="...gap:8px;flex:none">`).
+const RIGHT_GROUP_GAP = 8;
+
 const PILL_GAP = 8;
 const PILL_PADDING = "7px 12px 7px 11px";
 const PILL_BORDER = paper.border;
@@ -25,6 +29,28 @@ const CHEVRON_FONT_SIZE = 9;
 const CHEVRON_COLOR = paper.faint;
 const CHEVRON_GLYPH = "▼";
 
+// The Tuner pill — copied verbatim from the vendored visual reference
+// (changes/007-hear-me/design/Practice.dc.html, markup lines 22-28).
+const TUNER_PILL_HEIGHT = 32;
+const TUNER_PILL_GAP = 6;
+const TUNER_PILL_PADDING = "0 12px 0 10px";
+const TUNER_PILL_BORDER = paper.border;
+const TUNER_PILL_BACKGROUND = paper.card;
+// Module-local one-off colour, per the codebase's convention (see e.g.
+// ScaleRow.tsx's FORMULA_COLOR) — not one of theme.ts's tokens.
+const TUNER_PILL_INK = "#4a4136";
+const TUNER_PILL_FONT_SIZE = 12.5;
+const TUNER_PILL_FONT_WEIGHT = 600;
+
+const TUNER_GLYPH_GAP = 2;
+const TUNER_GLYPH_HEIGHT = 12;
+const TUNER_GLYPH_BAR_WIDTH = 2;
+const TUNER_GLYPH_BAR_RADIUS = 1;
+const TUNER_GLYPH_BAR_SHORT = 6;
+const TUNER_GLYPH_BAR_TALL = 12;
+const TUNER_GLYPH_BAR_COLOR = paper.faint;
+const TUNER_GLYPH_BAR_ACCENT = paper.accent;
+
 const GEAR_SIZE = 32;
 const GEAR_BORDER = paper.border;
 const GEAR_BACKGROUND = paper.card;
@@ -43,8 +69,15 @@ function HeaderComponent(props: {
   readonly rangeLabel: string;
   readonly onOpenPicker: () => void;
   readonly onOpenSettings: () => void;
+  readonly onOpenTuner: () => void;
 }): JSX.Element {
-  const { variantLabel, rangeLabel, onOpenPicker, onOpenSettings } = props;
+  const {
+    variantLabel,
+    rangeLabel,
+    onOpenPicker,
+    onOpenSettings,
+    onOpenTuner,
+  } = props;
 
   return (
     <div
@@ -94,27 +127,97 @@ function HeaderComponent(props: {
           {CHEVRON_GLYPH}
         </span>
       </button>
-      <button
-        type="button"
-        aria-label="Settings"
-        onClick={onOpenSettings}
+      <div
         style={{
-          width: GEAR_SIZE,
-          height: GEAR_SIZE,
-          borderRadius: 999,
-          border: `1px solid ${GEAR_BORDER}`,
-          background: GEAR_BACKGROUND,
-          color: GEAR_ICON_COLOR,
           display: "flex",
           alignItems: "center",
-          justifyContent: "center",
-          fontSize: GEAR_FONT_SIZE,
-          cursor: "pointer",
+          gap: RIGHT_GROUP_GAP,
           flex: "none",
         }}
       >
-        {GEAR_GLYPH}
-      </button>
+        <button
+          type="button"
+          aria-label="Tuner"
+          onClick={onOpenTuner}
+          style={{
+            height: TUNER_PILL_HEIGHT,
+            boxSizing: "border-box",
+            display: "flex",
+            alignItems: "center",
+            gap: TUNER_PILL_GAP,
+            padding: TUNER_PILL_PADDING,
+            borderRadius: 999,
+            border: `1px solid ${TUNER_PILL_BORDER}`,
+            background: TUNER_PILL_BACKGROUND,
+            color: TUNER_PILL_INK,
+            cursor: "pointer",
+          }}
+        >
+          <span
+            style={{
+              display: "flex",
+              alignItems: "flex-end",
+              gap: TUNER_GLYPH_GAP,
+              height: TUNER_GLYPH_HEIGHT,
+            }}
+          >
+            <span
+              style={{
+                width: TUNER_GLYPH_BAR_WIDTH,
+                height: TUNER_GLYPH_BAR_SHORT,
+                borderRadius: TUNER_GLYPH_BAR_RADIUS,
+                background: TUNER_GLYPH_BAR_COLOR,
+              }}
+            />
+            <span
+              style={{
+                width: TUNER_GLYPH_BAR_WIDTH,
+                height: TUNER_GLYPH_BAR_TALL,
+                borderRadius: TUNER_GLYPH_BAR_RADIUS,
+                background: TUNER_GLYPH_BAR_ACCENT,
+              }}
+            />
+            <span
+              style={{
+                width: TUNER_GLYPH_BAR_WIDTH,
+                height: TUNER_GLYPH_BAR_SHORT,
+                borderRadius: TUNER_GLYPH_BAR_RADIUS,
+                background: TUNER_GLYPH_BAR_COLOR,
+              }}
+            />
+          </span>
+          <span
+            style={{
+              fontSize: TUNER_PILL_FONT_SIZE,
+              fontWeight: TUNER_PILL_FONT_WEIGHT,
+              lineHeight: 1,
+            }}
+          >
+            Tuner
+          </span>
+        </button>
+        <button
+          type="button"
+          aria-label="Settings"
+          onClick={onOpenSettings}
+          style={{
+            width: GEAR_SIZE,
+            height: GEAR_SIZE,
+            borderRadius: 999,
+            border: `1px solid ${GEAR_BORDER}`,
+            background: GEAR_BACKGROUND,
+            color: GEAR_ICON_COLOR,
+            display: "flex",
+            alignItems: "center",
+            justifyContent: "center",
+            fontSize: GEAR_FONT_SIZE,
+            cursor: "pointer",
+            flex: "none",
+          }}
+        >
+          {GEAR_GLYPH}
+        </button>
+      </div>
     </div>
   );
 }
diff --git a/src/ui/main.tsx b/src/ui/main.tsx
index 489edad..6777a23 100644
--- a/src/ui/main.tsx
+++ b/src/ui/main.tsx
@@ -49,6 +49,25 @@ function exposeSoundForTiming(sound: ReturnType<typeof fallbackSound>): void {
   ).__sound = sound;
 }
 
+// T014 also exposes the listening port, alongside `__session`/`__sound`, for
+// the tuner's own dev-time inspection (e.g. the phone's track settings —
+// changes/007-hear-me/notes.md).
+function exposeListeningForTiming(
+  listening: ReturnType<typeof webAudioListening>,
+): void {
+  if (!import.meta.env.DEV) return;
+  (
+    window as unknown as { __listening?: ReturnType<typeof webAudioListening> }
+  ).__listening = listening;
+}
+
+// One AudioContext for both worklets (ADR 0006): one audio thread, one
+// clock. `webAudioSound` and `webAudioListening` each call this on their
+// own first `start()` — whichever runs first creates it, the other gets the
+// same instance back.
+let context: AudioContext | null = null;
+const audioContext = (): AudioContext => (context ??= new AudioContext());
+
 const sound = fallbackSound(
   // The default `AudioContext` (no `latencyHint`), not "playback": the
   // browser's reported `outputLatency` is only an estimate and tends to run
@@ -59,11 +78,14 @@ const sound = fallbackSound(
   // fixes (no parsing on the audio thread, the hoisted output view,
   // stop_all's fade) do the rest of the underrun-avoidance work that
   // "playback" used to buy.
-  webAudioSound(() => new AudioContext()),
+  webAudioSound(audioContext),
   silentSound(() => performance.now()),
 );
 exposeSoundForTiming(sound);
 
+const listening = webAudioListening(audioContext);
+exposeListeningForTiming(listening);
+
 createRoot(rootElement).render(
   <StrictMode>
     <App
@@ -74,11 +96,7 @@ createRoot(rootElement).render(
         clock: browserClock(),
         wakeLock: screenWakeLock(navigator),
         visibility: pageVisibility(document),
-        // T014 replaces this with the same memoised AudioContext factory
-        // `sound` shares (main.tsx: `const audioContext = memoised(() =>
-        // new AudioContext())`, passed to both) — for now the tuner's own
-        // context is created on its own first start().
-        listening: webAudioListening(() => new AudioContext()),
+        listening,
       }}
       onSessionReady={exposeSessionForTiming}
     />
diff --git a/src/ui/theme.ts b/src/ui/theme.ts
index 515d6da..0a26972 100644
--- a/src/ui/theme.ts
+++ b/src/ui/theme.ts
@@ -24,3 +24,14 @@ export const fonts = {
   mono: "'JetBrains Mono', monospace",
   music: "'Noto Music', serif",
 } as const;
+
+// practice.tuner — docs/design.md §8: the reading's colours (sharp/flat/
+// in-tune, the in-tune band's fill) and the pinned target's grey notehead.
+export const tuner = {
+  sharp: "oklch(0.55 0.11 28)",
+  flat: "oklch(0.55 0.11 258)",
+  inTune: "oklch(0.55 0.11 150)",
+  band: "oklch(0.90 0.045 150)",
+  targetHead: "#a39a8c",
+  ghostInk: "#8a8175",
+} as const;
diff --git a/tests/ui/scenarios/circle-interaction.test.tsx b/tests/ui/scenarios/circle-interaction.test.tsx
index 73a269a..802fda1 100644
--- a/tests/ui/scenarios/circle-interaction.test.tsx
+++ b/tests/ui/scenarios/circle-interaction.test.tsx
@@ -87,8 +87,10 @@ test("Tab-focusing a wedge shows a focus ring that follows focus, and disappears
 
   expect(screen.queryByTestId("wedge-focus-ring")).toBeNull();
 
-  // The instrument pill and settings button precede the circle in tab
-  // order; three tabs reaches the first wedge (C major, outer ring).
+  // The instrument pill, the Tuner pill (practice.tuner/REQ-001, T014) and
+  // the settings button precede the circle in tab order; four tabs reaches
+  // the first wedge (C major, outer ring).
+  await user.tab();
   await user.tab();
   await user.tab();
   await user.tab();
```

<!-- recorded 2026-09-28T10:59:29Z by scripts/record.sh -->
