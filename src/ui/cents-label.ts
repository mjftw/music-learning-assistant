import type { LeadSnapshot } from "../practice/published";
import { noteLabel } from "../theory/published";
import { paper, tuner } from "./theme";

// "+12" / "−16" / "0" — U+2212 MINUS SIGN, not a hyphen (matches the
// vendored reference's own `k > 0 ? "+"+k : "−"+(-k)`). Shared by every
// tuner view that writes a signed cents value (TunerLevel's tag, TunerStave's
// strip cents) — extracted here once TunerStave needed the same four-line,
// side-effect-free formatter TunerLevel already had, rather than duplicating
// it (docs/engineering.md, AGENTS.md "things agents get wrong here").
export function formatCents(cents: number): string {
  if (cents > 0) return `+${cents}`;
  if (cents < 0) return `−${-cents}`;
  return "0";
}

// practice.session/REQ-017, REQ-015/S3, REQ-022 — the live card's judgement
// line: "Play <target>" muted while nothing is detected, the signed cents
// out of tune, "in tune · holding" in tune, "<previous note> held ✓" from an
// advance until the first reading against the new target, and "All held"
// once the run completes. `null` while idle or cannot-hear — those cards
// show no judgement line at all.
export function judgementLabelOf(
  lead: LeadSnapshot,
): { readonly text: string; readonly ink: string } | null {
  if (lead.phase === "complete") {
    return { text: "All held", ink: tuner.inTune };
  }
  if (lead.phase !== "listening" || lead.target === null) return null;
  if (lead.justHeld !== null) {
    return { text: `${noteLabel(lead.justHeld)} held ✓`, ink: tuner.inTune };
  }
  if (lead.reading === null) {
    return { text: `Play ${noteLabel(lead.target.note)}`, ink: paper.faint };
  }
  const { cents, verdict } = lead.reading;
  if (verdict === "in-tune") {
    return { text: "in tune · holding", ink: tuner.inTune };
  }
  if (verdict === "flat") {
    return {
      text: `↓ ${Math.abs(Math.round(cents))} ¢ flat`,
      ink: tuner.flat,
    };
  }
  return { text: `↑ ${Math.round(cents)} ¢ sharp`, ink: tuner.sharp };
}
