@AGENTS.md

<!--
Claude Code reads CLAUDE.md, not AGENTS.md. The import above is the bridge, so
AGENTS.md stays the single source of truth for every agent.

Claude-specific additions only below this line. Anything that applies to all
agents belongs in AGENTS.md.
-->

## Claude-specific

- When grilling, ask one question at a time unless I say otherwise.
- Use `AskUserQuestion` for gate approvals and for any question with a small
  set of discrete answers. Always include your own recommended answer as the
  first option, marked `(Recommended)`.
- Subagents: `implementer`, `task-reviewer` and `reviewer` live in
  `.claude/agents/`. Spawn them with the Agent tool; do not do their jobs
  inline. Their model tiers are the ladder in the `sdd` skill.
- When a `[sdd]` line at the top of a turn says a phase is open, invoke
  `sdd-continue` before anything else. It moves the turn to Fable.
- Keep a task list for anything that runs past three steps.
