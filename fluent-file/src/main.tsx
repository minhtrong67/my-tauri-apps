import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import Root from './Root';

/* A crash must never leave a silent black window: show the error with a reload button instead. */
function showFatal(msg: string) {
  document.body.classList.remove('booting');
  const root = document.getElementById('root');
  if (!root || root.querySelector('[data-fatal]')) return;
  const box = document.createElement('div');
  box.setAttribute('data-fatal', '');
  box.style.cssText = 'position:fixed;inset:0;display:grid;place-items:center;padding:24px;background:#202020;color:#fff;font:14px system-ui,sans-serif;z-index:9999';
  box.innerHTML = '<div style="max-width:640px"><h2 style="margin:0 0 8px;color:#ff99a4">Fluent File failed to start</h2><pre style="white-space:pre-wrap;user-select:text;background:#2d2d2d;padding:12px;border-radius:8px;max-height:50vh;overflow:auto"></pre><button style="margin-top:12px;height:32px;padding:0 20px;border:0;border-radius:4px;background:#60cdff;color:#000" onclick="location.reload()">Reload</button></div>';
  (box.querySelector('pre') as HTMLElement).textContent = msg;
  document.body.appendChild(box);
}
window.addEventListener('error', (e) => showFatal(String(e.error?.stack || e.message)));
window.addEventListener('unhandledrejection', (e) => console.error('Unhandled rejection:', e.reason));
class Boundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error, info: ErrorInfo) { console.error(err, info.componentStack); showFatal(String(err.stack || err.message)); }
  render() { return this.state.err ? null : this.props.children; }
}

createRoot(document.getElementById('root')!).render(<StrictMode><Boundary><Root /></Boundary></StrictMode>);
