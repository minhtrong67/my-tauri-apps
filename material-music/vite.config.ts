import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };

/**
 * The project root `index.html` is the public landing page, so the desktop app's entry is `app.html`.
 * Tauri expects `dist/index.html`, so the built app page is renamed back to index.html.
 */
function appAsIndex(): Plugin {
  return {
    name: 'app-html-as-index',
    enforce: 'post',
    generateBundle(_, bundle) {
      const page = bundle['app.html'];
      if (page) {
        page.fileName = 'index.html';
        bundle['index.html'] = page;
        delete bundle['app.html'];
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), appAsIndex()],
  clearScreen: false,
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { port: 1420, strictPort: true, watch: { ignored: ['**/src-tauri/**'] } },
  build: {
    target: 'es2021',
    chunkSizeWarningLimit: 1500,
    rollupOptions: { input: resolve(__dirname, 'app.html') },
  },
});
