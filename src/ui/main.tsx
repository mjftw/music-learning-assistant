import "@fontsource/instrument-serif";
import "@fontsource/noto-music";
import "@fontsource/public-sans";
import "@fontsource/public-sans/500.css";
import "@fontsource/public-sans/600.css";
import "@fontsource/public-sans/700.css";
import "@fontsource/jetbrains-mono";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "./global.css";
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
