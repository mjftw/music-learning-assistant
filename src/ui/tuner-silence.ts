// practice.tuner/REQ-003 — the last reading's own view state once nothing
// more is detected: it lingers where it was, greyed, for motion.lingerHoldMs,
// then fades out over motion.lingerFadeMs. A shared, dependency-free module
// (no import of TunerLevel/TunerStave, which both import TunerScreen —
// importing either from here would be circular) so the type and the one
// small helper below are defined once, not duplicated between
// TunerLevel.tsx and TunerStave.tsx.
import type { NoteJudged } from "../practice/published";

// The last reading TunerScreen showed, still being displayed after it
// cleared: held grey then fading opacity 1 → 0 (reduced motion: held at
// opacity 1 throughout, then removed with no transition at all).
export interface StaleReading {
  readonly reading: NoteJudged;
  readonly opacity: number;
  // The CSS transition duration for `opacity`, or `null` for no animated
  // transition (prefers-reduced-motion, or the held phase before the fade
  // has started).
  readonly transitionMs: number | null;
}

// The data-state/aria-hidden/opacity/transition a lingering element carries,
// spread onto whichever element already carries its own data-testid.
// `undefined` when there is nothing stale to show (live, or truly nothing to
// show).
export function staleAttrs(stale: StaleReading | undefined):
  | {
      readonly "data-state": "fading";
      readonly "aria-hidden": "true";
      readonly style: {
        readonly opacity: number;
        readonly transition?: string;
      };
    }
  | undefined {
  if (stale === undefined) return undefined;
  return {
    "data-state": "fading",
    "aria-hidden": "true",
    style: {
      opacity: stale.opacity,
      ...(stale.transitionMs === null
        ? {}
        : { transition: `opacity ${stale.transitionMs}ms` }),
    },
  };
}

// Guarded for `matchMedia` being absent (jsdom has no implementation by
// default).
export function prefersReducedMotion(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
