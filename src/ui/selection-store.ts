import { z } from "zod";
import type { Direction, Shape } from "../theory/published";
import type { NoteLength, SoundMode } from "../practice/published";

export type StoredOctaves = "full" | 1 | 2 | 3 | 4;

export interface StoredSelection {
  readonly schemaVersion: 3;
  readonly variantId: string;
  readonly keyId: string;
  readonly spelling: "sharp" | "flat";
  readonly view: "names" | "stave";
  readonly degreesEnabled: boolean;
  readonly distanceRingEnabled: boolean;
  readonly staveNamesEnabled: boolean;
  readonly traversal: {
    readonly direction: Direction;
    readonly octaves: StoredOctaves;
    readonly shape: Shape;
  };
  readonly session: {
    readonly noteLength: NoteLength;
    readonly soundMode: SoundMode;
    readonly loop: boolean;
    readonly countIn: boolean;
    readonly restBar: boolean;
    readonly tempoBpm: number;
  };
}

export const firstRunDefaults: Omit<StoredSelection, "variantId" | "keyId"> = {
  schemaVersion: 3,
  spelling: "sharp",
  view: "names",
  degreesEnabled: true,
  distanceRingEnabled: true,
  staveNamesEnabled: false,
  traversal: { direction: "updown", octaves: 1, shape: "scale" },
  session: {
    noteLength: "crotchet",
    soundMode: "both",
    loop: true,
    countIn: true,
    restBar: false,
    tempoBpm: 96,
  },
};

export interface SelectionStore {
  load(): StoredSelection | null;
  save(selection: StoredSelection): void;
}

const STORAGE_KEY = "music-learning-assistant.selection.v1";

const storedOctavesSchema = z.union([
  z.literal("full"),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

const directionSchema = z.enum(["up", "down", "updown"]);
const shapeSchema = z.enum(["scale", "arpeggio"]);
const noteLengthSchema = z.enum(["crotchet", "quaver"]);
const soundModeSchema = z.enum(["notes", "both", "metronome"]);

const storedSelectionV3Schema = z.object({
  schemaVersion: z.literal(3),
  variantId: z.string(),
  keyId: z.string(),
  spelling: z.enum(["sharp", "flat"]),
  view: z.enum(["names", "stave"]),
  degreesEnabled: z.boolean(),
  distanceRingEnabled: z.boolean(),
  staveNamesEnabled: z.boolean(),
  traversal: z.object({
    direction: directionSchema,
    octaves: storedOctavesSchema,
    shape: shapeSchema,
  }),
  session: z.object({
    noteLength: noteLengthSchema,
    soundMode: soundModeSchema,
    loop: z.boolean(),
    countIn: z.boolean(),
    restBar: z.boolean(),
    tempoBpm: z.number().int().min(40).max(200),
  }),
});

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
  storedSelectionV3Schema,
  storedSelectionV2Schema,
  storedSelectionV1Schema,
]);

// Drops span (REQ-012 supersedes it) and adds the traversal and session
// groups at their first-run defaults — the v2 preferences it carries are
// otherwise kept as-is.
function migrateFromV2(
  v2: z.infer<typeof storedSelectionV2Schema>,
): StoredSelection {
  return {
    schemaVersion: 3,
    variantId: v2.variantId,
    keyId: v2.keyId,
    spelling: v2.spelling,
    view: v2.view,
    degreesEnabled: v2.degreesEnabled,
    distanceRingEnabled: v2.distanceRingEnabled,
    staveNamesEnabled: v2.staveNamesEnabled,
    traversal: firstRunDefaults.traversal,
    session: firstRunDefaults.session,
  };
}

// Chains through v2: only the ids carry forward, everything else takes
// the v2-then-v3 first-run defaults.
function migrateFromV1(
  v1: z.infer<typeof storedSelectionV1Schema>,
): StoredSelection {
  return migrateFromV2({
    schemaVersion: 2,
    variantId: v1.variantId,
    keyId: v1.keyId,
    spelling: "sharp",
    view: "names",
    span: "full",
    degreesEnabled: true,
    distanceRingEnabled: true,
    staveNamesEnabled: false,
  });
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
        switch (result.data.schemaVersion) {
          case 1:
            return migrateFromV1(result.data);
          case 2:
            return migrateFromV2(result.data);
          case 3:
            return result.data;
        }
      } catch {
        return null;
      }
    },
    save(selection: StoredSelection): void {
      storage.setItem(STORAGE_KEY, JSON.stringify(selection));
    },
  };
}
