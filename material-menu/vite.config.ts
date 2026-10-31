import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The root index.html is the public landing page; the Tauri app entry is app.html.
export default defineConfig({
  base: './',
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true, watch: { ignored: ['**/src-tauri/**'] } },
  optimizeDeps: { entries: ['app.html'] },
  build: {
    target: 'chrome110',
    chunkSizeWarningLimit: 1200,
    rollupOptions: { input: 'app.html' },
  },
})
