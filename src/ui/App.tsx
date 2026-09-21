import { useEffect, useState, type JSX } from "react";
import {
  circleOfFifths,
  keyId as keyIdOf,
  keyView,
  spelledMajorAt,
  spelledMinorAt,
  type Catalogue,
  type Key,
  type Mode,
  type Signature,
  type SpellingPreference,
  type Variant,
} from "../theory/published";
import { findVariantById } from "./catalogue-lookup";
import { CircleOfFifths, locateSpelledKey } from "./CircleOfFifths";
import { InstrumentSelector } from "./InstrumentSelector";
import { keyLabel, pitchClassLabel } from "./key-label";
import { KeyViewStave } from "./KeyViewStave";
import { Notices } from "./Notices";
import {
  firstRunDefaults,
  type SelectionStore,
  type StoredSelection,
} from "./selection-store";
import { fonts } from "./theme";

const DEFAULT_VARIANT_ID = "flute-concert";
const DEFAULT_KEY_ID = "C-major";
// The 001 stave note-names toggle's own default, kept independent of
// `firstRunDefaults.staveNamesEnabled` — this is the temporary bridge
// T007-T011 replace, not the new preference set (see additional context).
const DEFAULT_NOTE_NAMES_VISIBLE = true;

function variantLabel(variant: Variant): string {
  return `${variant.instrumentName} — ${variant.variantName}`;
}

function relativeKeyLabel(key: Key, relative: Key): string {
  const relativeModeLabel = key.mode === "major" ? "minor" : "major";
  return `Relative ${relativeModeLabel}: ${keyLabel(relative)}`;
}

function signatureSummary(signature: Signature): string {
  if (signature.kind === "none") return "no accidentals";
  const singularKind = signature.kind === "sharps" ? "sharp" : "flat";
  const kindLabel = signature.count === 1 ? singularKind : signature.kind;
  const accidentalsLabel = signature.accidentals.map(pitchClassLabel).join(" ");
  return `${signature.count} ${kindLabel} (${accidentalsLabel})`;
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
  readonly degreesEnabled: boolean;
  readonly distanceRingEnabled: boolean;
  readonly noteNamesVisible: boolean;
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
    degreesEnabled: firstRunDefaults.degreesEnabled,
    distanceRingEnabled: firstRunDefaults.distanceRingEnabled,
    noteNamesVisible: DEFAULT_NOTE_NAMES_VISIBLE,
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
    degreesEnabled: stored.degreesEnabled,
    distanceRingEnabled: stored.distanceRingEnabled,
    noteNamesVisible: stored.staveNamesEnabled,
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

  const position = circleOfFifths()[selection.positionIndex];
  if (position === undefined) {
    throw new Error("unreachable: selection position index out of range");
  }
  const selectedKey =
    selection.mode === "major"
      ? spelledMajorAt(position, selection.spelling)
      : spelledMinorAt(position, selection.spelling);

  useEffect(() => {
    const toSave: StoredSelection = {
      ...firstRunDefaults,
      variantId: selection.variantId,
      keyId: keyIdOf(selectedKey),
      spelling: selection.spelling,
      degreesEnabled: selection.degreesEnabled,
      distanceRingEnabled: selection.distanceRingEnabled,
      staveNamesEnabled: selection.noteNamesVisible,
    };
    selectionStore.save(toSave);
  }, [selection, selectedKey, selectionStore]);

  // initialSelection already resolved variantId to a value that exists in
  // this catalogue (falling back to the default when it didn't), so this
  // always resolves; no further fallback is needed here.
  const variant = findVariantById(catalogue, selection.variantId);
  const view =
    variant === undefined ? undefined : keyView(selectedKey, variant);

  return (
    <div>
      <Notices notices={catalogue.notices} />
      <InstrumentSelector
        catalogue={catalogue}
        selectedVariantId={selection.variantId}
        onSelect={(selectedVariant) =>
          setSelection((current) => ({
            ...current,
            variantId: selectedVariant.variantId,
          }))
        }
      />
      <div
        data-testid="current-key"
        style={{ fontFamily: fonts.display, fontSize: 46 }}
      >
        {keyLabel(selectedKey)}
      </div>
      <p data-testid="current-variant">
        {variant === undefined ? "" : variantLabel(variant)}
      </p>
      <p data-testid="relative-key">
        {view === undefined ? "" : relativeKeyLabel(selectedKey, view.relative)}
      </p>
      <p data-testid="signature-summary">
        {view === undefined ? "" : signatureSummary(view.signature)}
      </p>
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
      {view === undefined ? null : (
        <KeyViewStave
          view={view}
          noteNamesVisible={selection.noteNamesVisible}
        />
      )}
      <button
        type="button"
        role="switch"
        aria-checked={selection.noteNamesVisible}
        aria-label="Note names"
        onClick={() =>
          setSelection((current) => ({
            ...current,
            noteNamesVisible: !current.noteNamesVisible,
          }))
        }
      >
        Note names
      </button>
    </div>
  );
}
