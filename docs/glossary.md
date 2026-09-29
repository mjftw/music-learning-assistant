---
type: Glossary
title: Glossary
description: The domain vocabulary, in the user's definitions. Specs, plans, code and tests use these words exactly.
resource: /docs/glossary.md
status: stable
tags: [sdd, glossary]
sources:
  - resource: conversation:2026-09-19
generated:
  by: claude-code/claude-fable-5
  at: 2026-09-19T17:40:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-19T15:48:37Z
  - by: human:merlin-webster
    at: 2026-09-20T18:53:54Z
  - by: human:merlin-webster
    at: 2026-09-22T16:33:44Z
  - by: human:merlin-webster
    at: 2026-09-23T13:44:18Z
  - by: human:merlin-webster
    at: 2026-09-24T04:15:00Z
  - by: human:merlin-webster
    at: 2026-09-26T12:17:08Z
  - by: human:merlin-webster
    at: 2026-09-29T22:20:41Z
sdd_phase: approved
---

# Glossary

> The domain vocabulary, in the user's definitions. Specs, plans, code, and
> tests use these words exactly — not synonyms, not abbreviations the user did
> not give. Add a term the first time it appears in an intent; never redefine
> one without the user.
>
> The same word can mean different things in different contexts — that is two
> rows, and code in each context uses its own meaning. A term used across
> contexts unchanged is listed under Shared in `docs/domain.md`.

| Term | Context | Means | Not to be confused with | First used in |
|---|---|---|---|---|
| Note | `theory` (shared with `practice`) | A named position in music: name + octave, with a pitch under the chosen temperament (e.g. F♯4) | Detected pitch — what the learner actually produced | intent-product |
| Detected pitch | `listening` | What the microphone heard: a frequency (Hz) with a confidence and a time — near or far from any note | Note — the thing the learner was aiming at | domain map |
| Instrument | `theory` (shared with `practice`) | A thing the user plays: a name and a playable range (e.g. flute, ocarina) | The app or its sounds; "instrument" always means the physical one | intent-product |
| Variant | `theory` | A concrete, playable form of an instrument, with its own range (e.g. Ocarina Alto C) | Instrument — the tier above; a variant is what's actually selected and played | 001-the-circle |
| Range | `theory` | The lowest to highest note an instrument can play; every generated sequence stays inside it | — | product brief |
| Key | `theory` | A tonal centre and its accidentals (e.g. B♭ major); a position on the circle of fifths | Scale — the notes played in that key | intent-product |
| Scale | `theory` | One of a catalogue of note-formulas (major, its modes, minor and its variants, pentatonics, blues, whole tone, chromatic) rooted on a key's tonic, played as an exercise | Arpeggio; Key — the tonic and the printed signature stay the key's whatever scale is chosen | intent-product; broadened in 005-scale-selection |
| Scale family | `theory` | Which ring's Scale sheet offers a scale: major, minor, or either | Mode — who leads, a `practice` word | 005-scale-selection |
| Arpeggio | `theory` | The chord tones of a key played in sequence, as an exercise | Scale | intent-product |
| Circle of fifths | `theory` | The arrangement of keys a fifth apart; neighbouring keys differ by exactly one accidental. The user's primary mental model and the UI's organising display | A mere picker widget — it is also the teaching surface | intent-product |
| Accidental | `theory` | The sharp or flat a key introduces; each step round the circle adds exactly one | — | product brief |
| Temperament | `theory` | The tuning system giving each note its pitch: just or equal | — | intent-product |
| NoteSequence | `theory` | The concrete list of notes produced by fitting a traversal to an instrument's range, in playing order with direction applied (a ↑↓ run of 8 notes is a 15-note sequence) | Traversal — the recipe, not the result; the run — the ascending set the stave shows | domain map; 003-hear-the-scale |
| Traversal | `theory` | How a scale or arpeggio is walked: direction (↑, ↓ or ↑↓), octaves (1–4 whole octaves from the lowest fitting tonic, or the full range) and shape (scale or arpeggio) — the recipe for the NoteSequence | NoteSequence — the resulting notes; Session settings — how the sequence is played | intent-product; widened in 003-hear-the-scale |
| Session | `practice` | One run of practising: instrument, key, traversal, mode, tempo, the session settings, and the position within the sequence | — | domain map |
| Mode | `practice` | Who leads: tool leads (it plays, learner follows) or learner leads (it shows the target, listens, advances) | Musical mode (Dorian etc.) — used since 005-scale-selection as Scale catalogue entries; still a different word: Mode is who leads, Scale is what is played | intent-product |
| Target note | `practice` | The note the learner should be playing right now; in the tuner it is the nearest note unless one is pinned | — | domain map; 007-hear-me |
| Tuner | UI | The screen that listens and shows the detected pitch against the nearest or a pinned note | Drone — sounds a note for the learner to match; the tuner only listens | 007-hear-me |
| Nearest note | `theory` | The note whose pitch under the temperament is closest to a detected pitch, with the offset in cents | Target note — what the pitch is measured from; the two differ once a target is pinned | 007-hear-me |
| In-tune band | `practice` | The ±5 ¢ within which a judgement is in tune | In tune — the verdict itself | 007-hear-me |
| Tempo | `practice` | The speed notes are played or expected, as chosen for the session | — | intent-product |
| Session setting | `practice` | How the sequence is played, as distinct from which notes: sound mode (notes, both, metronome), loop, count-in, rest bar, tempo | Traversal — which notes | 003-hear-the-scale |
| Count-in | `practice` | One bar of four clicks, counted down before the first note of a run | Rest bar — between loops | 003-hear-the-scale |
| Rest bar | `practice` | One bar of four clicks between one loop of the sequence and the next | Count-in — before the first | 003-hear-the-scale |
| Tempo term | `practice` | The Italian name for a band of tempos (Largo 40–59 … Presto 176–200); picking one lands on the middle of its band | Tempo — the number itself | 003-hear-the-scale |
| Audible onset | `practice` | The instant a scheduled note reaches the listener: its scheduled onset plus the device's reported output latency; the sounding-note highlight is timed to it | Scheduled onset — the audio graph's time | 003-hear-the-scale |
| Drone | `practice` | A continuously sounding note held for pitching a wind instrument or tuning a stringed one | — | intent-product |
| Drone sound | `practice` | Which of pure, warm or reed the drone is rendered with | Sound mode — what sounds during playback (notes, both, metronome) | 004-the-drone |
| Tapped note | `practice` | A note of the run sounded for one beat on demand, from the stave or the names view | Target note — the sequence's current note; a tapped note never advances the target | 004-the-drone |
| Judgement | `practice` | The verdict on a detected pitch against the target note: sharp, flat, or in tune, with the offset in cents | Raw detected pitch — judgement only exists relative to a target | domain map |
| In tune | `practice` | Close enough to the target note's pitch to count as correct | Nailed — colloquial, not used | glossary |
| Held | `practice` | Sustained in tune for the required duration; what advances the target in learner-leads mode | A single in-tune instant | glossary |
| Cents | shared | 1/100 of a semitone; the unit of sharp/flat offset everywhere | Hz — the raw frequency unit, used only inside `listening` | domain map |
| Stave | UI | The five-line notation display showing the current scale's notes | Sheet music — displaying songs is out of scope | intent-product |
| Tooltip | UI | A small explanation of the theory behind what is on screen, available on demand and never interrupting | Notifications or pop-ups — forbidden by Article VI | intent-product |
| Distance ring | UI | The arc over the key's seven circle positions, coloured by distance from the selected key (warm sharpward, cool flatward), carrying the scale degrees and the key's own names for those notes | The wedges — which keep their fixed labels and hues regardless of selection | 002-circle-redesign |
