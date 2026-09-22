---
type: Intent
title: hear-the-scale — intent
description: The tool plays the chosen scale or arpeggio traversal in the instrument's range at a chosen tempo, exactly as the Hear the Scale prototype shows, and the learner plays along
resource: /changes/003-hear-the-scale/intent.md
status: stable
tags: [sdd, intent, "change:003-hear-the-scale"]
sources:
  - resource: conversation:2026-09-22
  - resource: /docs/product.md
  - resource: /docs/decisions.md
generated:
  by: claude-code/claude-fable-5-1
  at: 2026-09-22T16:45:23Z
verified:
  - by: human:merlin-webster
    at: 2026-09-22T17:01:31Z
sdd_id: 003-hear-the-scale
sdd_context: practice
sdd_phase: resolved
---

# Intent: hear-the-scale

> The user's words. A proto-spec: what is wanted, why, and under which
> constraints — captured before anything is formalised. `sdd-specify` reads
> this; it does not re-ask what is answered here.

## Problem

The circle shows the scale but makes no sound. The user still has to know
how the scale goes and set the pace himself; a play-along that the tool
sounds, inside the instrument's range and at a chosen tempo, is the core
loop the product exists for (product brief: tool leads, learner follows).

## Proposed outcome

The "Hear the Scale" prototype (Claude Design, iterated by the user;
vendored at `design/hear-the-scale.dc.html`) is the source of truth: the
output UI looks exactly the same. Below the key panel a transport card
plays and stops the traversal, shows where it is and a tempo stepper with
the Italian tempo term; an "edit" row opens the Traversal sheet (direction,
octaves, shape, note length, sound, loop / count-in / rest bar). The Span
pills are gone — the traversal decides what the stave and names view show,
and the current note lights as it sounds.

## Affected users and systems

- The user, alone, phone on the music stand (and the laptop column).
- `practice` gains its first capability, `practice.session` (tool-leads
  mode): transport, tempo, what sounds.
- `theory.circle-of-fifths` is modified: Span (REQ-011) is removed;
  the stave/names panel shows the traversal's run and the sounding note.
- `theory` computes the run (NoteSequence — its noun already, per
  `docs/domain.md`); the sequence walked (order, direction) is the
  traversal.
- `theory.instruments` unchanged.

## Constraints

- The prototype wins on every visual and interaction divergence (decision
  2026-09-20, carried); the design-review screenshot loop from 002 applies.
- Constitution Article VI: playback never demands interaction mid-sequence,
  never interrupts; Article VII: no runtime services (sound is synthesised
  locally, no sample downloads); Article VIII.
- Stated preference (user, 2026-09-22): **audio generation should be part
  of the Rust features, along with audio listening.** This cuts across
  ADR 0001 (Rust owns `listening` only; TS owns practice; Rust enters at
  hear-me) and `docs/domain.md` (sounding notes belongs to `practice`).
  The plan amends ADR 0001 — technology decision, not grilled here.
- Persistence pattern of REQ-008 (local, nothing personal).

## Interview record

> One block per question. The answer is recorded verbatim or near it.

### Q1: Is the whole prototype the scope of 003?

**Recommended:** Yes — one change creating `practice.session` and
modifying `theory.circle-of-fifths` (Span removed; traversal drives the
stave). The roadmap line said 1–2 octaves / up-down / scale-arpeggio /
tempo; the prototype adds octaves to 4 + full, ↑↓, note length ♩/♪, sound
mode notes/both/metronome, loop, count-in, rest bar, tempo terms sheet,
transport with position caption and progress bar. Source of truth means
the whole screen.
**Answer:** Yes, whole prototype.
**Status:** decided

### Q2: What do the notes and the metronome sound like?

**Recommended:** One mellow synthesised timbre for every note, sustained to
the note length with a short release; a short click with beat 1 of 4
accented; fixed level, no volume control; no samples.
**Answer:** Plain synth tone, but a friendly soft wood click sound would be
nice rather than a hard tone.
**Status:** decided — tone: plain synth; click: soft, woody (a woodblock
feel), not a hard tick. Accent and bar structure carried to Q3.

### Q3: Count-in, rest bar, accent and the quaver case

**Recommended:** Count-in is one bar of four counted down 4·3·2·1 (the
prototype shows a 3-count — the one departure); count-in and rest bar
always click whatever the sound mode, beat 1 accented; in *notes* mode the
click stops once the notes start. With ♪ the click stays on the beat at
the tempo and two notes sound per click; with ♩ one note per click. No
accents during the run (a scale's length is not a multiple of four).
**Answer:** Yes, 4-beat count-in.
**Status:** decided

### Q4: What do "full" and "arpeggio" mean where the prototype's code and comments disagree?

**Recommended:** Full = every in-range note of the key, lowest to highest
(as the prototype's code and shipped REQ-011 do; its comment says "tonic to
top") — "full" is about the whole range, and a real instrument makes you
start off the tonic at the bottom anyway. Arpeggio = the run's notes whose
scale degree is 1, 3 or 5 (the prototype thins by position in the run,
which is wrong for a full run that starts off the tonic): G major on flute,
full, arpeggio → D4 G4 B4 D5 G5 B5 D6 G6 B6; an octave run → 1 3 5 8.
**Answer:** Yes to both.
**Status:** decided

### Q5: Timing budget — does Article V apply, and with what numbers?

**Recommended:** Playback is not feedback, so Article V does not literally
bite, but treat it as if it did: every note onset within ±5 ms of its
scheduled time at any tempo 40–200; the current-note highlight within 30 ms
of the onset; both with measured tests. Playback stops when the page is
hidden rather than limping on with throttled timers; the screen is kept
awake while playing where the platform allows (phone on a stand).
**Answer:** Yes, those numbers.
**Status:** decided

### Q6: Changing things while playing, and what ❚❚ does

**Recommended:** As the prototype: key, instrument, direction, octaves or
shape changed while playing → the run restarts from its first note at once,
still playing, no count-in; tempo or note length → from the next note,
position kept; sound mode switches instantly; loop / count-in / rest bar
apply the next time they matter. ❚❚ is stop, not pause: silence at once,
next ▶ starts from the top (with count-in if on). End with loop off → idle,
caption back to "N notes · low–high". Sheets and the drawer never stop
playback (Article VI).
**Answer:** Yes, as the prototype.
**Status:** decided

### Q7: What is remembered, and what happens to an octave choice that no longer fits?

**Recommended:** The traversal (direction, octaves incl. full, shape, note
length, sound mode, loop, count-in, rest bar) and the tempo persist as the
REQ-008 preferences do — one schema bump, defaults for old state; playing
state is never stored. First-run defaults are the prototype's: ↑↓, 1 oct,
scale, ♩, both, loop on, count-in on, rest bar off, 96 bpm. A stored octave
count that exceeds what the instrument fits is clamped for display and
playback but kept, so it returns on the larger instrument.
**Answer:** Yes to both.
**Status:** decided

### Q8: When sound cannot start

**Recommended:** As the invalid-variant rule (instruments REQ-003): a
visible, non-interrupting notice and the transport still runs silently —
the highlight walks the run at tempo. No modal, no retry control; ▶ again
retries. The first ▶ tap is the gesture that unlocks audio; nothing sounds
or asks before it. The phone's mute switch is the phone's business.
**Answer:** Yes.
**Status:** decided

### Q9: Vocabulary

**Recommended:** Traversal (theory) widens to direction ↑ ↓ ↑↓, octaves
1–4 or full, and shape scale/arpeggio — the recipe for the NoteSequence.
Note length, sound mode, loop, count-in, rest bar and tempo are Session
settings (practice): how the sequence is played, not which notes. The sheet
keeps its designed title "Traversal" although it also carries the playing
options. NoteSequence = the notes in playing order with direction applied
(a ↑↓ run of 8 notes is a 15-note sequence; the caption counts it). Span is
removed from the glossary, superseded. New terms: Count-in, Rest bar, Tempo
term.
**Answer:** Yes.
**Status:** decided

### Q10: Acceptance, and is Rust audio a hard requirement?

**Recommended:** Acceptance on the phone, side by side with the prototype
(as 002), then a functional walk: G major on flute, ↑↓ · 2 oct · scale · ♩ ·
both · loop · count-in, Andante — hear it, play along; flip to arpeggio,
then ♪, then metronome-only; Bass C ocarina clamps 2 oct to 1; F♯ major on
Bass C offers only full. Tests: the two timing measurements; sequence
properties (never leaves range, arpeggio ⊆ scale, ↑↓ is a palindrome);
tempo-term bands contiguous over 40–200. User signs off. Rust/WASM audio
generation is tried first; if the plan shows it cannot meet ±5 ms or dwarfs
the change, 003 ships with TS-side synthesis behind the same interface and
Rust takes generation at 005 with listening. Cut order under pressure:
tempo-term sheet → rest bar → ♪ note length.
**Answer:** Fallback acceptable.
**Status:** decided

## Resolved

- Whole prototype is 003: creates `practice.session`, modifies
  `theory.circle-of-fifths` (Span/REQ-011 removed; traversal drives the
  panel) — source of truth means the whole screen.
- Sound: plain synthesised tone for notes; soft, woody click for the
  metronome; fixed level, no volume control, no samples.
- Count-in one bar of four (4·3·2·1 — departs from the prototype's
  3-count); count-in and rest bar always click, beat 1 accented; ♪ = two
  notes per click, click on the beat; no accents during the run.
- Full = every in-range note lowest→highest; arpeggio = degree-1/3/5 notes
  of the run (not position-thinned).
- Timing: onsets within ±5 ms of schedule at 40–200 bpm; highlight within
  30 ms of onset; both measured. Playback stops when the page is hidden;
  screen kept awake while playing where supported.
- Transport as the prototype: restart without count-in on key/instrument/
  traversal change; tempo & length from the next note; ❚❚ = stop to top;
  end without loop → idle; sheets never stop playback.
- Traversal and session settings + tempo persist with the selection (one
  schema bump, prototype defaults); playing state never stored; oversized
  octave choice clamped, not overwritten.
- Audio failure → non-interrupting notice, transport runs silently with the
  highlight; first ▶ is the unlock gesture.
- Vocabulary: Traversal = direction + octaves + shape; Session settings =
  note length, sound mode, loop, count-in, rest bar, tempo; NoteSequence in
  playing order; Span dropped; Count-in, Rest bar, Tempo term added.
- Acceptance: phone side-by-side + the G-major walk; user signs off.
- Rust/WASM audio generation is the preferred home (user, 2026-09-22);
  the plan may fall back to TS synthesis behind the same interface.

## Assumptions carried

- 4/4 is the only metre — risk if wrong: count-in/rest bar lengths and the
  accent pattern change (a later change could add a metre setting).
- The "Circle - current" file in the handoff equals the shipped 002
  prototype; only the Hear the Scale file carries new UI — risk if wrong:
  a design-review diff at implementation shows circle drift to reconcile.
- The tempo stepper's ±2 and the 40–200 range are the prototype's and
  stand — risk: none beyond the prototype.

## Still open

- None blocking. ADR 0001 amendment (Rust owns the audio boundary) is the
  plan's to write.

## Riskiest unknown

Rust/WASM audio generation entering at 003 — toolchain, worklet plumbing,
and meeting ±5 ms — on a change that is otherwise UI; the TS fallback
bounds it.
