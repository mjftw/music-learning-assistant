import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  root: "src/ui",
  // AudioWorklet and the Screen Wake Lock exist only in secure contexts:
  // localhost qualifies, a LAN address does not. `pnpm dev` stays plain
  // HTTP for the laptop; `pnpm dev:phone` sets DEV_HTTPS so the phone can
  // reach a secure context over the LAN (self-signed — accept the warning
  // once). Dev-only; production hosting is HTTPS in its own right.
  plugins: [react(), ...(process.env.DEV_HTTPS ? [basicSsl()] : [])],
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
