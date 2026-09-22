---
type: Spec Delta
title: <context>.<capability> — delta for NNN-slug
description: <one sentence — what this change does to this capability>
resource: /changes/NNN-slug/delta/<context>/<capability>.md
status: draft
tags: [sdd, delta, "change:NNN-slug", "context:<context>"]
sources:
  - resource: /specs/<context>/<capability>.md
  - resource: /changes/NNN-slug/proposal.md
generated:
  by: claude-code/unknown
  at: YYYY-MM-DDTHH:MM:SSZ
verified: []
sdd_id: NNN-slug
sdd_context: <context>
sdd_capability: <capability>
---

# Delta: <context> / <capability>

> What this change does to the living spec `specs/<context>/<capability>.md`,
> and nothing else. Three sections, any of which may be empty and omitted.
> IDs: an ADDED requirement takes the next free `REQ-NNN` in the living spec
> (read it first; IDs are never reused, including removed ones). MODIFIED and
> REMOVED name existing IDs. `scripts/merge_delta.py` refuses anything else.
>
> If the capability does not exist yet, this delta is all ADDED starting at
> REQ-001, and the merge creates the living spec.

## ADDED

### REQ-00N: <short name>

<EARS sentence>

**Scenarios**
- **REQ-00N/S1 — <name>**
  Given <state>
  When <trigger>
  Then <observable outcome, real values>
- **REQ-00N/S2 — <failure name>**
  Given
  When
  Then

## MODIFIED

### REQ-00M: <short name — may change>

<the full new EARS sentence and full new scenario list; this replaces the block>

**Scenarios**
- **REQ-00M/S1 — <name>**
  Given
  When
  Then

**Was:**
> <the previous EARS sentence, verbatim, so the reviewer can see the diff>

## REMOVED

### REQ-00K: <its current name>
<one line: why it is no longer true, and what replaces it if anything>
