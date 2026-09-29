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
