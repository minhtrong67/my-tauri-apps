import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The Vite app lives in ./app so that the landing page can own ./index.html at the repo root.
export default defineConfig({
  root: 'app',
  publicDir: '../public',
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: { port: 1420, strictPort: true, watch: { ignored: ['**/src-tauri/**'] } },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: { outDir: '../dist', emptyOutDir: true, target: ['chrome105', 'safari15'], sourcemap: false, chunkSizeWarningLimit: 900 },
});
