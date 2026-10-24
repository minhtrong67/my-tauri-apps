import { Suspense, lazy, useEffect, useRef } from 'react';
import { LoadingIndicator } from './components/Expressive';
import { tr, resolveLang } from './lib/i18n';
import { setWindowTracking } from './lib/tauri';
import { listen } from '@tauri-apps/api/event';
import { convertFileSrc } from '@tauri-apps/api/core';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { TitleBar } from './components/TitleBar';
import { NavDrawer } from './components/NavDrawer';
import { PlayerBar } from './components/PlayerBar';
import { QueuePanel } from './components/QueuePanel';
import { MiniPlayer } from './components/MiniPlayer';
import { ContextMenu, Icon, Logo, Snackbar } from './components/ui';
import { AlbumView, AlbumsView, ArtistView, ArtistsView, HomeView, LikedView, PlaylistView, PlaylistsView, RecentView, SearchView, SmartView, SongsView } from './views/Library';

// heavy screens are loaded on demand so the app opens faster
const SettingsView = lazy(() => import('./views/Settings').then((m) => ({ default: m.SettingsView })));
const NowPlaying = lazy(() => import('./components/NowPlaying').then((m) => ({ default: m.NowPlaying })));
const Dialogs = lazy(() => import('./components/Dialogs').then((m) => ({ default: m.Dialogs })));
import { useCurrent, useStore } from './lib/store';
import { engine } from './lib/audio';
import { applyFont, applyTheme } from './lib/theme';
import { runThemeTransition } from './lib/themeTransition';
import { seedFromCover } from './lib/cover';
import { launchArgs, setCloseToTray } from './lib/tauri';
import { enterMini, exitMini, win } from './lib/window';

let booted = false;

function CurrentView() {
  const view = useStore((s) => s.view);
  const query = useStore((s) => s.query);
  if (query.trim()) return <SearchView />;
  switch (view.name) {
    case 'home': return <HomeView />;
    case 'songs': return <SongsView />;
    case 'albums': return <AlbumsView />;
    case 'album': return <AlbumView k={view.key} />;
    case 'artists': return <ArtistsView />;
    case 'artist': return <ArtistView name={view.artist} />;
    case 'playlists': return <PlaylistsView />;
    case 'playlist': return <PlaylistView id={view.id} />;
    case 'liked': return <LikedView />;
    case 'recent': return <RecentView />;
    case 'smart': return <SmartView id={view.id} />;
    case 'settings': return <Suspense fallback={null}><SettingsView /></Suspense>;
  }
}

export default function App() {
  const themeApplied = useRef(false);
  const lastKey = useRef('');
  const ready = useStore((s) => s.ready);
  const settings = useStore((s) => s.settings);
  const showQueue = useStore((s) => s.showQueue);
  const showNow = useStore((s) => s.showNowPlaying);
  const mini = useStore((s) => s.miniMode);
  const viewName = useStore((s) => s.view.name);
  const hasQuery = useStore((s) => !!s.query.trim());
  const lang = resolveLang(useStore((s) => s.settings.language));
  const scanning = useStore((s) => s.scanning);
  const dragOver = useStore((s) => s.dragOver);
  const hasDialog = useStore((s) => !!s.dialog);
  const isPlaying = useStore((s) => s.isPlaying);
  const duration = useStore((s) => s.duration);
  const current = useCurrent();
  // the window title (taskbar / Alt+Tab) shows what is playing
  useEffect(() => {
    win().setTitle(current ? `${current.title} — ${current.artist}` : 'Material Music').catch(() => undefined);
  }, [current?.id]);

  // Khởi tạo (chỉ một lần, kể cả khi React StrictMode chạy effect hai lần ở chế độ dev)
  useEffect(() => {
    if (booted) return;
    booted = true;
    const st = useStore.getState();
    st.init().then(async () => {
      try {
        const args = await launchArgs();
        if (args.length) await st.openPaths(args, true);
      } catch { /* ignore */ }
      st.syncLibrary(true); // auto-scan the Music folder + imported folders
    });
  }, []);

  // Chủ đề Material 3 (màu hạt giống / màu động theo ảnh bìa)
  useEffect(() => {
    let alive = true;
    const apply = (seed: string, animate = false) => {
      runThemeTransition(() => applyTheme(seed, settings.themeMode), animate && themeApplied.current);
      themeApplied.current = true;
    };
    try { localStorage.setItem('app-theme', JSON.stringify({ seed: settings.seedColor, mode: settings.themeMode, font: settings.fontFamily })); } catch { /* ignore */ }
    const key = `${settings.seedColor}|${settings.themeMode}`;
    apply(settings.seedColor, key !== lastKey.current);
    lastKey.current = key;
    if (settings.dynamicColor && current) seedFromCover(current).then((hex) => alive && hex && apply(hex));
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => settings.themeMode === 'system' && apply(settings.seedColor);
    mq.addEventListener('change', onChange);
    return () => { alive = false; mq.removeEventListener('change', onChange); };
  }, [settings.themeMode, settings.seedColor, settings.dynamicColor, current?.id]);

  // Phông chữ
  useEffect(() => { applyFont(settings.fontFamily); }, [settings.fontFamily]);

  // Cửa sổ: luôn trên cùng, thu nhỏ xuống khay
  const retrack = useRef<number | undefined>(undefined);
  useEffect(() => { setCloseToTray(settings.closeToTray).catch(() => undefined); }, [settings.closeToTray]);
  useEffect(() => {
    if (!useStore.getState().miniMode) getCurrentWindow().setAlwaysOnTop(settings.alwaysOnTop).catch(() => undefined);
  }, [settings.alwaysOnTop]);
  const prevMini = useRef(mini);
  useEffect(() => {
    if (prevMini.current === mini) return; // nothing to do on startup: keep the restored window size
    prevMini.current = mini;
    window.clearTimeout(retrack.current);
    if (mini) {
      void setWindowTracking(false).then(() => enterMini()).catch(() => undefined);
    } else {
      exitMini(useStore.getState().settings.alwaysOnTop)
        .catch(() => undefined)
        .finally(() => {
          retrack.current = window.setTimeout(() => {
            const s = useStore.getState();
            if (!s.miniMode && !s.fullscreen) void setWindowTracking(true);
          }, 700);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mini]);

  // Sự kiện từ hệ thống: kéo thả, mở bằng, khay hệ thống, tiến trình quét
  useEffect(() => {
    const st = useStore.getState();
    const unsubs: Array<Promise<() => void>> = [];
    unsubs.push(getCurrentWebview().onDragDropEvent((e) => {
      const p = e.payload;
      if (p.type === 'enter' || p.type === 'over') st.set({ dragOver: true });
      else if (p.type === 'leave') st.set({ dragOver: false });
      else if (p.type === 'drop') { st.set({ dragOver: false }); st.openPaths(p.paths, true); }
    }));
    unsubs.push(listen<string[]>('open-paths', (e) => st.openPaths(e.payload, true)));
    unsubs.push(listen<string>('tray-action', (e) => {
      if (e.payload === 'toggle') st.togglePlay();
      else if (e.payload === 'next') st.next(false);
      else if (e.payload === 'prev') st.prev();
      else if (e.payload === 'stop') { engine.pause(); st.seek(0); }
    }));
    // files added / removed / renamed inside the watched library folders
    unsubs.push(listen('library-changed', () => { void useStore.getState().syncLibrary(true); }));
    unsubs.push(listen<{ done: number; total: number }>('scan-progress', (e) => {
      if (useStore.getState().scanning) st.set({ scanning: e.payload });
    }));
    return () => { unsubs.forEach((p) => p.then((u) => u()).catch(() => undefined)); };
  }, []);

  // Hẹn giờ tắt nhạc & lưu vị trí định kỳ
  useEffect(() => {
    const i = window.setInterval(() => {
      const s = useStore.getState();
      if (s.sleepAt && Date.now() >= s.sleepAt) {
        engine.pause();
        s.set({ sleepAt: null, isPlaying: false });
        s.showToast(tr('sleepDone'), undefined, undefined, 'success');
      }
    }, 1000);
    const save = window.setInterval(() => {
      if (useStore.getState().isPlaying) useStore.getState().saveSession();
    }, 15000);
    return () => { clearInterval(i); clearInterval(save); };
  }, []);

  // Phím media của Windows + Media Session
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const st = useStore.getState();
    const ms = navigator.mediaSession;
    ms.setActionHandler('play', () => void engine.play());
    ms.setActionHandler('pause', () => engine.pause());
    ms.setActionHandler('previoustrack', () => st.prev());
    ms.setActionHandler('nexttrack', () => st.next(false));
    ms.setActionHandler('seekto', (d) => d.seekTime != null && st.seek(d.seekTime));
    ms.setActionHandler('stop', () => { engine.pause(); st.seek(0); });
    ms.setActionHandler('seekbackward', (d) => st.seek(Math.max(0, engine.audio.currentTime - (d.seekOffset ?? 10))));
    ms.setActionHandler('seekforward', (d) => st.seek(Math.min(engine.audio.duration || 0, engine.audio.currentTime + (d.seekOffset ?? 10))));
  }, []);
  useEffect(() => {
    if (!('mediaSession' in navigator) || !current) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title, artist: current.artist, album: current.album,
      artwork: current.cover ? [{ src: convertFileSrc(current.cover), sizes: '512x512' }] : [],
    });
  }, [current?.id, current?.cover]);
  // the Windows media overlay / lock screen follows the play state and shows the progress bar
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = current ? (isPlaying ? 'playing' : 'paused') : 'none';
    if (current && isFinite(duration) && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({ duration, position: Math.min(duration, engine.audio.currentTime || 0), playbackRate: engine.audio.playbackRate || 1 });
      } catch {
        /* ignore */
      }
    }
  }, [current?.id, isPlaying, duration]);

  // Phím tắt
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' && (e.target as HTMLInputElement).type !== 'range') return;
      if (tag === 'TEXTAREA') return;
      const st = useStore.getState();
      const k = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.key === 'F5') { e.preventDefault(); void st.syncLibrary(false, true); }
      else if (e.key === 'F11') { e.preventDefault(); void st.toggleFullscreen(); }
      else if (e.key === 'Escape' && st.fullscreen && !st.dialog && !st.menu && !st.showNowPlaying) { void st.toggleFullscreen(false); }
      else if (e.key === ' ') { e.preventDefault(); if (tag === 'BUTTON') (e.target as HTMLElement).blur(); st.togglePlay(); }
      else if (ctrl && e.key === 'ArrowRight') { e.preventDefault(); st.next(false); }
      else if (ctrl && e.key === 'ArrowLeft') { e.preventDefault(); st.prev(); }
      else if (!ctrl && e.key === 'ArrowRight' && tag !== 'INPUT') st.seek(Math.min(engine.audio.duration || 0, engine.audio.currentTime + 5));
      else if (!ctrl && e.key === 'ArrowLeft' && tag !== 'INPUT') st.seek(Math.max(0, engine.audio.currentTime - 5));
      else if (e.key === 'ArrowUp' && tag !== 'INPUT') { e.preventDefault(); st.setVolume(Math.min(1, st.settings.volume + 0.05)); }
      else if (e.key === 'ArrowDown' && tag !== 'INPUT') { e.preventDefault(); st.setVolume(Math.max(0, st.settings.volume - 0.05)); }
      else if (!ctrl && k === 'm') st.toggleMute();
      else if (!ctrl && k === 's') st.toggleShuffle();
      else if (!ctrl && k === 'r') st.cycleRepeat();
      else if (!ctrl && k === 'l') { const id = st.queue[st.index]; if (id) st.toggleLike(id); }
      else if (!ctrl && k === 'q') st.set({ showQueue: !st.showQueue });
      else if (!ctrl && k === 'n') st.set({ showNowPlaying: !st.showNowPlaying });
      else if (e.key === 'Escape' && st.showNowPlaying) st.set({ showNowPlaying: false });
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Tắt menu chuột phải mặc định của WebView
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!(e.target as HTMLElement)?.closest('input, textarea')) e.preventDefault(); };
    window.addEventListener('contextmenu', h);
    return () => window.removeEventListener('contextmenu', h);
  }, []);

  if (!ready) {
    return <div className="h-full flex flex-col items-center justify-center gap-4 bg-surface"><div className="relative"><span className="splash-ring" /><Logo size={72} /></div><LoadingIndicator size={44} /><div className="text-body-md text-on-surface-variant">{tr('loading')}</div></div>;
  }

  if (mini) return (<div key={lang} className="h-full"><MiniPlayer /><ContextMenu /><Snackbar /></div>);

  return (
    <div key={lang} className="h-full flex flex-col bg-surface text-on-surface">
      <TitleBar />
      <div className="flex-1 min-h-0 flex">
        <NavDrawer />
        <main className="flex-1 min-w-0 mr-3 rounded-3xl bg-surface-container-low overflow-hidden relative">
          <div key={`${viewName}-${hasQuery ? 1 : 0}`} className="h-full view-in"><CurrentView /></div>
        </main>
        {showQueue && <QueuePanel />}
      </div>
      <PlayerBar />
      {showNow && current && <Suspense fallback={null}><NowPlaying /></Suspense>}
      {hasDialog && <Suspense fallback={null}><Dialogs /></Suspense>}
      <ContextMenu />
      <Snackbar />
      {scanning && (
        <div className="fixed left-1/2 -translate-x-1/2 top-16 z-[80] animate-slide-up rounded-2xl bg-surface-container-highest text-on-surface px-5 py-3 shadow-xl ring-1 ring-outline-variant/40 flex items-center gap-3">
          <LoadingIndicator size={32} />
          <span className="text-body-md">{tr('scanning', { p: scanning.total ? `${scanning.done}/${scanning.total}` : '' })}</span>
        </div>
      )}
      {dragOver && (
        <div className="fixed inset-0 z-[90] bg-primary/20 backdrop-blur-sm flex items-center justify-center pointer-events-none animate-fade-in">
          <div className="rounded-m3-xl bg-primary-container text-on-primary-container px-12 py-10 text-center shadow-2xl border-2 border-dashed border-primary">
            <Icon name="library_add" size={56} fill />
            <div className="text-title-lg mt-2">{tr('dropTitle')}</div>
            <div className="text-body-md">{tr('dropSub')}</div>
          </div>
        </div>
      )}
    </div>
  );
}

