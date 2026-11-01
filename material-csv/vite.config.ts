import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The landing page (index.html) lives in the project root; the desktop app is its own Vite root in ./app.
export default defineConfig({
  root: 'app',
  publicDir: '../public',
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: { port: 1420, strictPort: true, host: '127.0.0.1', watch: { ignored: ['**/src-tauri/**'] } },
  build: { outDir: '../dist', emptyOutDir: true, target: 'es2022', chunkSizeWarningLimit: 900 },
});
