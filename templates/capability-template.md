---
type: Capability Spec
title: <context> / <capability>
description: <one sentence — what this capability does for its users>
resource: /specs/<context>/<capability>.md
status: draft
tags: [sdd, capability, "context:<context>"]
sources: []
generated:
  by: process:merge_delta.py
  at: YYYY-MM-DDTHH:MM:SSZ
verified: []
sdd_context: <context>
sdd_capability: <capability>
sdd_version: 0.0.0
---

# <context> / <capability>

> The current truth. Every requirement below is true of the system as it is
> now. Changes arrive as deltas under `changes/` and are merged here by
> `scripts/merge_delta.py` at `sdd-finish`. Never edited by hand.
>
> Cite a requirement as `<context>.<capability>/REQ-NNN` and a scenario as
> `<context>.<capability>/REQ-NNN/Sk`. IDs are never reused: a removed
> requirement stays, struck through, with the change that removed it.

## Purpose

<one paragraph>

## Requirements

## Invariants

| Invariant (from docs/domain.md) | Guarded by requirements |
|---|---|

## History

| Version | Date | Change | Added | Modified | Removed |
|---|---|---|---|---|---|
