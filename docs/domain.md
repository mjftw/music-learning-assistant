---
type: Domain Map
title: Domain map
description: The bounded contexts of this product, what each owns, the events between them, and the invariants each protects.
resource: /docs/domain.md
status: draft
tags: [sdd, domain]
sources:
  - resource: conversation:2026-09-19
  - resource: /docs/product.md
generated:
  by: claude-code/unknown
  at: 2026-09-19T14:48:18Z
verified: []
sdd_phase: draft          # draft | approved
---

# Domain map

> The product divided into **bounded contexts**: areas that each own one model
> and one vocabulary. Code layout mirrors this map one-to-one. A slice belongs
> to exactly one context. Contexts talk through the events and interfaces
> listed here and in no other way — `scripts/check-contexts.sh` enforces it.
>
> Keep this short. A context that cannot be described in two lines is two
> contexts. Three to seven contexts is normal for a product; one is fine for a
> small one.

## Contexts

| Context | Owns (the nouns) | Responsible for (the verbs) | Not responsible for | Code root |
|---|---|---|---|---|
| `<name>` | | | | `src/<name>/` |

## Relationships

> Direction and mechanism only. Upstream publishes; downstream consumes and
> translates at its own boundary (anti-corruption). No context imports another
> context's internals.

| Upstream | Downstream | Mechanism | Translation needed? |
|---|---|---|---|
| `<ctx>` | `<ctx>` | event `<Name>` / interface `<name>` | |

## Events

> Past tense. Named in the upstream context's language. Schema-first — the
> schema is the contract (see engineering §8). One row per event.

| Event | Emitted by | Consumed by | Carries | Schema |
|---|---|---|---|---|
| `<NounVerbed>` | `<ctx>` | `<ctx>` | | `<path>` |

## Invariants

> The rules that must hold at all times inside a context. Each becomes an
> EARS ubiquitous requirement and at least one scenario/property test. The
> thing that guards an invariant is that context's aggregate — we name the
> rule, not the pattern.

| Context | Invariant (one sentence, testable) | Guarded by |
|---|---|---|
| `<ctx>` | | `<the noun that owns it>` |

## Shared

> Things deliberately used across contexts unchanged. Keep this nearly empty;
> each row is a coupling.

-

## Open questions

| # | Question | Recommended answer |
|---|---|---|
