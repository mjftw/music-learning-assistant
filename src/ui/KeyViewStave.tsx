import { useEffect, useRef, type CSSProperties, type JSX } from "react";
import { Formatter, Renderer, Stave, StaveNote, Voice } from "vexflow";
import type { Accidental, KeyView, Note } from "../theory/published";
import { noteLabel } from "./key-label";

// Default colours for the two styling tokens the spec names. Consumers may
// override either by setting the same custom property higher in the DOM
// (e.g. a page-level theme); the values here just give the tokens a value
// when nothing else does.
const ROOT_EMPHASIS_DEFAULT = "#b91c1c";
const NEW_ACCIDENTAL_DEFAULT = "#2563eb";

const STAVE_LEFT_MARGIN = 10;
const STAVE_TOP_MARGIN = 10;
const STAVE_HEIGHT = 150;
const NOTE_SPACING = 36;
const STAVE_RIGHT_PADDING = 60;

// VexFlow's addKeySignature looks up a canonical major-key spelling for a
// sharp/flat count (see its `keySignatures` table) — it only cares about the
// count, not the actual key, so any key with that many sharps/flats draws
// the same signature glyphs.
const SHARP_KEY_SPECS: readonly string[] = [
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
  "C#",
];
const FLAT_KEY_SPECS: readonly string[] = [
  "C",
  "F",
  "Bb",
  "Eb",
  "Ab",
  "Db",
  "Gb",
  "Cb",
];

function keySpecFor(signature: KeyView["signature"]): string {
  if (signature.kind === "sharps")
    return SHARP_KEY_SPECS[signature.count] ?? "C";
  if (signature.kind === "flats") return FLAT_KEY_SPECS[signature.count] ?? "C";
  return "C";
}

const ACCIDENTAL_SUFFIX: Record<Accidental, string> = {
  flat: "b",
  natural: "",
  sharp: "#",
};

// VexFlow's StaveNote key strings use the accidental suffix, not a drawn
// accidental glyph — the key signature already implies it, so no explicit
// `Accidental` modifier is added.
function vexKeyOf(note: Note): string {
  return `${note.letter.toLowerCase()}${ACCIDENTAL_SUFFIX[note.accidental]}/${note.octave}`;
}

function isNewAccidentalPitch(note: Note, view: KeyView): boolean {
  const newAccidental = view.newAccidental;
  return (
    newAccidental !== null &&
    note.letter === newAccidental.letter &&
    note.accidental === newAccidental.accidental
  );
}

function renderStave(container: HTMLDivElement, view: KeyView): void {
  container.innerHTML = "";

  const width =
    STAVE_LEFT_MARGIN * 2 +
    view.notes.length * NOTE_SPACING +
    STAVE_RIGHT_PADDING;
  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(width, STAVE_HEIGHT);
  const context = renderer.getContext();

  const stave = new Stave(
    STAVE_LEFT_MARGIN,
    STAVE_TOP_MARGIN,
    width - STAVE_LEFT_MARGIN * 2,
  );
  stave.addClef("treble").addKeySignature(keySpecFor(view.signature));
  stave.setContext(context).draw();

  if (view.notes.length === 0) return;

  const staveNotes = view.notes.map(({ note, isRoot }) => {
    const staveNote = new StaveNote({ keys: [vexKeyOf(note)], duration: "q" });
    if (isRoot) {
      staveNote.setStyle({
        fillStyle: "var(--root-emphasis)",
        strokeStyle: "var(--root-emphasis)",
      });
    } else if (isNewAccidentalPitch(note, view)) {
      staveNote.setStyle({
        fillStyle: "var(--new-accidental)",
        strokeStyle: "var(--new-accidental)",
      });
    }
    return staveNote;
  });

  const voice = new Voice({ numBeats: staveNotes.length, beatValue: 4 });
  voice.setStrict(false);
  voice.addTickables(staveNotes);
  new Formatter()
    .joinVoices([voice])
    .format([voice], width - STAVE_LEFT_MARGIN * 2 - STAVE_RIGHT_PADDING);
  voice.draw(context, stave);
}

// Defines the two styling tokens the spec names as CSS custom properties on
// the stave's wrapper, so every VexFlow-drawn SVG element beneath it (and
// any consumer's override further up the DOM) can reference them by name.
// Unchecked cast: React's `CSSProperties` type does not model custom
// properties (any key starting with `--`) at all, so TypeScript has no type
// for this shape; the browser accepts custom properties on any element's
// inline `style` regardless, so the value itself is valid at runtime.
const STYLE_TOKENS = {
  "--root-emphasis": ROOT_EMPHASIS_DEFAULT,
  "--new-accidental": NEW_ACCIDENTAL_DEFAULT,
} as CSSProperties;

export function KeyViewStave(props: {
  readonly view: KeyView;
  readonly noteNamesVisible: boolean;
}): JSX.Element {
  const { view, noteNamesVisible } = props;
  const staveContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = staveContainerRef.current;
    if (container === null) return;
    renderStave(container, view);
  }, [view]);

  return (
    <div data-testid="stave" style={STYLE_TOKENS}>
      <div ref={staveContainerRef} />
      {noteNamesVisible && (
        <div data-testid="note-names-row">
          {view.notes.map(({ note }) => (
            <div key={noteLabel(note)} data-testid="note-name">
              {noteLabel(note)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
