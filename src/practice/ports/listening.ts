import type {
  ListeningEnded,
  ListeningUnavailable,
  PitchDetected,
} from "../../listening/published/pitch-detected.schema";
import type { Result } from "./result";

// The seam onto the microphone — practice.tuner/REQ-001, REQ-002, REQ-006.
// The real adapter wraps listening/published's Listener; tests use a fake
// that publishes pitches on demand (tests/practice/fakes.ts).
export interface ListeningPort {
  start(): Promise<Result<void, ListeningUnavailable>>;
  stop(): void;
  currentFrame(): number;
  sampleRate(): number;
  onPitch(listener: (pitch: PitchDetected) => void): () => void;
  onEnded(listener: (ended: ListeningEnded) => void): () => void;
}
