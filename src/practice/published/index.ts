export type { TempoTerm } from "../domain/tempo";
export {
  TEMPO_MAX_BPM,
  TEMPO_MIN_BPM,
  TEMPO_TERMS,
  steppedTempo,
  tempoForTerm,
  tempoTermFor,
} from "../domain/tempo";
export type { SessionSettings, SoundMode } from "../domain/settings";
export {
  defaultSessionSettings,
  defaultTraversal,
  summaryLineOf,
} from "../domain/settings";
export type { ScaleChoice } from "../domain/scale-choice";
export { defaultScaleChoice, chosenScaleIdFor } from "../domain/scale-choice";
export type { DroneOctave, DroneSettings, DroneSound } from "../domain/drone";
export {
  PIANO_HIGHEST_POSITION,
  PIANO_LOWEST_POSITION,
  canStepDroneOctave,
  defaultDroneOctave,
  defaultDroneSettings,
  droneNoteOf,
} from "../domain/drone";
export type { BeatsLeft, Tick, TransportState } from "../domain/transport";
export { advance, startTransport, tickOf } from "../domain/transport";
export type {
  Session,
  SessionContext,
  SessionDeps,
  SessionSnapshot,
  TargetAdvanced,
} from "../domain/session";
export {
  createSession,
  FIRST_TICK_LEAD_MS,
  HIGHLIGHT_LEAD_MS,
} from "../domain/session";
// Port types — published so consumers (including test fakes) depend on
// practice/published rather than reaching into practice/ports directly
// (docs/engineering.md §6: contexts communicate only through published/).
export type { ClockPort } from "../ports/clock";
export type { Result } from "../ports/result";
export type { SoundPort } from "../ports/sound";
export type { VisibilityPort } from "../ports/visibility";
export type { WakeLockPort } from "../ports/wake-lock";
// Adapters — the UI may only import published/, so every SessionDeps
// implementation main.tsx needs to wire up (T016) is re-exported here.
export { fallbackSound } from "../adapters/fallback-sound";
export { webAudioSound } from "../adapters/web-audio-sound";
export { silentSound } from "../adapters/silent-sound";
export { screenWakeLock } from "../adapters/screen-wake-lock";
export { pageVisibility } from "../adapters/page-visibility";
export { browserClock } from "../adapters/browser-clock";
