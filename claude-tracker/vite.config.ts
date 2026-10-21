import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// `vite --mode mock` chạy giao diện trên trình duyệt với dữ liệu giả (không cần Tauri/Rust).
export default defineConfig(({ mode }) => ({
  root: "app",
  plugins: [react()],
  clearScreen: false,
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { port: 1420, strictPort: true },
  build: { outDir: "../dist", emptyOutDir: true, target: "es2021", chunkSizeWarningLimit: 700 },
  resolve:
    mode === "mock"
      ? {
          alias: {
            "@tauri-apps/api/core": r("./app/src/mock/core.ts"),
            "@tauri-apps/api/event": r("./app/src/mock/event.ts"),
          },
        }
      : {},
}));
