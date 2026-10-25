import { Component, type ReactNode } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { t } from '../lib/i18n';

/** Last-resort safety net: shows a friendly screen instead of a blank window. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { console.error('UI crashed', e); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="grid h-full place-items-center bg-surface p-6 text-center text-on-surface">
        <div className="flex max-w-sm flex-col items-center gap-3">
          <span className="shape-cookie grid size-24 place-items-center bg-error-container text-on-error-container"><TriangleAlert size={40} /></span>
          <h1 className="text-2xl font-semibold">{t('error.title')}</h1>
          <p className="text-on-surface-variant">{t('error.body')}</p>
          <button onClick={() => location.reload()} className="ripple mt-2 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-on-primary"><RefreshCw size={18} />{t('action.reload')}</button>
        </div>
      </div>
    );
  }
}
