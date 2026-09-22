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
| Scale | `theory` | The ordered notes of a key, played as an exercise | Arpeggio; Key | intent-product |
| Arpeggio | `theory` | The chord tones of a key played in sequence, as an exercise | Scale | intent-product |
| Circle of fifths | `theory` | The arrangement of keys a fifth apart; neighbouring keys differ by exactly one accidental. The user's primary mental model and the UI's organising display | A mere picker widget — it is also the teaching surface | intent-product |
| Accidental | `theory` | The sharp or flat a key introduces; each step round the circle adds exactly one | — | product brief |
| Temperament | `theory` | The tuning system giving each note its pitch: just or equal | — | intent-product |
| NoteSequence | `theory` | The concrete list of notes produced by fitting a scale/arpeggio traversal to an instrument's range | Traversal — the recipe, not the result | domain map |
| Traversal | `theory` | How a scale or arpeggio is walked: 1 or 2 octaves, up and/or down | NoteSequence — the resulting notes | intent-product |
| Session | `practice` | One run of practising: instrument, key, traversal, mode, tempo, and the position within the sequence | — | domain map |
| Mode | `practice` | Who leads: tool leads (it plays, learner follows) or learner leads (it shows the target, listens, advances) | Musical mode (Dorian etc.) — not used in this product yet | intent-product |
| Target note | `practice` | The note the learner should be playing right now | — | domain map |
| Tempo | `practice` | The speed notes are played or expected, as chosen for the session | — | intent-product |
| Drone | `practice` | A continuously sounding note held for pitching a wind instrument or tuning a stringed one | — | intent-product |
| Judgement | `practice` | The verdict on a detected pitch against the target note: sharp, flat, or in tune, with the offset in cents | Raw detected pitch — judgement only exists relative to a target | domain map |
| In tune | `practice` | Close enough to the target note's pitch to count as correct | Nailed — colloquial, not used | glossary |
| Held | `practice` | Sustained in tune for the required duration; what advances the target in learner-leads mode | A single in-tune instant | glossary |
| Cents | shared | 1/100 of a semitone; the unit of sharp/flat offset everywhere | Hz — the raw frequency unit, used only inside `listening` | domain map |
| Stave | UI | The five-line notation display showing the current scale's notes | Sheet music — displaying songs is out of scope | intent-product |
| Tooltip | UI | A small explanation of the theory behind what is on screen, available on demand and never interrupting | Notifications or pop-ups — forbidden by Article VI | intent-product |
