export type BgType = 'gradient' | 'mesh' | 'solid' | 'image' | 'none'
export type FrameId = 'none' | 'win' | 'mac' | 'browser' | 'glass' | 'phone' | 'tablet' | 'laptop'
export type ToolId = 'select' | 'rect' | 'ellipse' | 'arrow' | 'line' | 'text' | 'step' | 'hl' | 'blur' | 'spot'
export type OverlayId = 'none' | 'dots' | 'grid' | 'grain'
export type Corner = 'tl' | 'tr' | 'bl' | 'br' | 'c'
export type Fmt = 'png' | 'jpeg' | 'webp'

export interface Params {
  bg: BgType; c1: string; c2: string; c3: string; use3: boolean; angle: number; solid: string; blur: number
  overlay: OverlayId; ovAlpha: number
  pad: number; radius: number
  shOn: boolean; shBlur: number; shAlpha: number; shY: number; shColor: string
  bdW: number; bdColor: string; bdA: number
  rot: number; skew: number
  frame: FrameId; ftheme: 'light' | 'dark'; ftitle: string
  ratio: string; cw: number; ch: number
  cap: string; capPos: 'top' | 'bottom'; capSize: number; capColor: string
  wmType: 'text' | 'logo'; wm: string; wmPos: Corner; wmSize: number; wmAlpha: number; wmColor: string
  ac: string; alw: number; asz: number; apx: number; textBg: boolean
  fmt: Fmt; q: number; sc: 1 | 2 | 3
}

export interface AnnBase { id: number; c: string; lw: number }
export type BoxAnn = AnnBase & { t: 'rect' | 'ellipse' | 'hl' | 'blur' | 'spot'; x: number; y: number; w: number; h: number; px: number }
export type LineAnn = AnnBase & { t: 'arrow' | 'line'; x: number; y: number; x1: number; y1: number }
export type TextAnn = AnnBase & { t: 'text'; x: number; y: number; s: string; size: number; bg: boolean }
export type StepAnn = AnnBase & { t: 'step'; x: number; y: number; n: number; size: number }
export type Ann = BoxAnn | LineAnn | TextAnn | StepAnn

export interface Crop { x: number; y: number; w: number; h: number }
export type Src = ImageBitmap | HTMLCanvasElement

export interface Layout {
  W: number; H: number; x: number; y: number; cw: number; ch: number; g: number; hdr: number
  ix: number; iy: number; iw: number; ih: number; capY: number; extra: number; base: number; ex: number
}

export interface RenderState {
  P: Params
  src: Src            // image used for drawing (preview bitmap or full)
  k: number           // scale of src relative to the full image
  crop: Crop
  ann: Ann[]
  cur: Ann | null
  bgImg: ImageBitmap | null
  wmImg: ImageBitmap | null
  font: string
  selId: number | null
  ui: boolean         // draw editing helpers (selection handles)
  dpr: number
}
