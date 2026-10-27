import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The Vite root is ./src so that the landing page can live at the project root as index.html.
export default defineConfig({
  root: "src",
  publicDir: "public",
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: { port: 1420, strictPort: true, host: "127.0.0.1" },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "chrome105",
    chunkSizeWarningLimit: 900,
  },
});
