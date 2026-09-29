import { z } from "zod";

// The seam between listening and its consumers (practice's tuner):
// PitchDetected crosses that boundary as an event, so it is Zod-parsed at
// the host shim rather than trusted as a plain object from the worklet's
// port (docs/engineering.md §3, "parse, don't validate").
export const pitchDetectedSchema = z.object({
  hz: z.number().positive(),
  confidence: z.number().min(0).max(1),
  atFrame: z.number().nonnegative(),
});
export type PitchDetected = z.infer<typeof pitchDetectedSchema>;

// Why `start()` could not begin capturing at all — refused or absent
// permission, or a load failure for the worklet module or the compiled
// WASM (mirrors sound's SoundUnavailable shape).
export type ListeningUnavailable = {
  readonly reason:
    "refused" | "none" | "failed" | "worklet-failed" | "wasm-failed";
  readonly detail: string;
};

// Listening was ended by something other than the caller's own stop() —
// currently only a track that ended mid-session (unplugged, permission
// revoked).
export type ListeningEnded = {
  readonly reason: "failed";
  readonly detail: string;
};

// A boundary failure that does not stop listening but should not be
// swallowed either (docs/engineering.md §11, §15): a `PitchDetected`
// message off the worklet's port that failed pitchDetectedSchema.
export type ListeningProblem = {
  readonly reason: "invalid-pitch-report";
  readonly detail: string;
};
