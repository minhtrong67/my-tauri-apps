import { useState } from 'react';
import { AppWindow, Check, Code2, FolderDown, FolderOpen, Github, Globe, Maximize, Monitor, MousePointerClick, Moon, Palette, RotateCcw, Settings as Cog, Sparkles, Sun, Type, X } from 'lucide-react';
import { Btn, IconBtn } from '../components/Btn';
import { Card, PageHeader, Row, Segmented } from '../components/Controls';
import { ConfirmDialog } from '../components/Modal';
import { Select } from '../components/Select';
import { Tooltip } from '../components/Tooltip';
import { useToast } from '../components/Toast';
import { useSettings, type Mode, type SaveMode, type WindowMode } from '../lib/store';
import { FONTS, type FontId } from '../lib/fonts';
import { PALETTE } from '../lib/theme';
import { isTauri, openLink, pickFolder } from '../lib/tauri';
import { saveWindowSize } from '../lib/windowState';
import type { Key, Lang } from '../lib/i18n';

const REPO = 'https://github.com/minhtrong67/my-tauri-apps';

export default function Settings() {
  const { s, set, reset, t } = useSettings();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);

  const modes: { value: Mode; icon: typeof Sun }[] = [{ value: 'light', icon: Sun }, { value: 'dark', icon: Moon }, { value: 'system', icon: Monitor }];
  const windows: { value: WindowMode; icon: typeof Sun; title: Key; desc: Key }[] = [
    { value: 'remember', icon: AppWindow, title: 'window.remember', desc: 'window.rememberDesc' },
    { value: 'maximized', icon: Maximize, title: 'window.maximized', desc: 'window.maximizedDesc' },
  ];
  const setWindow = (value: WindowMode) => {
    set({ windowMode: value });
    if (value === 'remember') { void saveWindowSize(); toast.success(t('toast.windowSaved')); }
    else toast.info(t('toast.windowMax'));
  };

  const chooseDir = async (): Promise<boolean> => {
    if (!isTauri) { toast.info(t('toast.desktopOnly')); return false; }
    const dir = await pickFolder();
    if (!dir) return false;
    set({ saveDir: dir }); toast.success(t('toast.saveDirSet'), dir);
    return true;
  };
  const setSaveMode = async (value: SaveMode) => {
    if (value === 'folder' && !s.saveDir && !(await chooseDir())) return;
    set({ saveMode: value });
  };
  const saveModes: { value: SaveMode; icon: typeof Sun; title: Key; desc: Key }[] = [
    { value: 'ask', icon: MousePointerClick, title: 'save.ask', desc: 'save.askDesc' },
    { value: 'folder', icon: FolderDown, title: 'save.folder', desc: 'save.folderDesc' },
  ];

  return (
    <div className="mx-auto max-w-3xl p-6 max-sm:p-4">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <div className="stagger space-y-4">
        <Card title={t('settings.appearance')} icon={Palette}>
          <Row label={t('settings.mode')} desc={t('settings.modeDesc')} stack>
            <div className="grid grid-cols-3 gap-3">
              {modes.map(({ value, icon: Icon }) => {
                const on = s.mode === value;
                return (
                  <button
                    key={value} type="button" role="radio" aria-checked={on} onClick={() => set({ mode: value })}
                    className={`ripple flex flex-col items-center gap-2 rounded-3xl border-2 px-3 py-4 text-sm font-medium transition-[background-color,border-color,border-radius,transform] duration-300 ease-spring active:scale-95 ${on ? 'rounded-[32px] border-primary bg-primary-container text-on-primary-container' : 'border-outline-variant bg-sc-high text-on-surface-variant hover:border-outline hover:bg-sc-highest'}`}
                  >
                    <Icon size={24} />{t(`mode.${value}` as Key)}
                  </button>
                );
              })}
            </div>
          </Row>
          <div className="my-4 h-px bg-outline-variant/50" />
          <Row label={t('settings.color')} desc={t('settings.colorDesc')} stack>
            <div className="flex flex-wrap gap-3">
              {PALETTE.map((c) => {
                const on = s.seed.toLowerCase() === c.hex.toLowerCase();
                return (
                  <Tooltip key={c.id} label={t(`c.${c.id}` as Key)}>
                    <button
                      type="button" aria-label={t(`c.${c.id}` as Key)} aria-pressed={on} onClick={() => set({ seed: c.hex })}
                      style={{ background: c.hex }}
                      className={`ripple flex size-11 items-center justify-center text-white transition-[border-radius,transform,box-shadow] duration-300 ease-spring hover:scale-110 active:scale-90 ${on ? 'scale-105 rounded-2xl ring-2 ring-primary ring-offset-2 ring-offset-card' : 'rounded-full'}`}
                    >
                      {on && <Check size={20} strokeWidth={3} className="drop-shadow" color={['#CDDC39', '#FFC107'].includes(c.hex) ? '#222' : '#fff'} />}
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          </Row>
        </Card>

        <Card title={t('settings.typography')} icon={Type}>
          <Row label={t('settings.fontSize')} desc={t('settings.fontSizeDesc')}>
            <div className="w-[min(100%,300px)] max-sm:w-full">
              <Segmented
                value={s.fontSize} onChange={(fontSize) => set({ fontSize })} ariaLabel={t('settings.fontSize')}
                options={[{ value: 'small', label: t('size.small') }, { value: 'medium', label: t('size.medium') }, { value: 'large', label: t('size.large') }]}
              />
            </div>
          </Row>
          <div className="my-4 h-px bg-outline-variant/50" />
          <Row label={t('settings.font')} desc={t('settings.fontDesc')}>
            <Select<FontId>
              value={s.font} onChange={(font) => set({ font })} ariaLabel={t('settings.font')}
              options={FONTS.map((f) => ({ value: f.id, label: f.id === 'system' ? t('font.system') : f.label, style: { fontFamily: f.stack } }))}
            />
          </Row>
        </Card>

        <Card title={t('settings.files')} icon={FolderDown}>
          <Row label={t('settings.saveMode')} desc={t('settings.saveModeDesc')} stack>
            <div className="grid gap-3 sm:grid-cols-2">
              {saveModes.map(({ value, icon: Icon, title, desc }) => {
                const on = s.saveMode === value;
                return (
                  <button
                    key={value} type="button" role="radio" aria-checked={on} onClick={() => setSaveMode(value)}
                    className={`ripple flex items-center gap-3 rounded-3xl border-2 p-4 text-left transition-[background-color,border-color,border-radius,transform] duration-300 ease-spring active:scale-[.98] ${on ? 'rounded-[32px] border-primary bg-primary-container text-on-primary-container' : 'border-outline-variant bg-sc-high hover:border-outline hover:bg-sc-highest'}`}
                  >
                    <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${on ? 'bg-primary text-on-primary' : 'bg-secondary-container text-on-secondary-container'}`}><Icon size={22} /></span>
                    <span className="min-w-0"><span className="block text-sm font-semibold">{t(title)}</span><span className={`block text-[13px] ${on ? 'opacity-80' : 'text-on-surface-variant'}`}>{t(desc)}</span></span>
                  </button>
                );
              })}
            </div>
          </Row>
          <div className="my-4 h-px bg-outline-variant/50" />
          <Row label={t('settings.saveDir')} desc={t('settings.saveDirDesc')} stack>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-outline-variant bg-sc-high px-4 py-2">
                <FolderOpen size={18} className="shrink-0 text-on-surface-variant" />
                <span className={`selectable min-w-0 flex-1 break-all text-sm ${s.saveDir ? '' : 'text-on-surface-variant'}`}>{s.saveDir ?? t('save.notSet')}</span>
              </div>
              <Btn variant="tonal" icon={FolderOpen} label={t('save.choose')} onClick={chooseDir} />
              {s.saveDir && <IconBtn icon={X} tip={t('save.clear')} tone="error" onClick={() => set({ saveDir: null, saveMode: 'ask' })} />}
            </div>
          </Row>
        </Card>

        <Card title={t('settings.general')} icon={Cog}>
          <Row label={t('settings.language')} desc={t('settings.languageDesc')}>
            <Select<Lang>
              value={s.lang} onChange={(lang) => set({ lang })} ariaLabel={t('settings.language')}
              options={[{ value: 'en', label: 'English' }, { value: 'vi', label: 'Tiếng Việt' }]}
            />
          </Row>
          <div className="my-4 h-px bg-outline-variant/50" />
          <Row label={t('settings.window')} desc={t('settings.windowDesc')} stack>
            <div className="grid gap-3 sm:grid-cols-2">
              {windows.map(({ value, icon: Icon, title, desc }) => {
                const on = s.windowMode === value;
                return (
                  <button
                    key={value} type="button" role="radio" aria-checked={on} onClick={() => setWindow(value)}
                    className={`ripple flex items-center gap-3 rounded-3xl border-2 p-4 text-left transition-[background-color,border-color,border-radius,transform] duration-300 ease-spring active:scale-[.98] ${on ? 'rounded-[32px] border-primary bg-primary-container text-on-primary-container' : 'border-outline-variant bg-sc-high hover:border-outline hover:bg-sc-highest'}`}
                  >
                    <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${on ? 'bg-primary text-on-primary' : 'bg-secondary-container text-on-secondary-container'}`}><Icon size={22} /></span>
                    <span className="min-w-0"><span className="block text-sm font-semibold">{t(title)}</span><span className={`block text-[13px] ${on ? 'opacity-80' : 'text-on-surface-variant'}`}>{t(desc)}</span></span>
                  </button>
                );
              })}
            </div>
          </Row>
          <div className="my-4 h-px bg-outline-variant/50" />
          <Row label={t('settings.resetAll')} desc={t('settings.resetAllDesc')}>
            <Btn variant="warning" icon={RotateCcw} label={t('common.reset')} onClick={() => setConfirm(true)} />
          </Row>
        </Card>

        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-primary to-tertiary p-6 text-on-primary shadow-lg" aria-label={t('settings.about')}>
          <span className="anim-blob pointer-events-none absolute -right-10 -top-12 size-52 bg-on-primary/15" />
          <span className="anim-blob pointer-events-none absolute -bottom-16 left-1/3 size-44 bg-on-primary/10 [animation-delay:-4s]" />
          <div className="relative">
            <div className="flex items-center gap-4">
              <img src="./icon.png" alt="" className="size-16 drop-shadow-lg" draggable={false} />
              <div>
                <h3 className="text-xl font-bold">{t('app.name')}</h3>
                <p className="text-sm opacity-90">{t('app.tagline')} · {t('common.version')} 1.0.0</p>
              </div>
            </div>
            <p className="mt-4 max-w-xl text-sm leading-relaxed opacity-95">{t('about.desc')}</p>
            <div className="mt-5 flex flex-wrap items-center gap-4 rounded-3xl bg-on-primary/15 p-4 backdrop-blur-sm">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-on-primary text-primary"><Code2 size={24} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium opacity-80">{t('about.createdBy')}</p>
                <p className="selectable text-lg font-bold tracking-tight">minhtrong67</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[13px] font-medium"><Sparkles size={14} />{t('about.withAi')}</p>
              </div>
              <button
                type="button" onClick={() => openLink(REPO)}
                className="ripple inline-flex h-10 items-center gap-2 rounded-full bg-on-primary px-5 text-sm font-semibold text-primary transition-[border-radius,transform] duration-300 ease-spring active:scale-95 active:rounded-2xl"
              ><Github size={18} />{t('about.github')}</button>
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs opacity-85"><Globe size={14} />{t('about.license')}</p>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirm} onClose={() => setConfirm(false)} variant="warning" icon={RotateCcw}
        title={t('settings.resetTitle')} message={t('settings.resetMsg')} confirmLabel={t('common.reset')} confirmIcon={RotateCcw}
        onConfirm={() => { reset(); setConfirm(false); toast.success(t('toast.settingsReset')); }}
      />
    </div>
  );
}
