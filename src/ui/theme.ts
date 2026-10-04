export const paper = {
  frame: "#efe9dc",
  card: "#f7f3ea",
  disc: "#fbf8f1",
  ink: "#1c1916",
  inkSoft: "#2b2620",
  inkMid: "#4a4136",
  muted: "#6f675c",
  mutedMore: "#7a7167",
  faint: "#9a9186",
  border: "#cfc6b4",
  borderSoft: "#ddd4c2",
  drawerBorder: "#d5cbb8",
  hairline: "#e6ddcc",
  hairlineSoft: "#ece4d5",
  pillActive: "#e7dcc6",
  // The Traversal sheet's unselected pill ink — carried over verbatim from
  // TraversalSheet.tsx's own PILL_INACTIVE_INK (changes/003, the vendored
  // reference) and promoted to a token here per C008_T016's brief.
  pillInk: "#756c60",
  accent: "#8a4b2a",
  trackOff: "#c8bfad",
  scrim: "rgba(28,25,22,.32)",
} as const;

export const fonts = {
  body: "'Public Sans', system-ui, sans-serif",
  display: "'Instrument Serif', serif",
  mono: "'JetBrains Mono', monospace",
  music: "'Noto Music', serif",
} as const;

// practice.tuner — docs/design.md §8: the reading's colours (sharp/flat/
// in-tune, the in-tune band's fill) and the pinned target's grey notehead.
export const tuner = {
  sharp: "oklch(0.55 0.11 28)",
  flat: "oklch(0.55 0.11 258)",
  inTune: "oklch(0.55 0.11 150)",
  // 0.9, not 0.90 — jsdom's (and every browser's) CSSOM strips an
  // insignificant trailing zero when a style value round-trips, so a test
  // comparing `el.style.background` to this constant needs the same
  // normal form the engine will hand back; the colour is identical either
  // way.
  band: "oklch(0.9 0.045 150)",
  targetHead: "#a39a8c",
  ghostInk: "#8a8175",
} as const;

// practice.tuner/REQ-003 — the last reading's own timing once it clears:
// held grey for lingerHoldMs, then faded out over lingerFadeMs.
export const motion = {
  lingerHoldMs: 600,
  lingerFadeMs: 200,
} as const;

// practice.session/REQ-017 — the lead run's hold-fill band: the colour the
// band fills with by held time ÷ required hold. The band, line and verdict
// colours themselves are tuner.band / tuner.inTune / tuner.flat /
// tuner.sharp (docs/design.md §8: one value per role).
export const lead = {
  // 0.8, not 0.80 — see the comment on `tuner.band`.
  holdFill: "oklch(0.8 0.07 150)",
} as const;

// practice.session/REQ-017 — the meter on the target note: the box (40 px
// tall, ±50 ¢), the band's width on the stave / its inset in the names
// view, the pitch line's overhang / inset, radii and its 180 ms move.
export const noteMeter = {
  boxHeight: 40,
  pxPerCent: 0.4,
  staveBandWidth: 26,
  staveLineOverhang: 2,
  columnBandInset: 6,
  columnLineInset: 3,
  columnBoxTop: 13,
  bandRadius: 3,
  lineHeight: 2,
  lineRadius: 1,
  lineTransition: "top .18s cubic-bezier(.3,.7,.3,1)",
} as const;

// practice.session/REQ-015, REQ-017, REQ-022 — the live lead card's target
// letter and octave, and the no-mic card's title and body copy.
export const leadCard = {
  targetLetterSize: 40,
  octaveSize: 12,
  noMicTitleSize: 14,
  noMicBodySize: 12.5,
  noMicLineHeight: 1.45,
} as const;

// practice.session/REQ-020 — the Traversal sheet's fixed row frame (label,
// two-line hint box, pills and switches) and the Who-leads row's ✕.
export const sheetRow = {
  height: 62,
  paddingX: 18,
  labelSize: 13,
  hintSize: 11,
  hintLineHeight: 14,
  hintBoxHeight: 28,
  pillPadding: "9px 10px 10px",
  pillRadius: 10,
  pillSize: 12.5,
  switchWidth: 36,
  switchHeight: 20,
  knob: 14,
  knobInset: 3,
  knobOnLeft: 19,
  closeSize: 28,
  hairline: paper.borderSoft,
} as const;

// practice.session/REQ-014 — the mode words beneath the caption, and the
// Tuner glyph drawn in the start circle while I lead is idle.
export const modeWords = {
  gap: 16,
  barHeight: 2,
  barOffset: 4,
  padding: 4,
  glyphBar: 3,
  glyphGap: 3,
  glyphHeights: [10, 20, 10] as const,
  glyphOuter: "rgba(249,244,233,.6)",
  glyphCentre: "#f9f4e9",
} as const;
