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
