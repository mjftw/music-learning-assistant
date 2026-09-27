---
type: Skill
name: sdd-constitution
description: Establish or amend the project constitution in memory/constitution.md — the non-negotiable principles that outrank every spec, plan and instruction. Use once per project before the first spec, when the constitution is still marked DRAFT or contains placeholders, or when the user asks to change a project principle, add a standard, or amend the constitution.
model: fable
---

# Constitution

`memory/constitution.md` is the highest authority in this repository. Articles
I–IV and VIII–X are fixed by the workflow itself. Articles V–VII are
deliberately left to the project — Spec Kit's structure keeps nine articles
stable while each project encodes its own non-negotiable standards.


## Model

Top of the ladder: this skill runs on Fable (`model: fable` above). First
thing, before any question: `./scripts/phase.sh show`. If it prints nothing,
run `./scripts/phase.sh enter sdd-constitution`; if it names a phase, leave it alone
(you were called from inside that phase). While the marker is set, every
turn starts with the `sdd-continue` skill, which keeps the interview on Fable
while the session default stays cheap. Writes to the artefacts this skill
owns are refused on any other model (`scripts/hooks/guard-paths.sh`); if a
write is refused, invoke `sdd-continue` and retry. If Fable is not available
to this account, stop and tell the user; do not carry on in a weaker model.

## The interview record

Every question this skill asks is written to `docs/interviews/constitution.md`
(from `templates/interview-template.md`; create it on the first question,
`sdd_phase: open`) as it is asked and answered: the question, the
recommendation you offered, the user's answer in their words, and where in
the artefact it landed. Questions you decided not to ask go under `## Not
asked` with the reason. When the gate passes, set `sdd_phase: closed` and
commit the record with the artefact. The artefact is the summary; the
record is why it says what it says.

## If establishing it for the first time

1. Read the current `memory/constitution.md`.
2. Interview the user for Articles V–VII. Offer candidates with recommended
   picks — do not present a blank menu. The candidates worth raising:

   - **Security and access boundaries** — authn/authz model, secret handling,
     what is never logged. Recommend this one by default.
   - **Testing floor** — what must have a test before merge; whether tests come
     first; integration-test requirements at service seams.
   - **Observability** — structured logs, metrics, tracing, the rule that a
     failure must be diagnosable from telemetry alone.
   - **Data handling and retention** — personal data, retention windows,
     deletion guarantees, where data may physically live.
   - **Versioning and breaking changes** — semver policy, deprecation window,
     what counts as breaking for consumers.
   - **Dependency policy** — bar for adding one, licence constraints, supply
     chain. Pairs well with Article VIII.
   - **Accessibility** — target conformance level, treated as a gate not a
     polish item.
   - **Performance budgets** — the numbers, and what happens when one is missed.
   - **Self-hosting / data sovereignty** — no third-party SaaS for X; runs
     without external network; single-operator maintainable.

   Ask which three matter most here. Three is the format; a fourth genuinely
   non-negotiable standard can become Article XI.

3. For each chosen article, push for something **enforceable**. "We care about
   security" is not an article. "No endpoint is added without an explicit
   authorisation check, and a missing check fails the build" is.
4. **Gate.** Show the three new articles in full and ask for approval before
   writing. This document governs everything afterwards.
5. On approval:
   - `mkdir -p .sdd && touch .sdd/unlock-constitution`
   - write the articles, replacing every `PLACEHOLDER`; update the body's
     Status/Version lines and append to the amendment log
   - `./scripts/fm.py set memory/constitution.md sdd_version 1.0.0`
   - `./scripts/approve.sh memory/constitution.md ratified`
   - `rm -f .sdd/unlock-constitution`
   - `./scripts/index.sh`
   - append each article as a decision to `docs/decisions.md`
   - commit: `docs(constitution): ratify v1.0.0`

## If amending

1. Read the current file and its version.
2. State the amendment: which article, the old text, the new text, and why.
3. Bump: MAJOR for removing or reversing an article, MINOR for adding one,
   PATCH for wording that does not change meaning.
4. **Check for orphans.** Do any approved specs or plans now conflict with the
   amended article? Name them. An amendment that silently invalidates existing
   specs is worse than no amendment.
5. **Gate.** Approval required before writing.
6. On approval: `mkdir -p .sdd && touch .sdd/unlock-constitution`, write the
   change, `./scripts/fm.py set memory/constitution.md sdd_version <new>`,
   `./scripts/approve.sh memory/constitution.md ratified`,
   `rm -f .sdd/unlock-constitution`, `./scripts/index.sh`, append to the log,
   commit `docs(constitution): vX.Y.Z — <summary>`.

## Rules

- An agent may **propose** an amendment. It may never make one. The write only
  happens after explicit human approval in this session.
- Do not soften an article to accommodate a feature. If the feature needs the
  article changed, that is a conscious amendment with its own gate.
- Do not add an article that merely restates `AGENTS.md`. The constitution is
  for what must never be traded away, not for conventions.
- The unlock file is a speed bump for the hook, not permission. It exists only
  between the user's approval and the commit.
- Every article must be checkable. If no one can tell whether it was violated,
  it is a value statement, not an article — put it in the README.

When the constitution is ratified or the amendment applied: if you entered
the phase yourself (it was not open when you started), `./scripts/phase.sh
leave`. If `sdd-init` called you, leave the marker; init closes it.
