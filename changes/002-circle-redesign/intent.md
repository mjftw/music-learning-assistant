---
type: Intent
title: Circle redesign — intent
description: Redesign the circle of fifths and key view's visual and interaction language, from a Claude Design handoff prototype.
resource: /changes/002-circle-redesign/intent.md
status: stable
tags: [sdd, intent, "change:002-circle-redesign"]
sources:
  - resource: conversation:2026-09-20
  - resource: /docs/product.md
  - resource: /docs/decisions.md
  - resource: local:Downloads/Circle of Fifths UI Redesign-handoff.zip
generated:
  by: claude-code/claude-sonnet-5
  at: 2026-09-20T19:14:10Z
verified:
  - by: human:merlin-webster
    at: 2026-09-20T19:32:07Z
sdd_id: 002-circle-redesign
sdd_context: theory
sdd_phase: resolved
---

# Intent: Circle redesign

> The user's words. A proto-spec: what is wanted, why, and under which
> constraints — captured before anything is formalised. `sdd-specify` reads
> this; it does not re-ask what is answered here.

## Problem

001-the-circle is functionally correct but, in the user's words on
acceptance, "the UI is terrible." A Claude Design handoff bundle
(`Circle of Fifths UI Redesign-handoff.zip`) provides a fully worked
prototype — real logic, not just visuals — for a redesigned circle and key
view: a warm/cool distance ring, scale-degree numbers, a global sharp/flat
spelling toggle, a names/stave view switch, a settings drawer, and a
variant picker as a bottom sheet.

## Proposed outcome

The circle of fifths and key view are rebuilt to match the prototype's
visual and interaction language, in this codebase's stack (React/TS, not
the prototype's own template runtime). Existing `theory.circle-of-fifths`
behaviour is preserved except where the prototype deliberately changes it
(see Interview record).

## Affected users and systems

The user, at the same two-device usage the product brief describes —
this redesign is explicitly meant to answer the still-open "is it legible
on a phone" question from 001. Touches `theory.circle-of-fifths`'s UI and,
per the interview, possibly its requirements; `theory.instruments` is
consumed unchanged (no delta expected there — confirmed below).

## Constraints

- Prototype is a reference for behaviour and visuals, not code — engineering
  §2/§6 (functional core, ports & adapters, React) still governs the actual
  implementation; the prototype's own template runtime is not reused.
- Article VI (instrument is the focus) and Article VII (no third-party
  services) apply unchanged.
- The prototype's comments cite this repo's own requirement IDs
  (`theory.circle-of-fifths/REQ-003`, `REQ-005`; `theory.instruments/REQ-001`),
  so it was built with the current spec in view — divergences from it are
  deliberate design decisions, not oversights, and are surfaced below rather
  than assumed.

## Interview record

> One block per question. The answer is recorded verbatim or near it.

### Q1: Enharmonic spelling display — keep simultaneous dual display, or adopt the prototype's global sharp/flat toggle?

**Recommended:** Global toggle — matches the prototype exactly; less crowded.
**Answer:** Global toggle. This becomes a MODIFIED `theory.circle-of-fifths/REQ-002`.
**Status:** decided

### Q2: New-accidental highlighting — keep every notehead highlighted in stave view, or adopt the prototype's signature-glyph-only accent?

**Recommended:** Signature-glyph-only in stave view; per-note accidental-order marks kept in names view — matches the prototype exactly.
**Answer:** Adopt the prototype. MODIFIES `theory.circle-of-fifths/REQ-004`'s stave-rendering behaviour.
**Status:** decided

### Q3: Restructure REQ-007 into a names/stave view switch plus a separate stave-names sub-toggle, as the prototype does?

**Recommended:** Yes — matches the prototype.
**Answer:** "I want what we build to look exactly like the prototype - doing
the prototype UI helped refine how I want the product to behave so we need
to follow that as priority." Adopted; and taken as the standing rule for
every remaining visual/interaction divergence between the prototype and the
shipped 001 behaviour — the prototype wins, without a further question per
divergence. Genuine architectural questions the prototype does not address
(it is a stateless mockup) are still asked below.
**Status:** decided

### Q4: Do the six new preferences (spelling, degrees, ring, stave-names, panel mode, span) persist across sessions like the existing selection?

**Recommended:** Yes, all of them — consistent with REQ-008's "the tool
reopens where it was left"; one schema version bump, old stored selections
still load with the new fields defaulting.
**Answer:** Persist all of them.
**Status:** decided

### Q5: What does the laptop show, given a phone-frame prototype?

**Recommended:** The same phone-proportioned column, centred (max-width
≈ 400px, full height) — phone-on-stand is the preferred practice interface,
and the handoff contains no widescreen design.
**Answer:** Agreed — "we can do wide layouts later."
**Status:** decided

### Q6: What is the display concept behind the 1/2/3-oct/full pills called?

**Recommended:** **Span** — which part of the key's in-range notes the stave
shows (an octave run up from a tonic, or the full range). Deliberately not
Traversal, which stays reserved for how playback walks a scale (change 003);
the display choice has no direction or walking semantics. 003's traversal
picker may default from the span but is its own concept.
**Answer:** Agreed.
**Status:** decided

### Q7: What is the acceptance test, and who signs off?

**Recommended:** Side-by-side with the prototype on the phone; same
functional walk as 001 plus the new interactions; reload restores all.
**Answer:** Agreed. On the phone (closes 001's open phone-legibility
question): the app reads as the same design as the prototype; G major on
flute shows the same values as 001; the ♯/♭ toggle respells the three dual
positions; distance-ring and degrees toggles work; names/stave switch and
span pills work; picker sheet and settings drawer work; a reload restores
every choice. Signed off by the user. Play-along footer stays a dashed
placeholder; wide layouts explicitly later.
**Status:** decided

## Resolved

- The prototype wins on every visual and interaction divergence from shipped
  001 behaviour — standing rule, no per-divergence questions (Q3): "doing
  the prototype UI helped refine how I want the product to behave."
- Enharmonic display becomes a single global ♯/♭ spelling preference
  toggling all three dual positions (modifies REQ-002) — less crowded;
  the prototype's centre toggle.
- New-accidental accent: signature-glyph-only in stave view; per-note
  accidental-order marks in names view (modifies REQ-004's rendering).
- REQ-007 restructures into a names/stave panel switch plus a separate
  "note names on the stave" setting; new settings: scale degrees, distance
  ring (modifies REQ-007).
- All six new preferences (spelling, degrees, ring, stave-names, panel,
  span) persist like the selection; one schema bump, old stored state loads
  with defaults (modifies REQ-008).
- Laptop shows the same phone-proportioned column, centred (max-width
  ≈ 400px); wide layouts are a possible later change.
- **Span** is the new display concept behind the 1/2/3-oct/full pills —
  distinct from Traversal, which stays reserved for playback (003).
- Acceptance: prototype side-by-side on the phone plus the functional walk
  above; user signs off.

## Assumptions carried

- "Circle 1c Function Paper" is the final design; the other studies in the
  handoff are earlier iterations — risk if wrong: rework against a
  different study.
- The prototype's own theory logic (spelling, ranges, runs) agrees with
  `theory/published` everywhere reachable — risk if wrong: a visual
  divergence traced to a logic divergence; the existing scenario tests
  catch it.

## Still open

- None.

## Riskiest unknown

Pixel-fidelity to the prototype is the acceptance bar and is judged by eye
on the phone — the hand-drawn stave and circle must be recreated exactly in
this codebase's stack, and "close" may not be close enough.
