import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, type Settings } from './api'
import { translate, type Key, type Lang } from './i18n'
import { applyTheme, FONTS, FONT_SIZES } from './theme'

const BOOT = 'mm-boot'
const defaults: Settings = {
  theme: 'system', seed: '#769CDF', fontSize: 'md', font: 'system',
  language: typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('vi') ? 'vi' : 'en',
  savePath: null, windowMode: 'remember',
}

export function bootSettings(): Settings {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(BOOT) ?? '{}') } } catch { return defaults }
}

export function applyAll(s: Settings) {
  const dark = applyTheme(s.theme, s.seed)
  const root = document.documentElement
  root.style.fontSize = FONT_SIZES[s.fontSize] ?? FONT_SIZES.md
  root.style.setProperty('--font-app', (FONTS[s.font] ?? FONTS.system).stack)
  root.lang = s.language
  return dark
}

interface Ctx {
  settings: Settings
  set: (patch: Partial<Settings>) => void
  t: (key: Key, vars?: Record<string, string | number>) => string
  lang: Lang
  dark: boolean
  defaultDir: string
  saveDir: string
}
const SettingsCtx = createContext<Ctx>(null as unknown as Ctx)
export const useSettings = () => useContext(SettingsCtx)

export function SettingsProvider({ children, onLoaded }: { children: ReactNode; onLoaded: () => void }) {
  const [settings, setSettings] = useState<Settings>(bootSettings)
  const [dark, setDark] = useState(() => applyAll(settings))
  const [defaultDir, setDefaultDir] = useState('')
  const loaded = useRef(false)
  const timer = useRef<number>(0)

  useEffect(() => {
    let alive = true
    Promise.all([api.loadSettings().catch(() => ({})), api.defaultSaveDir().catch(() => '')]).then(([s, dir]) => {
      if (!alive) return
      setDefaultDir(dir)
      setSettings((cur) => ({ ...cur, ...(s as Partial<Settings>) }))
      loaded.current = true
      onLoaded()
    })
    return () => { alive = false }
  }, [onLoaded])

  useEffect(() => {
    setDark(applyAll(settings))
    localStorage.setItem(BOOT, JSON.stringify(settings))
    if (!loaded.current) return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => api.saveSettings(settings).catch(() => {}), 250)
  }, [settings])

  useEffect(() => {
    if (settings.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const fn = () => setDark(applyAll(settings))
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [settings])

  const set = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), [])
  const lang = settings.language
  const value = useMemo<Ctx>(
    () => ({
      settings, set, lang, dark, defaultDir,
      saveDir: settings.savePath || defaultDir,
      t: (key, vars) => translate(lang, key, vars),
    }),
    [settings, set, lang, dark, defaultDir],
  )
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>
}
