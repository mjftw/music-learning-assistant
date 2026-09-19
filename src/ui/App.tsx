import { useEffect, useState, type JSX } from "react";
import {
  circleOfFifths,
  keyId as keyIdOf,
  keyView,
  type Catalogue,
  type Key,
  type Signature,
  type Variant,
} from "../theory/published";
import { findVariantById } from "./catalogue-lookup";
import { CircleOfFifths } from "./CircleOfFifths";
import { InstrumentSelector } from "./InstrumentSelector";
import { keyLabel, pitchClassLabel } from "./key-label";
import { KeyViewStave } from "./KeyViewStave";
import { Notices } from "./Notices";
import type { SelectionStore, StoredSelection } from "./selection-store";

const DEFAULT_VARIANT_ID = "flute-concert";
const DEFAULT_KEY_ID = "C-major";
const DEFAULT_NOTE_NAMES_VISIBLE = true;

function findKeyById(keyId: string): Key | undefined {
  for (const position of circleOfFifths()) {
    for (const key of [...position.majors, ...position.minors]) {
      if (keyIdOf(key) === keyId) return key;
    }
  }
  return undefined;
}

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

interface Selection {
  readonly variantId: string;
  readonly keyId: string;
  readonly noteNamesVisible: boolean;
}

function defaultSelection(): Selection {
  return {
    variantId: DEFAULT_VARIANT_ID,
    keyId: DEFAULT_KEY_ID,
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
  const key = findKeyById(stored.keyId);
  if (variant === undefined || key === undefined) return defaultSelection();
  return {
    variantId: stored.variantId,
    keyId: stored.keyId,
    noteNamesVisible: stored.noteNamesVisible,
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

  useEffect(() => {
    const toSave: StoredSelection = {
      schemaVersion: 1,
      variantId: selection.variantId,
      keyId: selection.keyId,
      noteNamesVisible: selection.noteNamesVisible,
    };
    selectionStore.save(toSave);
  }, [selection, selectionStore]);

  // initialSelection already resolved variantId/keyId to values that exist
  // in this catalogue/circle before this state was set (falling back to the
  // default when they didn't), so these always resolve; no further fallback
  // is needed here.
  const variant = findVariantById(catalogue, selection.variantId);
  const key = findKeyById(selection.keyId);
  const view =
    key === undefined || variant === undefined
      ? undefined
      : keyView(key, variant);

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
      <p data-testid="current-key">{key === undefined ? "" : keyLabel(key)}</p>
      <p data-testid="current-variant">
        {variant === undefined ? "" : variantLabel(variant)}
      </p>
      <p data-testid="relative-key">
        {key === undefined || view === undefined
          ? ""
          : relativeKeyLabel(key, view.relative)}
      </p>
      <p data-testid="signature-summary">
        {view === undefined ? "" : signatureSummary(view.signature)}
      </p>
      <CircleOfFifths
        selectedKeyId={selection.keyId}
        onSelect={(selectedKey) =>
          setSelection((current) => ({
            ...current,
            keyId: keyIdOf(selectedKey),
          }))
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
