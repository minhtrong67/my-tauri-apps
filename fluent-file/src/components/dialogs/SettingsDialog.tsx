import { useState } from 'react';
import { AppWindow, Layers, Check, Columns2, Eye, EyeOff, FileText, FolderTree, Globe, Heart, ImageIcon, Info, Languages, LayoutGrid, Maximize2, Monitor, Moon, Palette, Pipette, Rocket, RotateCcw, Ruler, Save, Settings as Gear, ShieldCheck, Sparkles, Sun, Trash2, Type, History, Bell, Keyboard, TextCursorInput, Rows3, Rows4, ListChecks, Check as CheckIcon, PanelRight, AppWindowMac, SquareArrowOutUpRight } from 'lucide-react';
import { useSettings } from '../../store/settings';
import { useUI, toast, openModal } from '../../store/ui';
import { useT } from '../../lib/i18n';
import { FONTS, PALETTE, validHex, LIGHT_SWATCH, type SwatchDef } from '../../lib/theme';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { Segmented, SectionCard, SettingRow, Switch } from '../ui/Controls';
import { Button } from '../ui/Buttons';
import { closeModal } from '../../store/ui';
import { api } from '../../lib/api';
import { confirmDialog, errText } from '../../store/explorer';
import { fmtSize } from '../../lib/format';
import logo from '../../assets/logo.svg';
import { toggleDual, TAGS } from '../../lib/menus';
import { APP_VERSION, GITHUB_REPO } from '../../lib/constants';

type PanelId = 'appearance' | 'general' | 'files' | 'about';

function Appearance() {
  const t = useT(); const S = useSettings();
  const [hex, setHex] = useState(S.seed);
  const pick = (h: string) => { setHex(h); S.set({ seed: h }); };
  const lang = S.lang;
  const custom = !PALETTE.some((p) => p.hex.toLowerCase() === S.seed.toLowerCase());
  return (
    <>
      <SectionCard title={t('settings.theme')}>
        <SettingRow icon={Sun} title={t('settings.theme')} desc={t('settings.d.theme')} stack>
          <Segmented ariaLabel={t('settings.theme')} value={S.theme} onChange={(v) => S.set({ theme: v })} options={[{ value: 'light', label: t('settings.light'), icon: Sun }, { value: 'dark', label: t('settings.dark'), icon: Moon }, { value: 'system', label: t('settings.system'), icon: Monitor }]} />
        </SettingRow>
      </SectionCard>
      <SectionCard title={t('settings.color')}>
        <SettingRow icon={Palette} title={t('settings.color')} desc={t('settings.d.color')} stack>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('settings.color')}>
            {PALETTE.map((p: SwatchDef) => {
              const on = p.hex.toLowerCase() === S.seed.toLowerCase(); const name = lang === 'vi' ? p.vi : p.en;
              return <button key={p.hex} type="button" role="radio" aria-checked={on} aria-label={t('settings.swatch', { name, hex: p.hex })} title={`${name} (${p.hex})`} onClick={() => pick(p.hex)} className={`swatch ${on ? 'on' : ''}`} style={{ background: p.hex }}>
                {on && <Check className="size-4" strokeWidth={2.5} style={{ color: LIGHT_SWATCH.has(p.hex.toLowerCase()) ? '#222' : '#fff' }} />}</button>;
            })}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <label className={`swatch cursor-pointer ${custom ? 'on' : ''}`} style={{ background: validHex(hex) ? hex : S.seed }} title={t('settings.custom')}>
              <Pipette className="size-4 text-white mix-blend-difference" strokeWidth={1.75} /><input type="color" className="absolute inset-0 size-full cursor-pointer opacity-0" value={validHex(hex) ? hex : S.seed} onChange={(e) => pick(e.target.value)} aria-label={t('settings.custom')} />
            </label>
            <input className="field !w-32 font-mono" value={hex} maxLength={7} spellCheck={false} aria-label="HEX" onChange={(e) => { setHex(e.target.value); if (validHex(e.target.value)) S.set({ seed: e.target.value }); }} />
            <span className="text-xs text-on-surface-variant">{t('settings.custom')}</span>
          </div>
        </SettingRow>
      </SectionCard>
      <SectionCard title={t('settings.effect')}>
        <SettingRow icon={Layers} title={t('settings.effect')} desc={t('settings.d.effect')}>
          <Select ariaLabel={t('settings.effect')} value={S.effect} onChange={(v) => S.set({ effect: v as typeof S.effect })} width={190}
            options={(['mica', 'tabbed', 'acrylic', 'blur', 'none'] as const).map((v) => ({ value: v, label: t('effect.' + v) }))} />
        </SettingRow>
      </SectionCard>
      <SectionCard title={t('settings.font')}>
        <SettingRow icon={Type} title={t('settings.font')} desc={t('settings.d.font')}>
          <Select ariaLabel={t('settings.font')} value={S.font} onChange={(v) => S.set({ font: v })} width={220}
            options={FONTS.map((f) => ({ value: f.id, label: f.label || t('settings.fontSystem'), style: { fontFamily: f.stack } }))} />
        </SettingRow>
        <SettingRow icon={Ruler} title={t('settings.fontSize')} desc={t('settings.d.fontSize')} stack>
          <Segmented ariaLabel={t('settings.fontSize')} value={S.fontSize} onChange={(v) => S.set({ fontSize: v })} options={[{ value: 'sm', label: t('settings.small') }, { value: 'md', label: t('settings.medium') }, { value: 'lg', label: t('settings.large') }]} />
        </SettingRow>
        <SettingRow icon={Rows3} title={t('settings.density')} desc={t('settings.d.density')} stack>
          <Segmented ariaLabel={t('settings.density')} value={S.density} onChange={(v) => S.set({ density: v })} options={[{ value: 'comfortable', label: t('settings.comfortable'), icon: Rows3 }, { value: 'compact', label: t('settings.compact'), icon: Rows4 }]} />
        </SettingRow>
      </SectionCard>
    </>
  );
}

function General() {
  const t = useT(); const S = useSettings();
  return (
    <>
      <SectionCard title={t('settings.language')}>
        <SettingRow icon={Languages} title={t('settings.language')} desc={t('settings.d.language')} stack>
          <Segmented ariaLabel={t('settings.language')} value={S.lang} onChange={(v) => S.set({ lang: v })} options={[{ value: 'en', label: t('settings.langEn'), icon: Globe }, { value: 'vi', label: t('settings.langVi'), icon: Globe }]} />
        </SettingRow>
      </SectionCard>
      <SectionCard title={t('settings.windowOnStart')}>
        <SettingRow icon={AppWindow} title={t('settings.windowOnStart')} desc={t('settings.d.windowStart')} stack>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
            {([['remember', Save, t('settings.winRemember'), t('settings.d.winRemember')], ['maximized', Maximize2, t('settings.winMax'), t('settings.d.winMax')]] as const).map(([v, I, title, desc]) => (
              <button key={v} type="button" role="radio" aria-checked={S.windowMode === v} onClick={() => S.set({ windowMode: v })}
                className={`flex items-start gap-3 rounded-md border p-3 text-left transition-colors duration-100 hover:bg-on-surface/5 ${S.windowMode === v ? 'border-primary bg-primary/10' : 'border-outline-variant bg-surface-container-low'}`}>
                <I className="mt-0.5 size-5 flex-none" strokeWidth={1.6} /><span><span className="block">{title}</span><span className="block text-xs opacity-80">{desc}</span></span>
              </button>
            ))}
          </div>
        </SettingRow>
      </SectionCard>
      <SectionCard title={t('settings.background')}>
        <SettingRow icon={AppWindowMac} title={t('settings.tray')} desc={t('settings.d.tray')}><Switch label={t('settings.tray')} checked={S.trayEnabled} onChange={(v) => S.set({ trayEnabled: v })} /></SettingRow>
        <SettingRow icon={Keyboard} title={t('settings.shortcut')} desc={t('settings.d.shortcut')}><Switch label={t('settings.shortcut')} checked={S.globalShortcut} onChange={(v) => S.set({ globalShortcut: v })} /></SettingRow>
        <SettingRow icon={History} title={t('settings.restoreTabs')} desc={t('settings.d.restoreTabs')}><Switch label={t('settings.restoreTabs')} checked={S.restoreTabs} onChange={(v) => S.set({ restoreTabs: v })} /></SettingRow>
        <SettingRow icon={Bell} title={t('settings.updates')} desc={t('settings.d.updates')}><Switch label={t('settings.updates')} checked={S.checkUpdates} onChange={(v) => S.set({ checkUpdates: v })} /></SettingRow>
      </SectionCard>
    </>
  );
}

function Files() {
  const t = useT(); const S = useSettings();
  const clear = async () => { try { toast(t('msg.cacheCleared', { size: fmtSize(await api.clearThumbCache(), true) }), 'success'); } catch (e) { toast(errText(e), 'error'); } };
  const reset = async () => {
    const ok = await confirmDialog({ title: t('settings.resetBtn'), message: t('settings.resetConfirm'), confirmLabel: t('settings.resetBtn'), confirmIcon: RotateCcw, tone: 'warning', icon: RotateCcw });
    if (ok) { S.reset(); toast(t('msg.resetDone'), 'success'); }
  };
  const row = (icon: typeof Eye, key: string, k: 'showHidden' | 'showExt' | 'showChecks' | 'confirmDelete' | 'showNav' | 'showDetails' | 'autoExpandTree' | 'thumbnails' | 'rememberLayouts') => (
    <SettingRow icon={icon} title={t('settings.' + key)} desc={t('settings.d.' + key)}><Switch label={t('settings.' + key)} checked={S[k]} onChange={(v) => S.set({ [k]: v })} /></SettingRow>
  );
  return (
    <>
      <SectionCard title={t('settings.files')}>
        <SettingRow icon={LayoutGrid} title={t('settings.defaultView')} desc={t('settings.d.view')}>
          <Select ariaLabel={t('settings.defaultView')} value={S.view} onChange={(v) => S.set({ view: v })} width={190} options={[{ value: 'details', label: t('view.details') }, { value: 'large', label: t('view.large') }, { value: 'grid', label: t('view.medium') }, { value: 'small', label: t('view.small') }]} />
        </SettingRow>
        {row(EyeOff, 'showHidden', 'showHidden')}{row(FileText, 'showExt', 'showExt')}{row(ListChecks, 'showChecks', 'showChecks')}
        {row(ImageIcon, 'thumbnails', 'thumbnails')}{row(Rows3, 'rememberLayouts', 'rememberLayouts')}
        <SettingRow icon={ImageIcon} title={t('settings.clearCache')} desc={t('settings.d.clearCache')}><Button tone="tonal" small icon={Trash2} label={t('settings.clearCacheBtn')} onClick={() => void clear()} /></SettingRow>
      </SectionCard>
      <SectionCard title={t('settings.layout')}>
        {row(PanelRight, 'showDetails', 'showDetails')}{row(FolderTree, 'showNav', 'showNav')}{row(FolderTree, 'autoExpandTree', 'autoExpandTree')}
        <SettingRow icon={Columns2} title={t('settings.dual')} desc={t('settings.d.dual')}><Switch label={t('settings.dual')} checked={S.dualPane} onChange={() => void toggleDual()} /></SettingRow>
      </SectionCard>
      <SectionCard title={t('settings.tags')}>
        <div className="grid gap-2 px-4 py-3 sm:grid-cols-2">
          {TAGS.map((tg) => (
            <label key={tg.id} className="input-box !h-9 !w-auto gap-3 !px-3">
              <i className="tag-dot !size-4 flex-none" style={{ background: tg.color }} />
              <input className="h-full min-w-0 flex-1 bg-transparent outline-none" maxLength={24} placeholder={t(tg.key)} aria-label={t(tg.key)} value={S.tagNames[tg.id] || ''} onChange={(e) => S.set({ tagNames: { ...S.tagNames, [tg.id]: e.target.value } })} />
            </label>))}
        </div>
      </SectionCard>
      <SectionCard title={t('settings.safety')}>
        {row(ShieldCheck, 'confirmDelete', 'confirmDelete')}
        <SettingRow icon={RotateCcw} title={t('settings.maintenance')} desc={t('settings.d.reset')}><Button tone="danger" small icon={RotateCcw} label={t('settings.resetBtn')} onClick={() => void reset()} /></SettingRow>
      </SectionCard>
    </>
  );
}

function About() {
  const t = useT();
  const open = (u: string) => void api.openItem(u);
  return (
    <div className="space-y-3">
      <div className="card flex flex-col items-center gap-3 p-6 text-center">
        <img src={logo} alt="" className="size-24" />
        <div><div className="text-2xl font-semibold">Fluent File</div><div className="text-on-surface-variant">{t('about.desc')}</div></div>
        <span className="rounded-md bg-primary/12 px-2.5 py-0.5 text-xs text-primary">{t('about.version')} {APP_VERSION}</span>
      </div>
      <SectionCard>
        <SettingRow icon={Info} title={t('about.author')} desc={t('about.authorDesc')}><span className="text-primary">minhtrong67</span></SettingRow>
        <SettingRow icon={Sparkles} title={t('about.aiTitle')} desc={t('about.ai')}><Heart className="size-5 text-error" fill="currentColor" strokeWidth={1.75} /></SettingRow>
        <SettingRow icon={ShieldCheck} title={t('about.license')} desc={t('about.licenseDesc')}><span>MIT</span></SettingRow>
        <SettingRow icon={Rocket} title={t('about.builtTitle')} desc="Tauri 2 · Vite · React · TypeScript · Tailwind CSS · Fluent Design · Lucide"><span /></SettingRow>
      </SectionCard>
      <div className="flex flex-wrap gap-2"><Button tone="filled" icon={SquareArrowOutUpRight} label={t('about.source')} onClick={() => open(`https://github.com/${GITHUB_REPO}`)} />
        <Button tone="tonal" icon={Bell} label={t('about.checkUpdate')} onClick={() => openModal('update', { manual: true })} /></div>
    </div>
  );
}

export function SettingsDialog() {
  const t = useT(); const open = useUI((s) => !!s.modals.settings); const panel = useUI((s) => s.settingsPanel) as PanelId;
  const setPanel = (p: PanelId) => useUI.setState({ settingsPanel: p });
  const items: { id: PanelId; icon: typeof Gear; label: string; sub: string }[] = [
    { id: 'appearance', icon: Palette, label: t('settings.appearance'), sub: t('settings.sub.appearance') },
    { id: 'general', icon: TextCursorInput, label: t('settings.general'), sub: t('settings.sub.general') },
    { id: 'files', icon: FolderTree, label: t('settings.files'), sub: t('settings.sub.files') },
    { id: 'about', icon: Info, label: t('settings.about'), sub: t('settings.sub.about') }
  ];
  const cur = items.find((i) => i.id === panel) || items[0];
  return (
    <Modal open={open} onClose={() => closeModal('settings')} bare width={920} tall labelledBy="settings-title">
      <div className="flex h-full max-sm:flex-col">
        <nav className="flex w-60 flex-none flex-col gap-0.5 border-r border-outline-variant bg-surface-container-low p-2 max-sm:w-auto max-sm:flex-row max-sm:overflow-x-auto max-sm:border-r-0 max-sm:border-b" aria-label={t('settings.title')}>
          <div className="mb-2 flex items-center gap-3 px-3 py-3 max-sm:hidden"><Gear className="size-5 text-primary" strokeWidth={1.75} /><span id="settings-title" className="text-base font-semibold">{t('settings.title')}</span></div>
          {items.map((i) => (
            <button key={i.id} type="button" onClick={() => setPanel(i.id)} aria-current={panel === i.id} className={`relative flex h-10 items-center gap-3 rounded-md px-3 text-left transition-colors duration-100 max-sm:flex-none ${panel === i.id ? 'bg-on-surface/6' : 'hover:bg-on-surface/5'}`}>
              {panel === i.id && <span aria-hidden className="absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-full bg-primary" />}
              <i.icon className={`size-[1.125rem] ${panel === i.id ? 'text-primary' : ''}`} strokeWidth={1.6} />{i.label}
            </button>
          ))}
        </nav>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex flex-none items-center gap-3 px-6 pt-5 pb-3">
            <div className="min-w-0 flex-1"><h2 className="truncate text-xl font-semibold">{cur.label}</h2><p className="truncate text-on-surface-variant">{cur.sub}</p></div>
            <Button tone="filled" icon={CheckIcon} label={t('common.done')} onClick={() => closeModal('settings')} data-autofocus />
          </header>
          <div key={panel} className="anim-slide min-h-0 flex-1 overflow-y-auto px-5 pt-1 pb-6">
            {panel === 'appearance' && <Appearance />}{panel === 'general' && <General />}{panel === 'files' && <Files />}{panel === 'about' && <About />}
          </div>
        </div>
      </div>
    </Modal>
  );
}
