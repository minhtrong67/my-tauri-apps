import React from 'react';
import ReactDOM from 'react-dom/client';
import './fonts.css';
import './index.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { applyFont, applyTheme, DEFAULT_SEED } from './lib/theme';
import { appReady } from './lib/tauri';
import { installRipple } from './components/ui';

// Apply the last used theme + font before the first paint (no light/dark or font flash)
try {
  const saved = JSON.parse(localStorage.getItem('app-theme') ?? 'null') as { seed?: string; mode?: 'system' | 'light' | 'dark'; font?: string } | null;
  applyTheme(saved?.seed ?? DEFAULT_SEED, saved?.mode ?? 'system');
  applyFont(saved?.font ?? 'system');
} catch {
  applyTheme(DEFAULT_SEED, 'system');
}

installRipple();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

// The window is created hidden; reveal it once the first frame has been painted (no white screen).
// A fatal error before that point still reveals it so the error is visible.
requestAnimationFrame(() => requestAnimationFrame(() => void appReady()));
window.addEventListener('error', () => void appReady());
window.addEventListener('unhandledrejection', () => void appReady());
