import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

// Giao diện ứng dụng nằm trong ./app (root của Vite).
export default defineConfig({
  root: "app",
  plugins: [react()],
  clearScreen: false,
  css: { postcss: { plugins: [tailwindcss({ config: "./tailwind.config.js" }), autoprefixer()] } },
  server: { port: 1420, strictPort: true, host: "127.0.0.1" },
  build: { outDir: "../dist", emptyOutDir: true, target: "chrome105", sourcemap: false },
});
