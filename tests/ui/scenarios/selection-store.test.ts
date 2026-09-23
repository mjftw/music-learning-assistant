import { expect, test } from "vitest";
import {
  firstRunDefaults,
  localStorageSelectionStore,
  type StoredSelection,
} from "../../../src/ui/selection-store";

const storageKey = "music-learning-assistant.selection.v1";

test("a v3 payload round-trips (practice.session/REQ-011/S1, theory.circle-of-fifths/REQ-008/S1)", () => {
  localStorage.clear();
  const store = localStorageSelectionStore(localStorage);
  const selection: StoredSelection = {
    schemaVersion: 3,
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
  };
  store.save(selection);
  expect(store.load()).toEqual(selection);
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
    schemaVersion: 3,
    variantId: "ocarina-bass-c",
    keyId: "Bb-major",
    spelling: "flat",
    view: "stave",
    degreesEnabled: false,
    distanceRingEnabled: true,
    staveNamesEnabled: true,
    traversal: firstRunDefaults.traversal,
    session: firstRunDefaults.session,
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
    schemaVersion: 3,
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
  });
});

test("corrupt or unrecognised stored state loads as null (theory.circle-of-fifths/REQ-008/S3)", () => {
  localStorage.setItem(storageKey, "{not json");
  expect(localStorageSelectionStore(localStorage).load()).toBeNull();
  localStorage.setItem(storageKey, JSON.stringify({ schemaVersion: 9 }));
  expect(localStorageSelectionStore(localStorage).load()).toBeNull();
});
