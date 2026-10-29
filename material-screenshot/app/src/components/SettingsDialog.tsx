import { useEffect, useState } from 'react'
import { AppWindow, Check, FolderOpen, Gauge, Globe, Keyboard, Languages, Maximize, Monitor, Moon, MonitorUp, Palette, RotateCcw, Save, Settings as Cog, Sparkles, Sun, Type, Heart, Contrast, Timer, ALargeSmall, Info, ExternalLink } from 'lucide-react'
import { settingsStore, THEME_COLORS, type FontId, type FontSizeId, type Settings } from '../lib/settings'
import { FONTS } from '../lib/fonts'
import { useT } from '../lib/i18n'
import { cn } from '../lib/cn'
import { isTauri, openExternal, openFolder, pickFolder } from '../lib/tauri'
import { toast } from './ui/Toast'
import { Button } from './ui/Button'
import { Card, ColorField, inputCls, Segmented, Switch } from './ui/Controls'
import { Dialog } from './ui/Dialog'
import { Tooltip } from './ui/Tooltip'
import { Select } from './ui/Select'
import type { K } from '../lib/dict'

export const AUTHOR = 'minhtrong67'
export const REPO = 'https://github.com/minhtrong67/my-tauri-apps'

interface Props { open: boolean; onClose: () => void; s: Settings; downloads: string; onReset: () => void; onShortcuts: () => void }

export function SettingsDialog({ open, onClose, s, downloads, onReset, onShortcuts }: Props) {
  const t = useT()
  const [pathTxt, setPathTxt] = useState(s.saveDir)
  useEffect(() => setPathTxt(s.saveDir), [s.saveDir])
  const commitPath = () => {
    const v = pathTxt.trim().replace(/^"(.*)"$/, '$1')
    if (v !== s.saveDir) { set({ saveDir: v }); toast.success(t('folderChanged')) }
  }
  const set = settingsStore.set
  const custom = !THEME_COLORS.some((c) => c.hex.toLowerCase() === s.seed.toLowerCase())

  const chooseDir = async () => {
    if (!isTauri()) { toast.info(t('desktopOnly')); return }
    try { const d = await pickFolder(); if (d) { set({ saveDir: d }); toast.success(t('folderChanged')) } } catch { toast.error(t('saveFail')) }
  }
  const openDir = async () => {
    if (!isTauri()) { toast.info(t('desktopOnly')); return }
    try { await openFolder(s.saveDir || downloads) } catch { toast.error(t('saveFail')) }
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('settings')} icon={Cog} size="lg" closeLabel={t('close')} scrollTopLabel={t('scrollTop')}
      actions={[{ label: t('resetAll'), icon: RotateCcw, variant: 'dangerTonal', onClick: onReset }, { label: t('done'), icon: Check, variant: 'filled', onClick: onClose }]}>
      <div>
        <div className="stagger flex flex-col gap-3 pb-2">
          <Card title={t('sTheme')} icon={Sun}>
            <Segmented value={s.theme} onChange={(v) => set({ theme: v })} options={[{ value: 'system', label: t('system'), icon: Monitor }, { value: 'light', label: t('light'), icon: Sun }, { value: 'dark', label: t('dark'), icon: Moon }]} />
          </Card>

          <Card title={t('sColor')} icon={Palette}>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-6 gap-2.5 sm:grid-cols-9">
                {THEME_COLORS.map((c) => {
                  const on = c.hex.toLowerCase() === s.seed.toLowerCase()
                  return (
                    <Tooltip key={c.id} label={t(('c_' + c.id) as K)} side="top" className="flex justify-center">
                      <button type="button" aria-label={t(('c_' + c.id) as K)} aria-pressed={on} onClick={() => set({ seed: c.hex })}
                        className={cn('relative flex h-11 w-11 items-center justify-center transition-all duration-300 ease-[var(--ease-spring)] hover:scale-110', on ? 'rounded-2xl' : 'rounded-full')} style={{ background: c.hex }}>
                        {on && <Check size={20} strokeWidth={3} className="anim-pop text-white drop-shadow" />}
                      </button>
                    </Tooltip>
                  )
                })}
              </div>
              <div className="mt-1 flex items-center gap-3 rounded-2xl bg-surface-container-high p-3"><div className="flex-1"><ColorField label={t('customColor')} value={s.seed} onChange={(v) => set({ seed: v })} /></div>{custom && <Sparkles size={18} className="text-primary" />}</div>
              <div>
                <div className="mb-1.5 flex items-center gap-2 text-[0.8rem] font-medium text-on-surface-variant"><Sparkles size={15} />{t('sVariant')}</div>
                <Segmented value={s.variant} onChange={(v) => set({ variant: v })} options={[{ value: 'tonal', label: t('vTonal') }, { value: 'vibrant', label: t('vVibrant') }]} />
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-2 text-[0.8rem] font-medium text-on-surface-variant"><Contrast size={15} />{t('sContrast')}</div>
                <Segmented value={s.contrast} onChange={(v) => set({ contrast: v })} options={[{ value: 0, label: t('cStd') }, { value: 0.5, label: t('cMed') }, { value: 1, label: t('cHigh') }]} />
              </div>
            </div>
          </Card>

          <Card title={t('sType')} icon={Type}>
            <div className="flex flex-col gap-4">
              <div>
                <div className="mb-1.5 flex items-center gap-2 text-[0.8rem] font-medium text-on-surface-variant"><ALargeSmall size={15} />{t('sFontSize')}</div>
                <Segmented<FontSizeId> value={s.fontSize} onChange={(v) => set({ fontSize: v })} options={[{ value: 'sm', label: t('fsSm') }, { value: 'md', label: t('fsMd') }, { value: 'lg', label: t('fsLg') }]} />
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-2 text-[0.8rem] font-medium text-on-surface-variant"><Type size={15} />{t('sFont')}</div>
                <Select<FontId> label={t('sFont')} value={s.font} onChange={(v) => set({ font: v })} options={FONTS.map((f) => ({ value: f.id, label: f.label, style: { fontFamily: f.stack }, hint: f.id === 'roboto' ? t('default') : undefined }))} />
              </div>
            </div>
          </Card>

          <Card title={t('sLang')} icon={Languages}>
            <Segmented value={s.lang} onChange={(v) => set({ lang: v })} options={[{ value: 'auto', label: t('auto'), icon: Globe }, { value: 'vi', label: 'Tiếng Việt' }, { value: 'en', label: 'English' }]} />
          </Card>

          <Card title={t('sWin')} icon={AppWindow}>
            <div className="grid gap-2 sm:grid-cols-2">
              {([['remember', AppWindow, 'winRemember', 'winRememberD'], ['maximized', Maximize, 'winMax', 'winMaxD']] as const).map(([id, I, l, d]) => {
                const on = s.winMode === id
                return (
                  <button key={id} type="button" aria-pressed={on} onClick={() => set({ winMode: id })}
                    className={cn('sl morph sq flex items-start gap-3 border p-3.5 text-left', on ? 'border-primary bg-primary-container text-on-primary-container' : 'border-outline-variant')} style={{ borderRadius: on ? 18 : 26 }}>
                    <I size={22} className="mt-0.5" /><span className="min-w-0 flex-1"><span className="block text-[0.875rem] font-semibold">{t(l)}</span><span className="block text-[0.75rem] opacity-80">{t(d)}</span></span>
                    {on && <Check size={18} className="anim-pop mt-0.5" />}
                  </button>
                )
              })}
            </div>
          </Card>

          <Card title={t('sSave')} icon={Save}>
            <div className="flex flex-col gap-3">
              <div>
                <div className="mb-1 text-[0.8rem] font-medium text-on-surface-variant">{t('savePath')}</div>
                <div className="flex gap-2">
                  <input className={inputCls} value={pathTxt} spellCheck={false} placeholder={downloads || t('saveDefault')} aria-label={t('savePath')}
                    onChange={(e) => setPathTxt(e.target.value)} onBlur={commitPath} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitPath() } }} />
                  <Button variant="filled" icon={FolderOpen} onClick={chooseDir} className="!px-4">{t('browse')}</Button>
                </div>
              </div>
              <p className="flex items-start gap-2 text-[0.78rem] text-on-surface-variant"><Info size={15} className="mt-0.5 text-primary" />{s.saveDir ? t('saveCustomHint') : t('saveDefaultHint')}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="tonal" size="sm" icon={ExternalLink} onClick={openDir}>{t('openFolder')}</Button>
                {s.saveDir && <Button variant="text" size="sm" icon={RotateCcw} onClick={() => set({ saveDir: '' })}>{t('resetFolder')}</Button>}
              </div>
              <Switch checked={s.askSave} onChange={(v) => set({ askSave: v })} label={t('askSave')} />
            </div>
          </Card>

          <Card title={t('sCapture')} icon={MonitorUp}>
            <div className="flex flex-col gap-3">
              <Switch checked={s.hotkey} onChange={(v) => set({ hotkey: v })} label={t('hotkey')} hint={t('hotkeyHint')} icon={Keyboard} />
              <div>
                <div className="mb-1.5 flex items-center gap-2 text-[0.8rem] font-medium text-on-surface-variant"><Timer size={15} />{t('delay')}</div>
                <Segmented value={s.captureDelay} onChange={(v) => set({ captureDelay: v })} options={[{ value: 0, label: t('noDelay') }, { value: 3, label: '3s' }, { value: 5, label: '5s' }]} />
              </div>
            </div>
          </Card>

          <Card title={t('sMore')} icon={Gauge}>
            <div className="flex flex-col gap-1">
              <Switch checked={s.reduceMotion} onChange={(v) => set({ reduceMotion: v })} label={t('reduceMotion')} />
              <Button variant="text" size="sm" icon={Keyboard} className="self-start" onClick={onShortcuts}>{t('shortcuts')}</Button>
            </div>
          </Card>

          {/* author: always the last block */}
          <Card tone="highlight" className="relative overflow-hidden">
            <div className="blob absolute -right-8 -top-8 h-32 w-32 bg-primary/15" />
            <div className="relative flex items-center gap-4">
              <div className="blob flex h-14 w-14 shrink-0 items-center justify-center bg-primary text-on-primary"><Heart size={24} fill="currentColor" /></div>
              <div className="min-w-0 flex-1">
                <div className="text-[0.72rem] font-semibold uppercase tracking-wider opacity-75">{t('author')}</div>
                <div className="text-[1.15rem] font-bold">{AUTHOR}</div>
                <div className="text-[0.8rem] opacity-85">{t('aiBy')} <b>Claude</b> · Anthropic</div>
              </div>
              <Button variant="filled" size="sm" onClick={() => openExternal(REPO)} icon={Globe}>GitHub</Button>
            </div>
          </Card>
        </div>
      </div>
    </Dialog>
  )
}
