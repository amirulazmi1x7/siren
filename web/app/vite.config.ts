/// <reference types="vitest" />
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// web/data/ is the shared data folder (Person A writes scenarios.json there).
// Serving it as the public dir keeps that path unchanged:
//   web/data/scenarios.json  ->  /scenarios.json (dev and build)
export default defineConfig({
  plugins: [react()],
  publicDir: resolve(__dirname, "../data"),
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        schedule: resolve(__dirname, "schedule.html"),
      },
    },
  },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
