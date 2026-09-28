import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type JSX,
} from "react";
import type { NoteJudged, TunerSnapshot } from "../practice/published";
import type { NoteRange, SpellingPreference } from "../theory/published";
import { TargetPill } from "./TargetPill";
import { TargetSheet } from "./TargetSheet";
import { fonts, paper } from "./theme";
import {
  prefersReducedMotion,
  type SilenceMode,
  type StaleReading,
} from "./tuner-silence";
import { TunerLevel } from "./TunerLevel";
import { TRAIL_MS, TunerStave, type TrailPoint } from "./TunerStave";

// Real defaults for the trail's injectable clock and frame scheduler
// (practice.tuner/REQ-005/S5, S6) — wrapped rather than passed by reference
// so neither depends on being called with `this === performance`/`window`.
function defaultNow(): number {
  return performance.now();
}
function defaultRequestFrame(callback: FrameRequestCallback): number {
  return requestAnimationFrame(callback);
}
function defaultCancelFrame(handle: number): void {
  cancelAnimationFrame(handle);
}

// design-loop variant (007 round 4) — the silence treatments' own
// injectable timer (the moments that need JavaScript: removing a fade's
// elements once it has ended, starting linger's fade after its hold), in
// the same spirit as now/requestFrame/cancelFrame above: real setTimeout/
// clearTimeout by default, a fake, advanceable one in tests
// (manualAnimationClock's own setTimer/clearTimer).
function defaultSetTimer(callback: () => void, delayMs: number): number {
  return window.setTimeout(callback, delayMs);
}
function defaultClearTimer(handle: number): void {
  window.clearTimeout(handle);
}

// design-loop variant (007 round 4) — the durations named, not inlined
// (docs/design.md-style constants). FADE_MS is a's own fade; LINGER_MS and
// LINGER_FADE_MS are b's hold and its own fade. "Play a note"'s own entrance
// (EMPTY_FADE_IN_MS) is named in TunerLevel.tsx, the only place that reads
// it in a style — this file only decides *when* that entrance starts
// (`emptyOpacity`, below), via the same setTimer it schedules the fades with.
const FADE_MS = 600;
const LINGER_MS = 1000;
const LINGER_FADE_MS = 400;

// design-loop variant (007 round 4) — the silence view's own phase: "live"
// while a reading sounds (or nothing has ever been heard), "stale" while
// the last reading lingers (fading or ghosted — the values here are exactly
// StaleReading minus its `reading`, which comes from staleReadingRef,
// below), "empty" once nothing more is shown ("Play a note"; `enteredViaTimer`
// marks the transition a's/b's own fade-completion timer drove, the one
// that gets its own 200 ms entrance).
type SilencePhase =
  | { readonly kind: "live" }
  | {
      readonly kind: "stale";
      readonly dataState: "fading" | "ghost";
      readonly opacity: number;
      readonly grey: boolean;
      readonly transitionMs: number | null;
    }
  | { readonly kind: "empty"; readonly enteredViaTimer: boolean };

function appendTrailPoint(
  trail: readonly TrailPoint[],
  reading: NoteJudged,
  atMs: number,
  runId: number,
): readonly TrailPoint[] {
  return prunedByAge([...trail, { reading, atMs, runId }], atMs);
}

// Drops points older than TRAIL_MS relative to `nowMs` — called both when
// a fresh reading is appended (bounding the trail's memory while sounding)
// and on every silent render (this is what lets the animation stop: once
// this returns `[]` there is nothing left to re-draw).
function prunedByAge(
  trail: readonly TrailPoint[],
  nowMs: number,
): readonly TrailPoint[] {
  return trail.filter((point) => nowMs - point.atMs <= TRAIL_MS);
}

// The header row — copied verbatim from the vendored visual reference
// (changes/007-hear-me/design/Tuner.dc.html, frame #4a, markup lines
// 131-141) — named here rather than re-derived by eye.
const HEADER_ROW_PADDING = "14px 16px 2px";
const HEADER_ROW_GAP = 10;

const BACK_PILL_GAP = 8;
const BACK_PILL_PADDING = "7px 13px 7px 11px";
const BACK_PILL_BORDER = paper.border;
const BACK_PILL_BACKGROUND = paper.card;

const CHEVRON_FONT_SIZE = 15;
const CHEVRON_COLOR = paper.mutedMore;
const CHEVRON_GLYPH = "‹";

const LABEL_FONT_SIZE = 13;
const LABEL_FONT_WEIGHT = 600;

const INDICATOR_GAP = 7;
const INDICATOR_FONT_SIZE = 10.5;
const INDICATOR_FONT_WEIGHT = 600;
const INDICATOR_LETTER_SPACING = "0.08em";

const DOT_SIZE = 8;
const DOT_BORDER_WIDTH = 1.5;

// The indicator's two states (practice.tuner/REQ-001, REQ-007) — the
// reference's script-side `micInk`/`micDot`/`micRing` values, listed once
// here rather than inline per branch.
const LISTENING_INK = paper.muted;
const LISTENING_DOT = paper.accent;
const LISTENING_RING = paper.accent;
const NO_MIC_INK = paper.faint;
const NO_MIC_DOT = "transparent";
const NO_MIC_RING = paper.faint;

// The "Can't hear" card (practice.tuner/REQ-007) — geometry and text copied
// verbatim from the vendored visual reference (Tuner.dc.html, the
// `cannotHear` sc-if at markup lines 169-172): absolutely positioned over
// the level/strip/target row rather than replacing them (REQ-007's own
// text: "visible, non-interrupting, no modal" — the level, strip and
// footer stay drawn underneath, S1).
const CARD_TOP = 440;
const CARD_SIDE = 16;
const CARD_PADDING = "13px 16px 14px";
const CARD_RADIUS = 14;
const CARD_GAP = 5;
const CARD_TITLE_FONT_SIZE = 14;
const CARD_BODY_FONT_SIZE = 12.5;
const CARD_BODY_LINE_HEIGHT = 1.45;
const CARD_TITLE_TEXT = "Can't hear — no microphone";
const CARD_BODY_TEXT =
  "It was refused or isn't there. Allow the microphone for this site, then go back and open the tuner again.";

// The footer (practice.tuner/REQ-002/S5, REQ-007) — geometry copied
// verbatim from the reference (Tuner.dc.html markup lines 282-287). The
// ♯/♭ segmented control writes the same `selection.spelling` the circle's
// own toggle does (App.tsx's `onSpellingChange` — `handleSelectSpelling`),
// so it carries the circle's own accessible names, "sharp"/"flat"
// (CircleOfFifths.tsx lines 808-840), not "Sharp spelling"/"Flat spelling"
// — one preference, one pair of names — and the same `aria-pressed`
// pattern.
const FOOTER_PADDING = "14px 16px 20px";
const FOOTER_GAP = 10;
const FOOTER_TEXT_FONT_SIZE = 10.5;
const FOOTER_TEXT_LETTER_SPACING = "0.02em";
const FOOTER_TEXT = "A4 = 440 Hz · in tune ±5 ¢";

// Border and inactive ink copied from CircleOfFifths.tsx's own
// PILL_BORDER/PILL_INACTIVE_INK (not named `paper` tokens there either) so
// the two segmented controls read as the same control.
const SPELLING_PILL_BORDER = "#e0d7c5";
const SPELLING_BUTTON_PADDING = "4px 13px 6px";
const SPELLING_BUTTON_FONT_SIZE = 14;
const SPELLING_BUTTON_LINE_HEIGHT = 1.2;
const SPELLING_ACTIVE_BG = paper.pillActive;
const SPELLING_ACTIVE_INK = paper.inkMid;
const SPELLING_INACTIVE_INK = "#756c60";
const SHARP_GLYPH = "♯";
const FLAT_GLYPH = "♭";

// the spiral's needle trail: the newest 50 readings of the current run
const SPIRAL_TRAIL_READINGS = 50;

// practice.tuner/REQ-001 — "LISTENING" covers both "starting" (the
// microphone has been asked for but capture has not begun yet) and
// "listening" itself; only "cannot-hear" reads "NO MIC" (REQ-007). The
// screen is never shown while "off" outlives the render that opens it
// (App only renders this once `session.enterTuner()` has run), so that
// state never reaches here in practice.
function isListening(tuner: TunerSnapshot): boolean {
  return tuner.listening.kind !== "cannot-hear";
}

// The way in and out's shell (practice.tuner/REQ-001) — the header row
// (‹ Practice, the LISTENING/NO MIC indicator) plus the structural areas
// later tasks fill in: the level (T015), the stave strip (T016), the
// target row (T017) and the footer (T018). Empty now.
function TunerScreenComponent(props: {
  readonly tuner: TunerSnapshot;
  readonly spelling: SpellingPreference;
  readonly range: NoteRange;
  readonly onLeave: () => void;
  readonly onHold: () => void;
  readonly onPin: (position: number) => void;
  readonly onStep: (delta: -1 | 1) => void;
  readonly onClear: () => void;
  readonly onSpellingChange: (preference: SpellingPreference) => void;
  readonly onReadingShown: (atFrame: number) => void;
  // practice.tuner/REQ-005/S5, S6 — the injectable clock/frame scheduler;
  // all optional with real defaults so a test can drive the trail's ageing
  // without depending on wall-clock time, and production code never has to
  // pass any of them.
  readonly now?: () => number;
  readonly requestFrame?: (callback: FrameRequestCallback) => number;
  readonly cancelFrame?: (handle: number) => void;
  // design-loop variant (007 round 4) — the silence treatment; "cut" (today's
  // behaviour) by default. setTimer/clearTimer are the treatments' own
  // injectable timer, real setTimeout/clearTimeout by default.
  readonly silence?: SilenceMode;
  readonly setTimer?: (callback: () => void, delayMs: number) => number;
  readonly clearTimer?: (handle: number) => void;
  // design-loop variant (007 round 4, follow-up 2) — the linger treatment's
  // own hold/fade durations, in place of LINGER_MS/LINGER_FADE_MS, so the
  // switch can offer several timings of the same treatment side by side.
  readonly lingerMs?: number;
  readonly lingerFadeMs?: number;
}): JSX.Element {
  const {
    tuner,
    spelling,
    range,
    onLeave,
    onHold,
    onPin,
    onStep,
    onClear,
    onSpellingChange,
    onReadingShown,
    now = defaultNow,
    requestFrame = defaultRequestFrame,
    cancelFrame = defaultCancelFrame,
    silence = "cut",
    setTimer = defaultSetTimer,
    clearTimer = defaultClearTimer,
    lingerMs = LINGER_MS,
    lingerFadeMs = LINGER_FADE_MS,
  } = props;
  const listening = isListening(tuner);
  const cannotHear = tuner.listening.kind === "cannot-hear";
  const sharpSelected = spelling === "sharp";

  // practice.tuner/REQ-004/S6 — the Target sheet's open/closed state is
  // local to this screen: opening or closing it never touches the session.
  // Hold, Auto and a spiral wedge each close the sheet as they pin/clear the
  // target (the vendored reference's own `pickAuto`/`holdNote`/wedge `pick`,
  // each `sheet: false` alongside its target change) — composed here rather
  // than in TargetSheet, which only knows the handlers it was given.
  const [targetSheetOpen, setTargetSheetOpen] = useState(false);
  const handleOpenTarget = useCallback(() => setTargetSheetOpen(true), []);
  const handleCloseTarget = useCallback(() => setTargetSheetOpen(false), []);
  const handleAuto = useCallback(() => {
    onClear();
    setTargetSheetOpen(false);
  }, [onClear]);
  const handleHold = useCallback(() => {
    onHold();
    setTargetSheetOpen(false);
  }, [onHold]);
  const handlePin = useCallback(
    (position: number) => {
      onPin(position);
      setTargetSheetOpen(false);
    },
    [onPin],
  );

  // The strip's trail (practice.tuner/REQ-005/S5, S6) — points of the last
  // TRAIL_MS, kept here (not in the session) so it is pure view state:
  // appended whenever `tuner.reading` becomes a genuinely new reading (a
  // fresh object each commit — domain/session.ts's `commitTunerReading`),
  // kept (not reset) on a gap ("Play a note" — REQ-003/S3) so it can carry
  // on ageing off the left edge, reset only by leaving the tuner (this
  // component unmounts, discarding the ref, since App only renders it while
  // `screen === "tuner"`). Mutated directly during render, not in an
  // effect, because the trail this render hands to TunerStave must already
  // include the reading this same render just received (while sounding) or
  // the age-pruning this same render must reflect (while silent).
  const trailRef = useRef<readonly TrailPoint[]>([]);
  const lastReadingRef = useRef<NoteJudged | null>(null);
  // Whether the *previous* render was silent — this is the run boundary:
  // a reading that arrives right after this was true starts a new run
  // (REQ-005/S6), never joined to whatever the trail already carried.
  // Starts `true` so the very first reading ever heard begins run 1.
  const wasSilentRef = useRef(true);
  const runIdRef = useRef(0);
  // The pending frame silence redraws with (below) — a ref, not state,
  // since scheduling it is a side effect, not something this render reads.
  const frameHandleRef = useRef<number | null>(null);
  const [, forceTrailRedraw] = useReducer((tick: number) => tick + 1, 0);

  let nowMs: number;
  if (tuner.reading === null) {
    wasSilentRef.current = true;
    lastReadingRef.current = null;
    nowMs = now();
    trailRef.current = prunedByAge(trailRef.current, nowMs);
  } else if (tuner.reading !== lastReadingRef.current) {
    const atMs = now();
    if (wasSilentRef.current) runIdRef.current += 1;
    wasSilentRef.current = false;
    lastReadingRef.current = tuner.reading;
    trailRef.current = appendTrailPoint(
      trailRef.current,
      tuner.reading,
      atMs,
      runIdRef.current,
    );
    nowMs = atMs;
  } else {
    // A re-render with nothing new while sounding — "now" stays the
    // newest point's own time (no animation while a note sounds).
    const newest = trailRef.current.at(-1);
    nowMs = newest === undefined ? now() : newest.atMs;
  }

  // practice.tuner/REQ-005/S5 — redraw the trail while it is still ageing
  // in silence, and only then: scheduled/cancelled after every render since
  // the condition depends on `trailRef.current`, a ref this render's own
  // pruning above just mutated, not on anything already tracked as a
  // dependency. Runs on the phone, on battery — never while a note sounds,
  // and stops for good once the trail has emptied.
  useEffect(() => {
    const shouldAnimate = tuner.reading === null && trailRef.current.length > 0;
    if (shouldAnimate) {
      if (frameHandleRef.current === null) {
        frameHandleRef.current = requestFrame(() => {
          frameHandleRef.current = null;
          forceTrailRedraw();
        });
      }
    } else if (frameHandleRef.current !== null) {
      cancelFrame(frameHandleRef.current);
      frameHandleRef.current = null;
    }
    return () => {
      if (frameHandleRef.current !== null) {
        cancelFrame(frameHandleRef.current);
        frameHandleRef.current = null;
      }
    };
  });

  // design-loop variant (007 round 4) — the silence treatment's own view
  // state: the last reading shown (never updated while it is fading or
  // ghosted — this only ever advances while `tuner.reading` is non-null,
  // mirroring `lastReadingRef` above but never reset to null by a gap, since
  // its whole point is to survive one), and the phase that drives what
  // TunerLevel/TunerStave render while `silence !== "cut"`.
  const staleReadingRef = useRef<NoteJudged | null>(null);
  if (tuner.reading !== null) {
    staleReadingRef.current = tuner.reading;
  }
  const [phase, setPhase] = useState<SilencePhase>({ kind: "live" });
  const silenceTimerRef = useRef<number | null>(null);
  const reducedMotion = prefersReducedMotion();

  useEffect(() => {
    if (silence === "cut") return;

    const clearPendingTimer = (): void => {
      if (silenceTimerRef.current !== null) {
        clearTimer(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };

    if (tuner.reading !== null) {
      // A live reading is shown at once — no fade in, nothing stale left
      // pending (practice.tuner "a, interrupted").
      clearPendingTimer();
      setPhase({ kind: "live" });
      return;
    }

    if (staleReadingRef.current === null) {
      // Silence before anything was ever heard — nothing to linger.
      setPhase({ kind: "empty", enteredViaTimer: false });
      return;
    }

    if (silence === "ghost") {
      // c — no timer at all: grey, held until the next reading or unmount.
      setPhase({
        kind: "stale",
        dataState: "ghost",
        opacity: 1,
        grey: true,
        transitionMs: null,
      });
      return;
    }

    if (silence === "fade") {
      // a — opacity 1 → 0 over FADE_MS, in its original colour.
      setPhase({
        kind: "stale",
        dataState: "fading",
        opacity: reducedMotion ? 1 : 0,
        grey: false,
        transitionMs: reducedMotion ? null : FADE_MS,
      });
      silenceTimerRef.current = setTimer(() => {
        silenceTimerRef.current = null;
        setPhase({ kind: "empty", enteredViaTimer: true });
      }, FADE_MS);
      return clearPendingTimer;
    }

    // b — grey at once, held lingerMs, then fades over lingerFadeMs
    // (design-loop variant, 007 round 4, follow-up 2 — the switch's own
    // timing per `?variant`, in place of the LINGER_MS/LINGER_FADE_MS
    // constants).
    setPhase({
      kind: "stale",
      dataState: "fading",
      opacity: 1,
      grey: true,
      transitionMs: null,
    });
    silenceTimerRef.current = setTimer(() => {
      setPhase({
        kind: "stale",
        dataState: "fading",
        opacity: reducedMotion ? 1 : 0,
        grey: true,
        transitionMs: reducedMotion ? null : lingerFadeMs,
      });
      silenceTimerRef.current = setTimer(() => {
        silenceTimerRef.current = null;
        setPhase({ kind: "empty", enteredViaTimer: true });
      }, lingerFadeMs);
    }, lingerMs);
    return clearPendingTimer;
    // `reducedMotion` is deliberately not a dependency: it's read fresh each
    // time this effect runs (whenever the reading or the mode itself
    // changes), and re-running the whole timer chain on every render were it
    // tracked (it isn't memoised) would restart an already-scheduled fade.
  }, [tuner.reading, silence, setTimer, clearTimer, lingerMs, lingerFadeMs]);

  // design-loop variant (007 round 4) — "Play a note"'s own entrance once a
  // fade (a or b) has finished (`enteredViaTimer`): starts at opacity 0,
  // flips to 1 one (fake-timer-injectable) tick later so the CSS transition
  // in TunerLevel has something to animate from. Reduced motion: appears at
  // once, no transition.
  const [emptyFadingIn, setEmptyFadingIn] = useState(false);
  const emptyTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (emptyTimerRef.current !== null) {
      clearTimer(emptyTimerRef.current);
      emptyTimerRef.current = null;
    }
    if (
      silence !== "cut" &&
      phase.kind === "empty" &&
      phase.enteredViaTimer &&
      !reducedMotion
    ) {
      setEmptyFadingIn(true);
      emptyTimerRef.current = setTimer(() => {
        emptyTimerRef.current = null;
        setEmptyFadingIn(false);
      }, 0);
    } else {
      setEmptyFadingIn(false);
    }
    return () => {
      if (emptyTimerRef.current !== null) {
        clearTimer(emptyTimerRef.current);
        emptyTimerRef.current = null;
      }
    };
  }, [phase, silence, reducedMotion, setTimer, clearTimer]);

  const stale: StaleReading | undefined =
    phase.kind === "stale" && staleReadingRef.current !== null
      ? {
          reading: staleReadingRef.current,
          dataState: phase.dataState,
          opacity: phase.opacity,
          grey: phase.grey,
          transitionMs: phase.transitionMs,
        }
      : undefined;

  const emptyOpacity: number | undefined =
    silence !== "cut" &&
    phase.kind === "empty" &&
    phase.enteredViaTimer &&
    !reducedMotion
      ? emptyFadingIn
        ? 0
        : 1
      : undefined;

  // Current run only, newest 50 readings; the spiral draws it only while
  // a note sounds (REQ-005/S6).
  const spiralTrail = trailRef.current
    .filter((point) => point.runId === runIdRef.current)
    .slice(-SPIRAL_TRAIL_READINGS)
    .map((point) => point.reading);

  // practice.tuner/REQ-006 — the paint is reported once per distinct
  // reading, right after React has committed it (useLayoutEffect, not
  // useEffect, so the report reflects this exact commit rather than a
  // later one); the dependency is the reading's own `atFrame`, not the
  // `NoteJudged` object, so two commits of the same reading (a re-render
  // with nothing new) report only once. No reading, nothing to report.
  const atFrame = tuner.reading?.atFrame;
  useLayoutEffect(() => {
    if (atFrame !== undefined) onReadingShown(atFrame);
  }, [atFrame, onReadingShown]);

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        flex: 1,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: HEADER_ROW_GAP,
          padding: HEADER_ROW_PADDING,
        }}
      >
        <button
          type="button"
          aria-label="Practice"
          onClick={onLeave}
          style={{
            display: "flex",
            alignItems: "center",
            gap: BACK_PILL_GAP,
            padding: BACK_PILL_PADDING,
            border: `1px solid ${BACK_PILL_BORDER}`,
            borderRadius: 999,
            background: BACK_PILL_BACKGROUND,
            color: paper.ink,
            whiteSpace: "nowrap",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              fontSize: CHEVRON_FONT_SIZE,
              color: CHEVRON_COLOR,
              marginTop: -2,
            }}
          >
            {CHEVRON_GLYPH}
          </span>
          <span
            style={{ fontSize: LABEL_FONT_SIZE, fontWeight: LABEL_FONT_WEIGHT }}
          >
            Practice
          </span>
        </button>
        <span
          data-testid="mic-indicator"
          style={{
            display: "flex",
            alignItems: "center",
            gap: INDICATOR_GAP,
            fontFamily: fonts.mono,
            fontSize: INDICATOR_FONT_SIZE,
            fontWeight: INDICATOR_FONT_WEIGHT,
            letterSpacing: INDICATOR_LETTER_SPACING,
            color: listening ? LISTENING_INK : NO_MIC_INK,
          }}
        >
          <span
            style={{
              width: DOT_SIZE,
              height: DOT_SIZE,
              borderRadius: 999,
              boxSizing: "border-box",
              background: listening ? LISTENING_DOT : NO_MIC_DOT,
              border: `${DOT_BORDER_WIDTH}px solid ${
                listening ? LISTENING_RING : NO_MIC_RING
              }`,
            }}
          />
          <span>{listening ? "LISTENING" : "NO MIC"}</span>
        </span>
      </div>
      <TunerLevel
        tuner={tuner}
        spelling={spelling}
        {...(stale !== undefined ? { stale } : {})}
        {...(emptyOpacity !== undefined ? { emptyOpacity } : {})}
      />
      <TargetPill
        tuner={tuner}
        onOpen={handleOpenTarget}
        onStep={onStep}
        onClear={onClear}
      />
      <div style={{ padding: "10px 16px 0" }}>
        <TunerStave
          tuner={tuner}
          trail={trailRef.current}
          nowMs={nowMs}
          {...(stale !== undefined ? { stale } : {})}
        />
      </div>
      {cannotHear && (
        <div
          data-testid="cannot-hear"
          style={{
            position: "absolute",
            left: CARD_SIDE,
            right: CARD_SIDE,
            top: CARD_TOP,
            padding: CARD_PADDING,
            background: paper.card,
            border: `1px solid ${paper.borderSoft}`,
            borderRadius: CARD_RADIUS,
            display: "flex",
            flexDirection: "column",
            gap: CARD_GAP,
          }}
        >
          <div style={{ fontSize: CARD_TITLE_FONT_SIZE, fontWeight: 600 }}>
            {CARD_TITLE_TEXT}
          </div>
          <div
            style={{
              fontSize: CARD_BODY_FONT_SIZE,
              lineHeight: CARD_BODY_LINE_HEIGHT,
              color: paper.muted,
            }}
          >
            {CARD_BODY_TEXT}
          </div>
        </div>
      )}
      <div
        style={{
          marginTop: "auto",
          padding: FOOTER_PADDING,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: FOOTER_GAP,
        }}
      >
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: FOOTER_TEXT_FONT_SIZE,
            letterSpacing: FOOTER_TEXT_LETTER_SPACING,
            color: paper.muted,
          }}
        >
          {FOOTER_TEXT}
        </div>
        <div
          style={{
            display: "flex",
            border: `1px solid ${SPELLING_PILL_BORDER}`,
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            aria-label="sharp"
            aria-pressed={sharpSelected}
            onClick={() => onSpellingChange("sharp")}
            style={{
              padding: SPELLING_BUTTON_PADDING,
              fontSize: SPELLING_BUTTON_FONT_SIZE,
              fontWeight: 600,
              lineHeight: SPELLING_BUTTON_LINE_HEIGHT,
              color: sharpSelected
                ? SPELLING_ACTIVE_INK
                : SPELLING_INACTIVE_INK,
              background: sharpSelected ? SPELLING_ACTIVE_BG : "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            {SHARP_GLYPH}
          </button>
          <button
            type="button"
            aria-label="flat"
            aria-pressed={!sharpSelected}
            onClick={() => onSpellingChange("flat")}
            style={{
              padding: SPELLING_BUTTON_PADDING,
              fontSize: SPELLING_BUTTON_FONT_SIZE,
              fontWeight: 600,
              lineHeight: SPELLING_BUTTON_LINE_HEIGHT,
              color: !sharpSelected
                ? SPELLING_ACTIVE_INK
                : SPELLING_INACTIVE_INK,
              background: !sharpSelected ? SPELLING_ACTIVE_BG : "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            {FLAT_GLYPH}
          </button>
        </div>
      </div>
      <TargetSheet
        open={targetSheetOpen}
        tuner={tuner}
        spelling={spelling}
        range={range}
        trail={spiralTrail}
        onClose={handleCloseTarget}
        onAuto={handleAuto}
        onHold={handleHold}
        onPin={handlePin}
      />
    </div>
  );
}

export const TunerScreen = memo(TunerScreenComponent);
