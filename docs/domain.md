---
type: Domain Map
title: Domain map
description: The bounded contexts of this product, what each owns, the events between them, and the invariants each protects.
resource: /docs/domain.md
status: stable
tags: [sdd, domain]
sources:
  - resource: conversation:2026-09-19
  - resource: /docs/product.md
generated:
  by: claude-code/claude-fable-5
  at: 2026-09-19T17:05:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-19T15:37:24Z
sdd_phase: approved
---

# Domain map

> The product divided into **bounded contexts**: areas that each own one model
> and one vocabulary. Code layout mirrors this map one-to-one. A slice belongs
> to exactly one context. Contexts talk through the events and interfaces
> listed here and in no other way — `scripts/check-contexts.sh` enforces it.
>
> Keep this short. A context that cannot be described in two lines is two
> contexts. Three to seven contexts is normal for a product; one is fine for a
> small one.

## Contexts

| Context | Owns (the nouns) | Responsible for (the verbs) | Not responsible for | Code root |
|---|---|---|---|---|
| `theory` | Note, Instrument (name + playable range), Key, Scale, Arpeggio, Interval, Circle of Fifths, Temperament (just/equal), NoteSequence | Answering timeless questions: the notes of a scale/arpeggio in a key, a traversal (1–2 octaves, up/down) fitted to an instrument's range, a note's pitch under a temperament, neighbouring keys on the circle | Anything that changes during a session; sound; the microphone | `src/theory/` |
| `practice` | Session, Mode (tool-leads / learner-leads), Traversal choice, Target note, Tempo, Drone, Judgement (sharp/flat/nailed, in cents) | Running a session: sounding notes and the drone, holding the current target, consuming detected pitch and judging it against the target, advancing through the sequence | Music-theory facts; how pitch is detected | `src/practice/` |
| `listening` | Detected pitch (frequency, confidence, time) | Capturing the instrument through the microphone and publishing what pitch was heard, fast | Knowing the target note; judging sharp/flat; theory | `src/listening/` |

The UI (circle-of-fifths display, stave, tooltips) is the interface over all
three contexts, not a context of its own.

## Relationships

> Direction and mechanism only. Upstream publishes; downstream consumes and
> translates at its own boundary (anti-corruption). No context imports another
> context's internals.

| Upstream | Downstream | Mechanism | Translation needed? |
|---|---|---|---|
| `theory` | `practice` | interface `theory/published` (synchronous lookups: scales, sequences, pitches) | No — Note and Instrument are shared unchanged |
| `listening` | `practice` | event `PitchDetected` | Yes — practice translates a detected pitch into a Judgement against its target note |

## Events

> Past tense. Named in the upstream context's language. Schema-first — the
> schema is the contract (see engineering §8). One row per event.

| Event | Emitted by | Consumed by | Carries | Schema |
|---|---|---|---|---|
| `PitchDetected` | `listening` | `practice` | frequency (Hz), confidence, timestamp | `src/listening/published/pitch-detected.schema` |
| `TargetAdvanced` | `practice` | UI | new target note, position in sequence | `src/practice/published/target-advanced.schema` |
| `NoteJudged` | `practice` | UI | target note, offset in cents, verdict (sharp/flat/nailed) | `src/practice/published/note-judged.schema` |

## Invariants

> The rules that must hold at all times inside a context. Each becomes an
> EARS ubiquitous requirement and at least one scenario/property test. The
> thing that guards an invariant is that context's aggregate — we name the
> rule, not the pattern.

| Context | Invariant (one sentence, testable) | Guarded by |
|---|---|---|
| `theory` | A generated NoteSequence never contains a note outside the selected Instrument's range. | NoteSequence |
| `theory` | Neighbouring keys on the Circle of Fifths differ by exactly one accidental. | Circle of Fifths |
| `practice` | The current target note is always a member of the active sequence. | Session |
| `practice` | In learner-leads mode, the target never advances unless the note was held correct for the required duration. | Session |
| `listening` | A PitchDetected fact always carries a positive frequency and a confidence. | Detected pitch |
| `listening` | Pitch feedback is emitted within a bound that feels instant, or not at all — silence beats late feedback. | Detected pitch |

## Shared

> Things deliberately used across contexts unchanged. Keep this nearly empty;
> each row is a coupling.

- **Note** — defined by `theory` (name + octave + pitch under the chosen
  temperament); `practice` uses it unchanged. `listening` deliberately does
  not — it says *detected pitch*.
- **Instrument** — defined by `theory` (name + playable range); `practice`
  holds the selected one.
- **Cents** — the unit of sharp/flat offset; same meaning in `practice`'s
  Judgement and the UI's display.

## Open questions

| # | Question | Recommended answer |
|---|---|---|
