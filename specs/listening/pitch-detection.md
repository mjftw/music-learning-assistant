---
type: Capability Spec
title: listening / pitch-detection
description: <one sentence — what this capability does for its users>
resource: /specs/listening/pitch-detection.md
status: stable
tags: [sdd, capability, "context:listening"]
sources:
  - resource: /changes/007-hear-me/proposal.md
generated:
  by: process:merge_delta.py
  at: 2026-09-29T22:17:17Z
verified:
  - by: human:merlin-webster
    at: 2026-09-29T22:17:21Z
sdd_context: listening
sdd_capability: pitch-detection
sdd_version: 0.1.0
sdd_phase: current
---

# listening / pitch-detection

> The current truth. Every requirement below is true of the system as it is
> now. Changes arrive as deltas under `changes/` and are merged here by
> `scripts/merge_delta.py` at `sdd-finish`. Never edited by hand.
>
> Cite a requirement as `listening.pitch-detection/REQ-NNN` and a scenario as
> `listening.pitch-detection/REQ-NNN/Sk`. IDs are never reused: a removed
> requirement stays, struck through, with the change that removed it.

## Purpose

A **Tuner** pill in the practice screen's header opens a tuner screen: playback and the drone stop, the microphone is asked for, and as the learner plays, the screen names the nearest note with its octave, draws how far sharp or flat it is on a ±50 ¢ level with a ±5 ¢ in-tune band, and writes the heard note on a small stave with the offset in cents above it — every readout within 100 ms of the sound, for any note from E2 to C7, within ±2 ¢ on a steady tone, measured. A target can be pinned (Hold what is playing, or a note picked from a pitch spiral) so everything is measured from it instead; it is forgotten on leaving. Silence shows "Play a note"; a refused or missing microphone shows "Can't hear" without interrupting anything; ‹ Practice returns to the practice screen idle and silent. Nothing sounds while the tuner listens, nothing is stored, and the tool never opens on it.

## Requirements

### REQ-001: The microphone is opened on request and released on demand

WHEN listening is requested
THE SYSTEM SHALL ask for the microphone then — and never before — and
begin capturing when it is granted; WHEN listening is ended THE SYSTEM
SHALL release the microphone within 200 ms so that the device no longer
shows it in use; and THE SYSTEM SHALL never send captured audio off the
device or store it

**Scenarios**
- **REQ-001/S1 — nothing before the request**
  Given the tool has just opened
  When no listening has been requested
  Then the microphone has not been asked for and no permission prompt has
  been shown
- **REQ-001/S2 — asked for on request**
  Given the microphone has never been granted
  When listening is requested
  Then the platform's microphone permission is asked for at that moment,
  and once granted, capture begins
- **REQ-001/S3 — released on demand**
  Given listening is in progress
  When listening is ended
  Then within 200 ms the microphone is released and no detected pitch is
  published afterwards, however loud the room

_Since 007-hear-me_

### REQ-002: A heard pitch is published as a detected pitch

WHILE listening is in progress and a single pitch is sounding
THE SYSTEM SHALL publish `PitchDetected` — the frequency in hertz, a
confidence, and the time of the sound it reflects — for every note from E2
(82.41 Hz) to C7 (2093.00 Hz), with the frequency within ±2 cents of the
true pitch on a steady tone, whether a sine or a harmonic-rich tone, and
never an octave above or below it

**Scenarios**
- **REQ-002/S1 — a sine at concert A**
  Given listening is in progress
  When a steady sine at 440.0 Hz is captured
  Then every PitchDetected published while it sounds carries a frequency
  between 439.5 and 440.5 Hz (±2 ¢)
- **REQ-002/S2 — a flute-like tone is not heard an octave out**
  Given listening is in progress
  When a steady tone at 440.0 Hz with harmonics at 880, 1320, 1760, 2200
  and 2640 Hz at falling amplitude is captured
  Then every PitchDetected carries a frequency within ±2 ¢ of 440.0 Hz —
  never near 880 or 220 Hz
- **REQ-002/S3 — the low end**
  Given listening is in progress
  When a steady flute-like tone at E2, 82.41 Hz, is captured
  Then PitchDetected carries a frequency between 82.31 and 82.50 Hz
- **REQ-002/S4 — the high end**
  Given listening is in progress
  When a steady sine at C7, 2093.00 Hz, is captured
  Then PitchDetected carries a frequency between 2090.6 and 2095.4 Hz
- **REQ-002/S5 — every semitone in between (measured)**
  Given listening is in progress
  When a steady sine and a steady flute-like tone at every semitone from
  E2 to C7 are captured in turn
  Then for each, every PitchDetected published while it sounds is within
  ±2 ¢ of the tone; outside E2–C7 nothing is promised, and anything
  published still obeys REQ-003

_Since 007-hear-me_

### REQ-003: Silence and noise publish nothing (invariant)

THE SYSTEM SHALL publish no `PitchDetected` for silence, breath, broadband
noise or several pitches sounding at once, and every `PitchDetected` it
does publish SHALL carry a frequency greater than zero and a confidence

**Scenarios**
- **REQ-003/S1 — silence**
  Given listening is in progress
  When nothing but the room's own noise floor is captured for 2 seconds
  Then no PitchDetected is published in those 2 seconds
- **REQ-003/S2 — noise**
  Given listening is in progress
  When white noise at the level of a played note is captured for 2 seconds
  Then no PitchDetected is published in those 2 seconds
- **REQ-003/S3 — a breath between notes**
  Given a steady tone at 440 Hz has been captured and stops
  When 850 ms of breath noise follows before the next tone
  Then no PitchDetected is published during the breath, and the next tone
  is published again as REQ-002
- **REQ-003/S4 — always a positive frequency and a confidence (invariant)**
  Given every input the harness can produce — tones, silence, noise,
  chords, clipping
  When any PitchDetected is published
  Then its frequency is greater than 0 and its confidence is present

_Since 007-hear-me_

### REQ-004: Detections keep pace, or are dropped

WHILE a pitch is sounding
THE SYSTEM SHALL publish a `PitchDetected` at least every 50 ms, each
carrying the time of the sound it reflects, and IF a detection cannot be
published within the tuner's budget of 100 ms after the sound it reflects
(`practice.tuner/REQ-006`) THEN THE SYSTEM SHALL drop it rather than
publish it late

**Scenarios**
- **REQ-004/S1 — at least twenty a second**
  Given listening is in progress
  When a steady tone at 440 Hz is captured for 5 seconds
  Then at least 100 PitchDetected are published, none more than 50 ms
  after the previous
- **REQ-004/S2 — the time is the sound's**
  Given listening is in progress
  When a tone begins at a known instant in the captured signal
  Then the first PitchDetected for it carries a time no earlier than that
  instant and no later than 100 ms after it
- **REQ-004/S3 — late is dropped (invariant)**
  Given listening is in progress and the device is stalled so that a
  detection would be published more than 100 ms after the sound it
  reflects
  When that detection is ready
  Then it is not published; the next one that can meet the bound is

_Since 007-hear-me_

### REQ-005: Capture stops while the page is hidden

WHEN the page becomes hidden (tab switched, phone locked or backgrounded)
WHILE listening is in progress
THE SYSTEM SHALL stop capturing and publish nothing while hidden; and
WHEN the page is shown again while listening is still requested THE SYSTEM
SHALL resume capturing without a new request

**Scenarios**
- **REQ-005/S1 — hidden means deaf**
  Given listening is in progress and a tone is sounding
  When the page is hidden
  Then no PitchDetected is published while it is hidden
- **REQ-005/S2 — shown again means listening again**
  Given the page was hidden during listening and is shown again
  When the tone is still sounding
  Then PitchDetected is published again within 200 ms of the page
  becoming visible, with no new permission prompt

_Since 007-hear-me_

### REQ-006: When the microphone cannot be used

IF the microphone is refused, absent, or fails while capturing
THEN THE SYSTEM SHALL report which — refused, none, or failed — to whoever
requested listening, publish no `PitchDetected`, and end listening; and
each later request SHALL try again

**Scenarios**
- **REQ-006/S1 — refused**
  Given the platform refuses the microphone
  When listening is requested
  Then the outcome reports refused, nothing is published, and listening
  is not in progress
- **REQ-006/S2 — none**
  Given the device has no microphone
  When listening is requested
  Then the outcome reports none
- **REQ-006/S3 — failed mid-way**
  Given listening is in progress
  When the microphone is unplugged or its permission revoked
  Then the failure is reported to the requester, no further PitchDetected
  is published, and the next request asks for the microphone again

_Since 007-hear-me_

## Invariants

| Invariant (from docs/domain.md) | Guarded by requirements |
|---|---|

## History

| Version | Date | Change | Added | Modified | Removed |
|---|---|---|---|---|---|
| 0.1.0 | 2026-09-29 | 007-hear-me | 6 | 0 | 0 |
