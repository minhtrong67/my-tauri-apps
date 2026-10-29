import { useEffect, useRef, useState } from 'react';
import { History, Info, Maximize2, Minimize2, Minus, Search, Settings, X } from 'lucide-react';
import { IconButton } from '@/components/ui/Button';
import { useSettings } from '@/lib/settings';
import { isTauri, windowControls } from '@/lib/tauri';
import { MOD } from '@/lib/utils';
import logo from '@/assets/logo.svg';

interface Props { onPalette: () => void; onHistory: () => void; onSettings: () => void; onAbout: () => void }

type Controls = Awaited<ReturnType<typeof windowControls>>;

// ?frame in the URL shows the window buttons in a plain browser (used to capture the README screenshots).
const SHOW_FRAME = isTauri || new URLSearchParams(location.search).has('frame');

export function TitleBar({ onPalette, onHistory, onSettings, onAbout }: Props) {
  const { t } = useSettings();
  const [maximized, setMaximized] = useState(false);
  const ctl = useRef<Controls | null>(null);

  useEffect(() => {
    if (!isTauri) return;
    let off: (() => void) | undefined;
    let dead = false;
    windowControls().then(async (c) => {
      if (dead) return;
      ctl.current = c;
      setMaximized(await c.isMaximized());
      off = await c.onResized(() => void c.isMaximized().then(setMaximized));
    });
    return () => { dead = true; off?.(); };
  }, []);

  const winBtn = 'rip state grid h-9 w-11 place-items-center rounded-md outline-none transition-[border-radius,background-color] duration-300 hover:rounded-lg';
  return (
    <header data-tauri-drag-region className="flex h-14 shrink-0 select-none items-center gap-1 pl-4 pr-2">
      <img src={logo} alt="" data-tauri-drag-region className="pointer-events-none mr-2 size-8 shrink-0" draggable={false} />
      <span data-tauri-drag-region className="pointer-events-none truncate text-base font-medium max-[420px]:hidden">{t('appName')}</span>
      <div data-tauri-drag-region className="h-full min-w-4 flex-1" />
      <IconButton icon={Search} label={t('palette')} kbd={`${MOD}+K`} onClick={onPalette} />
      <IconButton icon={History} label={t('history')} kbd={`${MOD}+H`} onClick={onHistory} />
      <IconButton icon={Settings} label={t('settings')} kbd={`${MOD}+,`} onClick={onSettings} />
      <IconButton icon={Info} label={t('about')} onClick={onAbout} />
      {SHOW_FRAME && (
        <div className="ml-2 flex items-center gap-1 border-l border-outline-variant/60 pl-2">
          <button type="button" className={winBtn} aria-label={t('minimize')} data-tip={t('minimize')} onClick={() => void ctl.current?.minimize()}>
            <Minus className="size-[1.125rem]" aria-hidden />
          </button>
          <button type="button" className={winBtn} aria-label={maximized ? t('restore') : t('maximize')} data-tip={maximized ? t('restore') : t('maximize')} onClick={() => void ctl.current?.toggleMaximize()}>
            {maximized ? <Minimize2 className="size-[1.125rem]" aria-hidden /> : <Maximize2 className="size-[1.125rem]" aria-hidden />}
          </button>
          <button type="button" className={`${winBtn} hover:bg-error hover:text-on-error`} aria-label={t('close')} data-tip={t('close')} onClick={() => void ctl.current?.close()}>
            <X className="size-[1.125rem]" aria-hidden />
          </button>
        </div>
      )}
    </header>
  );
}
