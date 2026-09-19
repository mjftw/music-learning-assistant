/// <reference types="vite/client" />
import { z } from "zod";
import type { Note } from "../domain/notes";
import { parseNoteString, pitchPosition } from "../domain/notes";

export type VariantId = string & { readonly __brand: "VariantId" };

export interface NoteRange {
  readonly lowest: Note;
  readonly highest: Note;
}

export interface Variant {
  readonly instrumentId: string;
  readonly instrumentName: string;
  readonly variantId: VariantId;
  readonly variantName: string;
  readonly range: NoteRange;
}

export interface Instrument {
  readonly instrumentId: string;
  readonly instrumentName: string;
  readonly variants: readonly Variant[];
}

export interface CatalogueNotice {
  readonly source: string;
  readonly problem: string;
}

export interface Catalogue {
  readonly instruments: readonly Instrument[];
  readonly notices: readonly CatalogueNotice[];
}

const NOTE_STRING_PATTERN = /^([A-G])(#|b)?([0-8])$/;

const noteStringSchema = z
  .string()
  .regex(
    NOTE_STRING_PATTERN,
    'not a valid note (expected e.g. "A4", "F#5", "Bb3")',
  )
  .transform((value, ctx) => {
    const note = parseNoteString(value);
    if (note === null) {
      ctx.addIssue({ code: "custom", message: `invalid note "${value}"` });
      return z.NEVER;
    }
    return note;
  });

const variantFileSchema = z
  .object({
    instrumentId: z.string().min(1),
    instrumentName: z.string().min(1),
    variantId: z.string().min(1),
    variantName: z.string().min(1),
    range: z.object({
      lowest: noteStringSchema,
      highest: noteStringSchema,
    }),
  })
  .superRefine((value, ctx) => {
    if (
      pitchPosition(value.range.lowest) >= pitchPosition(value.range.highest)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["range"],
        message: "range: lowest must be below highest",
      });
    }
  });

function describeIssues(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

export function loadCatalogue(files: ReadonlyMap<string, unknown>): Catalogue {
  const instrumentsById = new Map<
    string,
    { instrumentName: string; variants: Variant[] }
  >();
  const notices: CatalogueNotice[] = [];

  for (const [source, contents] of files) {
    const result = variantFileSchema.safeParse(contents);
    if (!result.success) {
      notices.push({ source, problem: describeIssues(result.error) });
      continue;
    }

    const file = result.data;
    const variant: Variant = {
      instrumentId: file.instrumentId,
      instrumentName: file.instrumentName,
      variantId: file.variantId as VariantId,
      variantName: file.variantName,
      range: file.range,
    };

    const existing = instrumentsById.get(file.instrumentId);
    if (existing === undefined) {
      instrumentsById.set(file.instrumentId, {
        instrumentName: file.instrumentName,
        variants: [variant],
      });
    } else {
      existing.variants.push(variant);
    }
  }

  const instruments: Instrument[] = Array.from(instrumentsById.entries()).map(
    ([instrumentId, { instrumentName, variants }]) => ({
      instrumentId,
      instrumentName,
      variants,
    }),
  );

  return { instruments, notices };
}

export function builtInCatalogue(): Catalogue {
  const modules = import.meta.glob("./data/*.json", {
    eager: true,
    import: "default",
  });
  const files = new Map<string, unknown>(
    Object.entries(modules).map(([path, contents]) => [
      path.split("/").pop() ?? path,
      contents,
    ]),
  );
  return loadCatalogue(files);
}
