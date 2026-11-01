import { useEffect, useRef, useState } from 'react';
import { Minus, Square, Copy, X, Plus, Table2, Settings } from 'lucide-react';
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
  const b = 'grid h-11 w-12 place-items-center border-0 bg-transparent text-on-surface-variant transition-colors hover:bg-on-surface/10';
  return (
    <div className="flex flex-none" tabIndex={-1}>
      <button className={b} tabIndex={-1} onClick={() => win!.minimize()} {...tip(t('win.min'))}><Minus size={16} /></button>
      <button className={b} tabIndex={-1} onClick={() => win!.toggleMaximize()} {...tip(maxed ? t('win.restore') : t('win.max'))}>{maxed ? <Copy size={14} className="-scale-x-100" /> : <Square size={13} />}</button>
      <button className={cx(b, 'hover:!bg-error hover:!text-on-error')} tabIndex={-1} onClick={() => win!.close()} {...tip(t('win.close'))}><X size={17} /></button>
    </div>
  );
}

function Tab({ d, on }: { d: Doc; on: boolean }) {
  return (
    <div role="tab" aria-selected={on} className={cx('tabchip', on && 'on')} data-tip={d.path || d.name}
      onMouseDown={e => { if (e.button === 1) { e.preventDefault(); closeTab(d); } else if (e.button === 0 && !(e.target as HTMLElement).closest('.tclose')) activate(d); }}>
      <Table2 size={16} className="flex-none" />
      <span className="tname">{d.name}</span>
      <i className={cx('size-2 flex-none rounded-full bg-primary transition-all duration-300', d.dirty ? 'scale-100 opacity-100' : 'scale-0 opacity-0')} />
      <button className="ibtn sm tclose" tabIndex={-1} onClick={() => closeTab(d)} aria-label={t('close')} data-tip={t('close')}><X size={14} /></button>
    </div>
  );
}

export function Titlebar() {
  useApp();
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => { strip.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); }, [app.doc]);
  return (
    <header className="flex h-11 flex-none items-center bg-sc-low pl-3 text-on-surface">
      <div className="flex flex-none items-center gap-2 pr-3" data-tauri-drag-region><Logo size={22} small /><span className="hidden text-sm font-medium sm:inline" data-tauri-drag-region>Material CSV</span></div>
      <div ref={strip} role="tablist" className="hide-scroll flex min-w-0 items-center gap-1 overflow-x-auto py-1" onWheel={e => { strip.current!.scrollLeft += e.deltaY; }}>
        {app.docs.map(d => <Tab key={d.id} d={d} on={d === app.doc} />)}
      </div>
      <button className="ibtn sm ml-1 flex-none" onClick={() => run('file.new')} {...tip(t('tab.new'), keyOf('file.new'))}><Plus size={18} /></button>
      <div className="h-full min-w-6 flex-1" data-tauri-drag-region />
      <button className="ibtn mr-1 flex-none" onClick={() => run('app.settings')} {...tip(t('c.app.settings'), keyOf('app.settings'))} aria-label={t('c.app.settings')}><Settings size={20} className="transition-transform duration-500 [transition-timing-function:var(--spring)] hover:rotate-90" /></button>
      <WindowControls />
    </header>
  );
}
