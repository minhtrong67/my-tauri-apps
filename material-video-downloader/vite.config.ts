import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
// The root index.html is the public landing page (GitHub Pages friendly), so the desktop app's
// entry lives in ./app/index.html. Build output still goes to ./dist for Tauri.
export default defineConfig({
  root: here("./app"),
  publicDir: here("./public"),
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 1420,
    fs: { allow: [here(".")] },
    strictPort: true,
    host: host || false,
    watch: { ignored: ["**/src-tauri/**", "**/extension/**"] },
  },
  build: {
    target: "es2021",
    outDir: here("./dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
  },
});
