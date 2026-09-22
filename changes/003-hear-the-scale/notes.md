---
type: Implementation Notes
title: 003-hear-the-scale — notes
description: Decisions taken during implementation that the plan did not cover.
resource: /changes/003-hear-the-scale/notes.md
status: draft
tags: [sdd, notes, "change:003-hear-the-scale"]
sdd_id: 003-hear-the-scale
---

# Notes — 003-hear-the-scale

Decisions taken during implementation that the plan did not cover, and why.
One line each, newest last.

## Implementation log

- T003 done — review PASS/PASS, no findings. Resumed from an interrupted first run; code matched the brief line for line.
- T004 done — review PASS/PASS. Minor: per-file test helpers duplicated (codebase convention); brief steps 3–4 labelled RED passed immediately (generic implementation).
- T005 done — review PASS/PASS, no findings. Phase 2 (theory) complete.
- T001 done — DONE_WITH_CONCERNS: the task put `[profile.release]` in the member manifest where Cargo ignores it; fixer (haiku) moved it to the root, reviewer confirmed `-C opt-level=s -C panic=abort` now applied. Review PASS/PASS; minor: `render(_now_frame)` parameter name differs from the brief (ABI identical).

## Spike

- Laptop, headless Chromium 153.0.8010.12: ok — `?worker&url` loaded via `audioWorklet.addModule` without a fallback; `WebAssembly.compileStreaming` against Vite's dev-served `.wasm` succeeded; the `?sound-spike` button read "ok" after the click with no console or page errors.
- Phone: not yet checked — user away; carried to the acceptance walk.
