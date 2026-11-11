import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { AuthorCredit, Button, Icon, IconButton, InfoBar, Logo, Segmented, Switch } from '../components/ui';
import { NavView } from '../components/NavView';
import type { IconName } from '../components/icons';
import { ACCENT_PRESETS, BACKDROPS, DEFAULT_ACCENT, FONT_OPTIONS, buildAccent, isDarkMode } from '../lib/theme';
import { useStore } from '../lib/store';
import { useT } from '../lib/useT';
import type { Key } from '../lib/i18n';
import type { Backdrop } from '../lib/types';

type Tab = 'appearance' | 'playback' | 'library' | 'subtitles' | 'window' | 'data' | 'about';
const TABS: { id: Tab; icon: IconName; title: Key; desc: Key }[] = [
  { id: 'appearance', icon: 'palette', title: 'appearance', desc: 'appearanceDesc' },
  { id: 'playback', icon: 'play_circle', title: 'playback', desc: 'playbackDesc' },
  { id: 'library', icon: 'video_library', title: 'library', desc: 'libraryDesc' },
  { id: 'subtitles', icon: 'closed_caption', title: 'subtitles', desc: 'subtitlesDesc' },
  { id: 'window', icon: 'desktop_windows', title: 'window', desc: 'windowDesc' },
  { id: 'data', icon: 'database', title: 'data', desc: 'dataDesc' },
  { id: 'about', icon: 'info', title: 'about', desc: 'aboutDesc' },
];

/** Group header + stack of setting cards (WinUI Settings page) */
function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="animate-rise">
      {title && <h3 className="text-body-strong mb-2 px-0.5">{title}</h3>}
      <div className="flex flex-col gap-0.5">{children}</div>
    </section>
  );
}

const cardBase = 'rounded bg-card border border-stroke-card';

/** SettingsCard: icon, title + description on the left, the control on the right */
function Row({ icon, title, desc, children }: { icon?: IconName; title: string; desc?: string; children?: ReactNode }) {
  return (
    <div className={`${cardBase} flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 min-h-[64px]`}>
      {icon && <Icon name={icon} size={20} className="text-fg shrink-0" />}
      <div className="min-w-0 flex-1 basis-[200px]">
        <div className="text-body">{title}</div>
        {desc && <div className="text-caption text-fg-2 mt-0.5">{desc}</div>}
      </div>
      {children && <div className="shrink-0 max-w-full">{children}</div>}
    </div>
  );
}

/** SettingsExpander: a card whose header toggles a content area */
function Expander({ icon, title, desc, summary, defaultOpen = false, children }: { icon?: IconName; title: string; desc?: string; summary?: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`${cardBase} overflow-hidden`}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="w-full flex items-center gap-4 px-4 py-3 min-h-[64px] text-left hover:bg-subtle active:bg-subtle-press transition-colors duration-150 focus-ring">
        {icon && <Icon name={icon} size={20} className="shrink-0" />}
        <div className="min-w-0 flex-1">
          <div className="text-body">{title}</div>
          {desc && <div className="text-caption text-fg-2 mt-0.5">{desc}</div>}
        </div>
        {summary && <div className="shrink-0 text-caption text-fg-2">{summary}</div>}
        <Icon name="chevron_down" size={16} className={`shrink-0 text-fg-2 transition-transform duration-200 ease-fluent ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-fluent ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden min-h-0"><div className="border-t border-divider">{children}</div></div>
      </div>
    </div>
  );
}

const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);
/** Black or white check mark depending on the swatch brightness */
const onSwatch = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const l = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return l > 160 ? 'text-black/80' : 'text-white';
};

/** Radio tile: bordered, accent border + subtle fill when selected */
function Tile({ on, onClick, children, className = '' }: { on: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button" role="radio" aria-checked={on} onClick={onClick}
      className={`relative text-left rounded border p-3 transition-colors duration-150 ease-fluent focus-ring active:bg-subtle-press ${on ? 'border-accent bg-subtle' : 'border-stroke hover:bg-subtle'} ${className}`}
    >
      {children}
      <span className={`absolute right-2 top-2 w-4 h-4 rounded-full bg-accent text-on-accent flex items-center justify-center transition-all duration-150 ease-fluent ${on ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}><Icon name="check" size={12} /></span>
    </button>
  );
}

/** Mini window drawn with the same layering the real material produces, so the choice is easy to judge */
function BackdropPreview({ kind }: { kind: Backdrop }) {
  const wall = 'linear-gradient(135deg,#5b8fd1 0%,#9b7bd0 55%,#e58fb3 100%)';
  const tint =
    kind === 'mica' ? 'rgb(var(--tile-tint) / 0.78)' : kind === 'mica-alt' ? 'rgb(var(--tile-tint-alt) / 0.9)' : 'rgb(var(--tile-tint) / 0.4)';
  return (
    <div className="relative h-[72px] rounded-[3px] overflow-hidden mb-3" style={{ background: wall }} aria-hidden>
      <div className="absolute inset-x-2 top-2 bottom-0 rounded-t overflow-hidden border border-b-0 border-white/40" style={{ background: tint, backdropFilter: kind === 'acrylic' ? 'blur(6px) saturate(1.4)' : kind === 'mica' ? 'blur(18px)' : 'blur(22px)' }}>
        <div className="h-3 flex items-center gap-1 px-1.5"><span className="w-1.5 h-1.5 rounded-full bg-fg-3" /><span className="h-1 w-8 rounded-full bg-fg-3" /></div>
        <div className="absolute left-1.5 top-5 bottom-0 w-6 rounded-t bg-fg/10" />
        <div className="absolute left-9 right-1.5 top-5 bottom-0 rounded-tl bg-white/40 dark:bg-white/10" />
      </div>
    </div>
  );
}

function BackdropSection() {
  const t = useT();
  const kind = useStore((x) => x.settings.backdrop);
  const applied = useStore((x) => x.backdropApplied);
  const update = useStore((x) => x.updateSettings);
  const opts: { id: Backdrop; title: Key; desc: Key }[] = [
    { id: 'mica', title: 'backdropMica', desc: 'backdropMicaDesc' },
    { id: 'acrylic', title: 'backdropAcrylic', desc: 'backdropAcrylicDesc' },
    { id: 'mica-alt', title: 'backdropMicaAlt', desc: 'backdropMicaAltDesc' },
  ];
  const label = (k: Backdrop) => t(opts.find((o) => o.id === k)!.title);
  return (
    <Expander icon="paint" title={t('backdrop')} desc={t('backdropDesc')} summary={label(kind)} defaultOpen>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" role="radiogroup" aria-label={t('backdrop')} style={{ ['--tile-tint' as string]: 'var(--tint-rgb)' }}>
          {opts.map((o) => (
            <Tile key={o.id} on={kind === o.id} onClick={() => update({ backdrop: o.id })}>
              <BackdropPreview kind={o.id} />
              <div className="text-body-strong">{t(o.title)}</div>
              <div className="text-caption text-fg-2 mt-0.5">{t(o.desc)}</div>
            </Tile>
          ))}
        </div>
        {applied === 'none' && <InfoBar tone="warning">{t('backdropNone')}</InfoBar>}
        {applied && applied !== 'none' && applied !== kind && <InfoBar>{t('backdropFallback', { name: label(applied) })}</InfoBar>}
      </div>
    </Expander>
  );
}

function ColorSection() {
  const t = useT();
  const accent = useStore((x) => x.settings.accentColor);
  const mode = useStore((x) => x.settings.themeMode);
  const update = useStore((x) => x.updateSettings);
  const [hex, setHex] = useState('');
  const dark = isDarkMode(mode);
  const preset = ACCENT_PRESETS.find((p) => p.hex.toLowerCase() === accent.toLowerCase());

  const palette = useMemo(() => {
    const k = buildAccent(accent, dark);
    return [k['accent'], k['accent-text'], k['accent-ondark']].map((c) => `rgb(${c})`);
  }, [accent, dark]);

  const commitHex = () => {
    const v = (hex.startsWith('#') ? hex : `#${hex}`).trim();
    if (isHex(v)) update({ accentColor: v.toUpperCase() });
    setHex('');
  };

  return (
    <Expander
      icon="palette" title={t('themeColor')} desc={t('themeColorDesc')} defaultOpen
      summary={<span className="inline-flex items-center gap-2"><span className="w-4 h-4 rounded-sm border border-stroke-strong" style={{ background: palette[0] }} />{preset ? preset.name : t('customColor')}</span>}
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-36 shrink-0 overflow-hidden rounded border border-stroke-strong" aria-hidden>
            {palette.map((c, i) => <span key={i} className="flex-1 transition-colors duration-300" style={{ background: c }} />)}
          </div>
          <div className="min-w-0">
            <div className="text-body">{preset ? preset.name : t('customColor')}</div>
            <div className="text-caption text-fg-2 tabular-nums">{accent.toUpperCase()}</div>
          </div>
          {accent.toLowerCase() !== DEFAULT_ACCENT.toLowerCase() && (
            <Button variant="tonal" className="ml-auto" icon="restart_alt" onClick={() => update({ accentColor: DEFAULT_ACCENT })}>{t('reset')}</Button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('themeColor')}>
          {ACCENT_PRESETS.map((c) => {
            const on = accent.toLowerCase() === c.hex.toLowerCase();
            return (
              <button
                key={c.hex} type="button" role="radio" aria-checked={on} aria-label={c.name} title={c.name}
                onClick={() => update({ accentColor: c.hex })} style={{ background: c.hex }}
                className={`h-8 w-8 rounded inline-flex items-center justify-center transition-transform duration-150 ease-fluent hover:scale-110 active:scale-95 focus-ring ${on ? 'outline outline-2 outline-offset-2 outline-[var(--fg)]' : ''}`}
              >
                {on && <Icon name="check" size={16} className={`animate-pop ${onSwatch(c.hex)}`} />}
              </button>
            );
          })}
          <label
            title={t('customColor')}
            className={`relative h-8 w-8 rounded inline-flex items-center justify-center cursor-pointer border border-stroke-strong text-fg-2 transition-transform duration-150 hover:scale-110 focus-within:outline focus-within:outline-2 focus-within:outline-[var(--fg)] ${!preset ? 'outline outline-2 outline-offset-2 outline-[var(--fg)]' : ''}`}
            style={!preset ? { background: accent } : undefined}
          >
            <Icon name="colorize" size={16} className={!preset ? onSwatch(accent) : ''} />
            <input type="color" className="sr-only" value={isHex(accent) ? accent : DEFAULT_ACCENT} onChange={(e) => update({ accentColor: e.target.value.toUpperCase() })} />
          </label>
        </div>

        <label className="flex items-center gap-3">
          <span className="text-caption text-fg-2 w-24 shrink-0">{t('hexColor')}</span>
          <input
            value={hex} onChange={(e) => setHex(e.target.value)} onBlur={commitHex} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            placeholder={accent.toUpperCase()} maxLength={7} spellCheck={false}
            className="fluent-input w-32 px-3 text-body tabular-nums uppercase"
          />
        </label>
      </div>
    </Expander>
  );
}

function FontSection() {
  const t = useT();
  const font = useStore((x) => x.settings.fontFamily);
  const update = useStore((x) => x.updateSettings);
  const cur = FONT_OPTIONS.find((f) => f.id === font) ?? FONT_OPTIONS[0];
  const groups: { label?: string; items: typeof FONT_OPTIONS }[] = [
    { items: FONT_OPTIONS.filter((f) => f.group === 'system') },
    { label: t('fontGroupBundled'), items: FONT_OPTIONS.filter((f) => f.group === 'bundled') },
    { label: t('fontGroupWindows'), items: FONT_OPTIONS.filter((f) => f.group === 'windows') },
  ];
  return (
    <Expander icon="font" title={t('fontFamily')} desc={t('fontFamilyDesc')} summary={cur.id === 'system' ? t('fontSystem') : cur.label}>
      <div className="p-4 space-y-4">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.label && <div className="text-caption text-fg-2 mb-2">{g.label}</div>}
            <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(132px,1fr))]" role="radiogroup" aria-label={t('fontFamily')}>
              {g.items.map((f) => (
                <Tile key={f.id} on={f.id === font} onClick={() => update({ fontFamily: f.id })} className="h-[68px] !py-2">
                  <div className="text-subtitle leading-8" style={{ fontFamily: f.stack }}>Aa</div>
                  <div className="truncate text-caption" style={{ fontFamily: f.stack }}>{f.id === 'system' ? t('fontSystem') : f.label}</div>
                </Tile>
              ))}
            </div>
          </div>
        ))}
        <div className="rounded bg-control border border-stroke px-4 py-3 text-body-large" style={{ fontFamily: cur.stack }}>{t('fontPreview')}</div>
      </div>
    </Expander>
  );
}

function Appearance() {
  const t = useT();
  const s = useStore((x) => x.settings);
  const update = useStore((x) => x.updateSettings);
  return (
    <>
      <Group>
        <Row icon="language" title={t('language')}>
          <Segmented value={s.language} onChange={(v) => update({ language: v })} options={[{ value: 'auto', label: t('langAuto') }, { value: 'en', label: 'English' }, { value: 'vi', label: 'Tiếng Việt' }]} />
        </Row>
        <Row icon="dark_mode" title={t('theme')}>
          <Segmented value={s.themeMode} onChange={(v) => update({ themeMode: v })} options={[{ value: 'system', label: t('themeSystem'), icon: 'brightness_auto' }, { value: 'light', label: t('themeLight'), icon: 'light_mode' }, { value: 'dark', label: t('themeDark'), icon: 'dark_mode' }]} />
        </Row>
      </Group>
      <Group title={t('backdropGroup')}>
        <BackdropSection />
      </Group>
      <Group title={t('personalize')}>
        <ColorSection />
        <FontSection />
      </Group>
    </>
  );
}

function Playback() {
  const t = useT();
  const s = useStore((x) => x.settings);
  const update = useStore((x) => x.updateSettings);
  return (
    <Group>
      <Row icon="schedule" title={t('resumePlayback')} desc={t('resumePlaybackDesc')}><Switch checked={s.resume} onChange={(v) => update({ resume: v })} /></Row>
      <Row icon="playlist_play" title={t('autoQueue')} desc={t('autoQueueDesc')}><Switch checked={s.autoQueue} onChange={(v) => update({ autoQueue: v })} /></Row>
      <Row icon="forward_10" title={t('seekStep')}>
        <Segmented value={String(s.seekStep)} onChange={(v) => update({ seekStep: Number(v) })} options={[{ value: '5', label: '5 s' }, { value: '10', label: '10 s' }, { value: '15', label: '15 s' }]} />
      </Row>
      <Row icon="view" title={t('hideControls')}>
        <Segmented value={String(s.hideDelay)} onChange={(v) => update({ hideDelay: Number(v) })} options={[{ value: '1500', label: '1.5 s' }, { value: '2500', label: '2.5 s' }, { value: '5000', label: '5 s' }]} />
      </Row>
    </Group>
  );
}

function LibrarySettings() {
  const t = useT();
  const s = useStore((x) => x.settings);
  const syncing = useStore((x) => x.syncing);
  const update = useStore((x) => x.updateSettings);
  const st = useStore.getState();
  return (
    <>
      <Group>
        <Row icon="folder_open" title={t('autoScanVideos')} desc={t('autoScanVideosDesc')}><Switch checked={s.autoScanVideos} onChange={(v) => update({ autoScanVideos: v })} /></Row>
        <Row icon="refresh" title={t('scanNow')}>
          <Button variant="tonal" icon="refresh" disabled={syncing} onClick={() => void st.syncLibrary(false, true)}>{syncing ? t('scanning') : t('refresh')}</Button>
        </Row>
      </Group>
      <Group title={t('libraryFolders')}>
        <div className={`${cardBase} px-4 py-3 space-y-1.5`}>
          <div className="text-caption text-fg-2 pb-1">{t('libraryFoldersDesc')}</div>
          {s.libraryFolders.length === 0 && <div className="text-body text-fg-2 py-2">{t('noFolders')}</div>}
          {s.libraryFolders.map((f) => (
            <div key={f} className="flex items-center gap-3 h-10 pl-3 pr-1 rounded bg-control border border-stroke animate-rise">
              <Icon name="folder" size={16} className="text-fg-2" />
              <div className="flex-1 min-w-0 truncate text-body" title={f}>{f}</div>
              <IconButton icon="close" size="sm" title={t('removeFolder')} onClick={() => st.removeLibraryFolder(f)} />
            </div>
          ))}
          <div className="pt-1"><Button variant="tonal" icon="create_new_folder" onClick={st.addLibraryFolder}>{t('addFolder')}</Button></div>
        </div>
      </Group>
    </>
  );
}

function SubtitleSettings() {
  const t = useT();
  const s = useStore((x) => x.settings);
  const update = useStore((x) => x.updateSettings);
  const st = useStore.getState();
  return (
    <Group>
      <Row icon="closed_caption" title={t('autoSubs')} desc={t('autoSubsDesc')}><Switch checked={s.autoSubs} onChange={(v) => update({ autoSubs: v })} /></Row>
      <Row icon="text_fields" title={t('subStyleTitle')} desc={t('subStyleDesc')}><Button variant="tonal" onClick={() => st.openDialog({ type: 'subs' })}>{t('customize')}</Button></Row>
    </Group>
  );
}

function WindowSettings() {
  const t = useT();
  const s = useStore((x) => x.settings);
  const update = useStore((x) => x.updateSettings);
  const opts: { value: 'remember' | 'maximized'; icon: IconName; title: Key; desc: Key }[] = [
    { value: 'remember', icon: 'straighten', title: 'startModeRemember', desc: 'startModeRememberDesc' },
    { value: 'maximized', icon: 'fit_screen', title: 'startModeMaximized', desc: 'startModeMaximizedDesc' },
  ];
  return (
    <>
      <Group title={t('startMode')}>
        <div className={`${cardBase} p-3`}>
          <div className="text-caption text-fg-2 px-1 pb-2">{t('startModeDesc')}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="radiogroup" aria-label={t('startMode')}>
            {opts.map((o) => (
              <Tile key={o.value} on={s.startMode === o.value} onClick={() => update({ startMode: o.value })} className="p-4">
                <Icon name={o.icon} size={20} className={s.startMode === o.value ? 'text-accent-text' : 'text-fg-2'} />
                <div className="text-body-strong mt-2">{t(o.title)}</div>
                <div className="text-caption text-fg-2 mt-0.5">{t(o.desc)}</div>
              </Tile>
            ))}
          </div>
        </div>
      </Group>
      <Group>
        <Row icon="push_pin" title={t('alwaysOnTop')}><Switch checked={s.alwaysOnTop} onChange={(v) => update({ alwaysOnTop: v })} /></Row>
      </Group>
    </>
  );
}

function DataSettings() {
  const t = useT();
  const st = useStore.getState();
  return (
    <Group>
      <Row icon="delete_sweep" title={t('clearHistory')} desc={t('clearHistoryText')}>
        <Button variant="tonal" danger icon="delete"
          onClick={() => st.openDialog({ type: 'confirm', title: t('clearHistory'), text: t('clearHistoryText'), confirmLabel: t('clear'), danger: true, onConfirm: st.clearHistory })}>
          {t('clear')}
        </Button>
      </Row>
    </Group>
  );
}

function About() {
  const t = useT();
  const st = useStore.getState();
  const [ver, setVer] = useState('1.2.0');
  useEffect(() => { getVersion().then(setVer).catch(() => {}); }, []);
  return (
    <Group>
      <div className={`${cardBase} flex flex-col items-center text-center px-6 py-8 gap-1`}>
        <div className="animate-pop"><Logo size={72} /></div>
        <div className="text-subtitle mt-3">Fluent Video</div>
        <span className="mt-1 rounded bg-control border border-stroke px-2.5 py-0.5 text-caption text-fg-2">{t('version')} {ver}</span>
        <p className="text-body text-fg-2 mt-2 max-w-sm">{t('aboutTagline')}</p>
        <div className="mt-4"><AuthorCredit center /></div>
        <p className="text-caption text-fg-2 mt-4">{t('aboutLicense')}</p>
        <div className="mt-4"><Button variant="tonal" icon="keyboard" onClick={() => st.openDialog({ type: 'shortcuts' })}>{t('shortcuts')}</Button></div>
      </div>
    </Group>
  );
}

const PANELS: Record<Tab, () => JSX.Element> = {
  appearance: Appearance, playback: Playback, library: LibrarySettings, subtitles: SubtitleSettings, window: WindowSettings, data: DataSettings, about: About,
};

export function SettingsView() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('appearance');
  const cur = TABS.find((x) => x.id === tab)!;
  const Panel = PANELS[tab];
  return (
    <NavView selected={tab} onSelect={setTab} items={TABS.map((x) => ({ id: x.id, icon: x.icon, label: t(x.title) }))}>
      <div className="h-full overflow-y-auto scroll-smooth">
        <div key={tab} className="mx-auto w-full max-w-[820px] px-8 pt-6 pb-10 space-y-5">
          <header className="animate-rise">
            <h1 className="text-title">{t(cur.title)}</h1>
            <p className="text-body text-fg-2">{t(cur.desc)}</p>
          </header>
          <Panel />
        </div>
      </div>
    </NavView>
  );
}
