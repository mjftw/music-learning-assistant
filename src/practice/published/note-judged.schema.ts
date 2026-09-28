import { z } from "zod";
import type { Note } from "../../theory/published";

// NoteJudged — practice.tuner/REQ-002, REQ-004: one per shown reading, the
// tuner's translation of listening's PitchDetected into "how far off, from
// what". It never crosses a network or worker boundary (unlike
// PitchDetected, which does and so is Zod-parsed at that seam) — it is
// produced in-process by this context's own pure functions (domain/tuner.ts)
// and consumed by the UI, so it is a plain TS interface, not a Zod object
// (docs/engineering.md §3: parsing is for untrusted input at a boundary,
// not for values this context already typed correctly). Its wire shape, if
// one is ever needed (a remote harness, say), is this interface.
export const verdictSchema = z.enum(["sharp", "flat", "in-tune"]);
export type Verdict = z.infer<typeof verdictSchema>;

export interface NoteJudged {
  readonly target: Note; // the pinned target, or the nearest note (with hysteresis) on auto
  readonly cents: number; // signed, whole cents from `target` — may exceed ±50 only when pinned
  readonly verdict: Verdict;
  readonly heard: {
    readonly hz: number;
    readonly nearest: Note;
    readonly cents: number;
  };
  readonly atFrame: number;
}
