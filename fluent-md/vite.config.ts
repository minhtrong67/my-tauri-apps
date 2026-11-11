import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import pkg from './package.json' with { type: 'json' };

// The desktop UI lives in ./app.
export default defineConfig({
  root: fileURLToPath(new URL('./app', import.meta.url)),
  publicDir: fileURLToPath(new URL('./app/public', import.meta.url)),
  plugins: [react(), tailwindcss()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**', '**/target/**'] },
  },
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
    target: 'chrome110',
    chunkSizeWarningLimit: 1500,
  },
});
