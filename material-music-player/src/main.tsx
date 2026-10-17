import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { applyTheme } from './lib/theme';
import { appReady } from './lib/tauri';

// Apply the last used theme before the first paint (no light/dark flash)
try {
  const saved = JSON.parse(localStorage.getItem('app-theme') ?? 'null') as { seed?: string; mode?: 'system' | 'light' | 'dark' } | null;
  applyTheme(saved?.seed ?? '#6750A4', saved?.mode ?? 'system');
} catch {
  applyTheme('#6750A4', 'system');
}

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
