import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { flushSync } from "react-dom";
import {
  circleOfFifths,
  keyId as keyIdOf,
  keyView,
  scaleById,
  spelledMajorAt,
  spelledMinorAt,
  type Catalogue,
  type Key,
  type KeyView,
  type Mode,
  type Octaves,
  type PitchClass,
  type SpellingPreference,
  type Traversal,
  type Variant,
} from "../theory/published";
import {
  createSession,
  steppedTempo,
  tempoForTerm,
  type Session,
  type SessionDeps,
  type SessionSettings,
  type SessionSnapshot,
  type TempoTerm,
} from "../practice/published";
import { findVariantById } from "./catalogue-lookup";
import { CircleOfFifths, locateSpelledKey } from "./CircleOfFifths";
import { Header } from "./Header";
import { InstrumentSheet } from "./InstrumentSheet";
import { keyLabel, noteLabel } from "./key-label";
import { KeyPanel } from "./KeyPanel";
import { NamesView } from "./NamesView";
import { Notices } from "./Notices";
import {
  firstRunDefaults,
  type SelectionStore,
  type StoredOctaves,
  type StoredSelection,
} from "./selection-store";
import { SettingsDrawer } from "./SettingsDrawer";
import { StaveView } from "./StaveView";
import { TempoSheet } from "./TempoSheet";
import { fonts, paper } from "./theme";
import { TransportCard } from "./TransportCard";
import { TraversalRow } from "./TraversalRow";
import { TraversalSheet } from "./TraversalSheet";

const DEFAULT_VARIANT_ID = "flute-concert";
const DEFAULT_KEY_ID = "C-major";

// Geometry and colour below are copied verbatim from the vendored visual
// reference (changes/002-circle-redesign/design/Circle 1c Function Paper.dc.html
// — the outer frame, key-name row and circle wrapper blocks) — named here
// rather than re-derived by eye. The reference fixes the frame at 390×844
// (one phone screenshot); this column keeps the same 390px width but grows
// with the viewport (`min-height: 100vh`) instead of a fixed height.
const COLUMN_MAX_WIDTH = 390;
const COLUMN_MIN_HEIGHT = "100vh";
const COLUMN_BACKGROUND = paper.frame;

const KEY_NAME_ROW_PADDING = "6px 16px 0";
const KEY_NAME_FONT_SIZE = 46;

const CIRCLE_WRAPPER_MARGIN = "0 auto";
// Not from the reference (a fixed 390×844 screenshot has no wider viewport
// to centre within) — this app's own choice for how the column behaves on
// a viewport wider than 390px.
const COLUMN_CENTERING_MARGIN = "0 auto";

// The transport card and traversal row's wrapper — copied verbatim from the
// vendored visual reference (changes/003-hear-the-scale/design/
// hear-the-scale.dc.html, markup lines 121-141). `marginTop: "auto"` pins it
// to the bottom of the 390px column.
const SESSION_AREA_MARGIN_TOP = "auto";
const SESSION_AREA_PADDING = "14px 16px 20px";
const SESSION_AREA_GAP = 9;

function headerInstrumentLabel(variant: Variant): string {
  return `${variant.instrumentName} ${variant.variantName}`;
}

function headerRangeLabel(variant: Variant): string {
  return `${noteLabel(variant.range.lowest)}–${noteLabel(variant.range.highest)}`;
}

// Maps the store's stringly-typed octave count (`'full' | 1 | 2 | 3 | 4`) to
// and from the `Octaves` sum type published/consumed by the theory context's
// `traversalOf` (T003/T004) — the traversal's direction and shape carry over
// unchanged, so only the octaves need translating.
function octavesFromStored(stored: StoredOctaves): Octaves {
  return stored === "full"
    ? { kind: "full" }
    : { kind: "count", count: stored };
}

function storedFromOctaves(octaves: Octaves): StoredOctaves {
  return octaves.kind === "full" ? "full" : octaves.count;
}

// "22 notes · C4–C7" — the full in-range note count and extremes
// (theory.circle-of-fifths/REQ-003), independent of the traversal.
function rangeSummaryText(view: KeyView): string {
  const first = view.notes[0];
  const last = view.notes[view.notes.length - 1];
  if (first === undefined || last === undefined)
    return "no notes of this key in range";
  return `${view.notes.length} notes · ${noteLabel(first.note)}–${noteLabel(last.note)}`;
}

// The selection is kept keyed by circle position, not by key id — a
// respell (theory.circle-of-fifths/REQ-002/S2) then falls out of re-deriving
// the key from the same position under the new spelling, rather than the UI
// having to special-case it.
interface Selection {
  readonly variantId: string;
  readonly positionIndex: number;
  readonly mode: Mode;
  readonly spelling: SpellingPreference;
  readonly view: "names" | "stave";
  readonly degreesEnabled: boolean;
  readonly distanceRingEnabled: boolean;
  readonly staveNamesEnabled: boolean;
}

function traversalFromStored(stored: StoredSelection["traversal"]): Traversal {
  return {
    direction: stored.direction,
    octaves: octavesFromStored(stored.octaves),
    shape: stored.shape,
  };
}

function defaultSelection(): Selection {
  const located = locateSpelledKey(DEFAULT_KEY_ID, firstRunDefaults.spelling);
  if (located === undefined) {
    throw new Error("unreachable: default key is not on the circle of fifths");
  }
  return {
    variantId: DEFAULT_VARIANT_ID,
    positionIndex: located.position.index,
    mode: located.key.mode,
    spelling: firstRunDefaults.spelling,
    view: firstRunDefaults.view,
    degreesEnabled: firstRunDefaults.degreesEnabled,
    distanceRingEnabled: firstRunDefaults.distanceRingEnabled,
    staveNamesEnabled: firstRunDefaults.staveNamesEnabled,
  };
}

function initialSelection(
  catalogue: Catalogue,
  selectionStore: SelectionStore,
): Selection {
  const stored = selectionStore.load();
  if (stored === null) return defaultSelection();
  const variant = findVariantById(catalogue, stored.variantId);
  const located = locateSpelledKey(stored.keyId, stored.spelling);
  if (variant === undefined || located === undefined) return defaultSelection();
  return {
    variantId: stored.variantId,
    positionIndex: located.position.index,
    mode: located.key.mode,
    spelling: stored.spelling,
    view: stored.view,
    degreesEnabled: stored.degreesEnabled,
    distanceRingEnabled: stored.distanceRingEnabled,
    staveNamesEnabled: stored.staveNamesEnabled,
  };
}

// The session's initial traversal and settings (practice.session/REQ-011) —
// restored from the store alongside the rest of the selection, defaulting
// (via `firstRunDefaults`, the same S2 defaults a migrated v1/v2 payload
// takes) when nothing usable is stored.
function initialTraversalOf(stored: StoredSelection | null): Traversal {
  return traversalFromStored(stored?.traversal ?? firstRunDefaults.traversal);
}

function initialSettingsOf(stored: StoredSelection | null): SessionSettings {
  return stored?.session ?? firstRunDefaults.session;
}

export function App(props: {
  readonly catalogue: Catalogue;
  readonly selectionStore: SelectionStore;
  readonly sessionDeps: SessionDeps;
  // Optional: the session is created inside App (in an effect, per
  // practice.session/REQ-011's wiring — see the session-creating effect
  // below), so main.tsx — which never holds a reference to it otherwise —
  // uses this to capture it for T018's dev-only `window.__session` timing
  // hook. Keeping it optional and additive leaves App fully testable
  // without it.
  readonly onSessionReady?: (session: Session) => void;
}): JSX.Element {
  const { catalogue, selectionStore, sessionDeps, onSessionReady } = props;
  const [selection, setSelection] = useState<Selection>(() =>
    initialSelection(catalogue, selectionStore),
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [instrumentSheetOpen, setInstrumentSheetOpen] = useState(false);
  const [traversalSheetOpen, setTraversalSheetOpen] = useState(false);
  const [tempoSheetOpen, setTempoSheetOpen] = useState(false);

  const position = circleOfFifths()[selection.positionIndex];
  if (position === undefined) {
    throw new Error("unreachable: selection position index out of range");
  }
  const selectedKey =
    selection.mode === "major"
      ? spelledMajorAt(position, selection.spelling)
      : spelledMinorAt(position, selection.spelling);

  // initialSelection already resolved variantId to a value that exists in
  // this catalogue (falling back to the default when it didn't), so this
  // always resolves; no further fallback is needed here.
  const variant = findVariantById(catalogue, selection.variantId);

  // The session owns the traversal and session settings from here on
  // (practice.session/REQ-001 onward) — created once per App mount, seeded
  // from the store, and disposed on unmount. Created and torn down by the
  // *same* effect, with an empty dependency list, so cleanup always pairs
  // with creation: under StrictMode's dev-only mount → cleanup → mount
  // double-invoke this creates, disposes and creates again harmlessly,
  // and a genuine unmount always reaches the real `dispose()` (a skip-the-
  // first-cleanup workaround previously broke that: Vitest, like any
  // StrictMode-free build, runs with `import.meta.env.DEV` true, so the
  // very first — and only — cleanup call was always treated as the
  // phantom one and dispose() never ran).
  const sessionRef = useRef<Session | null>(null);
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);

  useEffect(() => {
    if (variant === undefined) {
      throw new Error("unreachable: initial variant not found");
    }
    const stored = selectionStore.load();
    const session = createSession(
      { key: selectedKey, variant },
      initialTraversalOf(stored),
      initialSettingsOf(stored),
      sessionDeps,
    );
    sessionRef.current = session;
    // The last snapshot reference actually applied to React state.
    // `session.snapshot()` caches its build and only changes reference when
    // something in it actually changed (practice.session/REQ-006, T032), so
    // comparing against this lets `onChange` recognise a beat
    // `onTargetAdvanced`'s `flushSync` already committed moments earlier
    // (below) and skip applying it again — App commits once per beat, not
    // twice.
    let lastAppliedSnapshot = session.snapshot();
    setSnapshot(lastAppliedSnapshot);
    const unsubscribeChange = session.onChange(() => {
      const next = session.snapshot();
      if (next === lastAppliedSnapshot) return;
      lastAppliedSnapshot = next;
      setSnapshot(next);
    });
    // practice.session/REQ-006/S4 — the sounding note's highlight must land
    // within 30 ms of its onset. This listener fires from the sound
    // engine's onset report, not a React event, so a plain `setState` here
    // would wait for React's next batch/flush and could miss the budget;
    // `flushSync` commits the snapshot in the current call so the highlight
    // paints straight away. Only this path does — `onChange` above covers
    // every other change and stays batched.
    const unsubscribeTargetAdvanced = session.onTargetAdvanced(() => {
      const next = session.snapshot();
      lastAppliedSnapshot = next;
      flushSync(() => setSnapshot(next));
    });
    onSessionReady?.(session);

    return () => {
      unsubscribeChange();
      unsubscribeTargetAdvanced();
      session.dispose();
      sessionRef.current = null;
    };
    // Deliberately empty: the session is seeded once from the initial
    // render's selection/store and thereafter owns its own state; later
    // key/variant changes reach it through `setContext` below, not by
    // recreating it.
  }, []);

  const session = sessionRef.current;

  // Key or variant change → setContext (practice.session/REQ-007). Depends
  // on the primitive ids, not the `selectedKey`/`variant` objects — those
  // are freshly derived every render, so depending on them directly would
  // fire this on every unrelated re-render (e.g. every tick while playing)
  // and restart the sequence each time.
  useEffect(() => {
    if (variant === undefined || session === null) return;
    session.setContext({ key: selectedKey, variant });
  }, [session, keyIdOf(selectedKey), variant?.variantId]);

  useEffect(() => {
    // Nothing to persist yet on the render before the session-creating
    // effect above has run (snapshot() still null) — that effect's own
    // completion re-renders with a snapshot, so this simply runs again.
    if (snapshot === null) return;
    const toSave: StoredSelection = {
      schemaVersion: 3,
      variantId: selection.variantId,
      keyId: keyIdOf(selectedKey),
      spelling: selection.spelling,
      view: selection.view,
      degreesEnabled: selection.degreesEnabled,
      distanceRingEnabled: selection.distanceRingEnabled,
      staveNamesEnabled: selection.staveNamesEnabled,
      traversal: {
        direction: snapshot.traversal.direction,
        octaves: storedFromOctaves(snapshot.traversal.octaves),
        shape: snapshot.traversal.shape,
      },
      session: snapshot.settings,
    };
    selectionStore.save(toSave);
  }, [
    selection,
    selectedKey,
    selectionStore,
    snapshot?.traversal,
    snapshot?.settings,
  ]);

  const view =
    variant === undefined
      ? undefined
      : keyView(
          selectedKey,
          variant,
          scaleById(selectedKey.mode === "major" ? "major" : "natural-minor"),
        );

  const soundingSequenceNote =
    snapshot === null || snapshot.soundingPosition === null
      ? undefined
      : snapshot.sequence[snapshot.soundingPosition];
  const soundingRunIndex = soundingSequenceNote?.runIndex ?? null;
  const soundingPitchClass: PitchClass | null =
    soundingSequenceNote === undefined
      ? null
      : {
          letter: soundingSequenceNote.note.letter,
          accidental: soundingSequenceNote.note.accidental,
        };
  const playing = snapshot !== null && snapshot.transport.kind === "playing";

  function handleTogglePlay(): void {
    if (session === null || snapshot === null) return;
    if (snapshot.transport.kind === "idle") {
      session.start();
    } else {
      session.stop();
    }
  }

  // Stable handlers (T032) — every one of these is passed to a
  // `React.memo`-wrapped component (the circle, header, settings drawer,
  // instrument sheet, traversal sheet, tempo sheet, traversal row) whose
  // other props are already stable during playback (primitives, or objects
  // the session only reassigns when they actually change). An inline arrow
  // here would recreate a new function identity — and so force a re-render
  // — on every unrelated App render, including every beat.
  const handleOpenInstrumentSheet = useCallback(
    () => setInstrumentSheetOpen(true),
    [],
  );
  const handleOpenSettings = useCallback(() => setSettingsOpen(true), []);
  const handleOpenTraversalSheet = useCallback(
    () => setTraversalSheetOpen(true),
    [],
  );
  const handleOpenTempoSheet = useCallback(() => setTempoSheetOpen(true), []);

  const handleSelectKey = useCallback((selectedWedgeKey: Key) => {
    setSelection((current) => {
      const located = locateSpelledKey(
        keyIdOf(selectedWedgeKey),
        current.spelling,
      );
      if (located === undefined) return current;
      return {
        ...current,
        positionIndex: located.position.index,
        mode: located.key.mode,
      };
    });
  }, []);

  const handleSelectSpelling = useCallback(
    (preference: SpellingPreference) =>
      setSelection((current) => ({ ...current, spelling: preference })),
    [],
  );

  const handleCloseSettings = useCallback(() => setSettingsOpen(false), []);
  const handleToggleStaveNames = useCallback(
    () =>
      setSelection((current) => ({
        ...current,
        staveNamesEnabled: !current.staveNamesEnabled,
      })),
    [],
  );
  const handleToggleDegrees = useCallback(
    () =>
      setSelection((current) => ({
        ...current,
        degreesEnabled: !current.degreesEnabled,
      })),
    [],
  );
  const handleToggleRing = useCallback(
    () =>
      setSelection((current) => ({
        ...current,
        distanceRingEnabled: !current.distanceRingEnabled,
      })),
    [],
  );

  const handleSelectInstrument = useCallback((selectedVariant: Variant) => {
    setSelection((current) => ({
      ...current,
      variantId: selectedVariant.variantId,
    }));
    setInstrumentSheetOpen(false);
  }, []);
  const handleCloseInstrumentSheet = useCallback(
    () => setInstrumentSheetOpen(false),
    [],
  );

  const handleCloseTraversalSheet = useCallback(
    () => setTraversalSheetOpen(false),
    [],
  );
  // `session` only ever changes once, from null to the instance the
  // session-creating effect above creates — reading it live from the
  // session (rather than closing over `snapshot`) means these never need
  // the per-beat `snapshot` object as a dependency.
  const handleTraversal = useCallback(
    (nextTraversal: Traversal) => session?.setTraversal(nextTraversal),
    [session],
  );
  const handleSessionSettings = useCallback(
    (nextSettings: SessionSettings) => session?.setSettings(nextSettings),
    [session],
  );

  const handleCloseTempoSheet = useCallback(() => setTempoSheetOpen(false), []);
  const handlePickTempo = useCallback(
    (term: TempoTerm) => {
      if (session === null) return;
      session.setSettings({
        ...session.snapshot().settings,
        tempoBpm: tempoForTerm(term),
      });
      setTempoSheetOpen(false);
    },
    [session],
  );

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        maxWidth: COLUMN_MAX_WIDTH,
        minHeight: COLUMN_MIN_HEIGHT,
        margin: COLUMN_CENTERING_MARGIN,
        overflow: "hidden",
        background: COLUMN_BACKGROUND,
        color: paper.ink,
        fontFamily: fonts.body,
      }}
    >
      <Header
        variantLabel={
          variant === undefined ? "" : headerInstrumentLabel(variant)
        }
        rangeLabel={variant === undefined ? "" : headerRangeLabel(variant)}
        onOpenPicker={handleOpenInstrumentSheet}
        onOpenSettings={handleOpenSettings}
      />
      <Notices
        notices={catalogue.notices}
        soundUnavailable={
          snapshot !== null && snapshot.notice === "sound-unavailable"
        }
      />
      <div style={{ margin: CIRCLE_WRAPPER_MARGIN, flex: "none" }}>
        <CircleOfFifths
          selectedKeyId={keyIdOf(selectedKey)}
          spelling={selection.spelling}
          degreesEnabled={selection.degreesEnabled}
          distanceRingEnabled={selection.distanceRingEnabled}
          onSelectKey={handleSelectKey}
          onSelectSpelling={handleSelectSpelling}
        />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: KEY_NAME_ROW_PADDING,
        }}
      >
        <div
          data-testid="current-key"
          style={{
            fontFamily: fonts.display,
            fontSize: KEY_NAME_FONT_SIZE,
            lineHeight: 1,
            color: paper.ink,
          }}
        >
          {keyLabel(selectedKey)}
        </div>
      </div>
      <KeyPanel
        view={selection.view}
        onSelectView={(selectedView) =>
          setSelection((current) => ({ ...current, view: selectedView }))
        }
        rangeSummary={view === undefined ? "" : rangeSummaryText(view)}
      >
        {selection.view === "names" ? (
          <NamesView
            key_={selectedKey}
            degreesEnabled={selection.degreesEnabled}
            soundingPitchClass={soundingPitchClass}
          />
        ) : (
          variant !== undefined && (
            <StaveView
              key_={selectedKey}
              variant={variant}
              notes={snapshot === null ? [] : snapshot.run}
              staveNamesEnabled={selection.staveNamesEnabled}
              soundingRunIndex={soundingRunIndex}
              playing={playing}
            />
          )
        )}
      </KeyPanel>
      {snapshot !== null && session !== null && (
        <div
          style={{
            marginTop: SESSION_AREA_MARGIN_TOP,
            padding: SESSION_AREA_PADDING,
            display: "flex",
            flexDirection: "column",
            gap: SESSION_AREA_GAP,
          }}
        >
          <TransportCard
            snapshot={snapshot}
            onTogglePlay={handleTogglePlay}
            onStepTempo={(delta) =>
              session.setSettings({
                ...snapshot.settings,
                tempoBpm: steppedTempo(snapshot.settings.tempoBpm, delta),
              })
            }
            onOpenTempo={handleOpenTempoSheet}
          />
          <TraversalRow
            summaryLine={snapshot.summaryLine}
            onOpen={handleOpenTraversalSheet}
          />
        </div>
      )}
      <SettingsDrawer
        open={settingsOpen}
        onClose={handleCloseSettings}
        staveNamesEnabled={selection.staveNamesEnabled}
        degreesEnabled={selection.degreesEnabled}
        distanceRingEnabled={selection.distanceRingEnabled}
        onToggleStaveNames={handleToggleStaveNames}
        onToggleDegrees={handleToggleDegrees}
        onToggleRing={handleToggleRing}
      />
      <InstrumentSheet
        open={instrumentSheetOpen}
        catalogue={catalogue}
        selectedVariantId={selection.variantId}
        onSelect={handleSelectInstrument}
        onClose={handleCloseInstrumentSheet}
      />
      {snapshot !== null && session !== null && (
        <>
          <TraversalSheet
            open={traversalSheetOpen}
            traversal={snapshot.traversal}
            effectiveOctaves={snapshot.effectiveOctaves}
            fittingCounts={snapshot.fittingCounts}
            settings={snapshot.settings}
            onTraversal={handleTraversal}
            onSettings={handleSessionSettings}
            onClose={handleCloseTraversalSheet}
          />
          <TempoSheet
            open={tempoSheetOpen}
            tempoBpm={snapshot.settings.tempoBpm}
            onPick={handlePickTempo}
            onClose={handleCloseTempoSheet}
          />
        </>
      )}
    </div>
  );
}
