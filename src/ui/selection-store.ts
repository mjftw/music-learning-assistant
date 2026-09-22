import { z } from "zod";

export interface StoredSelection {
  readonly schemaVersion: 1;
  readonly variantId: string;
  readonly keyId: string;
  readonly noteNamesVisible: boolean;
}

export interface SelectionStore {
  load(): StoredSelection | null;
  save(selection: StoredSelection): void;
}

const STORAGE_KEY = "music-learning-assistant.selection.v1";

const storedSelectionSchema = z.object({
  schemaVersion: z.literal(1),
  variantId: z.string(),
  keyId: z.string(),
  noteNamesVisible: z.boolean(),
});

export function localStorageSelectionStore(storage: Storage): SelectionStore {
  return {
    load(): StoredSelection | null {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      try {
        const parsed: unknown = JSON.parse(raw);
        const result = storedSelectionSchema.safeParse(parsed);
        return result.success ? result.data : null;
      } catch {
        return null;
      }
    },
    save(selection: StoredSelection): void {
      storage.setItem(STORAGE_KEY, JSON.stringify(selection));
    },
  };
}
