// The lead settings — who leads, the Hold, the In tune tolerance and the
// Cues — plus the hints the Traversal sheet shows beneath each row
// (practice.session/REQ-016, REQ-018, REQ-020). Pure (docs/engineering.md
// §2: functional core).

export type Who = "tool" | "me";
export type HoldBeats = 1 | 2 | 4;
export type Tolerance = "lenient" | "medium" | "accurate";

export const TOLERANCE_CENTS: Readonly<Record<Tolerance, number>> = {
  lenient: 15,
  medium: 10,
  accurate: 5,
};

export interface LeadSettings {
  readonly who: Who;
  readonly holdBeats: HoldBeats;
  readonly tolerance: Tolerance;
  readonly cueMeter: boolean;
  readonly cueTone: boolean;
}

export const defaultLeadSettings: LeadSettings = {
  who: "tool",
  holdBeats: 2,
  tolerance: "medium",
  cueMeter: true,
  cueTone: false,
};

// beats × 60000 / tempo — practice.session/REQ-016
export function requiredHoldMs(beats: HoldBeats, tempoBpm: number): number {
  return (beats * 60000) / tempoBpm;
}

// "Beats in tune, then the next · <s> s" — s = beats × 60 / tempo to one
// decimal, half rounded up (practice.session/REQ-020/S4).
export function holdHintOf(beats: HoldBeats, tempoBpm: number): string {
  const seconds = (beats * 60) / tempoBpm;
  const rounded = Math.round(seconds * 10 + Number.EPSILON) / 10;
  return `Beats in tune, then the next · ${rounded.toFixed(1)} s`;
}

// "Within <c>% of the way to the next note" — practice.session/REQ-020
export function toleranceHintOf(tolerance: Tolerance): string {
  return `Within ${TOLERANCE_CENTS[tolerance]}% of the way to the next note`;
}

// The Cues row's hint, both pills considered — practice.session/REQ-018
export function cuesHintOf(cueMeter: boolean, cueTone: boolean): string {
  if (cueMeter && cueTone) return "Sharp/flat on the note · a tone per note";
  if (cueMeter) return "Shows sharp or flat on the note";
  if (cueTone) return "A short tone as each note comes up";
  return "Just the note highlight";
}

// The Who leads row's hint — practice.session/REQ-020
export function whoHintOf(who: Who): string {
  return who === "tool" ? "It plays, you follow" : "It listens, you play";
}
