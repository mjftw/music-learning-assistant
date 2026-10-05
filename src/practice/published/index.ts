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
export type {
  Hold,
  HoldBeats,
  LeadPhase,
  LeadSettings,
  LeadTarget,
  Tolerance,
  Who,
} from "../domain/lead";
// SequenceNote is theory's type, but it appears in the lead reducer's own
// public signature (targetAt, applyJudgement take `readonly
// SequenceNote[]`) — re-exported here so a practice consumer never needs
// to reach into theory/published just to name a practice parameter type.
export type { SequenceNote } from "../../theory/published";
export {
  applyJudgement,
  applySilence,
  CUE_TAIL_MS,
  CUE_TONE_MS,
  cuesHintOf,
  defaultLeadSettings,
  emptyHold,
  heldFractionOf,
  HELD_TICK_MS,
  holdHintOf,
  LEAD_GAP_MS,
  requiredHoldMs,
  targetAt,
  TOLERANCE_CENTS,
  toleranceHintOf,
  whoHintOf,
} from "../domain/lead";
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
  DroneSnapshot,
  LeadSnapshot,
  Session,
  SessionContext,
  SessionDeps,
  SessionSnapshot,
  TargetAdvanced,
} from "../domain/session";
export {
  createSession,
  DRONE_RELEASE_MS,
  FIRST_TICK_LEAD_MS,
  HIGHLIGHT_LEAD_MS,
} from "../domain/session";
export type {
  ListeningState,
  TunerSnapshot,
  TunerTarget,
} from "../domain/tuner";
export {
  canStepTarget,
  HANDOVER_CENTS,
  IN_TUNE_BAND_CENTS,
  judge,
  nearestWithHandover,
  READING_MAX_AGE_MS,
  semitoneCountOf,
  TUNER_HIGHEST_POSITION,
  TUNER_LOWEST_POSITION,
  verdictOf,
} from "../domain/tuner";
export type { NoteJudged, Verdict } from "./note-judged.schema";
export { verdictSchema } from "./note-judged.schema";
// Port types — published so consumers (including test fakes) depend on
// practice/published rather than reaching into practice/ports directly
// (docs/engineering.md §6: contexts communicate only through published/).
export type { ClockPort } from "../ports/clock";
export type { ListeningPort } from "../ports/listening";
export type { Result } from "../ports/result";
export type { SoundPort } from "../ports/sound";
export type { VisibilityPort } from "../ports/visibility";
export type { WakeLockPort } from "../ports/wake-lock";
// Adapters — the UI may only import published/, so every SessionDeps
// implementation main.tsx needs to wire up (T016) is re-exported here.
export { fallbackSound } from "../adapters/fallback-sound";
export { webAudioSound } from "../adapters/web-audio-sound";
export { webAudioListening } from "../adapters/web-audio-listening";
export { silentSound } from "../adapters/silent-sound";
export { screenWakeLock } from "../adapters/screen-wake-lock";
export { pageVisibility } from "../adapters/page-visibility";
export { browserClock } from "../adapters/browser-clock";
