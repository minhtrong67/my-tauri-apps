import { defineConfig } from 'vite';

// https://v2.tauri.app/start/frontend/vite/
export default defineConfig({
  clearScreen: false,
  server: { port: 1420, strictPort: true, watch: { ignored: ['**/src-tauri/**'] } },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    target: ['chrome105', 'safari15'],
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
  },
});
