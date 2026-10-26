import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { fileURLToPath } from 'node:url';

const twConfig = fileURLToPath(new URL('./tailwind.config.js', import.meta.url));

// The Tauri app lives in ./app so the root index.html can be the landing page.
export default defineConfig({
  root: 'app',
  publicDir: '../public',
  plugins: [react()],
  css: { postcss: { plugins: [tailwindcss(twConfig), autoprefixer()] } },
  clearScreen: false,
  server: { port: 1420, strictPort: true, watch: { ignored: ['**/src-tauri/**'] } },
  build: { outDir: '../dist', emptyOutDir: true, target: 'es2021', minify: 'esbuild', sourcemap: false, chunkSizeWarningLimit: 700 },
});
