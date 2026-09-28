import { Fragment, type JSX } from "react";
import {
  IN_TUNE_BAND_CENTS,
  semitoneCountOf,
  type NoteJudged,
  type TunerSnapshot,
  type Verdict,
} from "../practice/published";
import {
  noteAtPosition,
  noteLabel,
  pitchClassLabel,
  pitchPosition,
  type Note,
  type SpellingPreference,
} from "../theory/published";
import { formatCents } from "./cents-label";
import { fonts, paper, tuner } from "./theme";
import { staleAttrs, type StaleReading } from "./tuner-silence";

// design-loop variant (007 round 4) — "Play a note"'s own entrance once a's
// or b's own fade has finished (TunerScreen's `emptyOpacity` prop, below).
const EMPTY_FADE_IN_MS = 200;

// Geometry below is copied verbatim from the vendored visual reference
// (changes/007-hear-me/design/Tuner.dc.html, frame #4a, markup lines
// 142-181, and the `level()` helper at lines 1130-1138: `L4 = level(536,
// lin(5.1), every5, [0, 10, 25, 50], dv)`) — named here rather than
// re-derived by eye or copied as markup.
const AREA_HEIGHT = 536;
const AREA_MID = AREA_HEIGHT / 2; // 268 — level()'s `mid`
const PX_PER_CENT = 5.1; // level()'s `lin(5.1)` map

const CENTRE_LINE_TOP = 267;
const CENTRE_LINE_HEIGHT = 2;

// The ±5 ¢ in-tune band, shaded — bandTop = mid - map(band), bandHeight =
// 2 * map(band).
const BAND_TOP = AREA_MID - IN_TUNE_BAND_CENTS * PX_PER_CENT; // 242.5
const BAND_HEIGHT = 2 * IN_TUNE_BAND_CENTS * PX_PER_CENT; // 51

// Ticks every 5 ¢; the three labelled radii (10, 25, 50) draw wider and
// taller than the rest, and carry a "+N"/"−N" label at the left edge.
const TICK_STEP_CENTS = 5;
const MAJOR_TICK_CENTS: readonly number[] = [10, 25, 50];
const MAJOR_TICK_WIDTH = 16;
const MAJOR_TICK_HEIGHT = 2;
const MINOR_TICK_WIDTH = 8;
const MINOR_TICK_HEIGHT = 1.5;
const TICK_LABEL_LEFT = 21;
const TICK_LABEL_FONT_SIZE = 10.5;
const TICK_LABEL_LINE_HEIGHT = "14px";

const HEADER_ROW_TOP = 4;
const HEADER_ROW_SIDE = { left: 56, right: 16 } as const;
const HALFWAY_GAP = 7;
const SHARP_FLAT_FONT_SIZE = 13;
const HALFWAY_LABEL_FONT_SIZE = 11.5;
const HALFWAY_NOTE_FONT_SIZE = 20;

const NAME_AREA_TOP = 183;
const NAME_AREA_HEIGHT = 170;
const NAME_FONT_SIZE = 164;
const OCTAVE_FONT_SIZE = 22;
const OCTAVE_MARGIN_TOP = 30;
const EMPTY_FONT_SIZE = 14;

// practice.tuner/REQ-007 — "'–' in place of the big name" while cannot-hear:
// unconditional, not a fallback for "nothing else to show" (Tuner.dc.html's
// `cannotHear` sc-if sits beside, not inside, `showName`'s). The dash's own
// colour, `paper.drawerBorder`, is the reference's `#d5cbb8`.
const DASH_INK = paper.drawerBorder;

// The line: lineTop = mid - map(cents) - 3.5, clamped to the rule's own
// ±50 ¢ — a pinned target beyond it stays at the edge.
const LINE_LEFT = 52;
const LINE_RIGHT = 24;
const LINE_HEIGHT = 7;
const LINE_RADIUS = 4;
const LINE_TOP_ADJUST = 3.5;
const LINE_CENTS_LIMIT = 50;

// The tag: tagTop = cents >= 0 ? lineTop - 36 : lineTop + 8.
const TAG_RIGHT = 24;
const TAG_ABOVE_OFFSET = 36;
const TAG_BELOW_OFFSET = 8;
const TAG_GAP = 6;
const TAG_PADDING = "2px 0";
const TAG_RADIUS = 6;
const TAG_CAPTION_FONT_SIZE = 12;
const TAG_CENTS_FONT_SIZE = 22;
const TAG_WORD_FONT_SIZE = 13;

const TONE_BY_VERDICT: Record<Verdict, string> = {
  sharp: tuner.sharp,
  flat: tuner.flat,
  "in-tune": tuner.inTune,
};

const WORD_BY_VERDICT: Record<Verdict, string> = {
  sharp: "sharp",
  flat: "flat",
  "in-tune": "in tune",
};

interface Tick {
  readonly cents: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly color: string;
  readonly label: string;
  readonly labelTop: number;
}

function buildTicks(): readonly Tick[] {
  const ticks: Tick[] = [];
  for (let cents = -50; cents <= 50; cents += TICK_STEP_CENTS) {
    const major = MAJOR_TICK_CENTS.includes(Math.abs(cents));
    const centreY = AREA_MID - cents * PX_PER_CENT;
    ticks.push({
      cents,
      top: centreY - (major ? 1 : 0.75),
      width: major ? MAJOR_TICK_WIDTH : MINOR_TICK_WIDTH,
      height: major ? MAJOR_TICK_HEIGHT : MINOR_TICK_HEIGHT,
      color: major ? paper.inkSoft : paper.faint,
      label: major && cents !== 0 ? formatCents(cents) : "",
      labelTop: centreY - 7,
    });
  }
  return ticks;
}

const TICKS = buildTicks();

// `AREA_MID - lineCents * PX_PER_CENT - LINE_TOP_ADJUST` at the pinned rule's
// own edge (lineCents = ±50 — practice.tuner/REQ-004) lands on a value like
// 9.500000000000028, not 9.5: PX_PER_CENT (5.1) has no exact binary
// representation, so `50 * 5.1` is already off by a sliver before the
// subtraction. Rounded to hundredths — far finer than a visible pixel, so
// nothing on screen moves — so the style's own `px` string reads "9.5px".
function roundPx(value: number): number {
  return Math.round(value * 100) / 100;
}

// The reading's line + tag, clamped to the rule's ±50 ¢ edge when a pinned
// target's offset runs past it (practice.tuner/REQ-004) — the line stays
// at the edge and the tag switches to "▲ N st" / "▼ N st".
function readingGeometry(reading: NoteJudged): {
  readonly lineTop: number;
  readonly tagTop: number;
  readonly tone: string;
  readonly primaryText: string;
  readonly wordText: string;
} {
  const cents = reading.cents;
  const lineCents = Math.max(
    -LINE_CENTS_LIMIT,
    Math.min(LINE_CENTS_LIMIT, cents),
  );
  const lineTop = roundPx(AREA_MID - lineCents * PX_PER_CENT - LINE_TOP_ADJUST);
  const tagTop =
    lineCents >= 0 ? lineTop - TAG_ABOVE_OFFSET : lineTop + TAG_BELOW_OFFSET;
  const tone = TONE_BY_VERDICT[reading.verdict];
  const over = Math.abs(cents) > LINE_CENTS_LIMIT;
  const primaryText = over
    ? `${cents > 0 ? "▲" : "▼"} ${semitoneCountOf(cents)} st`
    : formatCents(cents);
  const wordText = over ? "" : WORD_BY_VERDICT[reading.verdict];
  return { lineTop, tagTop, tone, primaryText, wordText };
}

export function TunerLevel(props: {
  readonly tuner: TunerSnapshot;
  readonly spelling: SpellingPreference;
  // design-loop variant (007 round 4) — `stale` is the last reading, still
  // shown fading or ghosted (`undefined` when nothing is: live, "cut", or
  // truly nothing to show); `emptyOpacity` drives "Play a note"'s own
  // entrance once a's/b's fade has ended (`undefined` outside that moment —
  // no style change, exactly today's behaviour).
  readonly stale?: StaleReading;
  readonly emptyOpacity?: number;
}): JSX.Element {
  const { tuner: snapshot, spelling, stale, emptyOpacity } = props;
  const reading = snapshot.reading;
  const cannotHear = snapshot.listening.kind === "cannot-hear";
  const targetPinnedSilent = snapshot.targetNote !== null && reading === null;

  // design-loop variant (007 round 4) — with a target pinned, the big name
  // always follows REQ-003/S2 below, unaffected by the silence treatment
  // (`staleForName` stays `undefined`); with none pinned, `stale` (when
  // present) stands in for the reading that just cleared, so the name
  // doesn't disappear on its own ahead of the line/tag/stave.
  const staleForName = !targetPinnedSilent ? stale : undefined;

  // The note the big name shows: the current reading's target (the
  // pinned note, or the nearest note with hysteresis) when there is one,
  // else the pinned target alone (practice.tuner/REQ-003/S2 — the target
  // stays shown, greyed, through a silence), else the stale reading's own
  // target while fading/ghosted.
  const referenceNote: Note | null =
    reading?.target ??
    (snapshot.targetNote !== null
      ? snapshot.targetNote
      : (staleForName?.reading.target ?? null));
  const referencePosition =
    referenceNote === null ? null : pitchPosition(referenceNote);
  const aboveLabel =
    referencePosition === null
      ? ""
      : noteLabel(noteAtPosition(referencePosition + 1, spelling));
  const belowLabel =
    referencePosition === null
      ? ""
      : noteLabel(noteAtPosition(referencePosition - 1, spelling));

  // practice.tuner/REQ-003 — greyed once a target is pinned but nothing is
  // currently heard; otherwise the normal ink, except while an unpinned
  // stale reading is greyed too (b, c — design-loop variant, 007 round 4).
  const nameInk = targetPinnedSilent
    ? paper.faint
    : staleForName !== undefined && staleForName.grey
      ? paper.faint
      : paper.ink;

  const nameStaleAttrs = staleAttrs(staleForName);

  // The "playing <heard note>" caption — only while pinned and the heard
  // note differs from the target (practice.tuner/REQ-004/S1, S3). Reads off
  // `effectiveReading` (design-loop variant, 007 round 4) so it fades/ghosts
  // with the rest of the tag rather than vanishing ahead of it.
  const effectiveReading = reading ?? stale?.reading ?? null;
  const captionText =
    effectiveReading !== null &&
    snapshot.target.kind === "pinned" &&
    pitchPosition(effectiveReading.heard.nearest) !==
      pitchPosition(effectiveReading.target)
      ? `playing ${noteLabel(effectiveReading.heard.nearest)}`
      : "";

  const geometry =
    effectiveReading === null ? null : readingGeometry(effectiveReading);
  // design-loop variant (007 round 4) — a's own fade keeps the verdict's own
  // colour (only opacity changes); b's/c's stale states grey it instead. Only
  // read when `geometry` is non-null (the line/tag's own render guard), so
  // the `paper.faint` fallback here is never actually shown.
  const displayTone = stale?.grey
    ? paper.faint
    : (geometry?.tone ?? paper.faint);
  const lineTagStaleAttrs = staleAttrs(reading === null ? stale : undefined);

  return (
    <div style={{ position: "relative", height: AREA_HEIGHT, flex: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: BAND_TOP,
          height: BAND_HEIGHT,
          background: tuner.band,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: CENTRE_LINE_TOP,
          height: CENTRE_LINE_HEIGHT,
          background: paper.borderSoft,
        }}
      />
      {TICKS.map((tick) => (
        <Fragment key={tick.cents}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: tick.top,
              width: tick.width,
              height: tick.height,
              background: tick.color,
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: tick.top,
              width: tick.width,
              height: tick.height,
              background: tick.color,
            }}
          />
          {tick.label !== "" && (
            <div
              style={{
                position: "absolute",
                left: TICK_LABEL_LEFT,
                top: tick.labelTop,
                fontFamily: fonts.mono,
                fontSize: TICK_LABEL_FONT_SIZE,
                lineHeight: TICK_LABEL_LINE_HEIGHT,
                color: paper.muted,
              }}
            >
              {tick.label}
            </div>
          )}
        </Fragment>
      ))}
      <div
        style={{
          position: "absolute",
          top: HEADER_ROW_TOP,
          left: HEADER_ROW_SIDE.left,
          right: HEADER_ROW_SIDE.right,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div
          style={{
            fontSize: SHARP_FLAT_FONT_SIZE,
            fontWeight: 600,
            color: tuner.sharp,
          }}
        >
          ↑ sharp
        </div>
        <div
          style={{ display: "flex", alignItems: "baseline", gap: HALFWAY_GAP }}
        >
          <div
            style={{ fontSize: HALFWAY_LABEL_FONT_SIZE, color: paper.muted }}
          >
            halfway to
          </div>
          <div
            style={{
              fontSize: HALFWAY_NOTE_FONT_SIZE,
              fontWeight: 600,
              color: paper.muted,
            }}
          >
            {aboveLabel}
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: HEADER_ROW_TOP,
          left: HEADER_ROW_SIDE.left,
          right: HEADER_ROW_SIDE.right,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div
          style={{
            fontSize: SHARP_FLAT_FONT_SIZE,
            fontWeight: 600,
            color: tuner.flat,
          }}
        >
          ↓ flat
        </div>
        <div
          style={{ display: "flex", alignItems: "baseline", gap: HALFWAY_GAP }}
        >
          <div
            style={{ fontSize: HALFWAY_LABEL_FONT_SIZE, color: paper.muted }}
          >
            halfway to
          </div>
          <div
            style={{
              fontSize: HALFWAY_NOTE_FONT_SIZE,
              fontWeight: 600,
              color: paper.muted,
            }}
          >
            {belowLabel}
          </div>
        </div>
      </div>
      <div data-testid="tuner-reading">
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: NAME_AREA_TOP,
            height: NAME_AREA_HEIGHT,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {cannotHear ? (
            <div
              data-testid="tuner-name"
              style={{
                fontFamily: fonts.display,
                fontSize: NAME_FONT_SIZE,
                lineHeight: 1,
                color: DASH_INK,
              }}
            >
              –
            </div>
          ) : (
            <>
              {referenceNote !== null && (
                <div
                  data-testid="tuner-name"
                  {...(nameStaleAttrs !== undefined
                    ? {
                        "data-state": nameStaleAttrs["data-state"],
                        "aria-hidden": nameStaleAttrs["aria-hidden"],
                      }
                    : {})}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 4,
                    ...(nameStaleAttrs?.style ?? {}),
                  }}
                >
                  <div
                    style={{
                      fontFamily: fonts.display,
                      fontSize: NAME_FONT_SIZE,
                      lineHeight: 1,
                      color: nameInk,
                    }}
                  >
                    {pitchClassLabel(referenceNote)}
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: OCTAVE_FONT_SIZE,
                      fontWeight: 600,
                      color: paper.muted,
                      marginTop: OCTAVE_MARGIN_TOP,
                    }}
                  >
                    {referenceNote.octave}
                  </div>
                </div>
              )}
              {/* design-loop variant (007 round 4) — "Play a note" shows
                  whenever nothing live is heard, except while a/b's stale
                  reading is still fading (absent until its timer ends);
                  c's ghost shows it at once, alongside the still-ghosted
                  reading (REQ-003/S2's own layout, reused). */}
              {reading === null &&
                (stale === undefined || stale.dataState === "ghost") && (
                  <div
                    data-testid="tuner-empty"
                    style={{
                      fontSize: EMPTY_FONT_SIZE,
                      color: paper.faint,
                      background: paper.frame,
                      padding: "4px 10px",
                      ...(emptyOpacity !== undefined
                        ? {
                            opacity: emptyOpacity,
                            transition: `opacity ${EMPTY_FADE_IN_MS}ms`,
                          }
                        : {}),
                    }}
                  >
                    Play a note
                  </div>
                )}
            </>
          )}
        </div>
        {effectiveReading !== null && geometry !== null && (
          <>
            <div
              data-testid="tuner-line"
              {...(lineTagStaleAttrs !== undefined
                ? {
                    "data-state": lineTagStaleAttrs["data-state"],
                    "aria-hidden": lineTagStaleAttrs["aria-hidden"],
                  }
                : {})}
              style={{
                position: "absolute",
                left: LINE_LEFT,
                right: LINE_RIGHT,
                top: geometry.lineTop,
                height: LINE_HEIGHT,
                borderRadius: LINE_RADIUS,
                background: displayTone,
                ...(lineTagStaleAttrs?.style ?? {}),
              }}
            />
            <div
              data-testid="tuner-tag"
              {...(lineTagStaleAttrs !== undefined
                ? {
                    "data-state": lineTagStaleAttrs["data-state"],
                    "aria-hidden": lineTagStaleAttrs["aria-hidden"],
                  }
                : {})}
              style={{
                position: "absolute",
                right: TAG_RIGHT,
                top: geometry.tagTop,
                display: "flex",
                alignItems: "baseline",
                gap: TAG_GAP,
                padding: TAG_PADDING,
                whiteSpace: "nowrap",
                background: paper.frame,
                borderRadius: TAG_RADIUS,
                color: displayTone,
                ...(lineTagStaleAttrs?.style ?? {}),
              }}
            >
              {captionText !== "" && (
                <div
                  style={{
                    fontSize: TAG_CAPTION_FONT_SIZE,
                    fontWeight: 600,
                    color: paper.muted,
                    whiteSpace: "nowrap",
                  }}
                >
                  {captionText}
                </div>
              )}
              <div
                style={{
                  fontFamily: fonts.mono,
                  fontSize: TAG_CENTS_FONT_SIZE,
                  fontWeight: 600,
                  color: displayTone,
                }}
              >
                {geometry.primaryText}
              </div>
              {geometry.wordText !== "" && (
                <div
                  style={{
                    fontSize: TAG_WORD_FONT_SIZE,
                    fontWeight: 600,
                    color: displayTone,
                  }}
                >
                  {geometry.wordText}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
