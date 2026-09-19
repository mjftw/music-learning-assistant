---
type: Decision Log
title: Decisions
description: Append-only log of every decision the user has made, read by every phase before asking anything.
resource: /docs/decisions.md
status: stable
tags: [sdd, decisions]
---

# Decisions

> Append-only. One line per decision the user has made, anywhere in the
> workflow. Read by every phase before asking anything. A decision here is
> never re-asked by an agent; only the user reopens it, and the reopening is
> itself a new line.
>
> Format: `YYYY-MM-DD · <where: init | constitution | engineering | NNN-slug> · <decision> · <why, one line>`

2026-09-19 · init · The product is a play-along theory-practice companion for scales, arpeggios and drones · self-taught, theory learned on the instrument not on paper
2026-09-19 · init · Instrument-agnostic and range-aware: selectable instrument constrains the playable range · plays flute and ocarina (smaller range), guitar possibly later; never ask for an unplayable note
2026-09-19 · init · Oriented around the circle of fifths as well as the stave · the circle is how the user learns — connections and heuristics over rote
2026-09-19 · init · Two modes: tool leads (plays, learner follows) and learner leads (tool shows note, listens, advances when nailed) · matches how practice actually flows
2026-09-19 · init · Traversal options: 1 or 2 octaves, up/down, scales and arpeggios · stated directly
2026-09-19 · init · Wanted beyond core: just vs equal temperament choice, theory tooltips, drone notes/scales · temperament and drone serve wind pitching and string tuning
2026-09-19 · init · Not gamified, no sheet-music/song playing, no progress tracking, no curriculum · user hates gamified apps; learning at own pace; sheet music stays outside the tool
2026-09-19 · init · Built for one user; others incidental · personal tool, no design effort for other people's needs
2026-09-19 · init · Runs on a laptop at least; phone on a music stand is the preferred practice interface; home use only · performance on laptop; practising happens at home
2026-09-19 · init · v1 core: pick a scale from the circle, choose traversal, tool plays, learner plays along · smallest useful thing; listening, drone, temperament, tooltips cut first
2026-09-19 · init · Success: a real practice session with it beats one without, enough to reach for it again unprompted · observable from the user's own behaviour
2026-09-19 · init · Abandonment condition: too complicated or too distracting during practice · the instrument is the focus, the app is an aid
2026-09-19 · init · Live pitch feedback must be immediate or it is not worth having · late feedback throws off practice entirely
2026-09-19 · init · Per-instrument fingerings deferred to a later feature · useful in time, not needed now
2026-09-19 · init · Three bounded contexts: theory (timeless music facts), practice (session in motion), listening (pitch detection) · listening isolated because it is the riskiest part; theory never changes mid-session
2026-09-19 · init · Listening reports raw PitchDetected only; practice judges sharp/flat/nailed against the target · the pitch engine can be swapped or tuned without touching practice rules
2026-09-19 · init · Note and detected pitch are deliberately different words · a note is a theory position; what the learner produces is a frequency near or far from one
2026-09-19 · init · Shared vocabulary limited to Note, Instrument, Cents · each shared word is coupling; the list stays short
2026-09-19 · constitution · Article V: live feedback carries a numbered latency budget with a measured test; late feedback is suppressed, not shown · the riskiest unknown made non-negotiable — late feedback throws off practice
2026-09-19 · constitution · Article VI: the practice view never demands interaction mid-sequence, never interrupts, never gamifies · the abandonment condition made enforceable at review
2026-09-19 · constitution · Article VII: no third-party subscriptions, accounts or services at runtime; architecture (incl. client-server) stays open · self-sufficient to run, but plan decides the shape
2026-09-19 · init · Roadmap: 001 the-circle, 002 hear-the-scale, 003 the-drone, 004 hear-me, 005 learner-leads, 006 temperament, 007 teach-me · each slice thin and useful alone; 001 replaces the paper circle before any sound exists
2026-09-19 · init · 004 hear-me built early despite only being needed by 005 · riskiest unknown (live pitch, latency budget) de-risked while paying its way as a tuner
2026-09-19 · init · Cut line below 005 · tool-leads + learner-leads + tuner is the product; temperament and tooltips are enrichment
