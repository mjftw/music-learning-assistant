import { useEffect, useState, type JSX } from "react";
import {
  circleOfFifths,
  keyId as keyIdOf,
  keyView,
  runOf,
  spelledMajorAt,
  spelledMinorAt,
  type Catalogue,
  type KeyView,
  type Mode,
  type Octaves,
  type SpellingPreference,
  type Traversal,
  type Variant,
} from "../theory/published";
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
import { fonts, paper } from "./theme";

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

function headerInstrumentLabel(variant: Variant): string {
  return `${variant.instrumentName} ${variant.variantName}`;
}

function headerRangeLabel(variant: Variant): string {
  return `${noteLabel(variant.range.lowest)}–${noteLabel(variant.range.highest)}`;
}

// Maps the store's stringly-typed octave count (`'full' | 1 | 2 | 3 | 4`) to
// and from the `Octaves` sum type published/consumed by the theory context's
// `runOf` (T003/T004) — the traversal's direction and shape carry over
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
  readonly traversal: Traversal;
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
    traversal: traversalFromStored(firstRunDefaults.traversal),
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
    traversal: traversalFromStored(stored.traversal),
    degreesEnabled: stored.degreesEnabled,
    distanceRingEnabled: stored.distanceRingEnabled,
    staveNamesEnabled: stored.staveNamesEnabled,
  };
}

export function App(props: {
  readonly catalogue: Catalogue;
  readonly selectionStore: SelectionStore;
}): JSX.Element {
  const { catalogue, selectionStore } = props;
  const [selection, setSelection] = useState<Selection>(() =>
    initialSelection(catalogue, selectionStore),
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [instrumentSheetOpen, setInstrumentSheetOpen] = useState(false);

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

  useEffect(() => {
    const toSave: StoredSelection = {
      ...firstRunDefaults,
      variantId: selection.variantId,
      keyId: keyIdOf(selectedKey),
      spelling: selection.spelling,
      view: selection.view,
      degreesEnabled: selection.degreesEnabled,
      distanceRingEnabled: selection.distanceRingEnabled,
      staveNamesEnabled: selection.staveNamesEnabled,
      traversal: {
        direction: selection.traversal.direction,
        octaves: storedFromOctaves(selection.traversal.octaves),
        shape: selection.traversal.shape,
      },
    };
    selectionStore.save(toSave);
  }, [selection, selectedKey, selectionStore]);

  const view =
    variant === undefined ? undefined : keyView(selectedKey, variant);
  const staveRun =
    variant === undefined
      ? []
      : runOf(selectedKey, variant, selection.traversal);

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
        onOpenPicker={() => setInstrumentSheetOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <Notices notices={catalogue.notices} />
      <div style={{ margin: CIRCLE_WRAPPER_MARGIN, flex: "none" }}>
        <CircleOfFifths
          selectedKeyId={keyIdOf(selectedKey)}
          spelling={selection.spelling}
          degreesEnabled={selection.degreesEnabled}
          distanceRingEnabled={selection.distanceRingEnabled}
          onSelectKey={(selectedWedgeKey) => {
            const located = locateSpelledKey(
              keyIdOf(selectedWedgeKey),
              selection.spelling,
            );
            if (located === undefined) return;
            setSelection((current) => ({
              ...current,
              positionIndex: located.position.index,
              mode: located.key.mode,
            }));
          }}
          onSelectSpelling={(preference) =>
            setSelection((current) => ({ ...current, spelling: preference }))
          }
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
            soundingPitchClass={null}
          />
        ) : (
          variant !== undefined && (
            <StaveView
              key_={selectedKey}
              variant={variant}
              notes={staveRun}
              staveNamesEnabled={selection.staveNamesEnabled}
              soundingRunIndex={null}
              playing={false}
            />
          )
        )}
      </KeyPanel>
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        staveNamesEnabled={selection.staveNamesEnabled}
        degreesEnabled={selection.degreesEnabled}
        distanceRingEnabled={selection.distanceRingEnabled}
        onToggleStaveNames={() =>
          setSelection((current) => ({
            ...current,
            staveNamesEnabled: !current.staveNamesEnabled,
          }))
        }
        onToggleDegrees={() =>
          setSelection((current) => ({
            ...current,
            degreesEnabled: !current.degreesEnabled,
          }))
        }
        onToggleRing={() =>
          setSelection((current) => ({
            ...current,
            distanceRingEnabled: !current.distanceRingEnabled,
          }))
        }
      />
      <InstrumentSheet
        open={instrumentSheetOpen}
        catalogue={catalogue}
        selectedVariantId={selection.variantId}
        onSelect={(selectedVariant) => {
          setSelection((current) => ({
            ...current,
            variantId: selectedVariant.variantId,
          }));
          setInstrumentSheetOpen(false);
        }}
        onClose={() => setInstrumentSheetOpen(false)}
      />
    </div>
  );
}
