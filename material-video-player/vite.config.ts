import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The project root holds the public landing page (index.html), so the app itself uses app.html as its entry.
 * After the build the app page is renamed to dist/index.html, which is what Tauri loads.
 */
function appAsIndex(): Plugin {
  return {
    name: 'app-as-index',
    apply: 'build',
    closeBundle() {
      const from = resolve(__dirname, 'dist/app.html');
      if (existsSync(from)) renameSync(from, resolve(__dirname, 'dist/index.html'));
    },
  };
}

export default defineConfig({
  plugins: [react(), appAsIndex()],
  clearScreen: false,
  server: { port: 1420, strictPort: true, watch: { ignored: ['**/src-tauri/**'] } },
  build: {
    target: 'es2021',
    chunkSizeWarningLimit: 1500,
    rollupOptions: { input: resolve(__dirname, 'app.html') },
  },
});
