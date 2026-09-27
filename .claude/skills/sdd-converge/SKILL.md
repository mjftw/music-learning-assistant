---
type: Skill
name: sdd-converge
description: Audit the implemented codebase against the spec, plan, tasks, constitution and REVIEW.md, report drift by severity, and append remaining work to tasks.md. Use when all tasks are done, or when the user says "converge", "check against the spec", "audit this", "did we build what we specified", "check for drift", or before opening a pull request.
---

# Converge

Compare **what is in the codebase** against **what the artefacts say should be**.
Code review evaluates plausibility; this evaluates compliance. Most AI-generated
changes pass tests, look reasonable, and still drift from the rules they were
meant to follow — and a spec only helps if something actually checks the code
against it.

## Model

Below the top of the ladder: this runs on the session default (Sonnet). First
thing: `./scripts/phase.sh leave` (a no-op if no phase is open), so later turns
are not moved up to Fable for nothing.

## How this phase runs

This phase **always** runs as the `reviewer` subagent
(`.claude/agents/reviewer.md`): read-only tools, strongest model, a context
that did not watch the implementation happen, so the work is not grading
itself (Article IV).

The policy — which passes, severities, thresholds, exclusions — is
`REVIEW.md`. It is the user's. Neither you nor the reviewer changes it.

Your job in the main session:

1. Spawn `reviewer` (Agent tool, `subagent_type: reviewer`) with the change
   path and the instruction to apply `REVIEW.md`, audit against the target
   state under `.sdd/target/<change>/` (build it with
   `./scripts/merge_delta.py preview changes/<change>`), run
   `./scripts/check-scenarios.sh --change changes/<change>`,
   `./scripts/check-contexts.sh` and `./scripts/check-design.sh --change
   changes/<change>`, and write its report to
   `.sdd/reports/<change>/converge.md`. If the change has screens, pass the
   dev server URL so the reviewer can run the fidelity pass (REVIEW.md 3c);
   if no server can be started, say so in the report rather than skipping
   the pass silently.
2. Receive the report. Do not edit it, soften it, or "fix a couple of things
   first". `./scripts/record.sh changes/<change> converge` — every cycle's
   report is kept as `record/converge-N.md`; a later cycle never overwrites
   an earlier one. Commit it.
3. Act on the verdict (below).

## Checks

The reviewer runs the passes in `REVIEW.md`. For reference, the shape:
spec compliance (scenario coverage) → constitution → engineering preferences →
plan conformance → domain boundaries → design fidelity → bugs → security →
scope → hygiene → notes fold-back. Severities and thresholds are in `REVIEW.md`.

Secrets, keys or credentials found anywhere in the tree are reported
immediately and separately, before anything else.

## Report format

```markdown
## Convergence report — NNN-slug
Run: <date> · Commit: <sha>

| Requirement | Implemented | Tested | All criteria met |
|---|---|---|---|
| REQ-001 | ✅ src/auth.py:42 | ✅ test_auth.py::test_login | ✅ |
| REQ-002 | ⚠️ partial | ❌ | ❌ 429 case missing |

| Scenario | Test | Through public interface? |
|---|---|---|
| REQ-001/S1 | ✅ tests/auth/scenarios/test_login.py::test_REQ_001_S1_… | ✅ |
| REQ-001/S2 | ❌ none | — |

Domain boundaries: `check-contexts.sh` ✅ / ❌ (findings below)

| Screen · state | Reference | Live | Matches | Untouched screens unchanged |
|---|---|---|---|---|
| circle · selected | design/reference/circle--selected.png | .sdd/design/<change>/live/circle--selected.png | ✅ | ✅ |

Design: `check-design.sh` ✅ / ❌ · tokens only ✅ / ⚠️ N hard-coded

### Critical (N)
- <finding> — <file:line> — <what the artefact requires> — <what the code does>

### Warning (N)
### Info (N)

### Commands
<pasted output: tests, lint, typecheck>

### Verdict
Converged  |  Not converged — N critical, M warning
```

## Outcome

- **Critical or warning findings:** append each to `tasks.md` as a new task with
  an ID continuing the sequence, in the full task anatomy (Status, Files, Steps,
  Verify), citing its requirement. Warnings the user accepts by name are
  recorded under `## Deferred` instead. For pass-8 items: propose an ADR in
  `docs/adr/` or a spec/plan amendment — as a proposal, gated — and where a note
  reveals an engineering preference not in `docs/engineering.md`, propose it via
  `sdd-engineering` › Refine. Report `Not converged`. Hand back to
  `sdd-implement`. Repeat the cycle until clean.
- **Info only, or clean:** report `Converged`. Run
  `./scripts/approve.sh changes/<change>/spec.md implemented`, set the change's
  `docs/roadmap.md` status to `converged`, `./scripts/index.sh`, then hand to
  `sdd-finish`.

## Never

- Never report Converged with an unmet acceptance criterion, an untested
  requirement, or a constitution violation — however minor it looks.
- Never fix things while auditing. Finding and fixing in one pass is how a
  finding gets quietly dropped. Record, then hand back.
- Never accept a checked box, a commit message, or a previous report as evidence.
- Never soften a finding because the fix is inconvenient or the feature is late.
- Never resolve a spec/code disagreement by editing the spec. That is the user's
  decision, raised as a finding.
