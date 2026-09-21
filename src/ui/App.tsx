import { useEffect, useState, type JSX } from "react";
import {
  circleOfFifths,
  keyId as keyIdOf,
  keyView,
  spanChoicesOf,
  spanNotesOf,
  spelledMajorAt,
  spelledMinorAt,
  type Catalogue,
  type Key,
  type KeyView,
  type Mode,
  type Span,
  type SpellingPreference,
  type Variant,
} from "../theory/published";
import { findVariantById } from "./catalogue-lookup";
import { CircleOfFifths, locateSpelledKey } from "./CircleOfFifths";
import { Header } from "./Header";
import { InstrumentSheet } from "./InstrumentSheet";
import { keyLabel, noteLabel, pitchClassLabel } from "./key-label";
import { KeyPanel, type SpanChoicePill } from "./KeyPanel";
import { NamesView } from "./NamesView";
import { Notices } from "./Notices";
import {
  firstRunDefaults,
  type SelectionStore,
  type StoredSelection,
  type StoredSpan,
} from "./selection-store";
import { SettingsDrawer } from "./SettingsDrawer";
import { StaveView } from "./StaveView";
import { fonts } from "./theme";

const DEFAULT_VARIANT_ID = "flute-concert";
const DEFAULT_KEY_ID = "C-major";

function headerInstrumentLabel(variant: Variant): string {
  return `${variant.instrumentName} ${variant.variantName}`;
}

function headerRangeLabel(variant: Variant): string {
  return `${noteLabel(variant.range.lowest)}–${noteLabel(variant.range.highest)}`;
}

// Maps the store's stringly-typed span (`'full' | 'oct-1'…'oct-4'`) to and
// from the `Span` sum type published/consumed by the theory context (T004's
// `spanChoicesOf`/`spanNotesOf`) — see .sdd/briefs/002-circle-redesign/
// T009.md's additional context.
function spanFromStored(stored: StoredSpan): Span {
  if (stored === "full") return { kind: "full" };
  const count = Number(stored.slice("oct-".length));
  if (count !== 1 && count !== 2 && count !== 3 && count !== 4) {
    throw new Error(`unreachable: invalid stored span "${stored}"`);
  }
  return { kind: "octaves", count };
}

function storedFromSpan(span: Span): StoredSpan {
  return span.kind === "full" ? "full" : (`oct-${span.count}` as StoredSpan);
}

function spanEquals(a: Span, b: Span): boolean {
  if (a.kind === "full" || b.kind === "full") return a.kind === b.kind;
  return a.count === b.count;
}

function spanPillLabel(span: Span): string {
  return span.kind === "full" ? "full" : `${span.count} oct`;
}

// "22 notes · C4–C7" — the full in-range note count and extremes
// (theory.circle-of-fifths/REQ-003), independent of the chosen span.
function rangeSummaryText(view: KeyView): string {
  const first = view.notes[0];
  const last = view.notes[view.notes.length - 1];
  if (first === undefined || last === undefined)
    return "no notes of this key in range";
  return `${view.notes.length} notes · ${noteLabel(first.note)}–${noteLabel(last.note)}`;
}

// "1 oct from G · 8" / "all 22 in range" (theory.circle-of-fifths/REQ-011).
function spanCaptionText(
  span: Span,
  tonic: Key["tonic"],
  shownNoteCount: number,
): string {
  return span.kind === "full"
    ? `all ${shownNoteCount} in range`
    : `${span.count} oct from ${pitchClassLabel(tonic)} · ${shownNoteCount}`;
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
  readonly span: Span;
  readonly degreesEnabled: boolean;
  readonly distanceRingEnabled: boolean;
  readonly staveNamesEnabled: boolean;
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
    span: spanFromStored(firstRunDefaults.span),
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
    span: spanFromStored(stored.span),
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
      span: storedFromSpan(selection.span),
      degreesEnabled: selection.degreesEnabled,
      distanceRingEnabled: selection.distanceRingEnabled,
      staveNamesEnabled: selection.staveNamesEnabled,
    };
    selectionStore.save(toSave);
  }, [selection, selectedKey, selectionStore]);

  // theory.circle-of-fifths/REQ-011: once the key or variant changes, a
  // span the user had chosen may no longer fit — reset to full rather than
  // showing a span the pills no longer offer.
  useEffect(() => {
    if (variant === undefined) return;
    const stillOffered = spanChoicesOf(selectedKey, variant).some((choice) =>
      spanEquals(choice.span, selection.span),
    );
    if (stillOffered) return;
    setSelection((current) => ({ ...current, span: { kind: "full" } }));
  }, [keyIdOf(selectedKey), selection.variantId, variant, selection.span]);

  const view =
    variant === undefined ? undefined : keyView(selectedKey, variant);
  const spanChoices: readonly SpanChoicePill[] =
    variant === undefined
      ? []
      : spanChoicesOf(selectedKey, variant).map((choice) => ({
          key: spanPillLabel(choice.span),
          label: spanPillLabel(choice.span),
          active: spanEquals(choice.span, selection.span),
          onSelect: () =>
            setSelection((current) => ({ ...current, span: choice.span })),
        }));
  const shownSpanNoteCount =
    variant === undefined
      ? 0
      : spanNotesOf(selectedKey, variant, selection.span).length;

  return (
    <div style={{ fontFamily: fonts.body, position: "relative" }}>
      <Header
        variantLabel={
          variant === undefined ? "" : headerInstrumentLabel(variant)
        }
        rangeLabel={variant === undefined ? "" : headerRangeLabel(variant)}
        onOpenPicker={() => setInstrumentSheetOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <Notices notices={catalogue.notices} />
      <div
        data-testid="current-key"
        style={{ fontFamily: fonts.display, fontSize: 46 }}
      >
        {keyLabel(selectedKey)}
      </div>
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
      <KeyPanel
        view={selection.view}
        onSelectView={(selectedView) =>
          setSelection((current) => ({ ...current, view: selectedView }))
        }
        rangeSummary={view === undefined ? "" : rangeSummaryText(view)}
        spanCaption={spanCaptionText(
          selection.span,
          selectedKey.tonic,
          shownSpanNoteCount,
        )}
        spanChoices={spanChoices}
      >
        {selection.view === "names" ? (
          <NamesView
            key_={selectedKey}
            degreesEnabled={selection.degreesEnabled}
          />
        ) : (
          variant !== undefined && (
            <StaveView
              key_={selectedKey}
              variant={variant}
              span={selection.span}
              staveNamesEnabled={selection.staveNamesEnabled}
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
