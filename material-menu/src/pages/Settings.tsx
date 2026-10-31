import { useState, type CSSProperties, type ReactNode } from 'react'
import {
  Check, Code, FolderOpen, Globe, Heart, Info, Languages, Maximize, Monitor, Moon, Palette, PanelsTopLeft, RotateCcw, Settings as Gear, Sparkles, Sun, Type, HardDrive, Scaling,
} from 'lucide-react'
import { open } from '@tauri-apps/plugin-dialog'
import { api, isTauri } from '../lib/api'
import { useSettings } from '../lib/settings'
import { FONTS, SEEDS, type ThemeMode } from '../lib/theme'
import { AppMark } from '../components/Titlebar'
import { Button, Chip, cx, IconButton, PageHeader, ripple, Segmented, Select, Tooltip } from '../components/ui'

const VERSION = '1.0.0'
const REPO = 'https://github.com/minhtrong67/my-tauri-apps'

function Section({ id, icon, title, children }: { id: string; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section id={`st-${id}`} className="card scroll-mt-4 p-6">
      <h2 className="mb-5 flex items-center gap-3 text-[1.1rem] font-semibold">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">{icon}</span>{title}
      </h2>
      <div className="space-y-6">{children}</div>
    </section>
  )
}
const Label = ({ children }: { children: ReactNode }) => <p className="mb-2.5 px-0.5 text-[0.85rem] font-medium text-on-surface-variant">{children}</p>

function ModeCard({ mode, on, label, onClick, icon }: { mode: ThemeMode; on: boolean; label: string; onClick: () => void; icon: ReactNode }) {
  const light = { bg: '#F9F9FF', bar: '#E2E2E9', line: '#C4C6D0', acc: '#415F91' }
  const dark = { bg: '#111318', bar: '#33353A', line: '#44474E', acc: '#AAC7FF' }
  const mini = (c: typeof light) => (
    <div className="h-full w-full p-2" style={{ background: c.bg }}>
      <div className="mb-1.5 h-1.5 w-8 rounded-full" style={{ background: c.acc }} />
      <div className="mb-1 h-1.5 w-full rounded-full" style={{ background: c.line }} />
      <div className="h-6 rounded-md" style={{ background: c.bar }} />
    </div>
  )
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick} onPointerDown={ripple}
      className={cx('sl press flex-1 rounded-2xl border-2 p-2.5 text-left transition-colors duration-300', on ? 'border-primary bg-primary-container/40' : 'border-outline-variant hover:border-outline')}>
      <div className="relative mb-2.5 h-[68px] overflow-hidden rounded-xl border border-outline-variant/70">
        {mode === 'system' ? (<><div className="absolute inset-0">{mini(light)}</div><div className="absolute inset-0" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}>{mini(dark)}</div></>) : mini(mode === 'dark' ? dark : light)}
      </div>
      <div className="flex items-center gap-2 px-1 text-[0.88rem] font-medium">
        {icon}<span className="flex-1">{label}</span>
        <span className={cx('flex h-5 w-5 items-center justify-center rounded-full bg-primary text-on-primary transition-all duration-300', on ? 'scale-100 opacity-100' : 'scale-0 opacity-0')}><Check size={13} strokeWidth={3} /></span>
      </div>
    </button>
  )
}

function WindowCard({ on, icon, title, desc, onClick }: { on: boolean; icon: ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick} onPointerDown={ripple}
      className={cx('sl press flex items-start gap-3.5 rounded-2xl border-2 p-4 text-left transition-colors duration-300', on ? 'border-primary bg-primary-container/40' : 'border-outline-variant hover:border-outline')}>
      <span className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors', on ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface-variant')}>{icon}</span>
      <span className="min-w-0 flex-1"><span className="block text-[0.95rem] font-semibold">{title}</span><span className="mt-0.5 block text-[0.82rem] text-on-surface-variant">{desc}</span></span>
      <span className={cx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors', on ? 'border-primary bg-primary text-on-primary' : 'border-outline')}>{on && <Check size={12} strokeWidth={3.4} className="anim-pop" />}</span>
    </button>
  )
}

const NAV = [
  { id: 'appearance', icon: <Palette size={18} />, label: 'secAppearance' },
  { id: 'font', icon: <Type size={18} />, label: 'secTypography' },
  { id: 'language', icon: <Languages size={18} />, label: 'secLanguage' },
  { id: 'storage', icon: <HardDrive size={18} />, label: 'secStorage' },
  { id: 'window', icon: <PanelsTopLeft size={18} />, label: 'secWindow' },
  { id: 'about', icon: <Info size={18} />, label: 'secAbout' },
] as const

export default function Settings() {
  const { t, settings, set, defaultDir, saveDir, dark } = useSettings()
  const [section, setSection] = useState<string>('appearance')
  const isPreset = SEEDS.some((s) => s.hex.toLowerCase() === settings.seed.toLowerCase())

  const pickDir = async () => {
    if (!isTauri) return
    const r = await open({ directory: true, multiple: false, defaultPath: saveDir || undefined })
    if (typeof r === 'string') set({ savePath: r })
  }

  return (
    <div>
      <PageHeader title={t('stTitle')} sub={t('stSub')} />
      <div className="flex items-start gap-6">
        <nav className="sticky top-0 hidden w-44 shrink-0 space-y-1 xl:block" aria-label={t('stTitle')}>
          {NAV.map((n) => (
            <button key={n.id} onPointerDown={ripple} onClick={() => { setSection(n.id); document.getElementById(`st-${n.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
              className={cx('sl flex h-11 w-full items-center gap-3 rounded-full px-4 text-[0.88rem] font-medium transition-colors duration-300', section === n.id ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant')}>
              {n.icon}{t(n.label)}
            </button>
          ))}
        </nav>

        <div className="stagger min-w-0 flex-1 space-y-4">
          <div style={{ '--i': 0 } as CSSProperties}>
            <Section id="appearance" icon={<Gear size={20} />} title={t('secAppearance')}>
              <div>
                <Label>{t('themeMode')}</Label>
                <div role="radiogroup" className="flex gap-3">
                  <ModeCard mode="system" on={settings.theme === 'system'} label={t('modeSystem')} icon={<Monitor size={17} />} onClick={() => set({ theme: 'system' })} />
                  <ModeCard mode="light" on={settings.theme === 'light'} label={t('modeLight')} icon={<Sun size={17} />} onClick={() => set({ theme: 'light' })} />
                  <ModeCard mode="dark" on={settings.theme === 'dark'} label={t('modeDark')} icon={<Moon size={17} />} onClick={() => set({ theme: 'dark' })} />
                </div>
              </div>
              <div>
                <Label>{t('themeColor')}</Label>
                <div className="flex flex-wrap gap-2.5">
                  {SEEDS.map((s) => {
                    const on = s.hex.toLowerCase() === settings.seed.toLowerCase()
                    return (
                      <Tooltip key={s.id} label={s[settings.language]}>
                        <button type="button" aria-label={s[settings.language]} aria-pressed={on} onClick={() => set({ seed: s.hex })} onPointerDown={ripple}
                          className={cx('press flex h-11 w-11 items-center justify-center rounded-full ring-offset-2 ring-offset-surface-container-low transition-all duration-300', on ? 'rounded-2xl ring-2 ring-primary' : 'hover:scale-110')}
                          style={{ background: s.hex }}>
                          {on && <Check size={20} strokeWidth={3} className="anim-pop text-white drop-shadow" />}
                        </button>
                      </Tooltip>
                    )
                  })}
                  <Tooltip label={t('customColor')}>
                    <label className={cx('press relative flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded-full ring-offset-2 ring-offset-surface-container-low transition-all duration-300', !isPreset && 'rounded-2xl ring-2 ring-primary')}
                      style={{ background: isPreset ? 'conic-gradient(#f44336,#ff9800,#ffeb3b,#4caf50,#00bcd4,#2196f3,#9c27b0,#f44336)' : settings.seed }}>
                      {isPreset ? <Palette size={18} className="text-white drop-shadow" /> : <Check size={20} strokeWidth={3} className="text-white drop-shadow" />}
                      <input type="color" aria-label={t('customColor')} value={settings.seed} onChange={(e) => set({ seed: e.target.value.toUpperCase() })} className="absolute inset-0 cursor-pointer opacity-0" />
                    </label>
                  </Tooltip>
                </div>
              </div>
              <div>
                <Label>{t('fontSize')}</Label>
                <Segmented value={settings.fontSize} onChange={(v) => set({ fontSize: v })} className="w-full max-w-md"
                  options={[{ value: 'sm', label: t('fsSmall') }, { value: 'md', label: t('fsMedium') }, { value: 'lg', label: t('fsLarge') }]} />
              </div>
            </Section>
          </div>

          <div style={{ '--i': 1 } as CSSProperties}>
            <Section id="font" icon={<Type size={20} />} title={t('secTypography')}>
              <div>
                <Label>{t('fontFamily')}</Label>
                <div className="max-w-md">
                  <Select ariaLabel={t('fontFamily')} value={settings.font} onChange={(v) => set({ font: v })} icon={<Type size={18} />}
                    options={Object.entries(FONTS).map(([k, f]) => ({ value: k, label: f.label, style: { fontFamily: f.stack } }))} />
                </div>
                <p className="mt-3 rounded-2xl bg-surface-container p-4 text-[1rem] leading-relaxed">{t('fontPreview')}</p>
              </div>
            </Section>
          </div>

          <div style={{ '--i': 2 } as CSSProperties}>
            <Section id="language" icon={<Globe size={20} />} title={t('secLanguage')}>
              <div>
                <Label>{t('langLabel')}</Label>
                <Segmented value={settings.language} onChange={(v) => set({ language: v })} className="w-full max-w-md"
                  options={[{ value: 'en', label: t('langEn') }, { value: 'vi', label: t('langVi') }]} />
              </div>
            </Section>
          </div>

          <div style={{ '--i': 3 } as CSSProperties}>
            <Section id="storage" icon={<HardDrive size={20} />} title={t('secStorage')}>
              <div>
                <Label>{t('savePath')}</Label>
                <div className="flex items-center gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-surface-container px-4 py-3">
                    <FolderOpen size={19} className="shrink-0 text-on-surface-variant" />
                    <span className="truncate font-mono text-[0.8rem]" title={saveDir}>{saveDir || defaultDir}</span>
                    {!settings.savePath && <Chip tone="primary">{t('pathDefault')}</Chip>}
                  </div>
                  {settings.savePath && <IconButton label={t('pathReset')} variant="tonal" onClick={() => set({ savePath: null })}><RotateCcw size={18} /></IconButton>}
                </div>
                <p className="mt-2 px-1 text-[0.8rem] text-on-surface-variant">{t('savePathDesc')}</p>
                <div className="mt-3 flex gap-2">
                  <Button label={t('browse')} icon={<FolderOpen size={18} />} variant="tonal" onClick={pickDir} disabled={!isTauri} />
                  <Button label={t('openFolder')} icon={<Scaling size={18} />} variant="outlined" onClick={() => api.openPath(saveDir)} />
                </div>
              </div>
            </Section>
          </div>

          <div style={{ '--i': 4 } as CSSProperties}>
            <Section id="window" icon={<PanelsTopLeft size={20} />} title={t('secWindow')}>
              <div role="radiogroup" className="grid gap-3 md:grid-cols-2">
                <WindowCard on={settings.windowMode === 'remember'} icon={<PanelsTopLeft size={22} />} title={t('winRemember')} desc={t('winRememberDesc')} onClick={() => set({ windowMode: 'remember' })} />
                <WindowCard on={settings.windowMode === 'maximized'} icon={<Maximize size={22} />} title={t('winMax')} desc={t('winMaxDesc')} onClick={() => set({ windowMode: 'maximized' })} />
              </div>
            </Section>
          </div>

          <div style={{ '--i': 5 } as CSSProperties}>
            <section id="st-about" className="relative scroll-mt-4 overflow-hidden rounded-[32px] bg-gradient-to-br from-primary-container via-tertiary-container to-secondary-container p-7 text-on-primary-container">
              <div className="blob pointer-events-none absolute -right-10 -top-12 h-52 w-52 bg-primary/20" />
              <div className="relative flex flex-wrap items-center gap-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-surface/70 shadow-e2" style={{ animation: 'float-y 4s ease-in-out infinite' }}><AppMark size={46} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.85rem] font-medium opacity-80">{t('aboutBy')}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[1.7rem] font-bold leading-tight tracking-tight">
                    minhtrong67
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[0.8rem] font-semibold text-on-primary"><Sparkles size={14} />{t('aboutAi')}</span>
                  </p>
                  <p className="mt-2 text-[0.85rem] opacity-80">{t('appName')} · {t('aboutVersion', { v: VERSION })}</p>
                </div>
              </div>
              <div className="relative mt-5 flex flex-wrap items-center gap-3">
                <Button label={t('aboutGithub')} icon={<Code size={18} />} onClick={() => api.openUri(REPO)} />
                <span className="inline-flex items-center gap-2 text-[0.82rem] font-medium opacity-90"><Heart size={15} className={dark ? 'text-error' : 'text-error'} />{t('aboutLicense')}</span>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
