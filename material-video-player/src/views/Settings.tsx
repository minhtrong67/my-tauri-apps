import { useMemo, useState, type ReactNode } from 'react';
import { AuthorCredit, Button, Icon, IconButton, Logo, Segmented, Switch } from '../components/ui';
import type { IconName } from '../components/icons';
import { DEFAULT_SEED, FONT_OPTIONS, SEED_PRESETS, buildTokens, isDarkMode } from '../lib/theme';
import { useStore } from '../lib/store';
import { useT } from '../lib/useT';
import type { Key } from '../lib/i18n';

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

/** Rounded surface that groups related rows; rows are separated by hairlines */
function Card({ title, desc, children, className = '' }: { title?: string; desc?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl bg-surface-container overflow-hidden animate-rise ${className}`}>
      {title && (
        <header className="px-5 pt-4 pb-1">
          <h3 className="text-title-md">{title}</h3>
          {desc && <p className="text-body-sm text-on-surface-variant mt-0.5">{desc}</p>}
        </header>
      )}
      <div className="divide-y divide-outline-variant/40">{children}</div>
    </section>
  );
}

function Row({ title, desc, children }: { title: string; desc?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-3.5 min-h-[64px]">
      <div className="min-w-0 flex-1 basis-[200px]">
        <div className="text-body-lg leading-6">{title}</div>
        {desc && <div className="text-body-sm text-on-surface-variant mt-0.5">{desc}</div>}
      </div>
      {children && <div className="shrink-0 max-w-full">{children}</div>}
    </div>
  );
}

const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);
/** Black or white check mark depending on the swatch brightness */
const onSwatch = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const l = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return l > 160 ? 'text-black/75' : 'text-white';
};

function ColorSection() {
  const t = useT();
  const seed = useStore((x) => x.settings.seedColor);
  const mode = useStore((x) => x.settings.themeMode);
  const update = useStore((x) => x.updateSettings);
  const [hex, setHex] = useState('');
  const dark = isDarkMode(mode);
  const preset = SEED_PRESETS.find((p) => p.hex.toLowerCase() === seed.toLowerCase());

  const palette = useMemo(() => {
    const k = buildTokens(seed, dark);
    return ['primary', 'primary-container', 'secondary-container', 'tertiary-container', 'surface-container-highest'].map((n) => `rgb(${k[n]})`);
  }, [seed, dark]);

  const commitHex = () => {
    const v = (hex.startsWith('#') ? hex : `#${hex}`).trim();
    if (isHex(v)) update({ seedColor: v.toUpperCase() });
    setHex('');
  };

  return (
    <Card title={t('themeColor')} desc={t('themeColorDesc')}>
      <div className="px-5 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-40 shrink-0 overflow-hidden rounded-2xl shadow-sm ring-1 ring-outline-variant/60" aria-hidden>
            {palette.map((c, i) => <span key={i} className="flex-1 transition-colors duration-500" style={{ background: c }} />)}
          </div>
          <div className="min-w-0">
            <div className="text-label-lg">{preset ? preset.name : t('customColor')}</div>
            <div className="text-body-sm text-on-surface-variant tabular-nums">{seed.toUpperCase()}</div>
          </div>
          {seed.toLowerCase() !== DEFAULT_SEED.toLowerCase() && (
            <Button variant="text" className="ml-auto" icon="restart_alt" onClick={() => update({ seedColor: DEFAULT_SEED })}>{t('reset')}</Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label={t('themeColor')}>
          {SEED_PRESETS.map((c) => {
            const on = seed.toLowerCase() === c.hex.toLowerCase();
            return (
              <button
                key={c.hex} type="button" role="radio" aria-checked={on} aria-label={c.name} title={c.name}
                onClick={() => update({ seedColor: c.hex })} style={{ background: c.hex }}
                className={`h-9 w-9 rounded-full inline-flex items-center justify-center transition-all duration-200 ease-emphasized hover:scale-110 active:scale-95 focus-ring ${on ? 'ring-2 ring-offset-2 ring-offset-surface-container ring-on-surface' : ''}`}
              >
                {on && <Icon name="check" size={20} className={`animate-pop ${onSwatch(c.hex)}`} />}
              </button>
            );
          })}
          <label
            title={t('customColor')}
            className={`relative h-9 w-9 rounded-full inline-flex items-center justify-center cursor-pointer border border-outline text-on-surface-variant transition-all duration-200 hover:bg-on-surface/[.08] hover:scale-110 focus-within:ring-2 focus-within:ring-primary ${!preset ? 'ring-2 ring-offset-2 ring-offset-surface-container ring-on-surface' : ''}`}
            style={!preset ? { background: seed } : undefined}
          >
            <Icon name="colorize" size={18} className={!preset ? onSwatch(seed) : ''} />
            <input type="color" className="sr-only" value={isHex(seed) ? seed : DEFAULT_SEED} onChange={(e) => update({ seedColor: e.target.value.toUpperCase() })} />
          </label>
        </div>

        <label className="flex items-center gap-3">
          <span className="text-body-sm text-on-surface-variant w-24 shrink-0">{t('hexColor')}</span>
          <input
            value={hex} onChange={(e) => setHex(e.target.value)} onBlur={commitHex} onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur())}
            placeholder={seed.toUpperCase()} maxLength={7} spellCheck={false}
            className="h-10 w-32 rounded-xl bg-surface-container-high px-3 text-body-md tabular-nums uppercase outline-none transition-shadow focus:ring-2 ring-primary/60 placeholder:text-on-surface-variant/70"
          />
        </label>
      </div>
    </Card>
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
    <Card title={t('fontFamily')} desc={t('fontFamilyDesc')}>
      <div className="px-5 py-4 space-y-4">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.label && <div className="text-label-md text-on-surface-variant mb-2 uppercase tracking-wider">{g.label}</div>}
            <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(132px,1fr))]" role="radiogroup" aria-label={t('fontFamily')}>
              {g.items.map((f) => {
                const on = f.id === font;
                return (
                  <button
                    key={f.id} type="button" role="radio" aria-checked={on} onClick={() => update({ fontFamily: f.id })}
                    className={`relative h-[68px] rounded-2xl border px-3 text-left transition-all duration-200 ease-emphasized hover:-translate-y-0.5 active:scale-[0.97] focus-ring ${on ? 'border-primary bg-primary-container text-on-primary-container' : 'border-outline-variant hover:bg-on-surface/[.06]'}`}
                  >
                    <div className="text-title-lg leading-8" style={{ fontFamily: f.stack }}>Aa</div>
                    <div className="truncate text-label-md" style={{ fontFamily: f.stack }}>{f.id === 'system' ? t('fontSystem') : f.label}</div>
                    {on && <Icon name="check" size={16} className="absolute right-2.5 top-2.5 animate-pop text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="rounded-2xl bg-surface-container-high px-4 py-3 text-body-lg transition-[font-family]" style={{ fontFamily: cur.stack }}>{t('fontPreview')}</div>
      </div>
    </Card>
  );
}

function Appearance() {
  const t = useT();
  const s = useStore((x) => x.settings);
  const update = useStore((x) => x.updateSettings);
  return (
    <>
      <Card>
        <Row title={t('language')}>
          <Segmented value={s.language} onChange={(v) => update({ language: v })} options={[{ value: 'auto', label: t('langAuto') }, { value: 'en', label: 'English' }, { value: 'vi', label: 'Tiếng Việt' }]} />
        </Row>
        <Row title={t('theme')}>
          <Segmented value={s.themeMode} onChange={(v) => update({ themeMode: v })} options={[{ value: 'system', label: t('themeSystem'), icon: 'brightness_auto' }, { value: 'light', label: t('themeLight'), icon: 'light_mode' }, { value: 'dark', label: t('themeDark'), icon: 'dark_mode' }]} />
        </Row>
      </Card>
      <ColorSection />
      <FontSection />
    </>
  );
}

function Playback() {
  const t = useT();
  const s = useStore((x) => x.settings);
  const update = useStore((x) => x.updateSettings);
  return (
    <Card>
      <Row title={t('resumePlayback')} desc={t('resumePlaybackDesc')}><Switch checked={s.resume} onChange={(v) => update({ resume: v })} /></Row>
      <Row title={t('autoQueue')} desc={t('autoQueueDesc')}><Switch checked={s.autoQueue} onChange={(v) => update({ autoQueue: v })} /></Row>
      <Row title={t('seekStep')}>
        <Segmented value={String(s.seekStep)} onChange={(v) => update({ seekStep: Number(v) })} options={[{ value: '5', label: '5 s' }, { value: '10', label: '10 s' }, { value: '15', label: '15 s' }]} />
      </Row>
      <Row title={t('hideControls')}>
        <Segmented value={String(s.hideDelay)} onChange={(v) => update({ hideDelay: Number(v) })} options={[{ value: '1500', label: '1.5 s' }, { value: '2500', label: '2.5 s' }, { value: '5000', label: '5 s' }]} />
      </Row>
    </Card>
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
      <Card>
        <Row title={t('autoScanVideos')} desc={t('autoScanVideosDesc')}><Switch checked={s.autoScanVideos} onChange={(v) => update({ autoScanVideos: v })} /></Row>
        <Row title={t('scanNow')}>
          <Button variant="tonal" icon="refresh" disabled={syncing} onClick={() => void st.syncLibrary(false, true)}>{syncing ? t('scanning') : t('refresh')}</Button>
        </Row>
      </Card>
      <Card title={t('libraryFolders')} desc={t('libraryFoldersDesc')}>
        <div className="px-5 py-3 space-y-1.5">
          {s.libraryFolders.length === 0 && <div className="text-body-md text-on-surface-variant py-2">{t('noFolders')}</div>}
          {s.libraryFolders.map((f) => (
            <div key={f} className="flex items-center gap-3 h-12 pl-3 pr-1 rounded-xl bg-surface-container-high animate-rise">
              <Icon name="folder" size={20} className="text-on-surface-variant" />
              <div className="flex-1 min-w-0 truncate text-body-md" title={f}>{f}</div>
              <IconButton icon="close" size="sm" title={t('removeFolder')} onClick={() => st.removeLibraryFolder(f)} />
            </div>
          ))}
          <div className="pt-1"><Button variant="tonal" icon="create_new_folder" onClick={st.addLibraryFolder}>{t('addFolder')}</Button></div>
        </div>
      </Card>
    </>
  );
}

function SubtitleSettings() {
  const t = useT();
  const s = useStore((x) => x.settings);
  const update = useStore((x) => x.updateSettings);
  const st = useStore.getState();
  return (
    <Card>
      <Row title={t('autoSubs')} desc={t('autoSubsDesc')}><Switch checked={s.autoSubs} onChange={(v) => update({ autoSubs: v })} /></Row>
      <Row title={t('subStyleTitle')} desc={t('subStyleDesc')}><Button variant="tonal" icon="text_fields" onClick={() => st.openDialog({ type: 'subs' })}>{t('customize')}</Button></Row>
    </Card>
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
      <Card title={t('startMode')} desc={t('startModeDesc')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 px-5 py-4" role="radiogroup" aria-label={t('startMode')}>
          {opts.map((o) => {
            const on = s.startMode === o.value;
            return (
              <button
                key={o.value} type="button" role="radio" aria-checked={on} onClick={() => update({ startMode: o.value })}
                className={`relative flex flex-col items-start justify-start text-left rounded-2xl border p-4 transition-all duration-200 ease-emphasized hover:-translate-y-0.5 active:scale-[0.98] focus-ring ${on ? 'border-primary bg-primary-container text-on-primary-container' : 'border-outline-variant hover:bg-on-surface/[.06]'}`}
              >
                <Icon name={o.icon} className={on ? 'text-primary' : 'text-on-surface-variant'} />
                <div className="text-title-sm mt-2">{t(o.title)}</div>
                <div className={`text-body-sm mt-0.5 ${on ? '' : 'text-on-surface-variant'}`}>{t(o.desc)}</div>
                {on && <Icon name="check" size={18} className="absolute right-3 top-3 text-primary animate-pop" />}
              </button>
            );
          })}
        </div>
      </Card>
      <Card>
        <Row title={t('alwaysOnTop')}><Switch checked={s.alwaysOnTop} onChange={(v) => update({ alwaysOnTop: v })} /></Row>
      </Card>
    </>
  );
}

function DataSettings() {
  const t = useT();
  const st = useStore.getState();
  return (
    <Card>
      <Row title={t('clearHistory')} desc={t('clearHistoryText')}>
        <Button variant="tonal" danger icon="delete_sweep" className="!bg-error-container !text-on-error-container"
          onClick={() => st.openDialog({ type: 'confirm', title: t('clearHistory'), text: t('clearHistoryText'), confirmLabel: t('clear'), danger: true, onConfirm: st.clearHistory })}>
          {t('clear')}
        </Button>
      </Row>
    </Card>
  );
}

function About() {
  const t = useT();
  const st = useStore.getState();
  return (
    <Card>
      <div className="flex flex-col items-center text-center px-6 py-8 gap-1">
        <div className="animate-pop"><Logo size={80} /></div>
        <div className="text-title-lg mt-3">Material Video Player</div>
        <span className="mt-1 rounded-full bg-secondary-container px-3 py-0.5 text-label-md text-on-secondary-container">{t('version')} 1.0.0</span>
        <p className="text-body-md text-on-surface-variant mt-2 max-w-sm">{t('aboutTagline')}</p>
        <div className="mt-4"><AuthorCredit center /></div>
        <p className="text-body-sm text-on-surface-variant mt-4">{t('aboutLicense')}</p>
        <div className="mt-4"><Button variant="tonal" icon="keyboard" onClick={() => st.openDialog({ type: 'shortcuts' })}>{t('shortcuts')}</Button></div>
      </div>
    </Card>
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
    <div className="h-full flex">
      {/* navigation rail (labels collapse on narrow windows) */}
      <nav className="shrink-0 w-[220px] max-[900px]:w-[76px] overflow-y-auto px-3 py-3 flex flex-col gap-1 transition-[width] duration-300 ease-emphasized" aria-label={t('settings')}>
        {TABS.map((x) => {
          const on = x.id === tab;
          return (
            <button
              key={x.id} type="button" onClick={() => setTab(x.id)} title={t(x.title)} aria-current={on ? 'page' : undefined}
              className={`group h-12 rounded-full flex items-center gap-3 px-4 max-[900px]:justify-center max-[900px]:px-0 text-label-lg transition-all duration-200 ease-emphasized active:scale-[0.97] focus-ring ${on ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-on-surface/[.08]'}`}
            >
              <Icon name={x.icon} size={22} className={`transition-transform duration-300 ease-emphasized ${on ? '' : 'group-hover:scale-110'}`} />
              <span className="truncate max-[900px]:hidden">{t(x.title)}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex-1 min-w-0 overflow-y-auto scroll-smooth">
        <div key={tab} className="mx-auto w-full max-w-[760px] px-6 pt-4 pb-10 space-y-4">
          <header className="flex items-center gap-3 px-1 pb-1 animate-rise">
            <span className="w-11 h-11 rounded-2xl bg-primary-container text-on-primary-container flex items-center justify-center"><Icon name={cur.icon} size={24} /></span>
            <div>
              <h1 className="text-headline-sm leading-8">{t(cur.title)}</h1>
              <p className="text-body-md text-on-surface-variant">{t(cur.desc)}</p>
            </div>
          </header>
          <Panel />
        </div>
      </div>
    </div>
  );
}
