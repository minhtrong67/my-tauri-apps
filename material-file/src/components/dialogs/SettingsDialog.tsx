import { useState } from 'react';
import { AppWindow, Check, Columns2, Eye, EyeOff, FileText, FolderTree, Globe, Heart, ImageIcon, Info, Languages, LayoutGrid, Maximize2, Monitor, Moon, Palette, Pipette, Rocket, RotateCcw, Ruler, Save, Settings as Gear, ShieldCheck, Sparkles, Sun, Trash2, Type, History, Bell, Keyboard, TextCursorInput, Rows3, Rows4, ListChecks, Check as CheckIcon, PanelRight, AppWindowMac, SquareArrowOutUpRight } from 'lucide-react';
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
          <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label={t('settings.color')}>
            {PALETTE.map((p: SwatchDef) => {
              const on = p.hex.toLowerCase() === S.seed.toLowerCase(); const name = lang === 'vi' ? p.vi : p.en;
              return <button key={p.hex} type="button" role="radio" aria-checked={on} aria-label={t('settings.swatch', { name, hex: p.hex })} title={`${name} (${p.hex})`} onClick={() => pick(p.hex)} className={`swatch ${on ? 'on' : ''}`} style={{ background: p.hex }}>
                {on && <Check className="size-4" strokeWidth={3.2} style={{ color: LIGHT_SWATCH.has(p.hex.toLowerCase()) ? '#222' : '#fff' }} />}</button>;
            })}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <label className={`swatch cursor-pointer ${custom ? 'on' : ''}`} style={{ background: validHex(hex) ? hex : S.seed }} title={t('settings.custom')}>
              <Pipette className="size-4 text-white mix-blend-difference" /><input type="color" className="absolute inset-0 size-full cursor-pointer opacity-0" value={validHex(hex) ? hex : S.seed} onChange={(e) => pick(e.target.value)} aria-label={t('settings.custom')} />
            </label>
            <input className="field !w-32 font-mono" value={hex} maxLength={7} spellCheck={false} aria-label="HEX" onChange={(e) => { setHex(e.target.value); if (validHex(e.target.value)) S.set({ seed: e.target.value }); }} />
            <span className="text-xs text-on-surface-variant">{t('settings.custom')}</span>
          </div>
        </SettingRow>
      </SectionCard>
      <SectionCard title={t('settings.font')}>
        <SettingRow icon={Type} title={t('settings.font')} desc={t('settings.d.font')}>
          <Select ariaLabel={t('settings.font')} value={S.font} onChange={(v) => S.set({ font: v })} width={220}
            options={FONTS.map((f) => ({ value: f.id, label: f.label || t('settings.fontSystem'), hint: f.bundled ? t('settings.fontBundled') : undefined, style: { fontFamily: f.stack } }))} />
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
                className={`ripple flex items-start gap-3 rounded-2xl p-3 text-left ring-1 transition-[border-radius,background-color,box-shadow] duration-300 hover:rounded-xl ${S.windowMode === v ? 'bg-primary-container text-on-primary-container ring-2 ring-primary' : 'bg-surface-container-high ring-outline-variant'}`}>
                <I className="mt-0.5 size-5 flex-none" /><span><span className="block font-semibold">{title}</span><span className="block text-xs opacity-80">{desc}</span></span>
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
            <label key={tg.id} className="flex items-center gap-3 rounded-2xl bg-surface-container-high px-3 py-1.5">
              <i className="tag-dot !size-4 flex-none" style={{ background: tg.color }} />
              <input className="h-9 min-w-0 flex-1 bg-transparent outline-none" maxLength={24} placeholder={t(tg.key)} aria-label={t(tg.key)} value={S.tagNames[tg.id] || ''} onChange={(e) => S.set({ tagNames: { ...S.tagNames, [tg.id]: e.target.value } })} />
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
    <div className="space-y-4">
      <div className="card flex flex-col items-center gap-3 p-6 text-center">
        <img src={logo} alt="" className="size-24 animate-[float_3.2s_ease-in-out_infinite] drop-shadow-lg" />
        <div><div className="text-2xl font-bold">Material File</div><div className="text-on-surface-variant">{t('about.desc')}</div></div>
        <span className="rounded-full bg-primary-container px-3 py-1 text-xs font-bold text-on-primary-container">{t('about.version')} {APP_VERSION}</span>
      </div>
      <SectionCard>
        <SettingRow icon={Info} title={t('about.author')} desc={t('about.authorDesc')}><span className="font-semibold text-primary">minhtrong67</span></SettingRow>
        <SettingRow icon={Sparkles} title={t('about.aiTitle')} desc={t('about.ai')}><Heart className="size-5 text-error" fill="currentColor" /></SettingRow>
        <SettingRow icon={ShieldCheck} title={t('about.license')} desc={t('about.licenseDesc')}><span className="font-semibold">MIT</span></SettingRow>
        <SettingRow icon={Rocket} title={t('about.builtTitle')} desc="Tauri 2 · Vite · React · TypeScript · Tailwind CSS · Lucide"><span /></SettingRow>
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
        <nav className="flex w-60 flex-none flex-col gap-1 bg-surface-container-low p-3 max-sm:w-auto max-sm:flex-row max-sm:overflow-x-auto max-sm:p-2" aria-label={t('settings.title')}>
          <div className="mb-2 flex items-center gap-3 px-2 py-2 max-sm:hidden"><span className="grid size-10 place-items-center rounded-2xl bg-primary text-on-primary"><Gear className="size-5" style={{ animation: open ? 'spin 1.2s var(--ease-emph) 1' : undefined }} /></span><span id="settings-title" className="text-lg font-semibold">{t('settings.title')}</span></div>
          {items.map((i) => (
            <button key={i.id} type="button" onClick={() => setPanel(i.id)} aria-current={panel === i.id} className={`ripple flex items-center gap-3 rounded-full px-4 py-3 text-left font-medium transition-[background-color,border-radius] duration-300 hover:rounded-2xl max-sm:flex-none ${panel === i.id ? 'bg-secondary-container font-semibold text-on-secondary-container' : 'hover:bg-on-surface/8'}`}>
              <i.icon className="size-5" />{i.label}
            </button>
          ))}
        </nav>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex flex-none items-center gap-3 px-6 pt-5 pb-3">
            <div className="min-w-0 flex-1"><h2 className="truncate text-2xl font-semibold">{cur.label}</h2><p className="truncate text-on-surface-variant">{cur.sub}</p></div>
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
