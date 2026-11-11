import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { port: 1420, strictPort: true, watch: { ignored: ['**/src-tauri/**'] } },
  build: {
    target: 'es2021',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        // vendor code changes rarely, so it gets its own long-lived chunks; the dynamic-colour maths loads only when a theme is applied
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@fluentui')) return 'icons';
          if (id.includes('@tauri-apps')) return 'tauri';
          if (/node_modules\/(react|react-dom|scheduler|zustand)\//.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
});
