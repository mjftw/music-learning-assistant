# Change 003-hear-the-scale

- [hear-the-scale — intent](intent.md) — Intent · resolved — The tool plays the chosen scale or arpeggio traversal in the instrument's range at a chosen tempo, exactly as the Hear the Scale prototype shows, and the learner plays along
- [003-hear-the-scale — notes](notes.md) — Implementation Notes — Decisions taken during implementation that the plan did not cover.
- [Hear the scale — plan](plan.md) — Implementation Plan · approved — A pure practice transport in TypeScript schedules notes and clicks ahead on the audio clock; a new Rust-owned `sound` context renders them sample-accurately in an AudioWorklet; theory gains traversal fitting and equal-temperament pitch; the UI adds the prototype's transport card and sheets
- [Hear the scale](proposal.md) — Change Proposal · merged — The tool plays the chosen traversal of the selected key within the instrument's range, at a chosen tempo, exactly as the Hear the Scale prototype shows, and the learner plays along
- [Hear the scale — tasks](tasks.md) — Task List · complete — 20 tasks across 6 phases — Rust sound engine spike, theory traversal and pitch, practice transport and session, sound adapters, UI from the prototype, hardening and measured timing
- [tasks/](tasks/index.md)
