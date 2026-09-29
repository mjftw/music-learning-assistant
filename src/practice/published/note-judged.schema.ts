import { z } from "zod";
import type { Note } from "../../theory/published";

// NoteJudged — practice.tuner/REQ-002, REQ-004: one per shown reading, the
// tuner's translation of listening's PitchDetected into "how far off, from
// what". docs/domain.md's Events table names this file as NoteJudged's
// schema, same as every sibling published event (target-advanced.schema.ts,
// listening's pitch-detected.schema.ts) — schema-first is the rule for a
// published event regardless of whether it happens to cross a runtime
// boundary today (docs/engineering.md §8). noteSchema mirrors
// theory/published's Note — letters A–G, accidental natural|sharp|flat, an
// integer octave — without importing theory's internals. NoteJudged is
// produced and consumed in-process, so nothing here calls `.parse()` in
// production; the schema exists as the documented contract, not as active
// parsing of an in-process value.
export const verdictSchema = z.enum(["sharp", "flat", "in-tune"]);
export type Verdict = z.infer<typeof verdictSchema>;

const noteSchema = z.object({
  letter: z.enum(["A", "B", "C", "D", "E", "F", "G"]),
  accidental: z.enum(["natural", "sharp", "flat"]),
  octave: z.number().int(),
}) satisfies z.ZodType<Note>;

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

export const noteJudgedSchema = z.object({
  target: noteSchema,
  cents: z.number(),
  verdict: verdictSchema,
  heard: z.object({
    hz: z.number(),
    nearest: noteSchema,
    cents: z.number(),
  }),
  atFrame: z.number().nonnegative(),
}) satisfies z.ZodType<NoteJudged>;
