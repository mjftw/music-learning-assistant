import "@fontsource/instrument-serif";
import "@fontsource/noto-music";
import "@fontsource/public-sans";
import "@fontsource/public-sans/500.css";
import "@fontsource/public-sans/600.css";
import "@fontsource/public-sans/700.css";
import "@fontsource/jetbrains-mono";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "./global.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  browserClock,
  fallbackSound,
  pageVisibility,
  screenWakeLock,
  silentSound,
  webAudioListening,
  webAudioSound,
  type Session,
} from "../practice/published";
import { builtInCatalogue } from "../theory/published";
import { App } from "./App";
import { localStorageSelectionStore } from "./selection-store";

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("Root element #root not found");
}

// T018's timing harness (pnpm test:timing) drives the session directly, in
// dev only — main.tsx is the only place that ever sees the instance App
// creates, so it hands it off here rather than App reaching for `window`
// itself.
function exposeSessionForTiming(session: Session): void {
  if (!import.meta.env.DEV) return;
  (window as unknown as { __session?: Session }).__session = session;
}

// T018 also reads the sound port directly — `sampleRate()`/`onOnset()` for
// the onset-timing measurement, and the real `AudioContext` behind
// `context()` (fallback-sound.ts forwards it) to correlate an onset's frame
// with wall-clock time via `context.currentTime`/`performance.now()`.
function exposeSoundForTiming(sound: ReturnType<typeof fallbackSound>): void {
  if (!import.meta.env.DEV) return;
  (
    window as unknown as { __sound?: ReturnType<typeof fallbackSound> }
  ).__sound = sound;
}

const sound = fallbackSound(
  // The default `AudioContext` (no `latencyHint`), not "playback": the
  // browser's reported `outputLatency` is only an estimate and tends to run
  // high, and "playback" grows it further — on the laptop it measured the
  // highlight landing 44 ms *after* the audible onset (practice.session/
  // REQ-006). session.ts's highlight timer already trims its aim by
  // HIGHLIGHT_LEAD_MS to stay ahead of that estimate; the other crackle
  // fixes (no parsing on the audio thread, the hoisted output view,
  // stop_all's fade) do the rest of the underrun-avoidance work that
  // "playback" used to buy.
  webAudioSound(() => new AudioContext()),
  silentSound(() => performance.now()),
);
exposeSoundForTiming(sound);

createRoot(rootElement).render(
  <StrictMode>
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(window.localStorage)}
      sessionDeps={{
        sound,
        clock: browserClock(),
        wakeLock: screenWakeLock(navigator),
        visibility: pageVisibility(document),
        // T014 replaces this with the same memoised AudioContext factory
        // `sound` shares (main.tsx: `const audioContext = memoised(() =>
        // new AudioContext())`, passed to both) — for now the tuner's own
        // context is created on its own first start().
        listening: webAudioListening(() => new AudioContext()),
      }}
      onSessionReady={exposeSessionForTiming}
    />
  </StrictMode>,
);
