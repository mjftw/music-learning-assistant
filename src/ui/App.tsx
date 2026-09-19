import { useEffect, useState, type JSX } from "react";
import {
  circleOfFifths,
  keyId as keyIdOf,
  type Accidental,
  type Catalogue,
  type Key,
  type Variant,
} from "../theory/published";
import type { SelectionStore, StoredSelection } from "./selection-store";

const DEFAULT_VARIANT_ID = "flute-concert";
const DEFAULT_KEY_ID = "C-major";
const DEFAULT_NOTE_NAMES_VISIBLE = true;

const ACCIDENTAL_SYMBOL: Record<Accidental, string> = {
  flat: "♭",
  natural: "",
  sharp: "♯",
};

function findKeyById(keyId: string): Key | undefined {
  for (const position of circleOfFifths()) {
    for (const key of [...position.majors, ...position.minors]) {
      if (keyIdOf(key) === keyId) return key;
    }
  }
  return undefined;
}

function findVariantById(
  catalogue: Catalogue,
  variantId: string,
): Variant | undefined {
  for (const instrument of catalogue.instruments) {
    for (const variant of instrument.variants) {
      if (variant.variantId === variantId) return variant;
    }
  }
  return undefined;
}

function keyLabel(key: Key): string {
  const modeLabel = key.mode === "major" ? "major" : "minor";
  return `${key.tonic.letter}${ACCIDENTAL_SYMBOL[key.tonic.accidental]} ${modeLabel}`;
}

function variantLabel(variant: Variant): string {
  return `${variant.instrumentName} — ${variant.variantName}`;
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

  const variant =
    findVariantById(catalogue, selection.variantId) ??
    findVariantById(catalogue, DEFAULT_VARIANT_ID);
  const key = findKeyById(selection.keyId) ?? findKeyById(DEFAULT_KEY_ID);

  return (
    <div>
      <p data-testid="current-key">{key === undefined ? "" : keyLabel(key)}</p>
      <p data-testid="current-variant">
        {variant === undefined ? "" : variantLabel(variant)}
      </p>
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
