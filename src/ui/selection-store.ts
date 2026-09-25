import { z } from "zod";
import type { Direction, ScaleId, Shape } from "../theory/published";
import { defaultScaleChoice } from "../practice/published";
import type { SoundMode } from "../practice/published";
import {
  droneSoundSchema,
  type DroneSound,
} from "../sound/published/sound-command.schema";

export type StoredOctaves = "full" | 1 | 2 | 3 | 4;

export interface StoredSelection {
  readonly schemaVersion: 5;
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
    readonly soundMode: SoundMode;
    readonly loop: boolean;
    readonly countIn: boolean;
    readonly restBar: boolean;
    readonly tempoBpm: number;
  };
  readonly scale: { readonly major: ScaleId; readonly minor: ScaleId };
  readonly drone: {
    readonly octave: number | null;
    readonly sound: DroneSound;
  }; // null = nearest
}

export const firstRunDefaults: Omit<StoredSelection, "variantId" | "keyId"> = {
  schemaVersion: 5,
  spelling: "sharp",
  view: "names",
  degreesEnabled: true,
  distanceRingEnabled: true,
  staveNamesEnabled: false,
  traversal: { direction: "updown", octaves: 1, shape: "scale" },
  session: {
    soundMode: "both",
    loop: true,
    countIn: true,
    restBar: false,
    tempoBpm: 96,
  },
  scale: defaultScaleChoice,
  drone: { octave: null, sound: "warm" },
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
const soundModeSchema = z.enum(["notes", "both", "metronome"]);

// The sixteen catalogued scale ids (theory/published `ScaleId`, T002), in
// catalogue order. Zod has no way to derive an enum from a TS union type at
// runtime, so this list is kept in sync with `ScaleId` by hand, the same way
// `directionSchema`/`shapeSchema` above shadow their own theory-published
// unions.
const scaleIdSchema = z.enum([
  "major",
  "major-pentatonic",
  "lydian",
  "mixolydian",
  "harmonic-major",
  "natural-minor",
  "harmonic-minor",
  "melodic-minor-classical",
  "melodic-minor-jazz",
  "minor-pentatonic",
  "blues",
  "dorian",
  "phrygian",
  "locrian",
  "whole-tone",
  "chromatic",
]);

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
    soundMode: soundModeSchema,
    loop: z.boolean(),
    countIn: z.boolean(),
    restBar: z.boolean(),
    tempoBpm: z.number().int().min(40).max(200),
  }),
});

const storedSelectionV4Schema = storedSelectionV3Schema.extend({
  schemaVersion: z.literal(4),
  scale: z.object({
    major: scaleIdSchema,
    minor: scaleIdSchema,
  }),
});

// Unlike `tempoBpm` (REQ-011) — where a bad value fails the whole payload
// and everything falls back to first-run defaults — a bad drone octave or
// sound falls back on its own (REQ-009/S4): the drone is the one thing that
// never blocks restoring the rest of the stored state, so each field (and
// the group as a whole, if it isn't even an object) `.catch`es to its
// default instead of rejecting the payload.
const storedDroneSchema = z
  .object({
    octave: z.number().int().min(0).max(8).nullable().catch(null),
    sound: droneSoundSchema.catch("warm"),
  })
  .catch({ octave: null, sound: "warm" });

const storedSelectionV5Schema = storedSelectionV4Schema.extend({
  schemaVersion: z.literal(5),
  drone: storedDroneSchema,
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
  storedSelectionV5Schema,
  storedSelectionV4Schema,
  storedSelectionV3Schema,
  storedSelectionV2Schema,
  storedSelectionV1Schema,
]);

// Adds `scale` at its first-run defaults (REQ-011/S4) — every v3 field
// carries forward as-is; scale choice did not exist before this change.
// Returns the v4 shape, not `StoredSelection` — every v1–v4 payload still
// chains through v4 as before, then through `migrateFromV4` once, below.
function migrateFromV3(
  v3: z.infer<typeof storedSelectionV3Schema>,
): z.infer<typeof storedSelectionV4Schema> {
  return {
    schemaVersion: 4,
    variantId: v3.variantId,
    keyId: v3.keyId,
    spelling: v3.spelling,
    view: v3.view,
    degreesEnabled: v3.degreesEnabled,
    distanceRingEnabled: v3.distanceRingEnabled,
    staveNamesEnabled: v3.staveNamesEnabled,
    traversal: v3.traversal,
    session: v3.session,
    scale: firstRunDefaults.scale,
  };
}

// Drops span (REQ-012 supersedes it) and adds the traversal and session
// groups at their first-run defaults — the v2 preferences it carries are
// otherwise kept as-is. Chains through `migrateFromV3` for the `scale`
// default, the same way `migrateFromV1` chains through this function.
function migrateFromV2(
  v2: z.infer<typeof storedSelectionV2Schema>,
): z.infer<typeof storedSelectionV4Schema> {
  return migrateFromV3({
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
  });
}

// Chains through v2: only the ids carry forward, everything else takes
// the v2-then-v3 first-run defaults.
function migrateFromV1(
  v1: z.infer<typeof storedSelectionV1Schema>,
): z.infer<typeof storedSelectionV4Schema> {
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

// Copies every v4 field and adds `drone` at its first-run defaults
// (REQ-009/S3) — stored state from before this change carries nothing
// about the drone, so it starts unpinned and warm.
function migrateFromV4(
  v4: z.infer<typeof storedSelectionV4Schema>,
): StoredSelection {
  return {
    ...v4,
    schemaVersion: 5,
    drone: firstRunDefaults.drone,
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
        switch (result.data.schemaVersion) {
          case 1:
            return migrateFromV4(migrateFromV1(result.data));
          case 2:
            return migrateFromV4(migrateFromV2(result.data));
          case 3:
            return migrateFromV4(migrateFromV3(result.data));
          case 4:
            return migrateFromV4(result.data);
          case 5:
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
