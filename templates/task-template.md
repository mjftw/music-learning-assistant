---
type: Task
title: CNNN_T0NN — <one outcome>
description: One task of NNN-slug, executed from its brief alone.
resource: /changes/NNN-slug/tasks/CNNN_T0NN.md
status: draft
tags: [sdd, task, "change:NNN-slug"]
sources:
  - resource: /changes/NNN-slug/plan.md
generated:
  by: claude-code/unknown
  at: YYYY-MM-DDTHH:MM:SSZ
sdd_id: NNN-slug
sdd_task: CNNN_T0NN
sdd_phase: todo           # todo | in-progress | done | parked — set with scripts/task.sh, never by hand
sdd_requirements: []      # qualified: [<context>.<capability>/REQ-001, …]
sdd_depends_on: []        # tasks whose Produces this task Consumes: [CNNN_T010, CNNN_T011]
sdd_parked_on:            # D003 when parked
sdd_group: "<phase or group name>"
sdd_parallel: false       # true: independent of its neighbours, may run alongside them
sdd_attempts: 0
---

# CNNN_T0NN · <one outcome>

**Files**
- Create: `<exact path>`
- Modify: `<exact path>:<lines or symbol>`
- Test: `<exact path>`

**Interfaces**
- Consumes: <exact signatures from earlier tasks, naming them: `fn x(a: A) -> B` (CNNN_T010)>
- Produces: `<exact signature this task exposes>` — <one line on semantics>

**Steps**
- [ ] 1. RED — scenario <context>.<capability>/REQ-00X/S1: write the failing test, named after the scenario, through the published interface (the actual test code):
  ```
  <test code>
  ```
- [ ] 2. Run `<exact command>` — expect FAIL: `<exact expected failure>`
- [ ] 3. GREEN — <the smallest implementation, described concretely or as code>
- [ ] 4. Run `<same command>` — expect PASS. Run `<check command>` — green.
- [ ] 5. REFACTOR — <specific cleanup, or "none">

**Verify** — `<exact command>` → `<exact expected output or observation>`
