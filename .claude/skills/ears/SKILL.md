---
type: Skill
name: ears
description: EARS (Easy Approach to Requirements Syntax) reference for writing unambiguous, testable requirements, and how each maps to Given/When/Then scenarios. Use whenever writing, reviewing or correcting a requirement or acceptance criterion, whenever a requirement reads vaguely, and whenever the words "requirement", "acceptance criteria", "EARS" or "SHALL" come up.
---

# EARS notation

A constrained sentence is a more reliable instruction to a literal machine than a
fluent paragraph. EARS constrains English into **trigger, condition, system,
response** — you cannot write a valid EARS requirement without naming all of
them, which is exactly the ambiguity that causes agents to drift.

`SHALL` is mandatory. Never `should`, `must`, `will`, `can` or `may`.
Keywords are uppercase. One requirement per statement.

## The five patterns

**1. Ubiquitous** — always true, no precondition.

```
THE SYSTEM SHALL store all passwords hashed with Argon2id
```

**2. Event-driven** — a trigger causes a response. `WHEN`.

```
WHEN a user submits the login form
THE SYSTEM SHALL validate the credentials and return a signed session token
```

**3. State-driven** — true for as long as a state holds. `WHILE`.

```
WHILE a payment is being processed
THE SYSTEM SHALL disable the submit button and display a progress indicator
```

**4. Unwanted behaviour** — error and edge handling. `IF … THEN`.

```
IF the payment provider returns a non-2xx response
THEN THE SYSTEM SHALL retain the cart, display the provider's failure reason,
and record the attempt without charging the customer
```

**5. Optional feature** — scoped to a configuration. `WHERE`.

```
WHERE two-factor authentication is enabled for the account
THE SYSTEM SHALL require a valid TOTP code before establishing a session
```

Patterns compose, in this order: `WHERE … WHILE … WHEN … IF … THEN THE SYSTEM SHALL …`
Compose sparingly — three keywords in one sentence usually means two requirements.

## Writing them

Each requirement gets a stable ID, an EARS sentence, and checkable criteria:

```markdown
### REQ-004: Login rate limiting

WHEN a client submits credentials
THE SYSTEM SHALL validate them and return a signed session token

**Acceptance criteria**
- [ ] Returns 401 on invalid credentials, with an identical response body and
      timing for "unknown user" and "wrong password"
- [ ] Returns 429 after 5 failed attempts from one IP within 15 minutes
- [ ] Session token TTL is 7 days; refresh tokens are single-use
- [ ] Successful login resets the failure counter for that IP
```

IDs never change once the spec is approved. A withdrawn requirement is struck
through in place, never deleted or renumbered. In this repository IDs are
qualified when cited from outside the spec: `<context>.<capability>/REQ-004`,
scenario `<context>.<capability>/REQ-004/S2`.

## Fixing bad requirements

| Instead of | Write |
|---|---|
| The system should be fast | WHEN a search is submitted THE SYSTEM SHALL return the first page of results within 300 ms at p95 |
| Handle errors gracefully | IF the upstream request times out THEN THE SYSTEM SHALL retry twice with exponential backoff and, on final failure, return 503 with a `Retry-After` header |
| Users can manage their profile | Three separate event-driven requirements: view, edit, delete — each with its own criteria |
| The UI should be intuitive | Not a requirement. Either a measurable target (task completion under N seconds in testing) or a note. |
| Data must be secure | Not a requirement. Decompose: at rest, in transit, access control, audit — one each. |
| Support many users | WHILE 10,000 sessions are active THE SYSTEM SHALL sustain 500 writes per second with p99 latency under 1 s |

## Review checklist

Run this over every requirement before a spec goes to a gate:

- [ ] Uses `SHALL`, and only `SHALL`
- [ ] Matches exactly one of the five patterns (or a deliberate composition)
- [ ] Names a single actor — "the system", or a specific named component
- [ ] Describes observable behaviour, not internal mechanism
- [ ] Contains no technology, library, or schema name
- [ ] Every number in it is a real number, not "fast", "several", "large"
- [ ] Could be turned into a test by someone who has not read the rest of the spec
- [ ] Has a matching unwanted-behaviour requirement, or a stated reason it needs none
- [ ] Is not two requirements joined by "and"

## EARS and scenarios

EARS states the rule; a scenario is one concrete example that proves it.
Every requirement has at least one scenario, usually one per path:

```
WHEN a client submits credentials
THE SYSTEM SHALL validate them and return a signed session token

REQ-004/S1 — valid credentials produce a session
  Given user "ada" exists with password "correct-horse"
  When "ada" submits password "correct-horse" from 203.0.113.9
  Then the response is a session token valid for 7 days

REQ-004/S2 — fifth failure in 15 minutes is rate-limited
  Given four failed attempts from 203.0.113.9 in the last 14 minutes
  When a fifth attempt arrives from 203.0.113.9
  Then the response is 429 with Retry-After 60
```

Mapping: the EARS trigger (`WHEN`) is the scenario's **When**; the EARS
precondition (`WHILE`/`WHERE`/`IF`) is the **Given**; the `SHALL` clause is
the **Then**. Ubiquitous requirements (invariants) get a scenario per way the
rule could be broken. A scenario's Then is always observable from outside the
context — see the `bdd` skill.

## Provenance

EARS was published by Alistair Mavin et al. (Rolls-Royce, 2009) for aerospace
requirements. It was adopted for agent work because a notation designed to remove
ambiguity for human readers turns out to be precisely what a model needs in order
not to guess. AWS Kiro generates its acceptance criteria in EARS by default.
