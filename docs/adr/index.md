# Architecture Decision Records

- [ADR 0000 — <Title>](0000-template.md) — Architecture Decision Record · proposed — <one sentence — the decision>
- [ADR 0001 — The language boundary follows the context boundary](0001-language-boundary-follows-contexts.md) — Decision Record — Rust owns the listening context (as WASM); TypeScript owns theory, practice and the UI; they meet only at the PitchDetected event.
- [ADR 0002 — The notation renderer follows the design, not engraving convention](0002-hand-drawn-stave-replaces-vexflow.md) — Decision Record — VexFlow is removed; the stave is hand-drawn SVG whose geometry is copied from the Function Paper prototype.
- [ADR 0003 — Rust owns the audio boundary](0003-rust-owns-the-audio-boundary.md) — Architecture Decision Record · accepted — Amends ADR 0001 — a fourth bounded context, sound (synthesis), joins listening as Rust compiled to WebAssembly running in the browser's audio thread; the language split still follows the context map.
