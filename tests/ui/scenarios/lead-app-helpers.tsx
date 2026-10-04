import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { builtInCatalogue } from "../../../src/theory/published";
import { App } from "../../../src/ui/App";
import {
  firstRunDefaults,
  localStorageSelectionStore,
  type StoredSelection,
} from "../../../src/ui/selection-store";
import { sessionDepsWithFakes } from "../../practice/fakes";

export const STORAGE_KEY = "music-learning-assistant.selection.v1";
export const frameOfMs = (ms: number): number =>
  Math.round((ms * 48000) / 1000);
export const HOP_MS = 512_000 / 48000;

/** C major on flute Concert, ↑↓ 1 oct — 15 notes · C4–C5 — stored at v6 with `lead` overridden. */
export function storedCMajor(
  lead: Partial<StoredSelection["session"]["lead"]> = {},
  rest: Partial<StoredSelection> = {},
): StoredSelection {
  return {
    ...firstRunDefaults,
    variantId: "flute-concert",
    keyId: "C-major",
    ...rest,
    session: {
      ...firstRunDefaults.session,
      ...rest.session,
      lead: { ...firstRunDefaults.session.lead, ...lead },
    },
  };
}

export function renderLeadApp(stored: StoredSelection = storedCMajor()) {
  localStorage.clear();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  const fakes = sessionDepsWithFakes();
  render(
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(localStorage)}
      sessionDeps={fakes.sessionDeps}
    />,
  );
  return { ...fakes, user: userEvent.setup() };
}

export type LeadApp = ReturnType<typeof renderLeadApp>;

export async function flushApp(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

/** Taps "I lead" (if not already) and the start circle, past the session's two awaits. */
export async function startLeadInApp(app: LeadApp): Promise<void> {
  if (screen.getByTestId("mode-word-me").style.color !== "rgb(28, 25, 22)")
    await app.user.click(screen.getByTestId("mode-word-me"));
  await app.user.click(screen.getByTestId("start-circle"));
  await flushApp();
}

export function hearInApp(app: LeadApp, hz: number, atMs: number): void {
  act(() => {
    app.listening.frame = frameOfMs(atMs);
    app.listening.feed(hz, app.listening.frame);
    app.clock.advance(1);
  });
}

export function hearSteadyInApp(
  app: LeadApp,
  hz: number,
  fromMs: number,
  toMs: number,
): number {
  let t = fromMs;
  for (; t <= toMs; t += HOP_MS) hearInApp(app, hz, t);
  return t - HOP_MS;
}

export function silenceInApp(app: LeadApp, ms: number): void {
  act(() => app.clock.advance(ms));
}

/** Opens the Traversal sheet (REQ-020). */
export async function openSheet(app: LeadApp): Promise<void> {
  await app.user.click(screen.getByRole("button", { name: "Edit traversal" }));
}

/** A sheet row by its `data-row` (REQ-020). */
export function row(name: string): HTMLElement {
  return screen
    .getAllByTestId("sheet-row")
    .find((r) => r.dataset.row === name)!;
}

/** A pill labelled `label` within row `name` (REQ-020). */
export function pill(name: string, label: string): HTMLElement {
  return within(row(name)).getByText(label);
}

/** Whether the pill labelled `label` in row `name` is the selected one (REQ-020). */
export function pillSelected(name: string, label: string): boolean {
  return pill(name, label).style.background === "rgb(231, 220, 198)";
}
