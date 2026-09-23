import type { ClockPort } from "../ports/clock";

// The lookahead scheduler's clock in the browser — practice.session/REQ-008.
export function browserClock(): ClockPort {
  return {
    setTimeout(callback: () => void, ms: number): () => void {
      const id = window.setTimeout(callback, ms);
      return () => window.clearTimeout(id);
    },
  };
}
