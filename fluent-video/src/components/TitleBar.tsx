import { useEffect, useState } from 'react';
import { win } from '../lib/window';
import { useStore } from '../lib/store';
import { useT } from '../lib/useT';
import { Icon, Logo } from './ui';

/** Windows 11 caption glyphs (thin 10px strokes, like Segoe Fluent Icons) */
const Glyph = {
  min: <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><path d="M0 5h10" stroke="currentColor" strokeWidth="1" fill="none" /></svg>,
  max: <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><rect x="0.5" y="0.5" width="9" height="9" rx="1.2" stroke="currentColor" strokeWidth="1" fill="none" /></svg>,
  restore: (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
      <path d="M2.5 2.5V1.7A1.2 1.2 0 0 1 3.7.5h4.6a1.2 1.2 0 0 1 1.2 1.2v4.6a1.2 1.2 0 0 1-1.2 1.2h-.8" stroke="currentColor" strokeWidth="1" fill="none" />
      <rect x="0.5" y="2.5" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  ),
  close: <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><path d="M0.5 0.5l9 9M9.5 0.5l-9 9" stroke="currentColor" strokeWidth="1" fill="none" /></svg>,
};

export function WindowControls({ showMaximize = true, light }: { showMaximize?: boolean; light?: boolean }) {
  const t = useT();
  const [maxed, setMaxed] = useState(false);
  useEffect(() => {
    const w = win();
    const sync = () => w.isMaximized().then(setMaxed).catch(() => undefined);
    sync();
    let un: (() => void) | undefined;
    w.onResized(sync).then((u) => (un = u)).catch(() => undefined);
    return () => un?.();
  }, []);
  const w = win();
  const cls = `w-[46px] h-8 inline-flex items-center justify-center transition-colors duration-100 ${light ? 'text-white hover:bg-white/15 active:bg-white/10' : 'text-fg hover:bg-subtle active:bg-subtle-press'}`;
  return (
    <div className="flex h-8 self-start">
      <button className={cls} aria-label={t('minimize')} title={t('minimize')} onClick={() => w.minimize()}>{Glyph.min}</button>
      {showMaximize && <button className={cls} aria-label={t('maximize')} title={t('maximize')} onClick={() => w.toggleMaximize()}>{maxed ? Glyph.restore : Glyph.max}</button>}
      <button className={`${cls} hover:!bg-[#C42B1C] hover:!text-white active:!bg-[#C42B1C]/80`} aria-label={t('close')} title={t('close')} onClick={() => w.close()}>{Glyph.close}</button>
    </div>
  );
}

/** Title bar for the Home / Settings screens (the player draws its own overlay bar). 32px like a native Windows 11 title bar. */
export function TitleBar() {
  const t = useT();
  const screen = useStore((s) => s.screen);
  const prev = useStore((s) => s.prevScreen);
  const go = useStore((s) => s.go);
  const hasVideo = useStore((s) => s.index >= 0);
  const fullscreen = useStore((s) => s.fullscreen);
  return (
    <div data-tauri-drag-region className="h-8 shrink-0 flex items-center select-none">
      {screen === 'settings' && (
        <button
          type="button" title={t('back')} aria-label={t('back')} onClick={() => go(prev === 'player' && !hasVideo ? 'home' : prev)}
          className="w-10 h-8 ml-1 rounded inline-flex items-center justify-center text-fg hover:bg-subtle active:bg-subtle-press transition-colors focus-ring"
        >
          <Icon name="arrow_back" size={16} />
        </button>
      )}
      <div className={`flex items-center gap-2 pointer-events-none ${screen === 'settings' ? 'pl-2' : 'pl-3'}`}>
        <Logo size={16} />
        <span className="text-caption">Fluent Video</span>
      </div>
      <div data-tauri-drag-region className="flex-1 h-full" />
      <button
        type="button" title={`${fullscreen ? t('exitFullscreen') : t('fullscreen')} (F11)`} aria-label={t('fullscreen')} onClick={() => void useStore.getState().toggleFullscreen()}
        className="w-10 h-8 rounded inline-flex items-center justify-center text-fg-2 hover:bg-subtle active:bg-subtle-press transition-colors focus-ring mr-1"
      >
        <Icon name={fullscreen ? 'fullscreen_exit' : 'fullscreen'} size={16} />
      </button>
      <WindowControls />
    </div>
  );
}
