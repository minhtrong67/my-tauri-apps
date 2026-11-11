import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DEFAULT_ACCENT, DEFAULT_BACKDROP, applyFont, applyTheme, isDarkMode } from './lib/theme';
import { applyBackdrop } from './lib/window';
import { appReady } from './lib/tauri';
import type { Backdrop, ThemeMode } from './lib/types';

// Apply the last used theme + window material before the first paint (no light/dark flash, no un-tinted window)
let backdropReady: Promise<unknown> = Promise.resolve();
try {
  const saved = JSON.parse(localStorage.getItem('app-theme') ?? 'null') as { accent?: string; mode?: ThemeMode; font?: string; backdrop?: Backdrop } | null;
  const mode = saved?.mode ?? 'system';
  applyTheme(saved?.accent ?? DEFAULT_ACCENT, mode);
  applyFont(saved?.font ?? 'system');
  backdropReady = applyBackdrop(saved?.backdrop ?? DEFAULT_BACKDROP, isDarkMode(mode), mode);
} catch {
  applyTheme(DEFAULT_ACCENT, 'system');
  backdropReady = applyBackdrop(DEFAULT_BACKDROP, isDarkMode('system'), 'system');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

// The window is created hidden; reveal it once the first frame has been painted and the window material is applied
// (no white / transparent flash). A fatal error before that point still reveals it so the error is visible.
const reveal = () => requestAnimationFrame(() => requestAnimationFrame(() => void appReady()));
void Promise.race([backdropReady, new Promise((r) => setTimeout(r, 1500))]).then(reveal, reveal);
window.addEventListener('error', () => void appReady());
window.addEventListener('unhandledrejection', () => void appReady());
