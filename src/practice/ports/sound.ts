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
  post(command: SoundCommand): void;
  onOnset(listener: (report: OnsetReport) => void): () => void;
  // Releases whatever start() acquired (an AudioContext, pending timers) —
  // called once, when the session that owns this port is torn down
  // (practice.session/REQ-002, T024).
  dispose(): void;
}
