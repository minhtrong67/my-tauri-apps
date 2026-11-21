import { useEffect, useState } from 'react';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { Effect, EffectState } from '@tauri-apps/api/window';
import { api, appWindow, IS_TAURI, listen, onFileDrop } from '../lib/api';
import { applyTheme, AUTO_SEED, isDark, onSystemSchemeChange, setSystemAccent } from '../lib/theme';
import { useSettings } from '../store/settings';
import { t } from '../lib/i18n';
import { onFileOp, refresh, runPaste, toggleTreeRefresh, useExplorer, openNewWindow } from '../store/explorer';
import { useUI, toast } from '../store/ui';
import { isVirtual } from '../lib/paths';
import type { PaneId } from '../lib/types';

/** Theme, language, window material, window title/size, watcher events, native file drops and tray. */
let fxSeq = 0;
export function useAppEffects() {
  const theme = useSettings((s) => s.theme); const seed = useSettings((s) => s.seed); const font = useSettings((s) => s.font);
  const uiFont = useSettings((s) => s.uiFont); const density = useSettings((s) => s.density); const lang = useSettings((s) => s.lang);

  // "Automatic" accent: follow the Windows accent colour (re-read when the window regains focus)
  const [accentTick, setAccentTick] = useState(0);
  useEffect(() => {
    if (seed !== AUTO_SEED) return;
    const read = () => api.getAccentColor().then((c) => { setSystemAccent(c); setAccentTick((n) => n + 1); }).catch(() => {});
    void read(); window.addEventListener('focus', read);
    return () => window.removeEventListener('focus', read);
  }, [seed]);

  useEffect(() => {
    const apply = () => { const dark = applyTheme({ theme, seed, font, uiFont, density }); if (appWindow) void appWindow.setTheme(theme === 'system' ? null : dark ? 'dark' : 'light').catch(() => {}); };
    apply(); return onSystemSchemeChange(() => { if (theme === 'system') apply(); });
  }, [theme, seed, font, uiFont, density, accentTick]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  // window material. Mica / Mica Alt / Acrylic are drawn by Windows; Frosted and Liquid glass are Acrylic plus CSS glass layers.
  // The previous material is always cleared first (and given a moment to go away) so switching never leaves the old one behind.
  const effect = useSettings((s) => s.effect);
  useEffect(() => {
    const root = document.documentElement;
    const win = appWindow;
    if (!win) { root.dataset.fx = 'none'; return; }
    const seq = ++fxSeq;
    const run = async () => {
      try {
        await win.clearEffects();
        if (effect === 'none') { if (seq === fxSeq) root.dataset.fx = 'none'; return; }
        await new Promise((r) => setTimeout(r, 80));
        if (seq !== fxSeq) return;
        const kind = { mica: Effect.Mica, tabbed: Effect.Tabbed, acrylic: Effect.Acrylic, frosted: Effect.Acrylic, liquid: Effect.Acrylic }[effect];
        const dark = isDark(useSettings.getState().theme);
        await win.setEffects({ effects: [kind], state: EffectState.Active, color: dark ? [32, 32, 32, 150] : [243, 243, 243, 150] });
        if (seq === fxSeq) root.dataset.fx = effect;
      } catch {
        if (seq !== fxSeq) return;
        root.dataset.fx = 'none';
        if (effect !== 'mica') toast(t('settings.effectUnsupported'), 'warning');
      }
    };
    void run();
    const un = onSystemSchemeChange(() => { if (useSettings.getState().theme === 'system' && (effect === 'acrylic' || effect === 'frosted' || effect === 'liquid')) void run(); });
    return () => { un(); };
  }, [effect, theme]);

  // window title follows the active folder
  const path = useExplorer((s) => s.panes[s.activePane].path);
  useEffect(() => {
    const name = path && !isVirtual(path) ? path.split(/[\\/]/).filter(Boolean).pop() || path : '';
    const title = name ? `${name} – Fluent File` : 'Fluent File';
    document.title = title; if (appWindow) void appWindow.setTitle(title).catch(() => {});
  }, [path]);

  // remember / maximise the window
  const mode = useSettings((s) => s.windowMode);
  useEffect(() => {
    const win = appWindow;
    if (!win) return;
    let timer = 0; let un: (() => void) | undefined; let off = false;
    void (async () => {
      const s = useSettings.getState();
      try {
        if (s.windowMode === 'maximized') await win.maximize();
        else if (s.winState) { if (s.winState.maximized) await win.maximize(); else { await win.setSize(new LogicalSize(s.winState.w, s.winState.h)); await win.center(); } }
      } catch { /* ignore */ }
      await win.show().catch(() => {});
      if (off) return;
      un = await win.onResized(() => {
        window.clearTimeout(timer);
        timer = window.setTimeout(async () => {
          if (useSettings.getState().windowMode !== 'remember') return;
          try {
            const max = await win.isMaximized(); const prev = useSettings.getState().winState;
            if (max) { useSettings.getState().set({ winState: { w: prev?.w ?? 1120, h: prev?.h ?? 720, maximized: true } }); return; }
            if (await win.isFullscreen()) return;
            useSettings.getState().set({ winState: { w: Math.round(window.innerWidth), h: Math.round(window.innerHeight), maximized: false } });
          } catch { /* ignore */ }
        }, 400);
      });
    })();
    return () => { off = true; window.clearTimeout(timer); un?.(); };
  }, []);
  useEffect(() => { // switching the option while running takes effect immediately
    if (!appWindow) return;
    if (mode === 'maximized') void appWindow.maximize().catch(() => {});
  }, [mode]);

  // backend events
  useEffect(() => {
    const offs: (() => void)[] = [];
    void listen<{ done: number; total: number; name: string }>('fileop', onFileOp).then((u) => offs.push(u));
    void listen<{ id: PaneId; path: string }>('fs-changed', (p) => { void refresh(p.id); toggleTreeRefresh(p.path); }).then((u) => offs.push(u));
    void listen('tray-new-window', () => { void openNewWindow(useExplorer.getState().panes.a.path); }).then((u) => offs.push(u));
    return () => offs.forEach((u) => u());
  }, []);
  // re-read the folder when the window regains focus (covers changes the watcher cannot see)
  useEffect(() => {
    const f = () => { void refresh('a'); if (useSettings.getState().dualPane) void refresh('b'); };
    window.addEventListener('focus', f); return () => window.removeEventListener('focus', f);
  }, []);

  // files dropped from Explorer onto the window → copy into the folder under the cursor
  useEffect(() => {
    let un: (() => void) | undefined; let hover: HTMLElement | null = null;
    const mark = (el: HTMLElement | null) => { if (hover !== el) { hover?.classList.remove('drop-target'); hover = el; hover?.classList.add('drop-target'); } };
    void onFileDrop((e) => {
      if (e.type === 'enter' || e.type === 'over') { useUI.setState({ extDrop: { active: true } }); const el = e.x !== undefined ? (document.elementFromPoint(e.x, e.y as number) as HTMLElement | null) : null; mark(el?.closest<HTMLElement>('[data-drop-path]:not([data-drop-path=""])') ?? null); }
      else if (e.type === 'leave') { useUI.setState({ extDrop: { active: false } }); mark(null); }
      else if (e.type === 'drop') {
        useUI.setState({ extDrop: { active: false } });
        const el = e.x !== undefined ? (document.elementFromPoint(e.x, e.y as number) as HTMLElement | null) : null;
        const target = el?.closest<HTMLElement>('[data-drop-path]:not([data-drop-path=""])')?.dataset.dropPath || useExplorer.getState().panes[useExplorer.getState().activePane].path;
        mark(null);
        if (target && !isVirtual(target) && e.paths?.length) void runPaste(e.paths, target, false); else toast(t('msg.noTarget'), 'warning');
      }
    }).then((u) => { un = u; });
    return () => { un?.(); mark(null); };
  }, []);

  // tray + global shortcut
  const tray = useSettings((s) => s.trayEnabled); const sc = useSettings((s) => s.globalShortcut);
  useEffect(() => { if (IS_TAURI) void api.setTray(tray, [t('tray.open'), t('tray.newWindow'), t('tray.quit')]).catch(() => {}); }, [tray, lang]);
  useEffect(() => { if (IS_TAURI) void api.setGlobalShortcut(sc).catch(() => { toast(t('err.shortcut'), 'warning'); useSettings.getState().set({ globalShortcut: false }); }); }, [sc]);
}
