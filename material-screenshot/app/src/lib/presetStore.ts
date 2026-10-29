import { createStore } from './store'
import type { Params } from './types'

export interface UserPreset { id: string; name: string; params: Partial<Params> }
export const presetStore = createStore<{ list: UserPreset[]; recent: string[] }>('ms2.presets', { list: [], recent: [] })

/** Style-related fields saved in a preset (no annotation defaults / export settings). */
export const STYLE_KEYS: (keyof Params)[] = ['bg', 'c1', 'c2', 'c3', 'use3', 'angle', 'solid', 'blur', 'overlay', 'ovAlpha', 'pad', 'radius', 'shOn', 'shBlur', 'shAlpha', 'shY', 'shColor', 'bdW', 'bdColor', 'bdA', 'rot', 'skew', 'frame', 'ftheme', 'ratio', 'cw', 'ch']
export const pickStyle = (p: Params): Partial<Params> => Object.fromEntries(STYLE_KEYS.map((k) => [k, p[k]])) as Partial<Params>

export const addRecent = (path: string) => presetStore.set((s) => ({ recent: [path, ...s.recent.filter((p) => p !== path)].slice(0, 6) }))
