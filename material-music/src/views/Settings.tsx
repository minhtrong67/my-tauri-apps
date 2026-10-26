import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { getActiveLang, tr } from '../lib/i18n';
import { AuthorCredit, Button, Chip, Icon, Logo, Segmented, Select, Switch } from '../components/ui';
import { engine } from '../lib/audio';
import { getBackupDir, openFolder, scrobbleValidate } from '../lib/tauri';
import { FONT_OPTIONS, MATERIAL_COLORS } from '../lib/theme';
import { useDerived, useStore } from '../lib/store';
import { fmtSize } from '../lib/utils';

/* ───────────── building blocks ───────────── */

function Section({ id, title, icon, children }: { id: string; title: string; icon: string; children: ReactNode }) {
  return (
    <section id={`set-${id}`} className="mb-5 scroll-mt-20">
      <h2 className="flex items-center gap-2.5 px-2 mb-2 text-title-md text-primary">
        <Icon name={icon} size={20} />
        {title}
      </h2>
      <div className="rounded-3xl bg-surface-container overflow-hidden divide-y divide-outline-variant/50">{children}</div>
    </section>
  );
}

/** A settings row: title + description on the left, control on the right (wraps below on narrow windows) */
function Row({ title, desc, children, tone }: { title: string; desc?: string; children?: ReactNode; tone?: 'danger' }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 min-h-[68px] ${tone === 'danger' ? 'bg-error-container/30' : ''}`}>
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
      className="flex items-center gap-6 px-5 py-4 min-h-[68px] cursor-pointer select-none outline-none transition-colors hover:bg-on-surface/[.05] active:bg-on-surface/[.08] focus-visible:bg-on-surface/[.08]"
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
    <div className="px-5 py-4">
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
  const c = MATERIAL_COLORS.find((m) => m.hex.toLowerCase() === hex.toLowerCase());
  return c ? (getActiveLang() === 'vi' ? c.vi : c.en) : tr('customColor');
};

function Stat({ value, label, icon }: { value: string | number; label: string; icon: string }) {
  return (
    <div className="rounded-2xl bg-surface-container-high px-4 py-3 flex items-center gap-3 min-w-0">
      <span className="w-9 h-9 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0"><Icon name={icon} size={18} /></span>
      <div className="min-w-0">
        <div className="text-title-md leading-5 truncate tabular-nums">{value}</div>
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
        className="w-[260px] max-w-full h-12 px-4 rounded-xl bg-transparent border border-outline focus:border-2 focus:border-primary outline-none text-body-lg text-on-surface select-text transition-colors"
      />
      <Button variant="tonal" icon="check_circle" disabled={busy || !token} onClick={test}>{tr('scrobbleTest')}</Button>
    </>
  );
}

/* ───────────── page ───────────── */

const JUMPS: { id: string; icon: string; label: () => string }[] = [
  { id: 'general', icon: 'settings', label: () => tr('generalSection') },
  { id: 'appearance', icon: 'palette', label: () => tr('appearance') },
  { id: 'playback', icon: 'graphic_eq', label: () => tr('playbackSection') },
  { id: 'library', icon: 'library_music', label: () => tr('librarySection') },
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
    <nav aria-label={tr('navSettings')} className="sticky top-0 z-20 -mx-6 px-6 py-3 bg-surface-container-low/90 backdrop-blur-md">
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
  const seed = s.seedColor.toUpperCase();
  const isPreset = MATERIAL_COLORS.some((c) => c.hex.toLowerCase() === seed.toLowerCase());
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
          <Row title={tr('colorMode')} desc={tr('themeModeDesc')}>
            <Segmented value={s.themeMode} onChange={(v) => update({ themeMode: v })} options={[{ value: 'system', label: tr('themeSystem'), icon: 'brightness_auto' }, { value: 'light', label: tr('themeLight'), icon: 'light_mode' }, { value: 'dark', label: tr('themeDark'), icon: 'dark_mode' }]} />
          </Row>

          <BlockRow
            title={tr('themeColor')} desc={tr('themeColorDesc')}
            aside={
              <span className="shrink-0 inline-flex items-center gap-2 h-8 pl-2 pr-3 rounded-full bg-surface-container-high text-label-lg">
                <span className="w-4 h-4 rounded-full ring-1 ring-outline-variant" style={{ background: seed }} />
                {colorName(seed)} <span className="text-on-surface-variant font-normal tabular-nums">{seed}</span>
              </span>
            }
          >
            <div className="grid gap-2.5 grid-cols-[repeat(auto-fill,minmax(40px,1fr))]">
              {MATERIAL_COLORS.map((c) => {
                const on = c.hex.toLowerCase() === seed.toLowerCase();
                const name = vi ? c.vi : c.en;
                return (
                  <button
                    key={c.hex} type="button" title={name} aria-label={name} aria-pressed={on}
                    onClick={() => update({ seedColor: c.hex })} style={{ background: c.hex }}
                    className={`relative aspect-square max-w-[44px] rounded-full flex items-center justify-center transition-all duration-200 ease-emphasized hover:scale-110 active:scale-95 focus-ring ${on ? 'ring-2 ring-offset-2 ring-offset-surface-container ring-on-surface' : ''}`}
                  >
                    {on && <Icon name="check" size={20} className={`animate-pop ${isLight(c.hex) ? 'text-black/80' : 'text-white'}`} />}
                  </button>
                );
              })}
              <label
                title={tr('customColor')}
                className={`relative aspect-square max-w-[44px] rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer transition-all duration-200 ease-emphasized hover:scale-110 focus-within:ring-2 ring-primary ${!isPreset ? 'border-transparent ring-2 ring-offset-2 ring-offset-surface-container ring-on-surface' : 'border-outline text-on-surface-variant hover:bg-on-surface/[.08]'}`}
                style={!isPreset ? { background: seed } : undefined}
              >
                <Icon name="colorize" size={20} className={!isPreset ? (isLight(seed) ? 'text-black/80' : 'text-white') : ''} />
                <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" aria-label={tr('customColor')} value={seed.toLowerCase()} onChange={(e) => update({ seedColor: e.target.value.toUpperCase() })} />
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
                    className={`h-11 px-3 rounded-xl border flex items-center justify-between gap-2 text-body-lg transition-all duration-200 ease-emphasized active:scale-[0.97] focus-ring ${on ? 'bg-secondary-container text-on-secondary-container border-transparent' : 'border-outline-variant text-on-surface hover:bg-on-surface/[.08]'}`}
                  >
                    <span className="truncate">{f.id === 'system' ? tr('fontSystem') : f.label}</span>
                    {on && <Icon name="check" size={18} className="animate-pop shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 rounded-2xl bg-surface-container-high px-4 py-3" style={{ fontFamily: font.stack }}>
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
          <div className="px-5 py-4 grid gap-2 grid-cols-[repeat(auto-fit,minmax(130px,1fr))]">
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
              {['MP3', 'FLAC', 'WAV', 'OGG', 'Opus', 'M4A', 'AAC'].map((f) => <span key={f} className="px-3 h-8 inline-flex items-center rounded-full bg-secondary-container text-on-secondary-container text-label-lg">{f}</span>)}
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
          <div className="px-5 py-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Logo size={64} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-title-lg">Material Music</span>
                <span className="px-2.5 h-6 inline-flex items-center rounded-full bg-secondary-container text-on-secondary-container text-label-md">{tr('version')} {__APP_VERSION__}</span>
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
