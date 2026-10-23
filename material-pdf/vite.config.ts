import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The frontend lives in ./app so that ./index.html (project root) can be the landing page.
export default defineConfig({
  root: "app",
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "es2022",
    chunkSizeWarningLimit: 1500,
  },
});
