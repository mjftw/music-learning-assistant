// design-loop variant (007 round 4) — exploration for the tuner's silence
// treatment: today the reading is cleared 300 ms after the last pitch and
// the view removes everything at once. Three treatments (fade/linger/ghost)
// live behind `?variant=a|b|c`; `"cut"` (no param) is today's behaviour,
// untouched. TEMPORARY: one treatment becomes the rule in a later task and
// this whole file — along with every other block carrying this comment —
// is deleted then.
//
// A shared, dependency-free module (no import of TunerLevel/TunerStave,
// which both import TunerScreen — importing either from here would be
// circular) so the type and the one small helper below are defined once,
// not duplicated between TunerLevel.tsx and TunerStave.tsx.
import type { NoteJudged } from "../practice/published";

export type SilenceMode = "cut" | "fade" | "linger" | "ghost";

// The last reading TunerScreen showed, still being displayed after it
// cleared: fading opacity 1 → 0 (a), held grey then fading (b), or grey and
// held indefinitely (c, "ghost" — until the next reading or unmount).
export interface StaleReading {
  readonly reading: NoteJudged;
  readonly dataState: "fading" | "ghost";
  readonly opacity: number;
  readonly grey: boolean;
  // The CSS transition duration for `opacity`, or `null` for no animated
  // transition (prefers-reduced-motion, or a steady state with nothing
  // currently changing — c's ghost, or b's hold before its own fade).
  readonly transitionMs: number | null;
}

// The data-state/aria-hidden/opacity/transition a stale element carries,
// spread onto whichever element already carries its own data-testid.
// `undefined` when there is nothing stale to show (live, or the "cut"
// default, which renders exactly as it always has).
export function staleAttrs(stale: StaleReading | undefined):
  | {
      readonly "data-state": "fading" | "ghost";
      readonly "aria-hidden": "true";
      readonly style: {
        readonly opacity: number;
        readonly transition?: string;
      };
    }
  | undefined {
  if (stale === undefined) return undefined;
  return {
    "data-state": stale.dataState,
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
