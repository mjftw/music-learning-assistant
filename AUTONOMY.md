---
type: Autonomy Policy
title: Autonomy policy
description: When agents decide for themselves and when they stop — the run boundary, the judgement test for one-way doors, and how every decision is recorded for the user to review afterwards.
resource: /AUTONOMY.md
status: stable
tags: [sdd, autonomy]
---

# Autonomy policy

> Owned by the user. Agents apply it; they do not change it. `task-brief.sh`
> puts "Who decides" in every task brief, so the implementer sees its part.

## The boundary

Everything that needs the user happens **before the plan is approved**: the
product, the domain, the constitution, the intent, the proposal and its
deltas, the plan. That is where the user is mined for what to build and how.

**After the plan is approved, the run is unattended.** Tasks are written and
self-checked without a gate. Implementation, review, fix loops, spec
amendments, convergence and finish run to the end without asking anything.
The user comes back to a finished change and a digest of every decision made
on their behalf.

The run does not stop for the user. Two things come back to them at the
end, in the end-of-run report:

1. **A visual check**, when the change touched screens. The run builds the
   screens, audits them against the wireframes for structure, and finishes.
   The report then lists every screen and state the change added or altered,
   with its route and a live screenshot, and asks the user to look at each
   one on the real device. Anything they want different is a design round
   (`sdd-design` D) on the same branch before merge, or a `--design` change
   after. The visual check is explicit: the report does not call the change
   done until the user has answered it.
2. **Any one-way door**, judged as below. Even then the run carries on and
   gets as far as it can. The decider names exactly what still depends on
   the answer: the parts of the blocked task that do not are split off and
   built, tasks that touch the same area but not the question go ahead, and
   only what genuinely needs the answer is parked. Implementation ends only
   when nothing left can be built without the user; the built part is still
   converged and finished, and the blocker is reported with the rest.

Nothing else is a reason to stop. Not an ambiguity, not a spec that is
slightly wrong, not a choice between two reasonable options, not a failed fix
loop. Those are decisions, and decisions get made.

## Who decides

**Craft inside a task** (naming, local structure, which of two equivalent
calls, how a test is arranged, error wording) is the implementer's to
decide. It decides, and lists what it chose under `Choices made` in its
report. It does not escalate these.

**Anything beyond the task's own code** (what the product does, what
another task or context relies on, what a requirement means, whether the
plan still holds) goes to the `decider` subagent, which runs on the strongest
model. The implementer reports `DECISION_NEEDED` with the question, the
options it sees, and what it would pick. The controller dispatches the
decider, records its verdict, and carries on.

## The judgement test

There is no list of allowed decisions. The decider judges each one on four
questions, and says in its verdict how it answered each:

1. **Reversal cost.** If this turns out wrong a month from now, what does
   undoing it cost? An afternoon is a two-way door. A data migration, a
   rewrite of everything built on top, or an apology to a user is not.
2. **Foundation.** How much will be built on top of this before anyone looks
   at it again? A leaf choice is cheap to change. A shape that every later
   task inherits (a core type, a storage layout, an event's schema) is
   expensive even if the code is small.
3. **Reach.** Does it cross the change's boundary? Other contexts' published
   interfaces, users' data, security and privacy, money, external services
   and anything in production reach further than the change can see.
4. **Promise.** Does it change what an approved requirement promises the
   user, or only how the promise is kept? Keeping the promise differently is
   the agent's call. Changing the promise is the user's.

A decision that is cheap to reverse, not foundational, contained, and keeps
the promise is **two-way: decide it**. A decision that fails any one of the
four badly is **one-way: escalate it**. Between those, the decider uses
judgement and says why, and leans towards deciding: the cost of a wrong
two-way decision is an afternoon; the cost of stopping is the user's whole
absence.

Calibration, not a list. Decided: a scenario's example value contradicts
another scenario, so pick the one the intent supports and amend the other; a
case the spec never mentioned has one obviously implied behaviour; the plan
names a helper that turns out to belong in a different file inside the same
context; a fix loop fails three times because the test was over-specified,
so loosen what it asserts about implementation while keeping what it asserts
about behaviour. Escalated: a requirement cannot be met without changing a
published event schema; the plan's storage choice cannot hold the data model
the spec needs; meeting a requirement would mean collecting data the
constitution says the product does not keep.

## Spec amendments

When a decision changes the wording of an approved delta (a scenario value,
a missing edge-case scenario, a clarified sentence) without changing its
promise, the decider writes the exact amendment in its verdict. The
implementer never edits the delta. When the last task is done, the
controller opens a Fable phase, applies every recorded amendment to the
delta, commits it as a draft, and only then runs converge, so the audit
measures the code against a spec that tells the truth.

## The record

Every decider verdict is kept in `changes/<id>/record/decisions/D<NNN>.md`
by `scripts/record.sh <change> decision <verdict-file>`. `record.sh <change>
decisions` prints the digest: number, task, verdict, door, one line each,
and whether an amendment was applied. That digest opens the end-of-run
report. The reviewer at converge re-reads every decided verdict and raises a
**critical** finding for any it judges was really a one-way door, so a wrong
call is caught before finish rather than after.
