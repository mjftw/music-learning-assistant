---
type: Guide
title: OKF artefact types
description: The frontmatter every artefact in this repository carries, and what each field means here.
resource: /docs/okf.md
status: stable
tags: [sdd, okf, guide]
---

# OKF artefact types

This bundle follows the [Open Knowledge Format v0.2](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md).
`type` is the only field OKF requires; everything else here is convention we
rely on. Consumers must tolerate unknown types and keys, so adopting it costs
nothing and buys provenance, trust and progressive disclosure.

## Common fields

| Field | Meaning here |
|---|---|
| `type` | One of the types below. Free-form in OKF; fixed by convention here. |
| `title`, `description` | Display name; one sentence. |
| `resource` | Bundle-relative path, e.g. `/specs/001-login/spec.md`. |
| `status` | OKF enum: `draft` until approved, `stable` once approved, `deprecated` when superseded. Set by `scripts/approve.sh`, never by hand. |
| `tags` | Always `sdd` and the type slug; slice artefacts add `slice:NNN-slug`. |
| `sources` | What this was derived from. Intent ← `conversation:<date>`; spec ← intent, product, constitution; plan ← spec, engineering, constitution; tasks ← plan, spec; ADR ← the plan or notes that prompted it. |
| `generated` | `{by: claude-code/<model>, at: <ISO>}` — who drafted it. Actors: `<producer>/<version>` for agents, `human:<id>` for people, `process:<id>` for scripts. |
| `verified` | List of `{by, at}`. **A gate approval is a `human:<id>` entry**, appended by `scripts/approve.sh`. Trust tier is derived, not stored: no `verified` → unverified; only non-human actors → machine-confirmed; any `human:` → human-reviewed. |
| `stale_after` | Only on ephemeral `.sdd/` artefacts. |
| `sdd_id` | Slice id `NNN-slug`. |
| `sdd_context` | The bounded context (from `docs/domain.md`) an artefact belongs to. |
| `sdd_capability` | The capability a living spec or delta describes. Cited with its context as `<context>.<capability>`. |
| `sdd_phase` | Workflow state, finer than OKF's `status`. Values per type below. |
| `sdd_constitution` | Constitution version a spec was written against. |
| `sdd_version` | Semver of the constitution / engineering preferences themselves. |

Extension keys are flat and `sdd_`-prefixed so `grep` and `sed` keep working.

## Types

| File | `type` | `sdd_phase` values |
|---|---|---|
| `memory/constitution.md` | `Constitution` | `draft \| ratified` (+ `sdd_version`) |
| `docs/product.md` | `Product Brief` | `draft \| approved` |
| `docs/roadmap.md` | `Roadmap` | `draft \| approved` |
| `docs/glossary.md` | `Glossary` | `draft \| approved` |
| `docs/engineering.md` | `Engineering Preferences` | `draft \| approved` (+ `sdd_version`) |
| `docs/domain.md` | `Domain Map` | `draft \| approved` |
| `docs/decisions.md` | `Decision Log` | — |
| `REVIEW.md` | `Review Policy` | — |
| `docs/sdd-guide.md`, `docs/okf.md` | `Guide` | — |
| `docs/adr/*.md` | `Architecture Decision Record` | `proposed \| accepted \| superseded` |
| `specs/<context>/<capability>.md` | `Capability Spec` | `current` (+ `sdd_version`, `sdd_context`, `sdd_capability`) |
| `changes/NNN/intent.md` | `Intent` | `draft \| resolved` |
| `changes/NNN/proposal.md` | `Change Proposal` | `draft \| in-review \| approved \| merged` |
| `changes/NNN/delta/<context>/<capability>.md` | `Spec Delta` | `draft \| approved` |
| `changes/NNN/plan.md` | `Implementation Plan` | `draft \| in-review \| approved` |
| `changes/NNN/tasks.md` | `Task List` | `draft \| approved \| in-progress \| complete` |
| `changes/NNN/notes.md` | `Implementation Notes` | — |
| `.sdd/briefs/**` | `Task Brief` | — (ephemeral; `stale_after` set) |
| `.sdd/reports/**/T*.md` | `Implementation Report` | — |
| `.sdd/reviews/**/T*.md` | `Task Review` | — |
| `.sdd/reports/**/converge.md` | `Convergence Report` | — |
| `.claude/skills/*/SKILL.md` | `Skill` | — |
| `.claude/agents/*.md` | `Agent` | — |
| `templates/*.md` | the type of what they produce | — |

## Useful queries

```bash
# Which specs have I actually approved?
grep -l 'by: human:' specs/*/spec.md

# Everything still in draft
for f in $(find docs specs -name '*.md'); do
  [ "$(./scripts/fm.py get "$f" status 2>/dev/null)" = draft ] && echo "$f"
done

# What was approved when
cat log.md

# Every artefact of one type
grep -rl '^type: Change Proposal' changes/

# What does the system do now, in one context?
cat specs/readings/index.md

# Which changes shaped a capability?
./scripts/fm.py get specs/readings/recording.md sources   # or read its History table
```

## Rules

- Never hand-edit frontmatter. Use `scripts/fm.py set` / `scripts/approve.sh`.
- `specs/**` is written only by `scripts/merge_delta.py`; the hook blocks
  everything else.
- Every gate runs `approve.sh`, then `scripts/index.sh`.
- `index.md` and `log.md` are reserved, carry no `type`, and are generated —
  the `guard-paths` hook blocks editing them directly.
- `AGENTS.md`, `CLAUDE.md` and `README.md` are deliberately outside the bundle:
  they are tool-standard files read by things that do not expect frontmatter.
