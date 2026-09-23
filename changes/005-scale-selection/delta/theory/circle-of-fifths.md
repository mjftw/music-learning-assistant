---
type: Spec Delta
title: theory.circle-of-fifths — delta for 005-scale-selection
description: Generalises the key view's names-view display and the traversal's run/sequence fitting from the key's own diatonic scale to any scale rooted on its tonic
resource: /changes/005-scale-selection/delta/theory/circle-of-fifths.md
status: stable
tags: [sdd, delta, "change:005-scale-selection", "context:theory"]
sources:
  - resource: /specs/theory/circle-of-fifths.md
  - resource: /changes/005-scale-selection/proposal.md
generated:
  by: claude-sonnet-5
  at: 2026-09-23T21:19:19Z
verified:
  - by: human:merlin-webster
    at: 2026-09-23T21:54:16Z
sdd_id: 005-scale-selection
sdd_context: theory
sdd_capability: circle-of-fifths
sdd_phase: approved
---

# Delta: theory / circle-of-fifths

> What this change does to the living spec
> `specs/theory/circle-of-fifths.md`, and nothing else. The circle's wedges,
> ring, numerals and signature glyphs are untouched by this change (decided
> in `changes/005-scale-selection/intent.md`, Q2) — only the key view's
> names view (`REQ-003`) and the run/sequence fitting (`REQ-012`) change.

## MODIFIED

### REQ-003: The key view shows the key on the instrument

WHEN a key is selected
THE SYSTEM SHALL display that key's signature — in the circle's centre and
on the stave view's stave — and, in the stave view, the traversal's run
(`REQ-012`) ordered lowest to highest with every occurrence of the root
visually emphasised and an inline accidental on any note the chosen scale
alters from the tonic's own major or natural-minor form, together with a
summary of how many in-range notes the run has and their extremes; and, in
the names view, the chosen scale's own notes rooted on the key's tonic, in
scale order

**Scenarios**
- **REQ-003/S1 — G major on the flute (acceptance)**
  Given the selected variant is flute Concert (C4–C7), stave view, full
  range, scale
  When G major is selected
  Then the signature shows one sharp (F♯) in the circle's centre and on the
  stave, the stave's notes run from C4 up to C7 using only G-major notes
  with every G emphasised, and the summary reads 22 notes, C4–C7
- **REQ-003/S2 — the display follows the variant's range**
  Given G major is selected on Ocarina Alto C (A4–F6) in stave view, full
  range
  When the variant is changed to Ocarina Bass C (A3–F5)
  Then every displayed note moves down exactly one octave
- **REQ-003/S3 — the names view follows the chosen scale**
  Given G major selected, Lydian chosen, names view
  When the panel is read
  Then it shows G A B C♯ D E F♯ in scale order with C♯ carrying an inline
  accidental as the one note Lydian alters from G major, regardless of the
  selected variant's range or the traversal; with the default scale
  (Major) it shows G A B C D E F♯ with no inline accidental, as before
- **REQ-003/S4 — the stave shows the traversal's run, the summary the key**
  Given G major on flute Concert in stave view
  When the traversal is set to 2 oct, arpeggio
  Then the stave shows exactly G4 B4 D5 G5 B5 D6 G6 while the summary still
  reads 22 notes, C4–C7
- **REQ-003/S5 — a non-seven-note scale**
  Given G major selected, Major pentatonic chosen, names view
  When the panel is read
  Then it shows the five notes G A B D E, and, in stave view at 2 oct
  scale, the run is the ten notes G4 A4 B4 D5 E5 G5 A5 B5 D6 E6

**Was:**
> WHEN a key is selected
> THE SYSTEM SHALL display that key's signature — in the circle's centre
> and on the stave view's stave — and, in the stave view, the traversal's
> run (`REQ-012`) ordered lowest to highest with every occurrence of the
> root visually emphasised, together with a summary of how many in-range
> notes the key has and their extremes; and, in the names view, the key's
> seven notes in scale order

### REQ-012: A traversal is fitted to the instrument and ordered

WHEN a traversal — octaves (a whole-octave count or full range), shape
(scale or arpeggio) and direction (↑, ↓ or ↑↓) — is applied to the chosen
scale rooted on the selected key's tonic, on the selected variant
THE SYSTEM SHALL produce the run: for a whole-octave count n, the scale's
notes from the lowest in-range tonic that has the tonic n octaves above it
in range, up to and including that upper tonic; for full range, every
in-range note of the scale lowest to highest; for the arpeggio shape, only
those notes of the run whose scale degree is 1, 3 or 5; and SHALL produce
the sequence from the run: ascending for ↑, descending for ↓ (using the
scale's own descending form where it defines one — otherwise the ascending
form reversed), ascending then descending without repeating the top note
for ↑↓; and THE SYSTEM SHALL report which whole-octave counts from 1 to 4
fit (a count fits when such a run exists — the same tonic-to-tonic
distance for every scale sharing that tonic, independent of how many notes
per octave the scale has)

**Scenarios**
- **REQ-012/S1 — two octaves of G major on the flute**
  Given G major on flute Concert (C4–C7), 2 oct, scale
  When the run and the ↑↓ sequence are produced
  Then the run is the 15 notes G4 A4 B4 C5 D5 E5 F♯5 G5 A5 B5 C6 D6 E6 F♯6
  G6, and the sequence is those 15 ascending followed by the 14 below G6
  descending — 29 notes, a palindrome ending on G4
- **REQ-012/S2 — which counts fit**
  Given flute Concert (C4–C7)
  When the fitting counts are read for C major and for G major
  Then C major fits 1, 2 and 3 (C4–C5, C4–C6, C4–C7) and G major fits 1
  and 2 (G4–G5, G4–G6) but not 3, because G7 is out of range; F♯ major on
  Ocarina Bass C (A3–F5) fits none
- **REQ-012/S3 — an arpeggio keeps the chord tones wherever they fall**
  Given G major on flute Concert, full range, arpeggio
  When the run is produced
  Then it is D4 G4 B4 D5 G5 B5 D6 G6 B6 — the degree-1, 3 and 5 notes of
  every in-range G-major note, starting on D4 because the range starts
  below G4; with 1 oct instead it is G4 B4 D5 G5
- **REQ-012/S4 — down**
  Given the run of S1
  When the ↓ sequence is produced
  Then it is G6 F♯6 E6 … A4 G4 — 15 notes
- **REQ-012/S5 — the sequence never leaves the range (invariant)**
  Given every catalogued variant, every selectable key spelling, every
  selectable scale, every octave choice that fits plus full range, both
  shapes and all three directions
  When the sequence is produced
  Then every note lies within the variant's range, and every note of an
  arpeggio is a note of the same scale's run
- **REQ-012/S6 — a scale with its own descending form**
  Given G melodic minor · classical on flute Concert, 1 oct, scale, ↑↓
  When the run and sequence are produced
  Then the ascending run is G A B♭ C D E F♯ G (the raised 6th and 7th),
  and the sequence descends using the natural-minor form instead — G F
  E♭ D C B♭ A G — 15 notes, not a mirror of the ascending run
- **REQ-012/S7 — a scale with fewer notes per octave**
  Given G major pentatonic on flute Concert, 2 oct, scale
  When the run is produced
  Then it is the 11 notes G4 A4 B4 D5 E5 G5 A5 B5 D6 E6 G6 — the same
  tonic-to-tonic span as G major's own 2-oct run, five notes per octave
  instead of seven

**Was:**
> WHEN a traversal — octaves (a whole-octave count or full range), shape
> (scale or arpeggio) and direction (↑, ↓ or ↑↓) — is applied to the
> selected key on the selected variant
> THE SYSTEM SHALL produce the run: for a whole-octave count n, the key's
> notes from the lowest in-range tonic that has the tonic n octaves above
> it in range, up to and including that upper tonic; for full range, every
> in-range note of the key lowest to highest; for the arpeggio shape, only
> those notes of the run whose scale degree is 1, 3 or 5; and SHALL
> produce the sequence from the run: ascending for ↑, descending for ↓,
> ascending then descending without repeating the top note for ↑↓; and THE
> SYSTEM SHALL report which whole-octave counts from 1 to 4 fit (a count
> fits when such a run exists)
