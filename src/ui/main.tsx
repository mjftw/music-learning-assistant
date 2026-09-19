import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { builtInCatalogue } from "../theory/published";
import { App } from "./App";
import { localStorageSelectionStore } from "./selection-store";

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <App
      catalogue={builtInCatalogue()}
      selectionStore={localStorageSelectionStore(window.localStorage)}
    />
  </StrictMode>,
);
