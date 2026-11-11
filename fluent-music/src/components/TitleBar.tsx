import { useEffect, useRef, useState } from 'react';
import { tr } from '../lib/i18n';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Icon, IconButton, Logo } from './ui';
import { useStore } from '../lib/store';

/** Windows 11 caption buttons: 46×32, thin glyphs, red close */
export function WindowControls({ showMaximize = true, height = 32 }: { showMaximize?: boolean; height?: number }) {
  const [maxed, setMaxed] = useState(false);
  useEffect(() => {
    const win = getCurrentWindow();
    const sync = () => win.isMaximized().then(setMaxed).catch(() => undefined);
    sync();
    let un: (() => void) | undefined;
    win.onResized(sync).then((u) => (un = u)).catch(() => undefined);
    return () => un?.();
  }, []);
  const win = getCurrentWindow();
  const cls = 'w-[46px] inline-flex items-center justify-center text-on-surface hover:bg-subtle active:bg-subtle-2 transition-colors duration-fast';
  const st = { height };
  return (
    <div className="flex shrink-0 self-start">
      <button style={st} className={cls} aria-label={tr('minimize')} onClick={() => win.minimize()}>
        <svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 5h10" stroke="currentColor" strokeWidth="1" /></svg>
      </button>
      {showMaximize && (
        <button style={st} className={cls} aria-label={maxed ? tr('maximize') : tr('maximize')} onClick={() => win.toggleMaximize()}>
          {maxed
            ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor"><rect x="0.5" y="2.5" width="7" height="7" rx="1" /><path d="M2.5 2.5V1.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-1" /></svg>
            : <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor"><rect x="0.5" y="0.5" width="9" height="9" rx="1.5" /></svg>}
        </button>
      )}
      <button style={st} className={`${cls} hover:!bg-[#C42B1C] hover:!text-white active:!bg-[#C42B1C]/90`} aria-label={tr('close')} onClick={() => win.close()}>
        <svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0l10 10M10 0L0 10" stroke="currentColor" strokeWidth="1" /></svg>
      </button>
    </div>
  );
}

export function TitleBar() {
  const query = useStore((s) => s.query);
  const setQuery = useStore((s) => s.setQuery);
  const canBack = useStore((s) => s.backStack.length > 0);
  const back = useStore((s) => s.back);
  const input = useRef<HTMLInputElement>(null);
  const syncing = useStore((s) => s.syncing);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'f') { e.preventDefault(); input.current?.focus(); input.current?.select(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div data-tauri-drag-region className="h-12 shrink-0 flex items-center gap-1 pl-2 select-none">
      <IconButton icon="arrow_back" size="sm" title={tr('back')} disabled={!canBack} onClick={back} />
      <div data-tauri-drag-region className="flex items-center gap-2 pl-1 pr-3 pointer-events-none"><Logo size={18} /><span className="text-body-md hidden sm:block">Fluent Music</span></div>
      <div data-tauri-drag-region className="flex-1 flex justify-center px-2">
        <div className="relative w-full max-w-[420px]">
          <input
            ref={input} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && (setQuery(''), input.current?.blur())}
            placeholder={tr('searchPlaceholder')} aria-label={tr('searchPlaceholder')}
            className="fl-input w-full pl-3 pr-14 text-body-lg"
          />
          {query && <button className="absolute right-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg hover:bg-subtle flex items-center justify-center" aria-label={tr('clear')} onClick={() => setQuery('')}><Icon name="close" size={12} /></button>}
          <Icon name="search" size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
        </div>
      </div>
      <IconButton icon="refresh" size="sm" title={tr('refreshLibraryTip')} disabled={syncing} busy={syncing} onClick={() => useStore.getState().syncLibrary(false, true)} />
      <IconButton icon="picture_in_picture_alt" size="sm" title={tr('miniPlayer')} onClick={() => useStore.getState().set({ miniMode: true })} />
      <div className="w-1" />
      <WindowControls />
    </div>
  );
}
