import type { Key } from "./keys";
import type { KeyViewNote } from "./key-view";
import { keyView } from "./key-view";
import type { Variant } from "../instruments/catalogue";

export type Span =
  | { readonly kind: "full" }
  | { readonly kind: "octaves"; readonly count: 1 | 2 | 3 | 4 }; // 1-4 octaves, ascending

export interface SpanChoice {
  readonly span: Span;
  readonly noteCount: number;
}

const OCTAVE_COUNTS = [1, 2, 3, 4] as const;

// An n-octave run is 7*n + 1 consecutive notes starting at a tonic
// (isRoot) — the index of the lowest tonic for which the run still fits
// within the key view's notes, or undefined if no tonic supports it.
function lowestTonicIndexFor(
  notes: readonly KeyViewNote[],
  octaveCount: number,
): number | undefined {
  const runLength = 7 * octaveCount;
  for (let index = 0; index < notes.length; index += 1) {
    if (!notes[index]!.isRoot) continue;
    if (index + runLength <= notes.length - 1) return index;
  }
  return undefined;
}

export function spanChoicesOf(
  key: Key,
  variant: Variant,
): readonly SpanChoice[] {
  const view = keyView(key, variant);
  const choices: SpanChoice[] = [];
  for (const octaveCount of OCTAVE_COUNTS) {
    const startIndex = lowestTonicIndexFor(view.notes, octaveCount);
    if (startIndex === undefined) continue;
    choices.push({
      span: { kind: "octaves", count: octaveCount },
      noteCount: 7 * octaveCount + 1,
    });
  }
  choices.push({ span: { kind: "full" }, noteCount: view.notes.length });
  return choices;
}

export function spanNotesOf(
  key: Key,
  variant: Variant,
  span: Span,
): readonly KeyViewNote[] {
  const view = keyView(key, variant);
  if (span.kind === "full") return view.notes;

  const startIndex = lowestTonicIndexFor(view.notes, span.count);
  if (startIndex === undefined) return view.notes;
  return view.notes.slice(startIndex, startIndex + 7 * span.count + 1);
}
