import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  root: "src/ui",
  // AudioWorklet and the Screen Wake Lock exist only in secure contexts:
  // localhost qualifies, a LAN address does not — so the dev server speaks
  // HTTPS (self-signed; accept the warning once on the phone). Dev-only;
  // production hosting is HTTPS in its own right (Article VII unaffected).
  plugins: [react(), basicSsl()],
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
  },
  test: {
    root: import.meta.dirname,
    environment: "jsdom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
