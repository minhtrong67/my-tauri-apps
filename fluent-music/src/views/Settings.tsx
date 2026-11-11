import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { getActiveLang, tr } from '../lib/i18n';
import { AuthorCredit, Button, Chip, Icon, Logo, Segmented, Select, Switch } from '../components/ui';
import { engine } from '../lib/audio';
import { listen } from '@tauri-apps/api/event';
import { backdropSupport, getBackupDir, lyricsCacheClear, openFolder, pickOne, scrobbleValidate, ytdlpInstall, ytdlpRemove, ytdlpStatus, type OnlineProgress, type BackdropSupport, type YtdlpStatus } from '../lib/tauri';
import { onlineErrorText } from '../lib/online';
import { ACCENT_COLORS, FONT_OPTIONS, SYSTEM_ACCENT, resolveAccent } from '../lib/theme';
import { BACKDROPS, type BackdropKind } from '../lib/types';
import { useDerived, useStore } from '../lib/store';
import { fmtSize } from '../lib/utils';

/* ───────────── building blocks ───────────── */

function Section({ id, title, icon, children }: { id: string; title: string; icon: string; children: ReactNode }) {
  return (
    <section id={`set-${id}`} className="mb-6 scroll-mt-16">
      <h2 className="flex items-center gap-2 px-1 mb-2 text-title-sm">
        <Icon name={icon} size={16} className="text-on-surface-variant" />
        {title}
      </h2>
      <div className="fl-card overflow-hidden divide-y divide-card-stroke">{children}</div>
    </section>
  );
}

/** A settings row: title + description on the left, control on the right (wraps below on narrow windows) */
function Row({ title, desc, children, tone }: { title: string; desc?: string; children?: ReactNode; tone?: 'danger' }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 min-h-[64px] ${tone === 'danger' ? 'bg-error-container/40' : ''}`}>
      <div className="flex-1 min-w-[220px]">
        <div className={`text-body-lg ${tone === 'danger' ? 'text-error' : 'text-on-surface'}`}>{title}</div>
        {desc && <div className="text-body-md text-on-surface-variant mt-0.5">{desc}</div>}
      </div>
      {children && <div className="shrink-0 flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/** A row whose whole surface toggles the switch (bigger click target, keyboard friendly) */
function ToggleRow({ title, desc, checked, onChange }: { title: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation(); // Space must not start / pause the music here
      onChange(!checked);
    }
  };
  return (
    <div
      role="switch" aria-checked={checked} aria-label={title} tabIndex={0} onClick={() => onChange(!checked)} onKeyDown={onKey}
      className="flex items-center gap-6 px-4 py-3 min-h-[64px] cursor-default select-none outline-none transition-colors duration-fast hover:bg-subtle active:bg-subtle-2 focus-visible:bg-subtle"
    >
      <div className="flex-1 min-w-0">
        <div className="text-body-lg text-on-surface">{title}</div>
        {desc && <div className="text-body-md text-on-surface-variant mt-0.5">{desc}</div>}
      </div>
      <Switch checked={checked} decorative />
    </div>
  );
}

/** Row with a full-width control underneath (colour grid, font list…) */
function BlockRow({ title, desc, aside, children }: { title: string; desc?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <div className="text-body-lg text-on-surface">{title}</div>
          {desc && <div className="text-body-md text-on-surface-variant mt-0.5">{desc}</div>}
        </div>
        {aside}
      </div>
      {children}
    </div>
  );
}

const isLight = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
};

const colorName = (hex: string) => {
  const c = ACCENT_COLORS.find((m) => m.hex.toLowerCase() === hex.toLowerCase());
  return c ? (getActiveLang() === 'vi' ? c.vi : c.en) : tr('customColor');
};

function Stat({ value, label, icon }: { value: string | number; label: string; icon: string }) {
  return (
    <div className="rounded-lg bg-ctl border border-card-stroke px-3 py-2.5 flex items-center gap-3 min-w-0">
      <span className="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center shrink-0"><Icon name={icon} size={16} /></span>
      <div className="min-w-0">
        <div className="text-title-sm truncate tabular-nums">{value}</div>
        <div className="text-body-sm text-on-surface-variant truncate">{label}</div>
      </div>
    </div>
  );
}

/** Audio output picker: lists the devices the system offers and follows plug / unplug */
function OutputDevice() {
  const device = useStore((st) => st.settings.audioDevice);
  const update = useStore((st) => st.updateSettings);
  const [list, setList] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => void engine.listOutputDevices().then((l) => alive && setList(l));
    load();
    navigator.mediaDevices?.addEventListener?.('devicechange', load);
    return () => { alive = false; navigator.mediaDevices?.removeEventListener?.('devicechange', load); };
  }, []);
  const options = list.some((d) => d.id === '') ? list : [{ id: '', label: tr('deviceDefault') }, ...list];
  // the saved device may be unplugged right now: keep it visible instead of silently showing another one
  const known = options.some((d) => d.id === device);
  const all = known ? options : [...options, { id: device, label: tr('deviceMissing') }];
  return <Select label={tr('audioOutput')} icon="speaker" value={device} onChange={(v) => update({ audioDevice: v })} options={all.map((d) => ({ value: d.id, label: d.label }))} minWidth={260} />;
}


/** Window material picker: Mica / Acrylic / Mica Alt (Windows 11 system backdrops) */
function BackdropRow() {
  const kind = useStore((st) => st.settings.backdrop);
  const applied = useStore((st) => st.backdropApplied);
  const update = useStore((st) => st.updateSettings);
  const [support, setSupport] = useState<BackdropSupport | null>(null);
  useEffect(() => { void backdropSupport().then(setSupport); }, []);
  const names: Record<BackdropKind, string> = { mica: tr('backdropMica'), acrylic: tr('backdropAcrylic'), 'mica-alt': tr('backdropMicaAlt') };
  const hints: Record<BackdropKind, string> = { mica: tr('backdropHintMica'), acrylic: tr('backdropHintAcrylic'), 'mica-alt': tr('backdropHintMicaAlt') };
  const ok = (k: BackdropKind) => !support || (k === 'mica' ? support.mica : k === 'acrylic' ? support.acrylic : support.micaAlt);
  const note = applied === 'none'
    ? tr('backdropFallback', { kind: names[kind] })
    : applied !== kind ? `${tr('backdropFallback', { kind: names[kind] })} ${tr('backdropAppliedAs', { kind: names[applied as BackdropKind] ?? applied })}` : '';
  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-[220px] flex-1">
          <div className="text-body-lg">{tr('backdropTitle')}</div>
          <div className="text-body-md text-on-surface-variant mt-0.5">{tr('backdropDesc')}</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3" role="radiogroup" aria-label={tr('backdropTitle')}>
        {BACKDROPS.map((k) => (
          <button
            key={k} type="button" onClick={() => update({ backdrop: k })} aria-pressed={kind === k} disabled={!ok(k)}
            className={`text-left rounded-lg border p-2.5 transition-colors duration-fast focus-ring disabled:opacity-40 ${kind === k ? 'bg-primary-container border-primary/50' : 'bg-ctl border-card-stroke hover:bg-ctl-hover'}`}
          >
            <span className="block h-12 rounded-lg mb-2 border border-card-stroke overflow-hidden relative" aria-hidden>
              <span className={`absolute inset-0 ${k === 'mica' ? 'bg-gradient-to-br from-primary/25 via-primary/10 to-tertiary/20' : k === 'acrylic' ? 'bg-gradient-to-br from-primary/35 to-tertiary/10 backdrop-blur-md' : 'bg-gradient-to-br from-on-surface/15 via-primary/20 to-on-surface/10'}`} />
              <span className="absolute left-2 top-2 right-2 bottom-0 rounded-t-lg bg-layer border border-b-0 border-card-stroke" />
            </span>
            <span className="block text-body-lg font-semibold">{names[k]}</span>
            <span className="block text-body-sm text-on-surface-variant mt-0.5">{hints[k]}</span>
          </button>
        ))}
      </div>
      {note && <div className="mt-3 rounded-lg bg-warning-container text-on-surface px-3 py-2 flex gap-2 text-body-md"><Icon name="info" size={16} className="shrink-0 mt-0.5 text-warning" />{note}</div>}
    </div>
  );
}

/** ListenBrainz token field + test button */
function ScrobbleToken() {
  const token = useStore((st) => st.settings.scrobbleToken);
  const update = useStore((st) => st.updateSettings);
  const [busy, setBusy] = useState(false);
  const test = async () => {
    const toast = useStore.getState().showToast;
    setBusy(true);
    try {
      const user = await scrobbleValidate(token);
      toast(tr('scrobbleOk', { u: user || '✓' }), undefined, undefined, 'success');
    } catch {
      toast(tr('scrobbleBad'), undefined, undefined, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <input
        type="password" value={token} onChange={(e) => update({ scrobbleToken: e.target.value.trim() })} placeholder={tr('scrobbleToken')} aria-label={tr('scrobbleToken')}
        autoComplete="off" spellCheck={false}
        className="fl-input w-[260px] max-w-full text-body-lg select-text"
      />
      <Button variant="tonal" icon="check_circle" disabled={busy || !token} onClick={test}>{tr('scrobbleTest')}</Button>
    </>
  );
}

/** yt-dlp (YouTube): status, install / update / remove, or pick your own copy */
function YtdlpPanel() {
  const custom = useStore((st) => st.settings.ytdlpPath);
  const update = useStore((st) => st.updateSettings);
  const [status, setStatus] = useState<YtdlpStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState<OnlineProgress | null>(null);
  const toast = useStore.getState().showToast;

  const refresh = () => void ytdlpStatus().then(setStatus).catch(() => setStatus(null));
  useEffect(() => { refresh(); }, [custom]);
  useEffect(() => {
    const un = listen<OnlineProgress>('online-progress', (e) => setProg(e.payload));
    return () => { void un.then((f) => f()).catch(() => undefined); };
  }, []);

  const install = async () => {
    setBusy(true);
    setProg(null);
    try {
      const st = await ytdlpInstall(true);
      setStatus(st);
      toast(tr('ytInstalled', { v: st.version || '' }), undefined, undefined, 'success');
    } catch (e) {
      toast(onlineErrorText(e), tr('retry'), () => void install(), 'error');
    } finally {
      setBusy(false);
      setProg(null);
    }
  };
  const remove = () =>
    useStore.getState().openDialog({
      type: 'confirm', title: tr('ytRemoveQ'), text: tr('ytRemoveText'), confirmLabel: tr('delete'), danger: true,
      onConfirm: () => void ytdlpRemove().then(setStatus).then(() => toast(tr('ytRemoved'), undefined, undefined, 'success')).catch((e) => toast(onlineErrorText(e), undefined, undefined, 'error')),
    });
  const choose = async () => {
    const p = await pickOne(['exe'], 'yt-dlp');
    if (p) update({ ytdlpPath: p });
  };

  const pct = prog && prog.total > 0 ? Math.min(100, Math.round((prog.done / prog.total) * 100)) : null;
  const stage = prog?.stage === 'runtime' ? tr('ytStageRuntime') : prog?.stage === 'ytdlp' ? tr('ytStageDownload') : tr('ytStageCheck');
  return (
    <div className="px-4 py-3 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${status?.installed ? 'bg-primary-container text-on-primary-container' : 'bg-secondary-container text-on-surface-variant'}`}><Icon name={status?.installed ? 'check_circle' : 'cloud_download'} size={22} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-body-lg">{status?.installed ? tr('ytReady', { v: status.version || '?' }) : tr('ytNotInstalled')}</div>
          <div className="text-body-sm text-on-surface-variant break-all line-clamp-1" title={status?.path}>
            {status?.installed ? status.path : tr('ytNotInstalledDesc')}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className={`px-2.5 h-6 inline-flex items-center gap-1.5 rounded-lg text-label-md ${status?.runtime ? 'bg-success-container text-success' : 'bg-error-container text-on-error-container'}`}>
          <Icon name={status?.runtime ? 'check' : 'info'} size={14} />{status?.runtime ? tr('ytRuntimeOk', { r: status.runtime }) : tr('ytRuntimeMissing')}
        </span>
        {custom && <span className="px-2.5 h-6 inline-flex items-center rounded-lg bg-tertiary-container text-on-tertiary-container text-label-md">{tr('ytCustomPath')}</span>}
      </div>
      {busy && (
        <div className="animate-fade-in">
          <div className="text-body-sm text-on-surface-variant mb-1.5">{stage}{pct !== null ? ` · ${pct}%` : ''}</div>
          <div className="h-1 rounded-full bg-secondary-container overflow-hidden"><div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${pct ?? 8}%` }} /></div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button icon={status?.managed ? 'sync' : 'download'} disabled={busy} onClick={() => void install()}>{status?.managed ? tr('ytUpdate') : tr('ytInstall')}</Button>
        <Button variant="tonal" icon="folder_open" disabled={busy} onClick={() => void choose()}>{tr('ytChoose')}</Button>
        {custom && <Button variant="outlined" icon="restart" disabled={busy} onClick={() => update({ ytdlpPath: '' })}>{tr('ytUseAuto')}</Button>}
        {status?.managed && <Button variant="outlined" danger icon="delete" disabled={busy} onClick={remove}>{tr('ytRemove')}</Button>}
      </div>
      <div className="rounded-lg bg-primary-container text-on-surface border border-card-stroke px-4 py-3 flex gap-3 text-body-md">
        <Icon name="info" size={20} className="shrink-0 mt-0.5" />
        <span>{tr('ytLegal')}</span>
      </div>
    </div>
  );
}

/* ───────────── page ───────────── */

const JUMPS: { id: string; icon: string; label: () => string }[] = [
  { id: 'general', icon: 'settings', label: () => tr('generalSection') },
  { id: 'appearance', icon: 'palette', label: () => tr('appearance') },
  { id: 'playback', icon: 'graphic_eq', label: () => tr('playbackSection') },
  { id: 'library', icon: 'library_music', label: () => tr('librarySection') },
  { id: 'music-online', icon: 'public', label: () => tr('onlineMusicSection') },
  { id: 'online', icon: 'radio', label: () => tr('scrobbleSection') },
  { id: 'about', icon: 'info', label: () => tr('aboutSection') },
];

/** Sticky chip bar: jump to a section and see which one you are reading */
function JumpBar({ scroller }: { scroller: React.RefObject<HTMLDivElement> }) {
  const [active, setActive] = useState('general');
  useEffect(() => {
    const root = scroller.current;
    if (!root || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id.replace('set-', ''))),
      { root, rootMargin: '-90px 0px -65% 0px' },
    );
    JUMPS.forEach((j) => { const el = document.getElementById(`set-${j.id}`); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [scroller]);
  const go = (id: string) => {
    setActive(id);
    document.getElementById(`set-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <nav aria-label={tr('navSettings')} className="sticky top-0 z-20 -mx-6 px-6 py-3 bg-surface-bright/80 backdrop-blur-xl">
      <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]">
        {JUMPS.map((j) => <Chip key={j.id} icon={j.icon} selected={active === j.id} onClick={() => go(j.id)}>{j.label()}</Chip>)}
      </div>
    </nav>
  );
}

export function SettingsView() {
  const scroller = useRef<HTMLDivElement>(null);
  const s = useStore((st) => st.settings);
  const update = useStore((st) => st.updateSettings);
  const st = useStore.getState();
  const { all, albums, artists } = useDerived();
  const playlists = useStore((x) => x.playlists);
  const size = all.reduce((a, t) => a + t.size, 0);
  const font = FONT_OPTIONS.find((f) => f.id === s.fontFamily) ?? FONT_OPTIONS[0];
  const isSystem = s.seedColor === SYSTEM_ACCENT;
  const seed = isSystem ? SYSTEM_ACCENT : s.seedColor.toUpperCase();
  const isCustom = !isSystem && !ACCENT_COLORS.some((c) => c.hex.toLowerCase() === seed.toLowerCase());
  const vi = getActiveLang() === 'vi';

  return (
    <div ref={scroller} className="h-full overflow-y-auto scroll-smooth">
      <div className="mx-auto w-full max-w-3xl px-6 pb-10 animate-fade-in">
        <div className="pt-8 pb-2 px-2">
          <h1 className="text-headline-lg">{tr('navSettings')}</h1>
          <p className="text-body-lg text-on-surface-variant mt-1">{tr('settingsSub')}</p>
        </div>
        <JumpBar scroller={scroller} />

        {/* General */}
        <Section id="general" title={tr('generalSection')} icon="settings">
          <Row title={tr('language')} desc={tr('languageDesc')}>
            <Segmented value={s.language} onChange={(v) => update({ language: v })} options={[{ value: 'auto', label: tr('langAuto') }, { value: 'en', label: 'English' }, { value: 'vi', label: 'Tiếng Việt' }]} />
          </Row>
          <Row title={tr('startMode')} desc={tr('startModeDesc')}>
            <Segmented value={s.startMode} onChange={(v) => update({ startMode: v })} options={[{ value: 'remember', label: tr('startModeRemember'), icon: 'straighten' }, { value: 'maximized', label: tr('startModeMaximized'), icon: 'fit_screen' }]} />
          </Row>
          <ToggleRow title={tr('closeToTray')} desc={tr('closeToTrayDesc')} checked={s.closeToTray} onChange={(v) => update({ closeToTray: v })} />
          <ToggleRow title={tr('alwaysOnTop')} desc={tr('alwaysOnTopDesc')} checked={s.alwaysOnTop} onChange={(v) => update({ alwaysOnTop: v })} />
        </Section>

        {/* Appearance */}
        <Section id="appearance" title={tr('appearance')} icon="palette">
          <BackdropRow />
          <Row title={tr('colorMode')} desc={tr('themeModeDesc')}>
            <Segmented value={s.themeMode} onChange={(v) => update({ themeMode: v })} options={[{ value: 'system', label: tr('themeSystem'), icon: 'brightness_auto' }, { value: 'light', label: tr('themeLight'), icon: 'light_mode' }, { value: 'dark', label: tr('themeDark'), icon: 'dark_mode' }]} />
          </Row>

          <BlockRow
            title={tr('themeColor')} desc={tr('themeColorDesc')}
            aside={
              <span className="shrink-0 inline-flex items-center gap-2 h-8 pl-2 pr-3 rounded-lg bg-ctl border border-card-stroke text-body-lg">
                <span className="w-4 h-4 rounded-full ring-1 ring-outline-variant" style={{ background: resolveAccent(seed) }} />
                {isSystem ? tr('accentSystem') : colorName(seed)} <span className="text-on-surface-variant tabular-nums text-body-md">{resolveAccent(seed).toUpperCase()}</span>
              </span>
            }
          >
            <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(36px,1fr))]">
              <button
                type="button" title={tr('accentSystemDesc')} aria-label={tr('accentSystem')} aria-pressed={isSystem}
                onClick={() => update({ seedColor: SYSTEM_ACCENT })}
                className={`relative aspect-square max-w-[40px] rounded-lg flex items-center justify-center border focus-ring ${isSystem ? 'border-on-surface border-2' : 'border-card-stroke hover:bg-subtle'}`}
                style={{ background: `linear-gradient(135deg, ${resolveAccent(SYSTEM_ACCENT)} 50%, transparent 50%)` }}
              >
                <Icon name="window" size={16} className={isSystem ? 'text-on-surface' : 'text-on-surface-variant'} />
              </button>
              {ACCENT_COLORS.map((c) => {
                const on = !isSystem && c.hex.toLowerCase() === seed.toLowerCase();
                const name = vi ? c.vi : c.en;
                return (
                  <button
                    key={c.hex} type="button" title={name} aria-label={name} aria-pressed={on}
                    onClick={() => update({ seedColor: c.hex })} style={{ background: c.hex }}
                    className={`relative aspect-square max-w-[40px] rounded-lg flex items-center justify-center transition-transform duration-fast hover:scale-105 active:scale-95 focus-ring ${on ? 'ring-2 ring-offset-2 ring-offset-surface-container-lowest ring-on-surface' : ''}`}
                  >
                    {on && <Icon name="check" size={18} className={`animate-pop ${isLight(c.hex) ? 'text-black/80' : 'text-white'}`} />}
                  </button>
                );
              })}
              <label
                title={tr('customColor')}
                className={`relative aspect-square max-w-[40px] rounded-lg border flex items-center justify-center cursor-default transition-transform duration-fast hover:scale-105 focus-within:outline focus-within:outline-2 ${isCustom ? 'border-transparent ring-2 ring-offset-2 ring-offset-surface-container-lowest ring-on-surface' : 'border-outline text-on-surface-variant hover:bg-subtle'}`}
                style={isCustom ? { background: seed } : undefined}
              >
                <Icon name="colorize" size={16} className={isCustom ? (isLight(seed) ? 'text-black/80' : 'text-white') : ''} />
                <input type="color" className="absolute inset-0 opacity-0 cursor-default" aria-label={tr('customColor')} value={resolveAccent(seed).toLowerCase()} onChange={(e) => update({ seedColor: e.target.value.toUpperCase() })} />
              </label>
            </div>
          </BlockRow>

          <ToggleRow title={tr('dynamicColor')} desc={tr('dynamicColorDesc')} checked={s.dynamicColor} onChange={(v) => update({ dynamicColor: v })} />

          <BlockRow title={tr('fontFamily')} desc={tr('fontDesc')}>
            <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
              {FONT_OPTIONS.map((f) => {
                const on = f.id === font.id;
                return (
                  <button
                    key={f.id} type="button" aria-pressed={on} onClick={() => update({ fontFamily: f.id })} style={{ fontFamily: f.stack }}
                    className={`h-10 px-3 rounded-lg border flex items-center justify-between gap-2 text-body-lg transition-colors duration-fast focus-ring ${on ? 'bg-primary-container border-primary/50 font-semibold' : 'bg-ctl border-card-stroke hover:bg-ctl-hover'}`}
                  >
                    <span className="truncate">{f.id === 'system' ? tr('fontSystem') : f.label}</span>
                    {on && <Icon name="check" size={18} className="animate-pop shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 rounded-lg bg-ctl border border-card-stroke px-4 py-3" style={{ fontFamily: font.stack }}>
              <div className="text-title-lg truncate">{tr('fontPreview')}</div>
              <div className="text-body-md text-on-surface-variant mt-0.5">Aa Bb Cc 0123456789 — ă â ê ô ơ ư đ</div>
            </div>
          </BlockRow>
        </Section>

        {/* Playback */}
        <Section id="playback" title={tr('playbackSection')} icon="graphic_eq">
          <ToggleRow title={tr('restoreSession')} desc={tr('restoreSessionDesc')} checked={s.restoreSession} onChange={(v) => update({ restoreSession: v })} />
          <ToggleRow title={tr('gapless')} desc={tr('gaplessDesc')} checked={s.gapless} onChange={(v) => update({ gapless: v })} />
          <Row title={tr('crossfade')} desc={tr('crossfadeDesc')}>
            <Segmented value={String(s.crossfade)} onChange={(v) => update({ crossfade: Number(v) })} options={[0, 3, 6, 10].map((n) => ({ value: String(n), label: n ? tr('cfSec', { n }) : tr('cfOff') }))} />
          </Row>
          <Row title={tr('replayGain')} desc={tr('replayGainDesc')}>
            <Segmented value={s.replayGain} onChange={(v) => update({ replayGain: v })} options={[{ value: 'off', label: tr('rgOff') }, { value: 'track', label: tr('rgTrack') }, { value: 'album', label: tr('rgAlbum') }]} />
          </Row>
          <ToggleRow title={tr('globalMediaKeys')} desc={tr('globalMediaKeysDesc')} checked={s.globalMediaKeys} onChange={(v) => update({ globalMediaKeys: v })} />
          <ToggleRow title={tr('globalHotkeys')} desc={tr('globalHotkeysDesc')} checked={s.globalHotkeys} onChange={(v) => update({ globalHotkeys: v })} />
          <Row title={tr('audioOutput')} desc={tr('audioOutputDesc')}>
            <OutputDevice />
          </Row>
          <ToggleRow title={tr('sleepFade')} desc={tr('sleepFadeDesc')} checked={s.sleepFade} onChange={(v) => update({ sleepFade: v })} />
          <Row title={tr('audioEq')} desc={tr('audioEqDesc')}>
            <Button variant="tonal" icon="tune" onClick={() => st.openDialog({ type: 'audio' })}>{tr('open')}</Button>
          </Row>
          <Row title={tr('sleepTitle')} desc={tr('sleepDesc')}>
            <Button variant="tonal" icon="bedtime" onClick={() => st.openDialog({ type: 'sleep' })}>{tr('setTimer')}</Button>
          </Row>
        </Section>

        {/* Library */}
        <Section id="library" title={tr('librarySection')} icon="library_music">
          <div className="px-4 py-3 grid gap-2 grid-cols-[repeat(auto-fit,minmax(130px,1fr))]">
            <Stat icon="music_note" value={all.length} label={tr('songsTitle')} />
            <Stat icon="album" value={albums.length} label="Album" />
            <Stat icon="person" value={artists.length} label={tr('navArtists')} />
            <Stat icon="queue_music" value={playlists.length} label={tr('playlists')} />
            <Stat icon="storage" value={fmtSize(size)} label={tr('infoSize')} />
          </div>
          <ToggleRow title={tr('autoScanMusic')} desc={tr('autoScanMusicDesc')} checked={s.autoScanMusic} onChange={(v) => update({ autoScanMusic: v })} />
          <ToggleRow title={tr('watchFolders')} desc={tr('watchFoldersDesc')} checked={s.watchFolders} onChange={(v) => update({ watchFolders: v })} />
          <BlockRow title={tr('supportedFormats')} desc={tr('supportedFormatsDesc')}>
            <div className="flex flex-wrap gap-2">
              {['MP3', 'FLAC', 'WAV', 'OGG', 'Opus', 'M4A', 'AAC'].map((f) => <span key={f} className="fl-badge !h-7 !px-3 !text-body-md">{f}</span>)}
            </div>
          </BlockRow>
          <Row title={tr('importGroup')} desc={tr('importGroupDesc')}>
            <Button icon="create_new_folder" onClick={st.importFolder}>{tr('addFolder')}</Button>
            <Button icon="audio_file" variant="tonal" onClick={st.importFiles}>{tr('addFiles')}</Button>
          </Row>
          <Row title={tr('maintainGroup')} desc={tr('maintainDesc')}>
            <Button icon="sync" variant="tonal" onClick={() => st.syncLibrary(false, true)}>{tr('rescanLibrary')}</Button>
            <Button icon="link_off" variant="tonal" onClick={st.removeMissing}>{tr('removeMissing')}</Button>
          </Row>
          <Row title={tr('dupTitle')} desc={tr('dupDesc')}>
            <Button icon="merge" variant="tonal" onClick={() => st.nav({ name: 'duplicates' })}>{tr('dupOpen')}</Button>
          </Row>
          <Row title={tr('autoBackup')} desc={tr('autoBackupDesc')}>
            <Button icon="folder_open" variant="tonal" onClick={() => void getBackupDir().then((d) => d ? openFolder(d) : undefined).catch(() => st.showToast(tr('openFolderFail'), undefined, undefined, 'error'))}>{tr('openFolder')}</Button>
          </Row>
          <Row title={tr('backupGroup')} desc={tr('backupDesc')}>
            <Button icon="download" variant="outlined" onClick={st.backup}>{tr('backup')}</Button>
            <Button icon="upload" variant="outlined" onClick={st.restore}>{tr('restore')}</Button>
          </Row>
        </Section>

        {/* Online music */}
        <Section id="music-online" title={tr('onlineMusicSection')} icon="public">
          <Row title={tr('onlineMusicInfoTitle')} desc={tr('onlineMusicInfoDesc')}>
            <span className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center"><Icon name="play_arrow" fill size={18} /></span>
          </Row>
          <ToggleRow title={tr('onlineLyrics')} desc={tr('onlineLyricsDesc')} checked={s.onlineLyrics} onChange={(v) => update({ onlineLyrics: v })} />
          <Row title={tr('lyricsCache')} desc={tr('lyricsCacheDesc')}>
            <Button variant="tonal" icon="delete" onClick={() => void lyricsCacheClear().then((n) => st.showToast(tr('lyricsCacheCleared', { n }), undefined, undefined, 'success')).catch(() => st.showToast(tr('onErrDisk'), undefined, undefined, 'error'))}>{tr('clear')}</Button>
          </Row>
          <BlockRow title={tr('ytTitle')} desc={tr('ytDesc')}>
            <div className="-mx-4 -mb-3"><YtdlpPanel /></div>
          </BlockRow>
        </Section>

        {/* Online */}
        <Section id="online" title={tr('scrobbleSection')} icon="radio">
          <ToggleRow title={tr('autoLyrics')} desc={tr('autoLyricsDesc')} checked={s.autoLyrics} onChange={(v) => update({ autoLyrics: v })} />
          <ToggleRow title={tr('scrobbleTitle')} desc={tr('scrobbleDesc')} checked={s.scrobble} onChange={(v) => update({ scrobble: v })} />
          <Row title={tr('scrobbleToken')} desc={tr('scrobbleTokenDesc')}>
            <ScrobbleToken />
          </Row>
        </Section>

        {/* About */}
        <Section id="about" title={tr('aboutSection')} icon="info">
          <div className="px-4 py-4 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Logo size={64} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-title-lg">Fluent Music</span>
                <span className="fl-badge">{tr('version')} {__APP_VERSION__}</span>
              </div>
              <div className="text-body-md text-on-surface-variant mt-0.5">{tr('aboutTagline')}</div>
              <div className="mt-2"><AuthorCredit /></div>
            </div>
          </div>
          <Row title={tr('shortcutsBtn')} desc={tr('shortcutsDesc')}>
            <Button variant="tonal" icon="keyboard" onClick={() => st.openDialog({ type: 'shortcuts' })}>{tr('open')}</Button>
          </Row>
        </Section>
      </div>
    </div>
  );
}
