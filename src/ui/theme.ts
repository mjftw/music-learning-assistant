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
  band: "oklch(0.90 0.045 150)",
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
  holdFill: "oklch(0.80 0.07 150)",
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
