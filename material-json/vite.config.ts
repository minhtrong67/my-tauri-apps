import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// The frontend lives in ./app so the landing page can own ./index.html at the project root.
export default defineConfig({
  root: 'app',
  clearScreen: false,
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: ['es2021', 'chrome100', 'safari14'],
    chunkSizeWarningLimit: 1600,
  },
});
