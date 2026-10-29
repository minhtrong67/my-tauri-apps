import type { Params } from './types'

export const DEF: Params = {
  bg: 'gradient', c1: '#667eea', c2: '#764ba2', c3: '#f093fb', use3: false, angle: 135, solid: '#e5e7eb', blur: 0,
  overlay: 'none', ovAlpha: 0.25,
  pad: 72, radius: 14,
  shOn: true, shBlur: 60, shAlpha: 0.4, shY: 28, shColor: '#000000',
  bdW: 0, bdColor: '#ffffff', bdA: 0.5,
  rot: 0, skew: 0,
  frame: 'mac', ftheme: 'light', ftitle: '',
  ratio: 'auto', cw: 1600, ch: 900,
  cap: '', capPos: 'bottom', capSize: 22, capColor: '#ffffff',
  wmType: 'text', wm: '', wmPos: 'br', wmSize: 16, wmAlpha: 0.7, wmColor: '#ffffff',
  ac: '#ef4444', alw: 5, asz: 32, apx: 14, textBg: false,
  fmt: 'png', q: 0.92, sc: 2,
}

export interface Look { id: string; params: Partial<Params> }
const base = { overlay: 'none', rot: 0, skew: 0, bdW: 0, shOn: true, ratio: 'auto' } as const

export const LOOKS: Look[] = [
  { id: 'Clean', params: { ...base, bg: 'solid', solid: '#f3f4f6', pad: 56, radius: 12, shBlur: 50, shAlpha: 0.22, shY: 20, frame: 'none' } },
  { id: 'Ocean', params: { ...base, bg: 'gradient', c1: '#2193b0', c2: '#6dd5ed', use3: false, angle: 135, pad: 72, radius: 14, shBlur: 60, shAlpha: 0.4, shY: 28, frame: 'win', ftheme: 'light' } },
  { id: 'Sunset', params: { ...base, bg: 'gradient', c1: '#ff7e5f', c2: '#feb47b', use3: false, angle: 135, pad: 72, radius: 14, shBlur: 60, shAlpha: 0.4, shY: 28, frame: 'mac', ftheme: 'light' } },
  { id: 'Night', params: { ...base, bg: 'gradient', c1: '#232526', c2: '#414345', use3: false, angle: 160, pad: 64, radius: 12, shBlur: 60, shAlpha: 0.55, shY: 28, frame: 'mac', ftheme: 'dark' } },
  { id: 'Aurora', params: { ...base, bg: 'gradient', c1: '#667eea', c2: '#764ba2', c3: '#f093fb', use3: true, angle: 135, pad: 80, radius: 16, shBlur: 70, shAlpha: 0.45, shY: 30, frame: 'browser', ftheme: 'light' } },
  { id: 'Glass', params: { ...base, bg: 'gradient', c1: '#89f7fe', c2: '#66a6ff', use3: false, angle: 135, pad: 80, radius: 22, shBlur: 60, shAlpha: 0.3, shY: 24, frame: 'glass' } },
  { id: 'Candy', params: { ...base, bg: 'mesh', c1: '#ff9a9e', c2: '#fad0c4', c3: '#a18cd1', use3: true, angle: 40, overlay: 'grain', ovAlpha: 0.2, pad: 84, radius: 20, shBlur: 70, shAlpha: 0.3, shY: 30, frame: 'browser', ftheme: 'light' } },
  { id: 'Phone', params: { ...base, bg: 'gradient', c1: '#7f7fd5', c2: '#86a8e7', c3: '#91eae4', use3: true, angle: 150, pad: 70, radius: 26, shBlur: 70, shAlpha: 0.4, shY: 30, frame: 'phone', ftheme: 'dark' } },
  { id: 'Laptop', params: { ...base, bg: 'mesh', c1: '#0f2027', c2: '#2c5364', c3: '#203a43', use3: true, angle: 70, overlay: 'dots', ovAlpha: 0.12, pad: 72, radius: 8, shBlur: 70, shAlpha: 0.5, shY: 30, frame: 'laptop', ftheme: 'dark' } },
  { id: 'Flat', params: { ...base, bg: 'none', pad: 0, radius: 0, shOn: false, frame: 'none' } },
]

export const GRADIENTS: [string, string][] = [
  ['#2193b0', '#6dd5ed'], ['#ff7e5f', '#feb47b'], ['#667eea', '#764ba2'], ['#11998e', '#38ef7d'], ['#ee9ca7', '#ffdde1'],
  ['#232526', '#414345'], ['#f12711', '#f5af19'], ['#a18cd1', '#fbc2eb'], ['#89f7fe', '#66a6ff'], ['#ffecd2', '#fcb69f'],
  ['#00c6ff', '#0072ff'], ['#f857a6', '#ff5858'], ['#134e5e', '#71b280'], ['#e0e0e0', '#ffffff'],
]

export const RATIOS = ['auto', '1:1', '4:3', '3:2', '16:9', '9:16', '4:5', '2:1', 'custom'] as const

export interface Social { id: string; w: number; h: number }
export const SOCIALS: Social[] = [
  { id: 'og', w: 1200, h: 630 }, { id: 'x', w: 1600, h: 900 }, { id: 'linkedin', w: 1200, h: 627 },
  { id: 'igsq', w: 1080, h: 1080 }, { id: 'igst', w: 1080, h: 1920 }, { id: 'ph', w: 1270, h: 760 }, { id: 'yt', w: 1280, h: 720 },
]

export const FRAME_LIST = ['none', 'win', 'mac', 'browser', 'glass', 'phone', 'tablet', 'laptop'] as const
