// practice.session/REQ-012, REQ-001 — the learner's scale choice, kept
// separately per ring (major-family, minor-family) so switching rings, or
// changing the traversal's shape, never disturbs the other ring's choice
// (REQ-001/S5: "each ring keeping its own choice").

import type { Mode, ScaleId } from "../../theory/published";

export interface ScaleChoice {
  readonly major: ScaleId;
  readonly minor: ScaleId;
}

export const defaultScaleChoice: ScaleChoice = {
  major: "major",
  minor: "natural-minor",
};

export function chosenScaleIdFor(choice: ScaleChoice, mode: Mode): ScaleId {
  return mode === "major" ? choice.major : choice.minor;
}
