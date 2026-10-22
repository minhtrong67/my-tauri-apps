import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The web app lives in ./src (root of Vite). The landing page index.html at the
// project root is a standalone file and is not part of the app bundle.
export default defineConfig({
  root: "src",
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true, host: "127.0.0.1" },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "es2021",
    chunkSizeWarningLimit: 1200,
  },
});
