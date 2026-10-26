import { engine } from '../audio';
import { replayGainDb } from './helpers';
import { tr, setActiveLang, resolveLang } from '../i18n';
import * as api from '../tauri';
import { defaultSettings, type RepeatMode } from '../types';
import { pathKey } from './helpers';
import type { Core } from './core';
import type { GetFn, SetFn, AppSlice } from './types';


export const createAppSlice = (set: SetFn, get: GetFn, core: Core): AppSlice => {
  const { subscribe, flags, snapshot, pushTrayLabels, relabelUnknown, snapshotLibrary, snapshotUser, applySnapshot, dedupeLibrary, pruneMissing, playCurrentIndex, scheduleSave, syncNext, allowLibrary, syncWatchers } = core;
  /** Is this parsed JSON a Material Music backup (or a copy of user.json)? */
  const isBackup = (d: unknown): boolean => {
    if (!d || typeof d !== 'object' || Array.isArray(d)) return false;
    const o = d as Record<string, unknown>;
    if (!['tracks', 'playlists', 'liked', 'settings', 'plays', 'history'].some((k) => k in o)) return false;
    if ('tracks' in o && !Array.isArray(o.tracks)) return false;
    if ('playlists' in o && !Array.isArray(o.playlists)) return false;
    if ('history' in o && !Array.isArray(o.history)) return false;
    for (const k of ['liked', 'plays', 'settings']) if (k in o && (typeof o[k] !== 'object' || o[k] === null || Array.isArray(o[k]))) return false;
    return true;
  };

  const applyBackup = (raw: string) => {
    try {
      applySnapshot(raw);
    } catch {
      get().showToast(tr('badBackup'), undefined, undefined, 'error');
      return;
    }
    const cfg = get().settings;
    setActiveLang(cfg.language);
    pushTrayLabels();
    void api.setStartMode(cfg.startMode);
    engine.setVolume(cfg.volume, cfg.muted);
    engine.setRate(cfg.playbackRate);
    engine.setEq(cfg.eqEnabled, cfg.eqGains, cfg.preamp);
    engine.setCrossfade(cfg.crossfade);
    void api.setMediaKeys(cfg.globalMediaKeys);
    void allowLibrary();
    void syncWatchers();
    engine.pause();
    set({ queue: [], baseQueue: [], index: -1, isPlaying: false });
    get().showToast(tr('restored'), undefined, undefined, 'success');
  };

  return {
    ready: false,
    settings: defaultSettings,

    saveSession: () => scheduleSave('user'),

    init: async () => {
      if (flags.initPromise) return flags.initPromise;
      let finish: () => void = () => undefined;
      flags.initPromise = new Promise<void>((r) => (finish = r));
      try {
      let session: { queue?: string[]; baseQueue?: string[]; index?: number; position?: number; shuffle?: boolean; repeat?: RepeatMode } | null = null;
      let recovered = false;
      try {
        const [libRes, userRes] = await Promise.all([api.loadState('library'), api.loadState('user')]);
        const libRaw = libRes.data;
        const userRaw = userRes.data;
        recovered = libRes.recovered || userRes.recovered;
        let legacy = false;
        if (libRaw) {
          const d = applySnapshot(libRaw);
          if (d.playlists !== undefined) {
            legacy = true; // one big file written by an older build: use it, then split it into the two files
            session = d.session ?? null;
          }
        }
        if (userRaw) session = applySnapshot(userRaw).session ?? null;
        if (legacy) {
          void api.saveState('library', snapshotLibrary());
          void api.saveState('user', snapshotUser());
        }
      } catch (e) {
        console.error('Could not read the saved data', e);
      }
      setActiveLang(get().settings.language);
      pushTrayLabels();
      // covers cached by an older build / another folder (or never extracted) are re-read by the next library scan
      try {
        const dir = await api.getCoverDir();
        if (dir) {
          const prefix = pathKey(dir) + '\\';
          set((s) => {
            let changed = false;
            const byId = { ...s.byId };
            for (const t of Object.values(byId)) {
              if (t.cover === undefined || (t.cover && !pathKey(t.cover).startsWith(prefix))) {
                byId[t.id] = { ...t, modified: 0 };
                changed = true;
              }
            }
            return changed ? { byId } : {};
          });
        }
      } catch {
        /* ignore */
      }
      await allowLibrary();
      void api.setStartMode(get().settings.startMode);
      dedupeLibrary();
      const removed = await pruneMissing();
      if (removed) get().showToast(tr('removedMissingStart', { n: removed }));
      const s = get().settings;
      engine.setVolume(s.volume, s.muted);
      engine.setRate(s.playbackRate);
      engine.setEq(s.eqEnabled, s.eqGains, s.preamp);
      engine.setCrossfade(s.crossfade);
      void api.setMediaKeys(s.globalMediaKeys);
      if (s.globalHotkeys) void api.setGlobalHotkeys(true);
      if (s.audioDevice) void engine.setOutputDevice(s.audioDevice);
      // gapless / crossfade: the next song already started on the other deck, move the queue forward
      engine.onAutoAdvance = () => get().next(true);

      engine.onTime = (t) => {
        set({ position: t });
        core.tickListen(t);
      };
      engine.onPlayState = (p) => set({ isPlaying: p });
      engine.onPlaying = () => {
        flags.errorStreak = 0;
      };
      engine.onDuration = (d) => {
        const st = get();
        const t = st.byId[st.queue[st.index]];
        set({ duration: d });
        if (t && Math.abs(t.duration - d) > 2) set({ byId: { ...st.byId, [t.id]: { ...t, duration: d } } });
      };
      engine.onEnded = () => {
        const st = get();
        if (st.sleepEndOfTrack) {
          set({ sleepEndOfTrack: false, isPlaying: false });
          engine.pause();
          return;
        }
        if (st.repeat === 'one') {
          const cur = st.queue[st.index];
          if (cur) core.beginListen(cur);
          engine.seek(0);
          void engine.play();
          return;
        }
        get().next(true);
      };
      engine.onError = () => {
        const st = get();
        const t = st.byId[st.queue[st.index]];
        get().showToast(tr('cannotPlay', { title: t?.title ?? tr('aSong') }), undefined, undefined, 'error');
        flags.errorStreak++;
        if (flags.errorStreak < 5 && st.index < st.queue.length - 1) get().next(true);
        else set({ isPlaying: false });
      };

      if (session && s.restoreSession && session.queue?.length) {
        const queue = session.queue.filter((id) => get().byId[id]);
        const idx = Math.min(Math.max(session.index ?? 0, 0), queue.length - 1);
        set({
          queue,
          baseQueue: (session.baseQueue ?? queue).filter((id) => get().byId[id]),
          shuffle: !!session.shuffle,
          repeat: session.repeat ?? 'off',
        });
        if (queue.length) playCurrentIndex(idx, false, session.position ?? 0);
      }

      set({ ready: true });
      if (recovered) window.setTimeout(() => get().showToast(tr('dataRecovered'), undefined, undefined, 'warning'), 600);
      syncNext();
      void syncWatchers();
      subscribe((st, prev) => {
        if (
          st.queue !== prev.queue || st.index !== prev.index || st.repeat !== prev.repeat || st.sleepEndOfTrack !== prev.sleepEndOfTrack ||
          st.byId !== prev.byId || st.settings.gapless !== prev.settings.gapless || st.settings.crossfade !== prev.settings.crossfade ||
          st.settings.replayGain !== prev.settings.replayGain
        )
          syncNext();
        if (st.playlists !== prev.playlists || st.settings.watchFolders !== prev.settings.watchFolders || st.settings.autoScanMusic !== prev.settings.autoScanMusic) void syncWatchers();
        if (st.byId !== prev.byId) scheduleSave('library');
        if (
          st.playlists !== prev.playlists ||
          st.liked !== prev.liked ||
          st.history !== prev.history ||
          st.plays !== prev.plays ||
          st.listens !== prev.listens ||
          st.lyricOffsets !== prev.lyricOffsets ||
          st.smartLists !== prev.smartLists ||
          st.settings !== prev.settings ||
          st.queue !== prev.queue ||
          st.index !== prev.index ||
          st.shuffle !== prev.shuffle ||
          st.repeat !== prev.repeat ||
          st.navCollapsed !== prev.navCollapsed ||
          st.viewModes !== prev.viewModes
        )
          scheduleSave('user');
      });
      } finally {
        finish();
      }
    },

    backup: async () => {
      const path = await api.pickSavePath('material-music-backup.json', ['json'], tr('backupName'));
      if (!path) return;
      await api.writeTextFile(path, snapshot());
      get().showToast(tr('backedUp'), undefined, undefined, 'success');
    },
    restore: async () => {
      const path = await api.pickOne(['json'], tr('backupName'));
      if (!path) return;
      let raw: string;
      try {
        raw = await api.readTextFile(path);
        if (!isBackup(JSON.parse(raw))) throw new Error('not a backup');
      } catch {
        get().showToast(tr('badBackup'), undefined, undefined, 'error');
        return;
      }
      get().openDialog({
        type: 'confirm', title: tr('restoreTitle'), text: tr('restoreText'), confirmLabel: tr('restore'), danger: true,
        onConfirm: () => applyBackup(raw),
      });
    },

    updateSettings: (p) => {
      const prevLang = resolveLang(get().settings.language);
      const settings = { ...get().settings, ...p };
      set({ settings });
      if (p.language) {
        setActiveLang(p.language);
        relabelUnknown(prevLang, resolveLang(p.language));
        pushTrayLabels();
      }
      if (p.startMode !== undefined) void api.setStartMode(p.startMode);
      if (p.autoScanMusic === true) void get().syncLibrary(false);
      if ('playbackRate' in p) engine.setRate(settings.playbackRate);
      if ('crossfade' in p) engine.setCrossfade(settings.crossfade);
      if ('globalMediaKeys' in p) void api.setMediaKeys(settings.globalMediaKeys);
      if ('globalHotkeys' in p) {
        void api.setGlobalHotkeys(settings.globalHotkeys).then((ok) => {
          if (settings.globalHotkeys && !ok) {
            get().showToast(tr('hotkeysFailed'), undefined, undefined, 'warning');
            set((st) => ({ settings: { ...st.settings, globalHotkeys: false } }));
          }
        });
      }
      if ('audioDevice' in p) {
        void engine.setOutputDevice(settings.audioDevice).then((ok) => {
          if (!ok) get().showToast(tr('deviceFailed'), undefined, undefined, 'warning');
        });
      }
      if ('replayGain' in p) {
        const st = get();
        const cur = st.byId[st.queue[st.index]];
        if (cur) engine.setReplayGain(replayGainDb(cur, settings.replayGain));
      }
      if ('eqEnabled' in p || 'eqGains' in p || 'preamp' in p) engine.setEq(settings.eqEnabled, settings.eqGains, settings.preamp);
    },
  };
};
