---
type: Implementation Notes
title: 004-the-drone — notes
description: Decisions taken during implementation that the plan did not cover.
resource: /changes/004-the-drone/notes.md
status: draft
tags: [sdd, notes, "change:004-the-drone"]
sdd_id: 004-the-drone
---

# Notes — 004-the-drone

Decisions taken during implementation that the plan did not cover, and why.
One line each, newest last.

- T001 (minor, reviewer): `Voices::stop_all` and `Voices::stop(tag)` are near-identical loops marking `Fade::Requested`; a private `request_fade(matches)` helper would fold them — left as is at 5 lines each.
- T001: `#[allow(dead_code)]` on `Length::UntilStopped` until T002's `push_drone` constructs it — the crate is a `cdylib`, so an unconstructed `pub` variant trips `-D warnings`; comment names T002.
- T002: the reed drone renders in 21–31 µs per 128-frame quantum (release build, laptop) against the plan's 500 µs cap — `MAX_HARMONIC` stays 24; the wavetable fallback (ADR 0005) is not needed.
- T002 (minor, reviewer): `a_drone_renders_without_large_steps_across_attack_and_stop` does not assert `push_drone`'s return value, unlike its two siblings — mirrors the brief's sketch; fold in if the file is touched again.
