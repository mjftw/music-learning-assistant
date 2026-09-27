---
type: Skill
name: sdd-design
description: Interface design for a product built with agents — the principles interview at init, the "do we have a design?" decision tree and wireframes before a proposal is written, the design-system half of docs/design.md at the first plan, and the gate-free refinement loop on the live build with its exit procedure. Use when a change adds or alters a screen, when the user says "design", "mockup", "wireframe", "what should it look like", "it looks awful", "make it feel right", or when docs/design.md is missing or unresolved. Skipped entirely when docs/design.md says the product has no interface.
model: fable
---

# Design

Four entry points, at four moments. Each is short; read only the one you are
at. The thread through all of them: **exploration has no gates, commitments
do.** A round of the loop is exploration. The exit of the loop, the
principles, and the promoted tokens are commitments and go through the user
like everything else.

Two rules that hold everywhere:

- **A design artefact is a spec, never a source.** The implementer builds
  the real screen in the real stack against the wireframe or reference; it
  never copies wireframe HTML into the app.
- **Nothing visual before the first plan is technology.** Principles,
  wireframes and walkthroughs say what is on the screen and how it behaves;
  tokens and stack choices arrive at the plan.

`docs/design.md` is owned here. It is hook-protected; the unlock file
`.sdd/unlock-design` exists only between an approval and the commit that
follows it.

---


## Model

Top of the ladder: this skill runs on Fable (`model: fable` above). First
thing, before any question: `./scripts/phase.sh show`. If it prints nothing,
run `./scripts/phase.sh enter sdd-design`; if it names a phase, leave it alone
(you were called from inside that phase). While the marker is set, every
turn starts with the `sdd-continue` skill, which keeps the interview on Fable
while the session default stays cheap. Writes to the artefacts this skill
owns are refused on any other model (`scripts/hooks/guard-paths.sh`); if a
write is refused, invoke `sdd-continue` and retry. If Fable is not available
to this account, stop and tell the user; do not carry on in a weaker model.

## The interview record

Every question this skill asks is written to `docs/interviews/design.md`
(from `templates/interview-template.md`; create it on the first question,
`sdd_phase: open`) as it is asked and answered: the question, the
recommendation you offered, the user's answer in their words, and where in
the artefact it landed. Questions you decided not to ask go under `## Not
asked` with the reason. When the gate passes, set `sdd_phase: closed` and
commit the record with the artefact. The artefact is the summary; the
record is why it says what it says.

## A. Principles — at `sdd-init`, after the product brief

Called by `sdd-init` step 3b. Also called by entry point B when a change
adds the first screen to a product whose `docs/design.md` still says
`sdd_interface: no` or `unknown`.

1. **One question:** "Does this product have an interface people look at?"
   Recommend from `docs/product.md`. If **no** (a library, a service, a
   CLI with plain output): `mkdir -p .sdd && touch .sdd/unlock-design`, set
   §1 to one line saying what kind of thing it is, `fm.py set docs/design.md
   sdd_interface no`, `approve.sh docs/design.md approved`, `rm -f
   .sdd/unlock-design`, `index.sh`. Done; every change skips design from
   here. (A terminal UI or an e-ink panel is **yes**.)
2. If **yes**, fill §1–§6 **one question at a time, recommendation first,
   the user's words recorded**:
   - §2 Situations: derive rows from the product brief's "who it is for"
     and constraints, then confirm each: device and distance, hands,
     attention. For each row propose the consequence ("phone on a music
     stand, hands on the instrument: large targets, nothing timed, readable
     at arm's length") and let the user correct it.
   - §3 Tone: offer three to five words drawn from the intent; ask what each
     rules out.
   - §4 Density: what is always visible, what is one tap away.
   - §5 Conventions: propose two to four rules that follow from §2–§4;
     each must be testable.
   - §6 Accessibility: recommend WCAG 2.1 AA as the floor plus any
     situation-specific additions from §2.
   - Taste: if the section is still `<taste>`, ask for likes and hates
     across all products, in one question; offer to save them to
     `~/.config/sdd/design-taste.md` for the next project.
3. **Gate.** Show §1–§6 and Taste. `AskUserQuestion`: *Approve* / *Revise*.
   On approval: unlock, `fm.py set` the frontmatter (`generated.*`,
   `sdd_interface yes`), `approve.sh docs/design.md principles`, remove the
   unlock, `index.sh`, append to `docs/decisions.md`
   (`<date> · design · <each convention> · <why>`), commit
   `docs(design): principles`.

No technology. No colours, no fonts, no component libraries. Those are §7–§9
and they are asked at the plan.

---

## B. Before the proposal — called by `sdd-specify`

Runs once per change, after `intent.md` is resolved and before a word of the
proposal is written. Its output is the proposal's `## Interface` table and
whatever is in `changes/<id>/design/`.

1. **Does design apply?** If `docs/design.md` has `sdd_interface: no`, write
   `none` under `## Interface` and return. If it is `unknown` (the product
   was initialised before this skill existed, or said no and this change
   adds a screen), run entry point A now, then continue.
2. **Does this change touch a screen?** From the intent: does any actor
   *see* something new or different? If not, `none`, return. Say so in one
   line.
3. **Do you already have a design for this?** `AskUserQuestion`, recommended
   first, chosen from the intent:
   - **Yes, import it** — ask for it: a Figma link, exported screens
     (PNG/PDF), a Claude Design artifact's HTML, a photo of a sketch. Copy
     files into `changes/<id>/design/` (a link goes into `rounds.md ›
     Origin` with a note on what it shows). Read every file. Then step 5.
   - **No, I'll make one elsewhere** — write `rounds.md › Origin` as
     `Source: external tool (<which>)`, list under `Files` exactly what to
     bring back and where (`design/<screen>.png` or `.html`, one per screen
     and state from the intent), and **stop the change here** with that note
     as the last line of the turn. The next session resumes at "import it";
     `sdd` routes here again when `rounds.md › Origin` says external and
     `design/` is still empty. Suggest Claude Design (fast for "show me four
     ways this could work") or Figma; either is fine, the repo does not care.
   - **No, wireframe it here** — step 4.
   - **Skip; no screen changes after all** — `none`, return.
4. **Wireframes.** Grey boxes, structure only, one file per screen, one
   `data-state` block per state:
   - `cp templates/wireframe.css changes/<id>/design/` (never edited).
   - For each screen, copy `templates/wireframe-template.html` to
     `design/<screen>.html` and lay out every state the intent implies:
     first-run/empty, the main state, each toggle or mode, error and
     unavailable states from the proposal's edge-case rows. Use the
     glossary's words for labels. Annotate with `.wf-note` what boxes
     cannot say.
   - `python3 scripts/design_snapshot.py changes/<id> wireframes` and **look
     at every screenshot** (Read the PNGs). Fix what is wrong before showing
     the user. A state that renders all states at once, text that overflows,
     a control that does not exist in the intent: fix, re-snapshot.
   - Show the user the screenshots (paths) and ask, one screen at a time:
     "Is anything missing, wrong, or not needed?" Change the HTML as they
     say. No gate; this is exploration. Two or three passes is normal.
   - `rounds.md › Origin`: `Source: wireframed here`, list the files.
5. **The walkthrough.** With the design in hand (imported or wireframed),
   walk every scenario the intent implies across the screens, and write two
   lists into `rounds.md › Origin › Walkthrough`:
   - scenarios with no screen or state to happen on → each becomes a state
     (add it to the wireframe) or an out-of-scope line for the proposal;
   - things on a screen that no requirement asks for → each becomes a
     requirement or is removed from the design.
   Ask the user about each. This list is why design runs before the
   proposal: it is where the requirements the intent forgot are found.
6. **Fill `## Interface`** in `proposal.md`: one row per screen and state,
   `Route` blank (the plan fills it), `Design` pointing at the file and
   state, `Requirements seen here` blank for now — `sdd-specify` fills the
   citations as it writes the delta and must leave none empty.
7. `./scripts/check-design.sh --change changes/<id>` clean (it will say the
   citations are unchecked until the delta exists). Return to
   `sdd-specify`.

---

## C. System — at the first `sdd-plan` that touches a screen

Called by `sdd-plan` when the change's Interface is not `none` and
`docs/design.md` §7 is still the template.

1. The plan has just chosen the UI stack (from constraints, NFRs, domain,
   engineering §1/§14, and what the repo uses, in that order — `sdd-plan ›
   Choosing the stack`). Record it in §7. Recommend, one question each:
   components (library or hand-rolled, and why), how styles are written,
   where the tokens file lives.
2. **Tokens, §8.** Propose a minimal set from §3 tone, §6 accessibility and
   Taste: one type scale, spacing scale, radii, a palette of at most five
   roles (paper, ink, muted, accent, danger) with contrast checked against
   §6, motion durations. The user changes or accepts. **This is the first
   moment colour exists in the project.** Keep it small; the loop will add
   what it needs.
3. Set `STYLE_GLOB` / `TOKENS_FILE` at the top of
   `scripts/check-design.sh` (or export `SDD_STYLE_GLOB` /
   `SDD_TOKENS_FILE` in `AGENTS.md › Commands`) to the chosen layout.
4. Fill the `Route` column of the change's Interface table now that the
   plan has routes.
5. **Gate** with the plan's own gate (one approval covers both). On
   approval: unlock, write §7–§8, `fm.py set docs/design.md sdd_version
   1.0.0`, `approve.sh docs/design.md approved`, remove the unlock. Commit
   with the plan.

Later plans read §7–§9 and follow them; a departure is an open question in
the plan, like an engineering departure.

---

## D. The refinement loop — after the tasks are done, before converge

Called by `sdd-implement` when every task is `done` and the change's
Interface is not `none`; or directly, for a `--design` change (a change
whose only purpose is to make shipped screens feel right); or whenever the
user says the interface is wrong.

**This is where the design actually happens.** The build so far is correct
and grey. From here on the real app is the prototype, the user is the
judge, and the only record is `rounds.md`.

### Setup

- Dev server running (`AGENTS.md › Commands › run`); note the base URL.
- `python3 scripts/design_snapshot.py changes/<id> live --base <url>`;
  Read every PNG. Compare each against its wireframe or imported reference
  for **structure** (elements present, order, states reachable). Fix any
  structural miss first; that is a bug, not a design question.
- Tell the user where to look: the real device and situation from
  `docs/design.md` §2, not the screenshot. "Put it on the stand and pick a
  key."

### A round

1. The user says what is wrong, in their words. Write it as `Problem`.
2. Propose **up to three treatments**, each one line, each different in
   kind (not three shades of one idea). Implement them behind a temporary
   `?variant=a|b|c` switch so all are live at once. Use tokens from
   `docs/design.md` §8; if a treatment needs a value that is not a token,
   say so — it becomes a token at exit or is dropped.
3. `design_snapshot.py … live --base <url> --variants a,b,c`. Read the PNGs
   yourself first: discard a variant that is plainly broken before the user
   sees it. Then give the user the paths and the URLs.
4. The user chooses, or mixes, or rejects all. Record `Chose` and `Rejected
   because` in their words. `./scripts/record.sh changes/<id> design-round N`
   keeps this round's screenshots, the rejected ones included, under
   `design/rounds/round-N/`; link them from the round's block so "rejected
   because cramped" has the picture next to it. Remove the switch; keep the
   winner. Commit `design(<id>): round N — <one line>`.
5. **Requirement changed?** If the round altered behaviour rather than
   appearance ("the names toggle is a long-press now"), that is a
   requirement change: write it to the delta (ADDED or MODIFIED) now, note
   it in the round, and say so out loud. Never let behaviour drift into the
   log without reaching the delta.
6. Next round, or exit.

No gate per round. No `approve.sh`. Keep rounds small and fast: one
problem, three treatments, one choice. If a round wants to redo the
structure, stop and ask whether the wireframe was wrong; that may be a
walkthrough problem, not a taste problem.

### Exit — when the user says it is done

1. `python3 scripts/design_snapshot.py changes/<id> reference --base <url>`
   — one reference per Interface row, into `design/reference/`.
2. **Promote.** From the rounds, list every value and pattern that won:
   values become rows in `docs/design.md` §8, patterns rows in §9 with the
   change and reference named. Show the list. `AskUserQuestion`: *Promote
   all* / *Choose*. Unlock, write, bump `sdd_version` (MINOR), append to
   the Refinement log, `approve.sh docs/design.md approved`, remove the
   unlock.
3. Re-run `./scripts/check-design.sh` — hard-coded values that the loop
   left in the styles are either promoted or fixed now.
4. Write `rounds.md › Exit`; `fm.py set changes/<id>/design/rounds.md
   sdd_phase exited`; `./scripts/check-design.sh --change changes/<id>`
   must be clean (every row has its reference).
5. Commit `design(<id>): exit — <N> rounds, <M> tokens promoted`.
   `./scripts/phase.sh leave`, then hand to `sdd-converge`, whose fidelity pass compares the shipped screens to these
   references.

---

## Model

Entry points A–D run in the main session on Fable (see Model above): A and B are judgement about the product; C is taste with
constraints; D reads screenshots and proposes treatments, and a weak model
here produces the "technically correct and awful" result this skill exists
to prevent. The implementer subagent still builds the screens from the
tasks; it is never asked to design them.

## Never

- Ask for colours, fonts or component libraries before the first plan.
- Approve a round. Rounds are exploration; only the exit is a commitment.
- Let a round change behaviour without writing the delta.
- Copy wireframe HTML into the application.
- Style with a value that is not a token once `docs/design.md` is approved,
  without a line in `notes.md` saying why.
- Judge a screen from the screenshot alone when the user has a device; the
  screenshot is for the record and for you, the device is for them.
- Edit `docs/design.md` outside this skill or without the unlock.
