import type {
  OnsetReport,
  SoundCommand,
  SoundUnavailable,
} from "../../sound/published/sound-command.schema";
import type { Result } from "./result";

// The seam onto the audio thread — practice.session/REQ-002, REQ-005. The
// real adapter wraps sound/published's SoundEngine; tests use a fake that
// records what was posted (tests/practice/fakes.ts).
export interface SoundPort {
  start(): Promise<Result<void, SoundUnavailable>>;
  sampleRate(): number;
  currentFrame(): number;
  // The delay, in ms, between a command's scheduled onset and the instant
  // it is actually audible (the destination's output latency) — 0 before
  // start() has ever produced a context. practice.session/REQ-006's
  // highlight timer adds this to its delay so the highlight aims at the
  // audible onset, not merely the scheduled one (T030).
  outputLatencyMs(): number;
  post(command: SoundCommand): void;
  onOnset(listener: (report: OnsetReport) => void): () => void;
  // Releases whatever start() acquired (an AudioContext, pending timers) —
  // called once, when the session that owns this port is torn down
  // (practice.session/REQ-002, T024).
  dispose(): void;
}
