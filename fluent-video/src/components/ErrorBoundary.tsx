import { Component, type ErrorInfo, type ReactNode } from 'react';
import { tr } from '../lib/i18n';

/** Catches render errors so a bug never leaves a blank window */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const details = `${error.name}: ${error.message}\n${error.stack ?? ''}`;
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--base)', color: 'var(--fg)' }}>
        <div style={{ maxWidth: 520, width: '100%', borderRadius: 8, padding: 24, background: 'var(--dialog)', border: '1px solid var(--stroke-card)', boxShadow: '0 32px 64px rgb(0 0 0 / .28)' }}>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{tr('errorTitle')}</div>
          <p style={{ fontSize: 14, color: 'var(--fg-2)', marginBottom: 12 }}>{tr('errorText')}</p>
          <pre style={{ maxHeight: 140, overflow: 'auto', fontSize: 11, padding: 10, borderRadius: 4, background: 'var(--control)', userSelect: 'text' }}>{details}</pre>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button style={{ height: 32, padding: '0 16px', borderRadius: 4, border: '1px solid var(--stroke)', background: 'var(--control)', color: 'inherit', cursor: 'pointer' }} onClick={() => void navigator.clipboard?.writeText(details)}>{tr('copyDetails')}</button>
            <button style={{ height: 32, padding: '0 16px', borderRadius: 4, border: 0, background: 'rgb(var(--accent))', color: 'rgb(var(--on-accent))', cursor: 'pointer' }} onClick={() => window.location.reload()}>{tr('reload')}</button>
          </div>
        </div>
      </div>
    );
  }
}
