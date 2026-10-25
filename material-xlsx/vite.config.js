import { defineConfig } from "vite";

// The UI lives in src/ (vanilla ES modules). Static vendor files (exceljs, fonts) are served from src/public.
export default defineConfig({
  root: "src",
  base: "./",
  clearScreen: false,
  server: { port: 1420, strictPort: true, host: "localhost" },
  build: { outDir: "../dist", emptyOutDir: true, target: ["chrome105", "safari15"], chunkSizeWarningLimit: 1200 },
});
