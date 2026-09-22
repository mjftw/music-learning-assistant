import { expect, test } from "vitest";
import {
  firstRunDefaults,
  localStorageSelectionStore,
} from "../../../src/ui/selection-store";

const storageKey = "music-learning-assistant.selection.v1";

test("a v2 payload round-trips", () => {
  localStorage.clear();
  const store = localStorageSelectionStore(localStorage);
  const selection = {
    schemaVersion: 2 as const,
    variantId: "ocarina-bass-c",
    keyId: "Bb-major",
    spelling: "flat" as const,
    view: "stave" as const,
    span: "oct-1" as const,
    degreesEnabled: false,
    distanceRingEnabled: true,
    staveNamesEnabled: true,
  };
  store.save(selection);
  expect(store.load()).toEqual(selection);
});

test("a 001-shape v1 payload migrates: ids carried, the rest defaulted", () => {
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

test("junk still loads as null", () => {
  localStorage.setItem(storageKey, "{not json");
  expect(localStorageSelectionStore(localStorage).load()).toBeNull();
  localStorage.setItem(
    storageKey,
    JSON.stringify({ schemaVersion: 3, other: true }),
  );
  expect(localStorageSelectionStore(localStorage).load()).toBeNull();
});
