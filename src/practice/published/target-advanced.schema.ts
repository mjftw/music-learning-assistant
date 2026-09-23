// The schema-first shape of TargetAdvanced (practice.session/REQ-006) as it
// crosses the practice/published boundary. noteSchema mirrors
// theory/published's Note — letters A–G, accidental natural|sharp|flat, an
// integer octave — without importing theory's internals
// (docs/engineering.md §8).
import { z } from "zod";
import type { Note } from "../../theory/published";

const noteSchema = z.object({
  letter: z.enum(["A", "B", "C", "D", "E", "F", "G"]),
  accidental: z.enum(["natural", "sharp", "flat"]),
  octave: z.number().int(),
}) satisfies z.ZodType<Note>;

export const targetAdvancedSchema = z.object({
  note: noteSchema,
  position: z.number().int().nonnegative(),
  length: z.number().int().positive(),
  atFrame: z.number().nonnegative(),
});
