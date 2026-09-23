import { z } from "zod";

// The seam between practice and the audio thread. Malformed commands cannot
// reach Rust: the host validates with this schema before posting.
export const soundCommandSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("tone"),
    tag: z.number().int().nonnegative(),
    hz: z.number().positive(),
    onsetFrame: z.number().nonnegative(),
    durationFrames: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal("click"),
    tag: z.number().int().nonnegative(),
    accent: z.boolean(),
    onsetFrame: z.number().nonnegative(),
  }),
  z.object({ kind: z.literal("stopAll") }),
]);
export type SoundCommand = z.infer<typeof soundCommandSchema>;

export const onsetReportSchema = z.object({
  tag: z.number().int().nonnegative(),
  onsetFrame: z.number().nonnegative(),
  actualFrame: z.number().nonnegative(),
});
export type OnsetReport = z.infer<typeof onsetReportSchema>;

export type SoundUnavailable = {
  readonly reason: "no-audio-context" | "worklet-failed" | "wasm-failed";
  readonly detail: string;
};
