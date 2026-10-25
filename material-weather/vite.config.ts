import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { existsSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The project root `index.html` is the marketing landing page (hosted as a static site),
 * so the Tauri app uses `app.html` as its Vite entry:
 *  - dev:   `/` is served from app.html
 *  - build: dist/app.html is renamed to dist/index.html (what Tauri loads)
 */
function appEntry(): Plugin {
  return {
    name: 'material-weather:app-entry',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/' || req.url === '/index.html' || req.url?.startsWith('/?')) req.url = '/app.html';
        next();
      });
    },
    closeBundle() {
      const from = resolve(__dirname, 'dist/app.html');
      if (existsSync(from)) renameSync(from, resolve(__dirname, 'dist/index.html'));
    },
  };
}

// Tauri expects a fixed dev-server port (see src-tauri/tauri.conf.json -> build.devUrl)
export default defineConfig({
  plugins: [react(), tailwindcss(), appEntry()],
  clearScreen: false,
  server: {
    host: '127.0.0.1',
    port: 1420,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  build: {
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: { input: resolve(__dirname, 'app.html') },
  },
});
