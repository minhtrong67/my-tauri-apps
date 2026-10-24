import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// The Vite app lives in ./src (index.html + modules) so the landing page can keep ./index.html at the project root.
export default defineConfig({
  root: 'src',
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  clearScreen: false,
  server: { port: 1420, strictPort: true, host: '127.0.0.1' },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'chrome105',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: { react: ['react', 'react-dom'], md: ['marked', 'dompurify'] }
      }
    }
  }
});
