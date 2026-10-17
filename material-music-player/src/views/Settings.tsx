import type { KeyboardEvent, ReactNode } from 'react';
import { getActiveLang, tr } from '../lib/i18n';
import { AuthorCredit, Button, Icon, Logo, Segmented, Switch } from '../components/ui';
import { FONT_OPTIONS, MATERIAL_COLORS } from '../lib/theme';
import { useDerived, useStore } from '../lib/store';
import { fmtSize } from '../lib/utils';

/* ───────────── building blocks ───────────── */

function Section({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <section className="mb-5">
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

/* ───────────── page ───────────── */

export function SettingsView() {
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
    <div className="h-full overflow-y-auto scroll-smooth">
      <div className="mx-auto w-full max-w-3xl px-6 pb-10 stagger">
        <div className="pt-8 pb-5 px-2">
          <h1 className="text-headline-lg">{tr('navSettings')}</h1>
          <p className="text-body-lg text-on-surface-variant mt-1">{tr('settingsSub')}</p>
        </div>

        {/* General */}
        <Section title={tr('generalSection')} icon="settings">
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
        <Section title={tr('appearance')} icon="palette">
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
        <Section title={tr('playbackSection')} icon="graphic_eq">
          <ToggleRow title={tr('restoreSession')} desc={tr('restoreSessionDesc')} checked={s.restoreSession} onChange={(v) => update({ restoreSession: v })} />
          <Row title={tr('audioEq')} desc={tr('audioEqDesc')}>
            <Button variant="tonal" icon="tune" onClick={() => st.openDialog({ type: 'audio' })}>{tr('open')}</Button>
          </Row>
          <Row title={tr('sleepTitle')} desc={tr('sleepDesc')}>
            <Button variant="tonal" icon="bedtime" onClick={() => st.openDialog({ type: 'sleep' })}>{tr('setTimer')}</Button>
          </Row>
        </Section>

        {/* Library */}
        <Section title={tr('librarySection')} icon="library_music">
          <div className="px-5 py-4 grid gap-2 grid-cols-[repeat(auto-fit,minmax(130px,1fr))]">
            <Stat icon="music_note" value={all.length} label={tr('songsTitle')} />
            <Stat icon="album" value={albums.length} label="Album" />
            <Stat icon="person" value={artists.length} label={tr('navArtists')} />
            <Stat icon="queue_music" value={playlists.length} label={tr('playlists')} />
            <Stat icon="storage" value={fmtSize(size)} label={tr('infoSize')} />
          </div>
          <ToggleRow title={tr('autoScanMusic')} desc={tr('autoScanMusicDesc')} checked={s.autoScanMusic} onChange={(v) => update({ autoScanMusic: v })} />
          <Row title={tr('importGroup')} desc={tr('importGroupDesc')}>
            <Button icon="create_new_folder" onClick={st.importFolder}>{tr('addFolder')}</Button>
            <Button icon="audio_file" variant="tonal" onClick={st.importFiles}>{tr('addFiles')}</Button>
          </Row>
          <Row title={tr('maintainGroup')} desc={tr('maintainDesc')}>
            <Button icon="sync" variant="tonal" onClick={() => st.syncLibrary(false, true)}>{tr('rescanLibrary')}</Button>
            <Button icon="link_off" variant="tonal" onClick={st.removeMissing}>{tr('removeMissing')}</Button>
          </Row>
          <Row title={tr('backupGroup')} desc={tr('backupDesc')}>
            <Button icon="download" variant="outlined" onClick={st.backup}>{tr('backup')}</Button>
            <Button icon="upload" variant="outlined" onClick={st.restore}>{tr('restore')}</Button>
          </Row>
          <Row title={tr('dangerZone')} desc={tr('clearLibraryDesc')} tone="danger">
            <Button icon="delete_forever" variant="outlined" danger onClick={() => st.openDialog({ type: 'confirm', title: tr('clearLibraryQ'), text: tr('clearLibraryText', { app: 'Material Music Player' }), confirmLabel: tr('clearAll'), danger: true, onConfirm: st.clearLibrary })}>{tr('clearLibrary')}</Button>
          </Row>
        </Section>

        {/* About */}
        <Section title={tr('aboutSection')} icon="info">
          <div className="px-5 py-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Logo size={64} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-title-lg">Material Music Player</span>
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
