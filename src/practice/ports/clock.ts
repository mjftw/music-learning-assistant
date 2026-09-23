// The lookahead scheduler's only notion of time — practice.session/REQ-008.
// The real adapter wraps setTimeout; tests use a fake with a settable
// clock (tests/practice/fakes.ts).
export interface ClockPort {
  setTimeout(callback: () => void, ms: number): () => void;
}
