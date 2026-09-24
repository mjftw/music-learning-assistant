---
type: Spec Delta
title: theory.circle-of-fifths — delta for 006-scale-selection-acceptance-fixes
description: A scenario pinning that the stave shows exactly the current run after a sequence of scale changes (REQ-003/S7)
resource: /changes/006-scale-selection-acceptance-fixes/delta/theory/circle-of-fifths.md
status: stable
tags: [sdd, delta, "change:006-scale-selection-acceptance-fixes", "context:theory"]
sources:
  - resource: /specs/theory/circle-of-fifths.md
  - resource: /changes/006-scale-selection-acceptance-fixes/proposal.md
generated:
  by: claude-fable-5-1
  at: 2026-09-24T06:00:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-24T07:55:32Z
sdd_id: 006-scale-selection-acceptance-fixes
sdd_context: theory
sdd_capability: circle-of-fifths
sdd_phase: approved
---

# Delta: theory / circle-of-fifths

## MODIFIED

### REQ-003: The key view shows the key on the instrument

WHEN a key is selected
THE SYSTEM SHALL display that key's signature — in the circle's centre and
on the stave view's stave — and, in the stave view, the traversal's run
(`REQ-012`) ordered lowest to highest (for a scale with its own descending
form: the ascending form for ↑, the descending form for ↓, and for ↑↓ the
sequence written out in playing order so the descent shows its own notes)
with every occurrence of the root visually emphasised and an inline
accidental on any note whose accidental differs from the signature's, or
from an earlier inline accidental at the same pitch in the run — an inline
accidental holds for the rest of the run, as in one bar — together with a
summary of how many in-range notes the chosen scale has and their
extremes; and, in the names view, the chosen scale's own notes rooted on
the key's tonic, in scale order — and only those: after any change of scale, key, variant or
traversal the stave shows the new run alone

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
  scale, the run is the eleven notes G4 A4 B4 D5 E5 G5 A5 B5 D6 E6 G6
- **REQ-003/S6 — a split-direction scale is written out, accidentals held**
  Given G melodic minor · classical on flute Concert, 1 oct, scale, ↑↓,
  stave view
  When the stave is read
  Then it shows the fifteen notes G4 A4 B♭4 C5 D5 E5 F♯5 G5 F5 E♭5 D5 C5
  B♭4 A4 G4 left to right in playing order; E5 and F♯5 carry inline ♮ and
  ♯ (the signature's two flats give E♭ and no F♯), the descending F5 and
  E♭5 carry inline ♮ and ♭ because the raised notes' accidentals were
  still in effect, and B♭4 carries no inline accidental at all (it is in
  the signature); with ↑ alone the stave shows the eight ascending notes,
  with ↓ alone the eight notes of the natural-minor form G4 … G5 lowest to
  highest
- **REQ-003/S7 — the stave after a scale change is exactly the new run**
  Given G minor on flute Concert, ↑↓, 1 oct, stave view, Melodic minor ·
  classical chosen (its written-out run repeats G4, D5 and other names)
  When Natural minor is chosen, then Harmonic minor, then Blues
  Then after each change the stave shows exactly that scale's run —
  after Blues the six noteheads G4 B♭4 C5 D♭5 D5 F5 (and the tonic G5),
  with inline accidentals only where the run needs them — and no notehead,
  accidental or name from an earlier scale remains

**Was:**
> WHEN a key is selected
> THE SYSTEM SHALL display that key's signature — in the circle's centre and
> on the stave view's stave — and, in the stave view, the traversal's run
> (`REQ-012`) ordered lowest to highest (for a scale with its own descending
> form: the ascending form for ↑, the descending form for ↓, and for ↑↓ the
> sequence written out in playing order so the descent shows its own notes)
> with every occurrence of the root visually emphasised and an inline
> accidental on any note whose accidental differs from the signature's, or
> from an earlier inline accidental at the same pitch in the run — an inline
> accidental holds for the rest of the run, as in one bar — together with a
> summary of how many in-range notes the chosen scale has and their
> extremes; and, in the names view, the chosen scale's own notes rooted on
> the key's tonic, in scale order
