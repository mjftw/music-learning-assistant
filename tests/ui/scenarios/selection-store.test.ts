import { expect, test } from "vitest";
import {
  firstRunDefaults,
  localStorageSelectionStore,
  type StoredSelection,
} from "../../../src/ui/selection-store";

const storageKey = "music-learning-assistant.selection.v1";

test("a v4 payload round-trips (practice.session/REQ-011/S1, theory.circle-of-fifths/REQ-008/S1)", () => {
  localStorage.clear();
  const store = localStorageSelectionStore(localStorage);
  const selection: StoredSelection = {
    schemaVersion: 5,
    variantId: "ocarina-bass-c",
    keyId: "Bb-major",
    spelling: "flat",
    view: "stave",
    degreesEnabled: false,
    distanceRingEnabled: true,
    staveNamesEnabled: true,
    traversal: { direction: "down", octaves: 2, shape: "arpeggio" },
    session: {
      soundMode: "metronome",
      loop: false,
      countIn: false,
      restBar: true,
      tempoBpm: 132,
    },
    scale: { major: "lydian", minor: "dorian" },
    drone: { octave: null, sound: "warm" },
  };
  store.save(selection);
  expect(store.load()).toEqual(selection);
});

test("a v3 payload migrates: everything kept, scale defaults to Major / Natural minor (practice.session/REQ-011/S4)", () => {
  localStorage.clear();
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      schemaVersion: 3,
      variantId: "flute-concert",
      keyId: "G-major",
      spelling: "sharp",
      view: "stave",
      degreesEnabled: true,
      distanceRingEnabled: false,
      staveNamesEnabled: true,
      traversal: { direction: "down", octaves: 2, shape: "arpeggio" },
      session: {
        soundMode: "notes",
        loop: false,
        countIn: true,
        restBar: false,
        tempoBpm: 120,
      },
    }),
  );
  const loaded = localStorageSelectionStore(localStorage).load();
  expect(loaded?.schemaVersion).toBe(5);
  expect(loaded?.drone).toEqual({ octave: null, sound: "warm" });
  expect(loaded?.scale).toEqual({ major: "major", minor: "natural-minor" });
  expect(loaded?.traversal).toEqual({
    direction: "down",
    octaves: 2,
    shape: "arpeggio",
  });
  expect(loaded?.session.tempoBpm).toBe(120);
});

test("an unknown scale id makes the payload unreadable → null (practice.session/REQ-011)", () => {
  localStorage.clear();
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      ...firstRunDefaults,
      variantId: "flute-concert",
      keyId: "C-major",
      scale: { major: "ionian", minor: "natural-minor" },
    }),
  );
  expect(localStorageSelectionStore(localStorage).load()).toBeNull();
});

test("a v2 payload migrates: preferences kept, traversal and session default, span dropped (practice.session/REQ-011/S3, theory.circle-of-fifths/REQ-008/S4)", () => {
  localStorage.clear();
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      schemaVersion: 2,
      variantId: "ocarina-bass-c",
      keyId: "Bb-major",
      spelling: "flat",
      view: "stave",
      span: "oct-1",
      degreesEnabled: false,
      distanceRingEnabled: true,
      staveNamesEnabled: true,
    }),
  );
  const loaded = localStorageSelectionStore(localStorage).load();
  expect(loaded).toEqual({
    schemaVersion: 5,
    variantId: "ocarina-bass-c",
    keyId: "Bb-major",
    spelling: "flat",
    view: "stave",
    degreesEnabled: false,
    distanceRingEnabled: true,
    staveNamesEnabled: true,
    traversal: firstRunDefaults.traversal,
    session: firstRunDefaults.session,
    scale: firstRunDefaults.scale,
    drone: firstRunDefaults.drone,
  });
  expect(loaded).not.toHaveProperty("span");
});

test("a 001-shape v1 payload migrates: ids carried, the rest defaulted (practice.session/REQ-011/S3, theory.circle-of-fifths/REQ-008/S4)", () => {
  localStorage.clear();
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      schemaVersion: 1,
      variantId: "ocarina-alto-c",
      keyId: "G-major",
      noteNamesVisible: false,
    }),
  );
  const loaded = localStorageSelectionStore(localStorage).load();
  expect(loaded).toEqual({
    variantId: "ocarina-alto-c",
    keyId: "G-major",
    ...firstRunDefaults,
  });
});

test("empty storage loads as null; first-run defaults match the spec (practice.session/REQ-011/S2, theory.circle-of-fifths/REQ-008/S2)", () => {
  localStorage.clear();
  expect(localStorageSelectionStore(localStorage).load()).toBeNull();
  expect(firstRunDefaults).toEqual({
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
    scale: { major: "major", minor: "natural-minor" },
    drone: { octave: null, sound: "warm" },
  });
});

test("corrupt or unrecognised stored state loads as null (theory.circle-of-fifths/REQ-008/S3)", () => {
  localStorage.setItem(storageKey, "{not json");
  expect(localStorageSelectionStore(localStorage).load()).toBeNull();
  localStorage.setItem(storageKey, JSON.stringify({ schemaVersion: 9 }));
  expect(localStorageSelectionStore(localStorage).load()).toBeNull();
});

// The file's v4 fixture (stored state from 005 — practice.drone/REQ-009/S3)
// and the v5 object migrating it is expected to produce.
const v4Payload = {
  schemaVersion: 4 as const,
  variantId: "ocarina-alto-c",
  keyId: "D-major",
  spelling: "sharp" as const,
  view: "names" as const,
  degreesEnabled: true,
  distanceRingEnabled: false,
  staveNamesEnabled: true,
  traversal: {
    direction: "up" as const,
    octaves: 2 as const,
    shape: "scale" as const,
  },
  session: {
    soundMode: "notes" as const,
    loop: true,
    countIn: false,
    restBar: true,
    tempoBpm: 108,
  },
  scale: { major: "mixolydian" as const, minor: "dorian" as const },
};

const migrateExpectation: StoredSelection = {
  ...v4Payload,
  schemaVersion: 5,
  drone: { octave: null, sound: "warm" },
};

test("practice.drone/REQ-009/S3 — stored state from 005 (v4) restores everything it carries; the drone takes its defaults", () => {
  localStorage.clear();
  localStorage.setItem(storageKey, JSON.stringify(v4Payload));
  const loaded = localStorageSelectionStore(localStorage).load();
  expect(loaded?.schemaVersion).toBe(5);
  expect(loaded?.drone).toEqual({ octave: null, sound: "warm" });
  expect(loaded?.scale).toEqual(v4Payload.scale);
  expect(loaded?.session.tempoBpm).toBe(v4Payload.session.tempoBpm);
});

test("practice.drone/REQ-009/S4 — an unreadable octave or sound falls back on its own; the rest is restored", () => {
  localStorage.clear();
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      ...v4Payload,
      schemaVersion: 5,
      drone: { octave: 12, sound: "bright" },
    }),
  );
  const loaded = localStorageSelectionStore(localStorage).load();
  expect(loaded?.drone).toEqual({ octave: null, sound: "warm" });
  expect(loaded?.keyId).toBe(v4Payload.keyId);
  expect(loaded?.session).toEqual(v4Payload.session);
});

test("practice.drone/REQ-009 — a v5 payload round-trips", () => {
  localStorage.clear();
  const store = localStorageSelectionStore(localStorage);
  const v5: StoredSelection = {
    ...migrateExpectation,
    drone: { octave: 4, sound: "reed" },
  };
  store.save(v5);
  expect(store.load()).toEqual(v5);
});
