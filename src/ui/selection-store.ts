import { z } from "zod";

export type StoredSpan = "full" | "oct-1" | "oct-2" | "oct-3" | "oct-4";

export interface StoredSelection {
  readonly schemaVersion: 2;
  readonly variantId: string;
  readonly keyId: string;
  readonly spelling: "sharp" | "flat";
  readonly view: "names" | "stave";
  readonly span: StoredSpan;
  readonly degreesEnabled: boolean;
  readonly distanceRingEnabled: boolean;
  readonly staveNamesEnabled: boolean;
}

export const firstRunDefaults: Omit<StoredSelection, "variantId" | "keyId"> = {
  schemaVersion: 2,
  spelling: "sharp",
  view: "names",
  span: "full",
  degreesEnabled: true,
  distanceRingEnabled: true,
  staveNamesEnabled: false,
};

export interface SelectionStore {
  load(): StoredSelection | null;
  save(selection: StoredSelection): void;
}

const STORAGE_KEY = "music-learning-assistant.selection.v1";

const storedSpanSchema = z.enum(["full", "oct-1", "oct-2", "oct-3", "oct-4"]);

const storedSelectionV2Schema = z.object({
  schemaVersion: z.literal(2),
  variantId: z.string(),
  keyId: z.string(),
  spelling: z.enum(["sharp", "flat"]),
  view: z.enum(["names", "stave"]),
  span: storedSpanSchema,
  degreesEnabled: z.boolean(),
  distanceRingEnabled: z.boolean(),
  staveNamesEnabled: z.boolean(),
});

const storedSelectionV1Schema = z.object({
  schemaVersion: z.literal(1),
  variantId: z.string(),
  keyId: z.string(),
  noteNamesVisible: z.boolean(),
});

const storedSelectionSchema = z.union([
  storedSelectionV2Schema,
  storedSelectionV1Schema,
]);

function migrateFromV1(
  v1: z.infer<typeof storedSelectionV1Schema>,
): StoredSelection {
  return {
    ...firstRunDefaults,
    variantId: v1.variantId,
    keyId: v1.keyId,
  };
}

export function localStorageSelectionStore(storage: Storage): SelectionStore {
  return {
    load(): StoredSelection | null {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      try {
        const parsed: unknown = JSON.parse(raw);
        const result = storedSelectionSchema.safeParse(parsed);
        if (!result.success) return null;
        return result.data.schemaVersion === 1
          ? migrateFromV1(result.data)
          : result.data;
      } catch {
        return null;
      }
    },
    save(selection: StoredSelection): void {
      storage.setItem(STORAGE_KEY, JSON.stringify(selection));
    },
  };
}
