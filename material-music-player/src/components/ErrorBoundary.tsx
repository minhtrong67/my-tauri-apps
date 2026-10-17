import { Component, type ErrorInfo, type ReactNode } from 'react';
import { tr } from '../lib/i18n';

/** Catches render errors so a bug never leaves a blank white window */
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
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgb(var(--md-surface))', color: 'rgb(var(--md-on-surface))' }}>
        <div style={{ maxWidth: 520, width: '100%', borderRadius: 28, padding: 28, background: 'rgb(var(--md-surface-container-high))' }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>{tr('errorTitle')}</div>
          <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 12 }}>{tr('errorText')}</p>
          <pre style={{ maxHeight: 140, overflow: 'auto', fontSize: 11, padding: 10, borderRadius: 12, background: 'rgb(var(--md-surface-container-lowest))', userSelect: 'text' }}>{details}</pre>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button style={{ height: 40, padding: '0 20px', borderRadius: 999, border: '1px solid rgb(var(--md-outline))', background: 'transparent', color: 'inherit', cursor: 'pointer' }} onClick={() => void navigator.clipboard?.writeText(details)}>{tr('copyDetails')}</button>
            <button style={{ height: 40, padding: '0 24px', borderRadius: 999, border: 0, background: 'rgb(var(--md-primary))', color: 'rgb(var(--md-on-primary))', cursor: 'pointer' }} onClick={() => window.location.reload()}>{tr('reload')}</button>
          </div>
        </div>
      </div>
    );
  }
}
