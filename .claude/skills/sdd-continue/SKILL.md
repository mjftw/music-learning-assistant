---
type: Skill
name: sdd-continue
description: Switch the current turn to the strong model and carry on the open top-of-ladder phase. Invoked at the start of each turn while .sdd/phase is set; the phase-model hook says when. Not for starting a phase — invoke the phase's own skill for that.
model: fable
---

# Continue the open phase

This turn now runs on the strong model. That is all this skill does.

1. `./scripts/phase.sh show` names the open phase.
2. If that phase's skill is still in your context, carry on from where it
   left off: the next question, the next section, the gate. Do not reload it.
   If it is not in your context (a new session, or it was compacted away),
   invoke that skill now and resume from the artefacts on disk, which record
   what has been answered.
3. Never restart the phase and never re-ask a question the artefacts or
   `docs/decisions.md` already answer.
4. If the user's message is not about this phase, say so in one line, run
   `./scripts/phase.sh leave`, and handle the message normally.
