---
type: Skill
name: sdd-specify
description: Write a change proposal and its delta specs — the WHAT and WHY of a change, and exactly which requirements it adds, modifies or removes in which living capability specs — into changes/NNN-slug/. Use after a grilling session, or when the user says "write the spec", "spec this", "propose this", "turn this into a spec". Writes no implementation code and never edits specs/ directly.
model: fable
---

# Specify — propose a change

Produce `changes/NNN-slug/proposal.md` and one delta file per capability the
change touches, under `changes/NNN-slug/delta/<context>/<capability>.md`.
**No technology.** **Never edit `specs/`** — that is the current truth, and it
changes only when a delta is merged at `sdd-finish`.


## Model

Top of the ladder: this skill runs on Fable (`model: fable` above). First
thing, before any question: `./scripts/phase.sh show`. If it prints nothing,
run `./scripts/phase.sh enter sdd-specify`; if it names a phase, leave it alone
(you were called from inside that phase). While the marker is set, every
turn starts with the `sdd-continue` skill, which keeps the interview on Fable
while the session default stays cheap. Writes to the artefacts this skill
owns are refused on any other model (`scripts/hooks/guard-paths.sh`); if a
write is refused, invoke `sdd-continue` and retry. If Fable is not available
to this account, stop and tell the user; do not carry on in a weaker model.

## Before writing

1. Read `memory/constitution.md`. If `sdd_phase` is not `ratified` or it has
   placeholders, stop and run `sdd-constitution` first.
2. Read the `ears`, `ddd` and `bdd` skills.
3. Read `templates/proposal-template.md` and `templates/delta-template.md`.
4. Read `docs/product.md`, `docs/domain.md`, `docs/roadmap.md`,
   `docs/glossary.md`, `docs/decisions.md`, and this change's `intent.md`. If
   `intent.md` is missing or its `sdd_phase` is not `resolved`, stop and run
   `grill`. Do not re-ask anything `intent.md` answers.
5. **Read the living specs this change touches**, in full:
   `specs/<context>/<capability>.md` for every capability the intent names.
   Note the highest existing `REQ-` in each (including struck-through ones);
   ADDED requirements continue from there. If the capability does not exist
   yet, the delta is all ADDED from `REQ-001` and the merge will create it.
6. Copy `sdd_context` from `intent.md` to `proposal.md` (`fm.py set`).
7. **Run `sdd-design` entry point B.** It decides whether this change has
   screens, imports or wireframes them, walks the scenarios across them, and
   fills the proposal's `## Interface` table. Its walkthrough list (scenarios
   with no screen; screen elements with no requirement) is input to the
   deltas you are about to write. If `docs/design.md` says the product has no
   interface, this is one line and `none`.

## The change directory

It exists already; `grill` created it with `./scripts/new-change.sh`. If
somehow it does not, run it now.

## Writing the proposal

Fill `proposal.md` in this order:

1. **Problem** — what is wrong today, for whom, at what cost.
2. **Outcome** — what is true afterwards, observable from outside. (For a new
   capability this becomes the living spec's Purpose.)
3. **Scope, especially "explicitly out of scope".**
4. **Relationship to other changes** — depends on, affects.
5. **Domain** — context, nouns, events emitted/consumed, invariants preserved
   or introduced.
6. **Changes** — one row per capability touched: adds / modifies / removes
   counts and why. This is the map to the delta files.
7. **Affects** — any change to `docs/domain.md`, `docs/glossary.md` or
   `docs/product.md` this requires. "none" is a valid and common answer.
7b. **Interface** — already filled by `sdd-design`; now fill every row's
   *Requirements seen here* with the qualified IDs from the delta. A row with
   no requirement is a screen state nobody asked for: remove it or add the
   requirement. A requirement with a visible effect that appears in no row
   has no screen: add the state.
8. **Non-functional requirements**, **Edge cases**, **Assumptions**,
   **Open questions** — as before.

## Writing the deltas

One file per capability, from `templates/delta-template.md`, with
`sdd_context`, `sdd_capability` and `resource` set. Three sections; omit an
empty one.

- **ADDED** — new requirements. Next free ID. Full EARS sentence, full
  scenarios with real values, failure paths included.
- **MODIFIED** — an existing requirement whose sentence or scenarios change.
  Give the *complete* new block (it replaces the old one), then `**Was:**`
  quoting the old EARS sentence verbatim so the reviewer sees the diff. Keep
  the ID; the title may change. Scenario IDs may be reused or extended.
- **REMOVED** — an existing requirement that is no longer true. One line: why,
  and what replaces it. Its ID is never reused.

Then run `./scripts/merge_delta.py preview changes/NNN-slug`. It must succeed.
Read `.sdd/target/NNN-slug/<context>/<capability>.md`: that is what the
capability will say after the change. If it reads wrong, the delta is wrong.

## The discipline

- **No technology.** Not in the proposal, not in a delta.
- **One change, one outcome.** Do not bundle. If a delta touches four
  capabilities, ask whether it is two changes.
- **Never invent a MODIFIED.** If you cannot quote the old sentence from the
  living spec, it is not a modification.
- **Do not answer your own open questions.**
- **Scenarios are observable from outside the context.**
- **Glossary words, in this context's meaning.**
- **The smallest delta that leaves nothing to guess.**

## Gate

First `./scripts/draft.sh changes/NNN-slug/proposal.md changes/NNN-slug/delta`
— the version you are about to show is committed as a numbered draft. Every
time the user sends it back and you revise, run it again before showing the
next version. The versions the user rejected are then in `git log --
changes/NNN-slug/proposal.md`, and a requirement they had you remove is one
diff away instead of gone.

Report in at most six lines:

- The capabilities touched, with adds / modifies / removes per capability
- Anything you decided that the user did not specify
- Any Affects (domain, glossary, product) — each is its own re-approval later
- The open questions, numbered
- The riskiest assumption
- The preview merged cleanly (say so)
- `./scripts/check-design.sh --change changes/NNN-slug` clean (or "no
  interface")

Then `AskUserQuestion`: *Approve*, *Revise*, *Answer open questions first*.

On approval: `./scripts/approve.sh changes/NNN-slug/proposal.md approved` and
`./scripts/approve.sh changes/NNN-slug/delta/<context>/<capability>.md approved`
for each delta; set the change's `docs/roadmap.md` status to `specified`;
`./scripts/index.sh`; commit `docs(proposal): NNN-slug — <title>`; hand to
`sdd-plan`.

**Do not write code in this turn.** Do not proceed to the plan without approval.
