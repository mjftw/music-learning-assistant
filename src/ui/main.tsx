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
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  browserClock,
  fallbackSound,
  pageVisibility,
  screenWakeLock,
  silentSound,
  webAudioSound,
  type Session,
} from "../practice/published";
import { createSoundEngine } from "../sound/published";
import { builtInCatalogue } from "../theory/published";
import { App } from "./App";
import { localStorageSelectionStore } from "./selection-store";

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("Root element #root not found");
}

// T002 spike — removed in T019
function SoundSpike() {
  const [label, setLabel] = useState("A4 for one second");

  const play = async () => {
    const context = new AudioContext();
    const outcome = await createSoundEngine(context);
    if (!outcome.ok) {
      setLabel(outcome.error.reason);
      return;
    }
    const { engine } = outcome;
    engine.post({
      kind: "tone",
      tag: 1,
      hz: 440,
      onsetFrame: engine.currentFrame() + 4800,
      durationFrames: 48000,
    });
    setLabel("ok");
  };

  return (
    <button
      onClick={() => {
        void play();
      }}
    >
      {label}
    </button>
  );
}

// T018's timing harness (pnpm test:timing) drives the session directly, in
// dev only — main.tsx is the only place that ever sees the instance App
// creates, so it hands it off here rather than App reaching for `window`
// itself.
function exposeSessionForTiming(session: Session): void {
  if (!import.meta.env.DEV) return;
  (window as unknown as { __session?: Session }).__session = session;
}

createRoot(rootElement).render(
  <StrictMode>
    {location.search === "?sound-spike" ? (
      <SoundSpike />
    ) : (
      <App
        catalogue={builtInCatalogue()}
        selectionStore={localStorageSelectionStore(window.localStorage)}
        sessionDeps={{
          sound: fallbackSound(
            webAudioSound(() => new AudioContext()),
            silentSound(() => performance.now()),
          ),
          clock: browserClock(),
          wakeLock: screenWakeLock(navigator),
          visibility: pageVisibility(document),
        }}
        onSessionReady={exposeSessionForTiming}
      />
    )}
  </StrictMode>,
);
