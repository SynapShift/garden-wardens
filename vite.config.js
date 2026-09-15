import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: { sourcemap: false, chunkSizeWarningLimit: 1400 },
});
