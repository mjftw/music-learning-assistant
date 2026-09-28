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
  type NoteJudged,
  type Session,
} from "../practice/published";
import { builtInCatalogue } from "../theory/published";
import { App } from "./App";
import { localStorageSelectionStore } from "./selection-store";
import type { SilenceMode } from "./tuner-silence";

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

// T021's measured tuner harness (pnpm test:tuner) reads NoteJudged events
// straight off the session, alongside `__session` above — its own hook
// rather than routing through `__session.onNoteJudged` so the harness need
// not know the session's shape, only that this subscribes and returns an
// unsubscribe function (Session.onNoteJudged's own signature).
function exposeNoteJudgedForTiming(session: Session): void {
  if (!import.meta.env.DEV) return;
  (
    window as unknown as {
      __noteJudged?: (listener: (event: NoteJudged) => void) => () => void;
    }
  ).__noteJudged = (listener) => session.onNoteJudged(listener);
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

// T014 also exposes the listening port, alongside `__session`/`__sound`, for
// the tuner's own dev-time inspection (e.g. the phone's track settings —
// changes/007-hear-me/notes.md).
function exposeListeningForTiming(
  listening: ReturnType<typeof webAudioListening>,
): void {
  if (!import.meta.env.DEV) return;
  (
    window as unknown as { __listening?: ReturnType<typeof webAudioListening> }
  ).__listening = listening;
}

// T019 — practice.tuner/REQ-006's measured harness (pnpm test:tuner) reads
// every painted reading's age back from `window.__paintAgesMs`, alongside
// `__session`/`__sound`/`__listening` above; App's `onPaintAge` reports one
// age per painted reading via this array's push, dev-only, same guard as
// the other three.
function collectPaintAge(ageMs: number): void {
  if (!import.meta.env.DEV) return;
  const withPaintAges = window as unknown as { __paintAgesMs?: number[] };
  (withPaintAges.__paintAgesMs ??= []).push(ageMs);
}

// One AudioContext for both worklets (ADR 0006): one audio thread, one
// clock. `webAudioSound` and `webAudioListening` each call this on their
// own first `start()` — whichever runs first creates it, the other gets the
// same instance back.
let context: AudioContext | null = null;
const audioContext = (): AudioContext => (context ??= new AudioContext());

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
  webAudioSound(audioContext),
  silentSound(() => performance.now()),
);
exposeSoundForTiming(sound);

const listening = webAudioListening(audioContext);
exposeListeningForTiming(listening);

// design-loop variant (007 round 4) — the tuner's silence treatment,
// exploring "it's very abrupt how quickly everything disappears when going
// from hearing something to nothing" on the phone via `?variant=a|b|c`.
// TEMPORARY — deleted, along with every other block carrying this comment,
// once one treatment/timing is chosen.
//
// design-loop variant (007 round 4, follow-up 2) — the user picked b
// (linger) and asked to try it with a faster fade ("b but try with faster
// fade"), so all three letters are now the linger treatment at different
// timings rather than three different treatments: `a` fades twice as fast
// as `b` (the one the user tried), `c` also shortens the hold. Anything
// else, including no parameter, is still `"cut"`, today's behaviour,
// untouched — `lingerMs`/`lingerFadeMs` go unread in that case.
interface SilenceVariant {
  readonly silence: SilenceMode;
  readonly lingerMs: number;
  readonly lingerFadeMs: number;
}
function silenceVariantFromUrl(): SilenceVariant {
  const variant = new URLSearchParams(window.location.search).get("variant");
  if (variant === "a")
    return { silence: "linger", lingerMs: 1000, lingerFadeMs: 200 };
  if (variant === "b")
    return { silence: "linger", lingerMs: 1000, lingerFadeMs: 400 };
  if (variant === "c")
    return { silence: "linger", lingerMs: 600, lingerFadeMs: 200 };
  return { silence: "cut", lingerMs: 1000, lingerFadeMs: 400 };
}

const silenceVariant = silenceVariantFromUrl();

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
        listening,
      }}
      onSessionReady={(session) => {
        exposeSessionForTiming(session);
        exposeNoteJudgedForTiming(session);
      }}
      onPaintAge={collectPaintAge}
      silence={silenceVariant.silence}
      lingerMs={silenceVariant.lingerMs}
      lingerFadeMs={silenceVariant.lingerFadeMs}
    />
  </StrictMode>,
);
