---
type: Interview Record
title: <phase> — interview record
description: Every question asked in the <phase> interview, the recommendation offered, and the user's answer in their own words — so the reasoning behind <artefact> is never only in a chat window.
resource: /docs/interviews/<phase>.md
status: draft
tags: [sdd, interview, "phase:<phase>"]
sources:
  - resource: conversation:YYYY-MM-DD
generated:
  by: claude-code/unknown
  at: YYYY-MM-DDTHH:MM:SSZ
verified: []
sdd_phase: open           # open | closed
---

# Interview record — <phase>

> Written as the interview happens, one block per question, in the same
> shape `grill` uses for an intent. The artefact this interview produced is
> the summary; this file is the evidence. Recommendations the user overrode
> are the most valuable lines here: they are the places the agent would have
> got it wrong.
>
> Blocks are appended, never edited. A question asked again in a later
> session gets a new block that names the earlier one.

**Produced:** `<artefact path>`

## Questions

### Q1: <the question>
**Recommended:** <what the agent proposed, and why, in one or two lines>
**Answer:** <the user's words, verbatim or near it>
**Status:** decided | open | assumed
**Became:** <where in the artefact this landed: section, article, row>

## Not asked

> Questions the interview deliberately skipped, and why (already decided in
> `docs/decisions.md`, out of scope, deferred to a later phase). Each is a
> line. This is what a future reader checks before re-asking.

-
