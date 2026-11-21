import { useEffect, useState } from 'react';
import { PanelLeft } from '../lib/icons';
import { appWindow, IS_TAURI } from '../lib/api';
import { useExplorer } from '../store/explorer';
import { useSettings } from '../store/settings';
import { useT } from '../lib/i18n';
import { isVirtual } from '../lib/paths';
import { Tooltip } from './ui/Tooltip';
import logo from '../assets/logo.svg';

/* Windows-style caption buttons: thin 10px glyphs like Segoe Fluent Icons, close turns red on hover */
const Glyph = ({ d, fill }: { d: string; fill?: boolean }) => <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1"><path d={d} /></svg>;

/** Custom title bar: app icon + title, sidebar toggle, drag region and minimise / maximise / close. */
export function TitleBar() {
  const t = useT();
  const nav = useSettings((s) => s.showNav);
  const path = useExplorer((s) => s.panes[s.activePane].path);
  const [max, setMax] = useState(false);
  useEffect(() => {
    if (!appWindow) return;
    let un: (() => void) | undefined; let live = true;
    const upd = () => { void appWindow!.isMaximized().then((m) => live && setMax(m)).catch(() => {}); };
    upd(); void appWindow.onResized(upd).then((f) => { if (live) un = f; else f(); }).catch(() => {});
    return () => { live = false; un?.(); };
  }, []);
  const name = path && !isVirtual(path) ? path.split(/[\\/]/).filter(Boolean).pop() || path : '';
  return (
    <div className="flex h-9 flex-none items-center select-none" data-tauri-drag-region>
      <Tooltip label={t('view.nav')} kbd="Ctrl+B"><button type="button" aria-label={t('view.nav')} aria-pressed={nav} onClick={() => useSettings.getState().set({ showNav: !nav })} className={`ibtn sm ml-1.5 ${nav ? '' : 'opacity-70'}`}><PanelLeft strokeWidth={1.75} /></button></Tooltip>
      <img src={logo} alt="" className="pointer-events-none ml-2 size-4" draggable={false} />
      <span className="pointer-events-none ml-2.5 min-w-0 truncate text-xs">{name ? <>{name}<span className="text-on-surface-variant"> – </span></> : null}<span className={name ? 'text-on-surface-variant' : ''}>Fluent File</span></span>
      <div className="min-w-8 flex-1 self-stretch" data-tauri-drag-region />
      {IS_TAURI && (
        <div className="flex h-full" role="group" aria-label="Window controls">
          <button type="button" aria-label="Minimize" className="grid h-full w-[46px] place-items-center transition-colors duration-100 hover:bg-on-surface/8" onClick={() => void appWindow?.minimize()}><Glyph d="M0 5h10" /></button>
          <button type="button" aria-label={max ? 'Restore' : 'Maximize'} className="grid h-full w-[46px] place-items-center transition-colors duration-100 hover:bg-on-surface/8" onClick={() => void appWindow?.toggleMaximize()}>
            {max ? <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden fill="none" stroke="currentColor" strokeWidth="1"><path d="M2.5 2.5V.5h7v7h-2" /><rect x=".5" y="2.5" width="7" height="7" /></svg> : <Glyph d="M.5.5h9v9h-9z" />}
          </button>
          <button type="button" aria-label="Close" className="grid h-full w-[46px] place-items-center transition-colors duration-100 hover:bg-[#C42B1C] hover:text-white" onClick={() => void appWindow?.close()}><Glyph d="M.5.5l9 9m0-9l-9 9" /></button>
        </div>
      )}
    </div>
  );
}
