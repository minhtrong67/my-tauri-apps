import { DEF, type Look } from './presets'
import { annBounds, cardMatrix, exportScale, layout, makePreviewSrc, paletteFrom, renderExport } from './render'
import type { Ann, BoxAnn, Crop, Params, RenderState, Src, ToolId } from './types'

export type Handle = 'tl' | 'tr' | 'bl' | 'br' | 'p0' | 'p1' | 'move'
interface Drag { kind: 'resize' | 'move'; handle: Handle; id: number; sx: number; sy: number; orig: Ann; moved: boolean }

const PKEY = 'ms2.params'
const isBox = (a: Ann): a is BoxAnn => ['rect', 'ellipse', 'hl', 'blur', 'spot'].includes(a.t)

/** All editor state lives here (outside React) so pointer drags never re-render the UI tree. */
export class Editor {
  P: Params = { ...DEF }
  img: Src | null = null
  pv: Src | null = null
  pvk = 1
  name = 'image'
  crop: Crop = { x: 0, y: 0, w: 0, h: 0 }
  ann: Ann[] = []
  stack: string[] = []
  redoStack: string[] = []
  cur: Ann | null = null
  selId: number | null = null
  tool: ToolId = 'select'
  cropMode = false
  cropSel: { x0: number; y0: number; x1: number; y1: number } | null = null
  bgImg: ImageBitmap | null = null
  wmImg: ImageBitmap | null = null
  font = 'Roboto, system-ui, sans-serif'
  busy = false
  private nextId = 1
  private drag: Drag | null = null
  private version = 0
  private subs = new Set<() => void>()
  private paintSubs = new Set<() => void>()
  private saveTimer?: ReturnType<typeof setTimeout>

  constructor() {
    try { Object.assign(this.P, JSON.parse(localStorage.getItem(PKEY) ?? '{}')) } catch { /* ignore */ }
    this.P.frame = this.P.frame in { none: 1, win: 1, mac: 1, browser: 1, glass: 1, phone: 1, tablet: 1, laptop: 1 } ? this.P.frame : 'mac'
  }

  /* ----- subscriptions ----- */
  subscribe = (f: () => void) => { this.subs.add(f); return () => { this.subs.delete(f) } }
  getVersion = () => this.version
  onPaint(f: () => void) { this.paintSubs.add(f); return () => { this.paintSubs.delete(f) } }
  bump() { this.version++; this.subs.forEach((f) => f()); this.paintSubs.forEach((f) => f()) }
  paint() { this.paintSubs.forEach((f) => f()) }

  get has() { return !!this.img }
  get canUndo() { return this.stack.length > 0 }
  get canRedo() { return this.redoStack.length > 0 }
  get selected() { return this.ann.find((a) => a.id === this.selId) ?? null }

  state(full = false, ui = true, dpr = 1): RenderState {
    return { P: this.P, src: (full ? this.img : this.pv)!, k: full ? 1 : this.pvk, crop: this.crop, ann: this.ann, cur: this.cur, bgImg: this.bgImg, wmImg: this.wmImg, font: this.font, selId: this.selId, ui, dpr }
  }

  /* ----- params ----- */
  setP(patch: Partial<Params>) {
    this.P = { ...this.P, ...patch }
    clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => { try { localStorage.setItem(PKEY, JSON.stringify(this.P)) } catch { /* ignore */ } }, 250)
    this.bump()
  }
  applyLook(l: Look) { this.setP(l.params) }
  resetStyle() { this.setP({ ...DEF }) }
  setTool(t: ToolId) { this.tool = t; if (t !== 'select') this.selId = null; this.bump() }
  setFont(f: string) { this.font = f; this.bump() }

  /* ----- history ----- */
  private snap() { return JSON.stringify({ a: this.ann, c: this.crop }) }
  pushHist() { this.stack.push(this.snap()); if (this.stack.length > 80) this.stack.shift(); this.redoStack = [] }
  private restore(j: string) { const o = JSON.parse(j); this.ann = o.a; this.crop = o.c; if (!this.ann.some((a) => a.id === this.selId)) this.selId = null }
  undo() { if (!this.stack.length) return; this.redoStack.push(this.snap()); this.restore(this.stack.pop()!); this.bump() }
  redo() { if (!this.redoStack.length) return; this.stack.push(this.snap()); this.restore(this.redoStack.pop()!); this.bump() }

  /* ----- image sources ----- */
  setSource(src: Src, name: string) {
    this.img = src
    const p = makePreviewSrc(src); this.pv = p.pv; this.pvk = p.k
    this.name = (name || 'image').replace(/\.[^.]+$/, '')
    this.crop = { x: 0, y: 0, w: src.width, h: src.height }
    this.ann = []; this.stack = []; this.redoStack = []; this.cur = null; this.selId = null; this.cropMode = false; this.cropSel = null
    this.bump()
  }
  async fromBlob(b: Blob, name: string) {
    const bm = await createImageBitmap(b, { imageOrientation: 'from-image' })
    this.setSource(bm, name)
  }
  async setBgImage(b: Blob) { this.bgImg = await createImageBitmap(b); this.setP({ bg: 'image' }) }
  async setLogo(b: Blob) { this.wmImg = await createImageBitmap(b); this.setP({ wmType: 'logo' }) }
  autoBackground() {
    if (!this.pv) return
    const [c1, c2, c3] = paletteFrom(this.pv)
    this.setP({ bg: 'gradient', c1, c2, c3, use3: true })
  }

  /* ----- annotations ----- */
  private newId() { return this.nextId++ }
  /** Layout -> annotation (image) coordinates of a point given in layout pixels. */
  toImage(lx: number, ly: number, clampIt = true) {
    const L = layout(this.P, this.crop)
    let x = lx, y = ly
    if (this.P.rot || this.P.skew) { const pt = cardMatrix(this.P, L).inverse().transformPoint(new DOMPoint(lx, ly)); x = pt.x; y = pt.y }
    x -= L.ix; y -= L.iy
    return clampIt ? { x: Math.max(0, Math.min(L.iw, x)), y: Math.max(0, Math.min(L.ih, y)) } : { x, y }
  }

  beginDraw(p: { x: number; y: number }) {
    const P = this.P, t = this.tool
    if (t === 'select' || t === 'text') return
    if (t === 'step') {
      this.pushHist()
      const n = this.ann.filter((a) => a.t === 'step').length + 1, a: Ann = { id: this.newId(), t: 'step', x: p.x, y: p.y, n, c: P.ac, lw: 0, size: Math.max(26, P.asz) }
      this.ann.push(a); this.selId = null; this.bump(); return
    }
    const id = this.newId()
    this.cur = t === 'arrow' || t === 'line' ? { id, t, x: p.x, y: p.y, x1: p.x, y1: p.y, c: P.ac, lw: P.alw } : { id, t, x: p.x, y: p.y, w: 0, h: 0, c: P.ac, lw: P.alw, px: P.apx }
    ;(this.cur as { ox?: number; oy?: number }).ox = p.x; (this.cur as { ox?: number; oy?: number }).oy = p.y
  }
  dragDraw(p: { x: number; y: number }) {
    const a = this.cur as (Ann & { ox?: number; oy?: number }) | null
    if (!a) return
    if (a.t === 'arrow' || a.t === 'line') { a.x1 = p.x; a.y1 = p.y }
    else if (isBox(a)) { const ox = a.ox ?? a.x, oy = a.oy ?? a.y; a.x = Math.min(ox, p.x); a.y = Math.min(oy, p.y); a.w = Math.abs(p.x - ox); a.h = Math.abs(p.y - oy) }
    this.paint()
  }
  endDraw(p: { x: number; y: number }) {
    const a = this.cur as (Ann & { ox?: number; oy?: number }) | null
    if (!a) return
    this.dragDraw(p); this.cur = null
    const tiny = a.t === 'arrow' || a.t === 'line' ? Math.hypot(a.x1 - a.x, a.y1 - a.y) < 6 : (a as BoxAnn).w < 4 || (a as BoxAnn).h < 4
    if (tiny) { this.paint(); return }
    delete a.ox; delete a.oy
    this.pushHist(); this.ann.push(a); this.selId = a.id; this.bump()
  }
  addText(p: { x: number; y: number }, s: string) {
    this.pushHist()
    const a: Ann = { id: this.newId(), t: 'text', x: p.x, y: p.y, s, c: this.P.ac, lw: 0, size: this.P.asz, bg: this.P.textBg }
    this.ann.push(a); this.selId = a.id; this.bump()
  }

  /** Returns what is under the pointer; tol is the hit tolerance in annotation units. */
  hitTest(p: { x: number; y: number }, tol: number): { id: number; handle: Handle } | null {
    const sel = this.selected
    if (sel) {
      const b = annBounds(sel, this.font)
      const pts: [Handle, number, number][] = sel.t === 'arrow' || sel.t === 'line' ? [['p0', sel.x, sel.y], ['p1', sel.x1, sel.y1]]
        : sel.t === 'text' || sel.t === 'step' ? [] : [['tl', b.x, b.y], ['tr', b.x + b.w, b.y], ['bl', b.x, b.y + b.h], ['br', b.x + b.w, b.y + b.h]]
      for (const [h, x, y] of pts) if (Math.hypot(p.x - x, p.y - y) <= tol * 1.3) return { id: sel.id, handle: h }
    }
    for (let i = this.ann.length - 1; i >= 0; i--) {
      const a = this.ann[i], b = annBounds(a, this.font)
      if (a.t === 'arrow' || a.t === 'line') {
        const dx = a.x1 - a.x, dy = a.y1 - a.y, l2 = dx * dx + dy * dy || 1
        const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2))
        if (Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)) <= tol + a.lw / 2) return { id: a.id, handle: 'move' }
      } else if (p.x >= b.x - tol / 2 && p.x <= b.x + b.w + tol / 2 && p.y >= b.y - tol / 2 && p.y <= b.y + b.h + tol / 2) {
        if ((a.t === 'rect' || a.t === 'ellipse') && b.w > tol * 4 && b.h > tol * 4) {
          const inner = p.x > b.x + tol && p.x < b.x + b.w - tol && p.y > b.y + tol && p.y < b.y + b.h - tol
          if (inner) continue
        }
        return { id: a.id, handle: 'move' }
      }
    }
    return null
  }
  beginSelect(p: { x: number; y: number }, tol: number) {
    const h = this.hitTest(p, tol)
    this.selId = h?.id ?? null
    if (h) { const orig = JSON.parse(JSON.stringify(this.ann.find((a) => a.id === h.id))) as Ann; this.drag = { kind: h.handle === 'move' ? 'move' : 'resize', handle: h.handle, id: h.id, sx: p.x, sy: p.y, orig, moved: false } }
    this.bump()
    return !!h
  }
  dragSelect(p: { x: number; y: number }) {
    const d = this.drag; if (!d) return
    const a = this.ann.find((x) => x.id === d.id); if (!a) return
    if (!d.moved) { if (Math.hypot(p.x - d.sx, p.y - d.sy) < 2) return; d.moved = true; const keep = this.ann.map((x) => (x.id === d.id ? d.orig : x)); this.stack.push(JSON.stringify({ a: keep, c: this.crop })); this.redoStack = [] }
    const dx = p.x - d.sx, dy = p.y - d.sy, o = d.orig
    if (d.kind === 'move') {
      a.x = o.x + dx; a.y = o.y + dy
      if ((a.t === 'arrow' || a.t === 'line') && (o.t === 'arrow' || o.t === 'line')) { a.x1 = o.x1 + dx; a.y1 = o.y1 + dy }
    } else if ((a.t === 'arrow' || a.t === 'line') && (o.t === 'arrow' || o.t === 'line')) {
      if (d.handle === 'p0') { a.x = o.x + dx; a.y = o.y + dy } else { a.x1 = o.x1 + dx; a.y1 = o.y1 + dy }
    } else if (isBox(a) && isBox(o)) {
      const fx = d.handle.endsWith('l') ? o.x + o.w : o.x, fy = d.handle.startsWith('t') ? o.y + o.h : o.y
      const mx = (d.handle.endsWith('l') ? o.x : o.x + o.w) + dx, my = (d.handle.startsWith('t') ? o.y : o.y + o.h) + dy
      a.x = Math.min(fx, mx); a.y = Math.min(fy, my); a.w = Math.max(2, Math.abs(mx - fx)); a.h = Math.max(2, Math.abs(my - fy))
    }
    this.paint()
  }
  endSelect() { const moved = this.drag?.moved; this.drag = null; if (moved) this.bump() }
  deleteSelected() { if (this.selId == null) return; this.pushHist(); this.ann = this.ann.filter((a) => a.id !== this.selId); this.selId = null; this.bump() }
  clearAnn() { if (!this.ann.length) return; this.pushHist(); this.ann = []; this.selId = null; this.bump() }
  patchSelected(patch: Partial<Ann>) { const a = this.selected; if (!a) return; Object.assign(a, patch); this.bump() }

  /* ----- crop ----- */
  enterCrop() { if (!this.img) return; this.cropMode = true; this.cropSel = null; this.selId = null; this.bump() }
  exitCrop() { this.cropMode = false; this.cropSel = null; this.bump() }
  cropRect() {
    const s = this.cropSel, c = this.crop; if (!s) return null
    const x = Math.max(0, Math.min(s.x0, s.x1)), y = Math.max(0, Math.min(s.y0, s.y1))
    return { x, y, w: Math.min(c.w, Math.max(s.x0, s.x1)) - x, h: Math.min(c.h, Math.max(s.y0, s.y1)) - y }
  }
  applyCrop() {
    const s = this.cropRect()
    if (!s || s.w < 8 || s.h < 8) { this.exitCrop(); return }
    this.pushHist()
    const dx = Math.round(s.x), dy = Math.round(s.y)
    this.shiftAnn(-dx, -dy)
    this.crop = { x: this.crop.x + dx, y: this.crop.y + dy, w: Math.round(s.w), h: Math.round(s.h) }
    this.exitCrop()
  }
  resetCrop() {
    const c = this.crop, im = this.img!
    if (c.x || c.y || c.w !== im.width || c.h !== im.height) { this.pushHist(); this.shiftAnn(c.x, c.y); this.crop = { x: 0, y: 0, w: im.width, h: im.height } }
    this.cropSel = null; this.bump()
  }
  private shiftAnn(dx: number, dy: number) {
    for (const a of this.ann) { a.x += dx; a.y += dy; if (a.t === 'arrow' || a.t === 'line') { a.x1 += dx; a.y1 += dy } }
  }

  /* ----- export ----- */
  private mime = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' } as const
  get ext() { return this.P.fmt === 'jpeg' ? 'jpg' : this.P.fmt }
  fileName(suffix = 'beautified') { return `${this.name}-${suffix}.${this.ext}` }
  limited() { return exportScale(this.P, layout(this.P, this.crop)) < this.P.sc }
  outputSize(P = this.P) { const L = layout(P, this.crop), s = exportScale(P, L); return { w: Math.round(L.W * s), h: Math.round(L.H * s), s } }

  private canvasBlob(cv: HTMLCanvasElement, type: string, q?: number) { return new Promise<Blob>((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), type, q)) }
  /** Renders the current image. Optionally overrides params / target width (for social presets). */
  async exportBlob(over?: Partial<Params>, targetW?: number, forceType?: 'png') {
    if (!this.img) throw new Error('no image')
    const st = this.state(true, false); st.P = { ...this.P, ...over }
    await new Promise((r) => setTimeout(r, 0))
    const cv = renderExport(st, undefined, targetW)
    const type = forceType ?? st.P.fmt
    return this.canvasBlob(cv, this.mime[type], st.P.q)
  }
  async renderOther(src: Src, over?: Partial<Params>) {
    const st: RenderState = { P: { ...this.P, ...over }, src, k: 1, crop: { x: 0, y: 0, w: src.width, h: src.height }, ann: [], cur: null, bgImg: this.bgImg, wmImg: this.wmImg, font: this.font, selId: null, ui: false, dpr: 1 }
    await new Promise((r) => setTimeout(r, 0))
    return this.canvasBlob(renderExport(st), this.mime[st.P.fmt], st.P.q)
  }
}
