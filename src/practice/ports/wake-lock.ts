// Keeps the screen awake while playing — practice.session/REQ-009. Held
// between start() and stop(), whatever the platform allows.
export interface WakeLockPort {
  acquire(): Promise<void>;
  release(): void;
}
