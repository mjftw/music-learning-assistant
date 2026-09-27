---
type: Skill
name: sdd-engineering
description: Establish, load, or refine the user's cross-project engineering preferences (paradigm, typing, errors, testing, architecture, tooling) — docs/engineering.md, mastered at ~/.config/sdd/engineering.md. Use at the first sdd-plan when docs/engineering.md is missing or unapproved, when the user says "my coding preferences", "how I like code written", "engineering standards", or when a review surfaces a preference not yet recorded. Not during sdd-init.
model: fable
---

# Engineering preferences

These do not change per project. They change slowly, across projects, as the
user learns what they want. So: one master outside the repo, a copy inside,
and a discipline for keeping them in step.


## Model

Top of the ladder: this skill runs on Fable (`model: fable` above). First
thing, before any question: `./scripts/phase.sh show`. If it prints nothing,
run `./scripts/phase.sh enter sdd-engineering`; if it names a phase, leave it alone
(you were called from inside that phase). While the marker is set, every
turn starts with the `sdd-continue` skill, which keeps the interview on Fable
while the session default stays cheap. Writes to the artefacts this skill
owns are refused on any other model (`scripts/hooks/guard-paths.sh`); if a
write is refused, invoke `sdd-continue` and retry. If Fable is not available
to this account, stop and tell the user; do not carry on in a weaker model.

## The interview record

Every question this skill asks is written to `docs/interviews/engineering.md`
(from `templates/interview-template.md`; create it on the first question,
`sdd_phase: open`) as it is asked and answered: the question, the
recommendation you offered, the user's answer in their words, and where in
the artefact it landed. Questions you decided not to ask go under `## Not
asked` with the reason. When the gate passes, set `sdd_phase: closed` and
commit the record with the artefact. The artefact is the summary; the
record is why it says what it says.

## When this runs

**At the first `sdd-plan`, and not before.** Nothing earlier in the workflow
needs to know how code is written: the product brief, domain map,
constitution, roadmap, glossary, intent and spec are all technology-free by
design. The plan is the first artefact that chooses a stack, so the plan is
the first thing that needs these preferences.

Never run this interview during `sdd-init`. A user who has not yet said what
they are building must not be asked which language they prefer. If a master
file exists, `scripts/init.sh` copies it in silently; that is the only
engineering activity init performs.

## Resolve

1. If `docs/engineering.md` exists and `sdd_phase` is `approved` → **load it**.
   Say one line: "engineering preferences loaded, v<sdd_version>". Done.
2. Else look for the master, in order: `$SDD_ENGINEERING`,
   `~/.config/sdd/engineering.md`. If found → copy it to `docs/engineering.md`,
   say so, done. (`scripts/init.sh` does this too; this is the fallback.)
3. Else → **interview** (below), write both the repo copy and the master.

## Interview

One question per section of
`templates/engineering-template.md`, **one at a time**, each with the
template's default offered as the recommendation — the user confirms,
changes, or replaces it.

**Order matters, and it is not the template's numeric order.** Ask the
principles first, the stack last:

1. §2 Paradigm, §3 Types, §4 Errors, §5 Immutability — how they think about
   code, independent of any language.
2. §6 Architecture, §7 Testing, §8 Data and interfaces — how they structure
   and prove it.
3. §9 Dependencies, §10 Style, §11 Observability, §12 Configuration,
   §13 Git — the working habits.
4. §15 Always / never — the things not covered above.
5. **Last**, §1 Languages and §14 Tooling — and frame them as *what you reach
   for*, not a decision for this project. By now you know the product's
   constraints from `docs/product.md`; offer the languages and tools that fit
   those, and record the user's general preference. The plan will choose this
   project's stack from the constraints, with these as one input, and may
   depart with a stated reason.

Their answer goes on the `**Mine:**` line in their words; a bare "yes"
records "as default".

Push where an answer is vague ("good types" → *which* strict mode, *which*
escape hatches are allowed). Accept "don't care" — record "no preference;
follow default" so it is never asked again.

Where the user's stated stack is known (from `docs/product.md` or the
conversation), tailor the tooling question to it — offer the community
standard per language rather than a blank table.

**Gate.** Show the completed file. `AskUserQuestion`: *Approve* / *Revise*.
On approval:

- `mkdir -p .sdd && touch .sdd/unlock-engineering`
- write `docs/engineering.md` (seeded from the template)
- `./scripts/fm.py set docs/engineering.md sdd_version 1.0.0`
- `./scripts/approve.sh docs/engineering.md approved`
- `rm -f .sdd/unlock-engineering`
- `./scripts/index.sh`
- ask once: "Write this as the master at `~/.config/sdd/engineering.md` so
  future projects start from it?" — on yes, `mkdir -p ~/.config/sdd` and copy
  it there
- append to `docs/decisions.md`:
  `<date> · engineering · preferences v1.0.0 ratified · <one line>`
- commit `docs(engineering): preferences v1.0.0`

## Refine

Triggered by the user, or by `sdd-converge` pass 8 when a `notes.md` line or a
recurring review finding reveals a preference that is not written down.

1. State the proposed change: section, old line, new line, and the evidence
   (which finding, which project).
2. **Gate.** *Apply* / *Reject* / *Reword*.
3. On apply: `mkdir -p .sdd && touch .sdd/unlock-engineering`, edit
   `docs/engineering.md`, bump `sdd_version` with `./scripts/fm.py set`
   (PATCH for wording, MINOR for a new preference, MAJOR for reversing one),
   append to the refinement log, `rm -f .sdd/unlock-engineering`.
4. Ask once: "Sync to master?" — on yes, copy `docs/engineering.md` over the
   master. Never sync without asking; the master affects every future project.

## Rules

- The unlock file exists only between approval and commit.
- The spec (`spec.md`) never reads this file and never cites it. Preferences
  are how, not what.
- §1 and §14 are preferences, not decisions. A plan that picks a different
  language for a good reason is not a violation; it names the reason.
- The plan cites it: any plan choice that departs from a preference names the
  section and the reason, as an open question for the user.
- Agents never edit this file outside this skill. The `guard-paths` hook
  blocks it.
- A preference the user has recorded is not re-litigated by an agent. Say
  once that you would do otherwise and why; then follow it. Article I.

When done: if you entered the phase yourself, `./scripts/phase.sh leave`. If
`sdd-plan` called you, leave the marker; the plan closes it.
