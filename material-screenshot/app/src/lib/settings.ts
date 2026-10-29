import { createStore } from './store'

export type ThemeMode = 'system' | 'light' | 'dark'
export type FontSizeId = 'sm' | 'md' | 'lg'
export type FontId = 'roboto' | 'system' | 'inter' | 'nunito' | 'bevietnam'
export type WinMode = 'remember' | 'maximized'

export interface Settings {
  lang: 'auto' | 'vi' | 'en'
  theme: ThemeMode
  seed: string
  variant: 'tonal' | 'vibrant'
  contrast: 0 | 0.5 | 1
  fontSize: FontSizeId
  font: FontId
  winMode: WinMode
  saveDir: string
  askSave: boolean
  hotkey: boolean
  captureDelay: 0 | 3 | 5
  reduceMotion: boolean
}

export const SETTINGS_DEFAULTS: Settings = {
  lang: 'auto', theme: 'system', seed: '#2196F3', variant: 'tonal', contrast: 0, fontSize: 'md', font: 'roboto',
  winMode: 'remember', saveDir: '', askSave: false, hotkey: true, captureDelay: 0, reduceMotion: false,
}

export const settingsStore = createStore<Settings>('ms2.settings', SETTINGS_DEFAULTS)

/** The 18 Material Design palette colours offered as theme colours. */
export const THEME_COLORS: { id: string; hex: string }[] = [
  { id: 'red', hex: '#F44336' }, { id: 'pink', hex: '#E91E63' }, { id: 'purple', hex: '#9C27B0' },
  { id: 'dpurple', hex: '#673AB7' }, { id: 'indigo', hex: '#3F51B5' }, { id: 'blue', hex: '#2196F3' },
  { id: 'lblue', hex: '#03A9F4' }, { id: 'cyan', hex: '#00BCD4' }, { id: 'teal', hex: '#009688' },
  { id: 'green', hex: '#4CAF50' }, { id: 'lgreen', hex: '#8BC34A' }, { id: 'lime', hex: '#CDDC39' },
  { id: 'yellow', hex: '#FFEB3B' }, { id: 'amber', hex: '#FFC107' }, { id: 'orange', hex: '#FF9800' },
  { id: 'dorange', hex: '#FF5722' }, { id: 'brown', hex: '#795548' }, { id: 'grey', hex: '#607D8B' },
]

export const detectLang = (): 'vi' | 'en' => {
  const list = navigator.languages?.length ? navigator.languages : [navigator.language || 'en']
  return list.some((l) => /^vi\b/i.test(l)) ? 'vi' : 'en'
}
