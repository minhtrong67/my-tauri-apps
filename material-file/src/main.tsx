import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import Root from './Root';

/* Material ripple: set the origin of the wave on every pointer-down of a .ripple element. */
document.addEventListener('pointerdown', (e) => {
  const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('.ripple');
  if (!el || (el as HTMLButtonElement).disabled || e.button !== 0) return;
  const r = el.getBoundingClientRect(); const size = Math.max(r.width, r.height) * 2;
  const s = document.createElement('span'); s.className = 'rp';
  Object.assign(s.style, { width: size + 'px', height: size + 'px', left: e.clientX - r.left - size / 2 + 'px', top: e.clientY - r.top - size / 2 + 'px' });
  el.appendChild(s); window.setTimeout(() => s.remove(), 650);
}, true);

/* A crash must never leave a silent black window: show the error with a reload button instead. */
function showFatal(msg: string) {
  document.body.classList.remove('booting');
  const root = document.getElementById('root');
  if (!root || root.querySelector('[data-fatal]')) return;
  const box = document.createElement('div');
  box.setAttribute('data-fatal', '');
  box.style.cssText = 'position:fixed;inset:0;display:grid;place-items:center;padding:24px;background:#1c1b1f;color:#e6e1e5;font:14px system-ui,sans-serif;z-index:9999';
  box.innerHTML = '<div style="max-width:640px"><h2 style="margin:0 0 8px;color:#ffb4ab">Material File failed to start</h2><pre style="white-space:pre-wrap;user-select:text;background:#2b2930;padding:12px;border-radius:12px;max-height:50vh;overflow:auto"></pre><button style="margin-top:12px;height:40px;padding:0 20px;border:0;border-radius:20px;background:#ffc107;color:#2b1d00;font-weight:600" onclick="location.reload()">Reload</button></div>';
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
