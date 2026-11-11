import { useEffect, useRef, useState } from 'react';
import { X, Plus, Table2, Settings } from '../lib/icons';
import { app, useApp, type Doc } from '../lib/store';
import { activate, closeTab } from '../lib/actions';
import { win } from '../lib/tauri';
import { run, keyOf } from '../lib/commands';
import { t } from '../lib/i18n';
import { Logo } from './Logo';
import { tip, cx } from './ui';

function WindowControls() {
  const [maxed, setMaxed] = useState(false);
  useEffect(() => {
    if (!win) return;
    const sync = async () => {
      try {
        const m = await win!.isMaximized(), f = await win!.isFullscreen();
        setMaxed(m || f);
        document.documentElement.classList.toggle('maxed', m || f);
      } catch { /* ignore */ }
    };
    sync();
    const un = win!.onResized(sync);
    return () => { un.then(f => f()); };
  }, []);
  if (!win) return null;
  return (
    <div className="flex h-full flex-none self-stretch" tabIndex={-1}>
      <button className="cap" tabIndex={-1} onClick={() => win!.minimize()} aria-label={t('win.min')}><svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 5h10" stroke="currentColor" strokeWidth="1" /></svg></button>
      <button className="cap" tabIndex={-1} onClick={() => win!.toggleMaximize()} aria-label={maxed ? t('win.restore') : t('win.max')}>
        {maxed ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor"><path d="M2.5 2.5V1.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-1" /><rect x="0.5" y="2.5" width="7" height="7" rx="1" /></svg>
          : <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor"><rect x="0.5" y="0.5" width="9" height="9" rx="1.5" /></svg>}
      </button>
      <button className="cap close" tabIndex={-1} onClick={() => win!.close()} aria-label={t('win.close')}><svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0l10 10M10 0L0 10" stroke="currentColor" strokeWidth="1" /></svg></button>
    </div>
  );
}

function Tab({ d, on }: { d: Doc; on: boolean }) {
  return (
    <div role="tab" aria-selected={on} className={cx('tabchip', on && 'on')} data-tip={d.path || d.name}
      onMouseDown={e => { if (e.button === 1) { e.preventDefault(); closeTab(d); } else if (e.button === 0 && !(e.target as HTMLElement).closest('.tclose')) activate(d); }}>
      <Table2 size={16} className="flex-none text-accent-text" />
      <span className="tname">{d.name}</span>
      <i className={cx('size-1.5 flex-none rounded-full bg-accent transition-all duration-150', d.dirty ? 'scale-100 opacity-100' : 'scale-0 opacity-0')} />
      <button className="ibtn sm tclose" tabIndex={-1} onClick={() => closeTab(d)} aria-label={t('close')} data-tip={t('close')}><X size={14} /></button>
    </div>
  );
}

export function Titlebar() {
  useApp();
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => { strip.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); }, [app.doc]);
  return (
    <header className="flex h-10 flex-none items-end pl-3 text-fg">
      <div className="flex h-full flex-none items-center gap-2 pr-3" data-tauri-drag-region><Logo size={18} small /><span className="hidden text-xs sm:inline" data-tauri-drag-region>Fluent CSV</span></div>
      <div ref={strip} role="tablist" className="hide-scroll flex min-w-0 items-end gap-0.5 overflow-x-auto" onWheel={e => { strip.current!.scrollLeft += e.deltaY; }}>
        {app.docs.map(d => <Tab key={d.id} d={d} on={d === app.doc} />)}
      </div>
      <div className="flex h-full flex-none items-center pl-1"><button className="ibtn sm" onClick={() => run('file.new')} {...tip(t('tab.new'), keyOf('file.new'))}><Plus size={16} /></button></div>
      <div className="h-full min-w-6 flex-1" data-tauri-drag-region />
      <div className="flex h-full flex-none items-center"><button className="ibtn mr-1" onClick={() => run('app.settings')} {...tip(t('c.app.settings'), keyOf('app.settings'))} aria-label={t('c.app.settings')}><Settings size={18} /></button></div>
      <WindowControls />
    </header>
  );
}
