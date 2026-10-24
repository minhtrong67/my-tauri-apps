import { useEffect, useRef } from 'react';
import { useStore, getActive } from './lib/store';
import { useT, wmoKey, t as tt } from './lib/i18n';
import { adaptiveSeed, applyTheme, onSystemThemeChange } from './lib/theme';
import { applyFont, applyFontSize } from './lib/fonts';
import { initWindow, setTitle } from './lib/window';
import { kindOf } from './lib/format';
import { loadPlace, reload, startLocate, switchPlace } from './lib/actions';
import { ui } from './lib/ui';
import { isModalOpen } from './components/ui/usePresence';
import { Toaster } from './components/ui/Toaster';
import { Drawer } from './components/Drawer';
import { TopBar } from './components/TopBar';
import type { SearchHandle } from './components/SearchBar';
import { Hero } from './components/Hero';
import { Daily, Details, Hourly, Tips } from './components/Sections';
import { AqiSheet, DaySheet } from './components/Sheets';
import { SettingsDialog } from './components/SettingsDialog';
import { AboutDialog, ConfirmHost, LocationDialog, ShortcutsDialog } from './components/Dialogs';
import { EmptyState, ErrorState, Skeletons } from './components/States';
import { Credit } from './components/Credit';

export default function App() {
  const s = useStore((x) => x.settings);
  const model = useStore((x) => x.model);
  const error = useStore((x) => x.error);
  const noPlaces = useStore((x) => x.places.length === 0);
  const search = useRef<SearchHandle>(null);
  const first = useRef(true);

  /* theme: MD3 palette from the seed (or from the weather when "adaptive colour" is on) */
  const seed = s.adaptive && model ? adaptiveSeed(kindOf(model.now.code), model.now.isDay) : s.seed;
  useEffect(() => {
    applyTheme(s.theme, seed, !first.current);
    first.current = false;
    return onSystemThemeChange(() => applyTheme(s.theme, seed, true));
  }, [s.theme, seed]);
  useEffect(() => void applyFont(s.fontFamily), [s.fontFamily]);
  useEffect(() => applyFontSize(s.fontSize), [s.fontSize]);
  useEffect(() => { document.title = tt('app.name'); }, [s.lang]);
  useEffect(() => {
    if (model) void setTitle(`${model.place.name} ${Math.round(model.now.temp)}° · ${tt(wmoKey(model.now.code))} — ${tt('app.name')}`);
  }, [model?.place.id, model?.now.temp, model?.now.code, s.lang]); // eslint-disable-line react-hooks/exhaustive-deps

  /* boot: apply window mode, show the window, load the home / saved place or ask for the location */
  useEffect(() => {
    void (async () => {
      await initWindow();
      const st = useStore.getState();
      const place = (st.homeId && st.places.find((p) => p.id === st.homeId)) || getActive() || st.places[0] || null;
      if (place) { st.setActive(place.id); void loadPlace(place); }
      else void startLocate({ firstRun: true });
    })();
    const noMenu = (e: MouseEvent) => { if (!/input|textarea/i.test((e.target as HTMLElement).tagName)) e.preventDefault(); };
    if (import.meta.env.PROD) document.addEventListener('contextmenu', noMenu);
    return () => document.removeEventListener('contextmenu', noMenu);
  }, []);

  /* auto refresh, wake-up refresh, back online */
  useEffect(() => {
    if (!s.autoRefresh) return;
    const id = setInterval(() => !document.hidden && void reload(), s.refreshMins * 60_000);
    return () => clearInterval(id);
  }, [s.autoRefresh, s.refreshMins]);
  useEffect(() => {
    const vis = () => { const m = useStore.getState().model; if (!document.hidden && m && Date.now() - m.fetchedAt > 10 * 60_000) void reload(); };
    const online = () => { if (useStore.getState().offline) void reload(); };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('online', online);
    return () => { document.removeEventListener('visibilitychange', vis); window.removeEventListener('online', online); };
  }, []);

  /* keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /input|textarea|select/i.test((document.activeElement as HTMLElement | null)?.tagName ?? '');
      const mod = e.ctrlKey || e.metaKey;
      if ((mod && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing && !isModalOpen())) { e.preventDefault(); search.current?.focus(); }
      else if (e.key === 'F5' || (mod && e.key.toLowerCase() === 'r')) { e.preventDefault(); void reload(true); }
      else if (mod && e.key === ',') { e.preventDefault(); ui().set({ settings: !ui().settings }); }
      else if (e.key === '?' && !typing && !isModalOpen()) { e.preventDefault(); ui().set({ shortcuts: true }); }
      else if (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); switchPlace(e.key === 'ArrowDown' ? 1 : -1); }
      else if (e.key === 'Escape' && !isModalOpen()) ui().set({ navOpen: false });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-full">
      <Drawer />
      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar ref={search} />
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pb-6 pt-1 max-[960px]:px-4">
          <div className="mx-auto flex max-w-[1040px] flex-col gap-4">
            {model ? (
              <>
                <Hero />
                <Tips />
                <Hourly />
                <Details />
                <Daily />
                <Footer />
              </>
            ) : error ? <ErrorState /> : noPlaces ? <EmptyState /> : <Skeletons />}
          </div>
        </div>
      </main>
      <SettingsDialog />
      <AboutDialog />
      <ShortcutsDialog />
      <LocationDialog />
      <ConfirmHost />
      <DaySheet />
      <AqiSheet />
      <Toaster />
    </div>
  );
}

function Footer() {
  const t = useT();
  return <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-on-surface-variant"><span>{t('about.data')}</span><span>·</span><Credit /></div>;
}
