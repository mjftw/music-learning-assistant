---
type: Constitution
title: Project Constitution
description: The non-negotiable principles that outrank every spec, plan and instruction in this repository.
resource: /memory/constitution.md
status: stable
tags: [sdd, constitution]
generated:
  by: sdd-starter/template
  at: 2026-09-19T12:00:00Z
verified:
  - by: human:merlin-webster
    at: 2026-09-19T15:42:51Z
sdd_phase: ratified
sdd_version: 1.0.0
---
# Project Constitution

> Highest authority in this repository. Overrides specs, plans, `AGENTS.md`, and
> in-the-moment instructions. An agent that finds an instruction in conflict
> with an article here must stop and say so rather than choose.
>
> **Status:** RATIFIED
> **Version:** 1.0.0 · **Ratified:** 2026-09-19 · **Last amended:** 2026-09-19

---

## Article I — The user is the source of truth

What is built, why, and in what order is decided by the user and by no one else.
The agent's role is to draw those decisions out, record them, and execute them.
It proposes; it never decides on the user's behalf. Every recommendation is a
draft for the user to accept, change, or reject. A decision the user has made is
written to `docs/decisions.md` and is not re-opened by an agent — only by the
user. An agent that believes a recorded decision is wrong says so once, with its
reason, and then follows the decision. Where the user has not decided, the
matter is undecided: it is asked, or recorded as open, never inferred.

## Article II — Specification precedes implementation

No implementation code is written before an approved `spec.md` exists for the
change. The spec states what and why; it names no technology. Unstated means
undecided: a gap is raised as a question or recorded under `## Open questions`,
never filled with a plausible guess.

## Article III — Requirements are testable or they are not requirements

Every requirement is written in EARS notation, carries a stable ID, and is
verifiable by a test that an agent can run. A requirement no test can fail is
rewritten or deleted. Prose that cannot be falsified is not a requirement; it is
a note.

## Article IV — Verification is separate from implementation

The step that checks the work does not trust the step that produced it, and is
performed by a reviewer that did not write the code. Tests are written before or
alongside the code they cover and are run — with output shown — before any task
is called complete. `/sdd-converge` compares the codebase against the spec and
`REVIEW.md`, not against the implementer's account of it.

## Article V — Live feedback has a numbered budget

Any slice that gives feedback while the learner is playing carries an explicit,
numbered end-to-end latency budget (sound made → feedback perceivable) in its
spec, and a measured test that fails when the budget is exceeded. Feedback that
would miss its budget is suppressed, not shown late — silence beats late
feedback. "Feels fast" is never accepted as evidence; only the measurement is.

## Article VI — The instrument is the focus

The practice view never requires interaction while a sequence is in progress,
never interrupts (no notifications, pop-ups, or celebrations), and contains no
gamification — no streaks, points, levels, or scores, anywhere, ever. Any spec
that adds a visible element or interaction to the practice view must state what
it costs in attention and why it earns its place; a reviewer may reject it on
distraction alone.

## Article VII — No third-party services to run

The product is fully usable with zero third-party subscriptions, accounts, or
external services at runtime: everything needed to practise runs on hardware
the user controls. A client–server architecture is allowed; a runtime
dependency on someone else's service is not, and a slice that introduces one
fails review. (Build-time tooling and package registries are unaffected.)

## Article VIII — Simplicity is the default

The simplest thing that satisfies the spec wins. No abstraction is introduced
for a second case that does not yet exist. No dependency is added without a
recorded reason. Features not in the spec are not built, however obvious they
seem.

## Article IX — Learning updates the specification

Implementation is expected to teach us things the spec got wrong. When it does,
the spec is amended and the amendment is recorded — the code is never left
silently disagreeing with it. Specs are written one vertical slice at a time,
not exhaustively up front.

## Article X — Amendment

This document is amended only by explicit human decision, via
`/sdd-constitution`. Each amendment bumps the version (semver: MAJOR for
removing or reversing an article, MINOR for adding one, PATCH for wording),
updates the date, and appends to the log below. An agent may propose an
amendment; it may not make one.

---

## Amendment log

| Version | Date | Change |
|---|---|---|
| 0.1.0 | — | Initial draft, unratified. Articles V–VII are placeholders. |
| 1.0.0 | 2026-09-19 | Ratified. Articles V–VII: latency budget, instrument is the focus, no third-party services. |
