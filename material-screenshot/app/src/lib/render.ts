import type { Ann, Crop, Layout, Params, RenderState, Src, FrameId } from './types'

/* ---------- helpers ---------- */
export const rr = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  r = Math.max(0, Math.min(r, w / 2, h / 2))
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath()
}
const rgb = (h: string): [number, number, number] => {
  h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((x) => x + x).join('')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) || 0) as [number, number, number]
}
export const rgba = (h: string, a: number) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})` }

interface FrameDef { hdr: number; bez: number; base?: boolean; device?: boolean }
export const FRAMES: Record<FrameId, FrameDef> = {
  none: { hdr: 0, bez: 0 }, win: { hdr: 32, bez: 0 }, mac: { hdr: 38, bez: 0 }, browser: { hdr: 44, bez: 0 },
  glass: { hdr: 0, bez: 14 }, phone: { hdr: 0, bez: 16, device: true }, tablet: { hdr: 0, bez: 20, device: true },
  laptop: { hdr: 0, bez: 16, device: true, base: true },
}

const ratioVal = (P: Params) => {
  if (P.ratio === 'auto') return 0
  if (P.ratio === 'custom') return Math.max(0.05, P.cw) / Math.max(0.05, P.ch)
  const [a, b] = P.ratio.split(':').map(Number)
  return a / b
}

export function layout(P: Params, c: Crop): Layout {
  const F = FRAMES[P.frame] ?? FRAMES.none, g = F.bez
  const cw = c.w + 2 * g, ch = c.h + F.hdr + 2 * g
  const ex = F.base ? 36 : 0, bh = F.base ? 14 : 0
  const extra = P.cap ? Math.round(P.capSize * 2.2) : 0
  const tw = cw + ex, th = ch + bh
  let W = tw + 2 * P.pad, H = th + 2 * P.pad + extra
  const r = ratioVal(P)
  if (r) { if (W / H < r) W = Math.round(H * r); else H = Math.round(W / r) }
  W = Math.round(W); H = Math.round(H)
  const x = (W - tw) / 2 + ex / 2, top = (H - extra - th) / 2
  const y = top + (P.capPos === 'top' ? extra : 0)
  const capY = P.capPos === 'top' ? top + extra / 2 : y + th + extra / 2
  return { W, H, x, y, cw, ch, g, hdr: F.hdr, ix: x + g, iy: y + g + F.hdr, iw: c.w, ih: c.h, capY, extra, base: bh, ex }
}

/** Matrix applied to the card (rotation / skew) in layout pixels. */
export function cardMatrix(P: Params, L: Layout) {
  const cx = L.x + L.cw / 2, cy = L.y + L.ch / 2
  return new DOMMatrix().translate(cx, cy).rotate(P.rot).skewX(P.skew).translate(-cx, -cy)
}

/* ---------- background ---------- */
let grainTile: HTMLCanvasElement | null = null
function grain() {
  if (grainTile) return grainTile
  const t = document.createElement('canvas'); t.width = t.height = 200
  const x = t.getContext('2d')!, d = x.createImageData(200, 200)
  let s = 1234567
  for (let i = 0; i < d.data.length; i += 4) {
    s = (s * 1664525 + 1013904223) >>> 0
    const v = (s >>> 24) & 255
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255
  }
  x.putImageData(d, 0, 0)
  return (grainTile = t)
}

function drawBg(c: CanvasRenderingContext2D, q: number, L: Layout, st: RenderState) {
  const P = st.P, W = L.W * q, H = L.H * q
  if (P.bg === 'gradient') {
    const a = (P.angle * Math.PI) / 180, dx = Math.sin(a), dy = -Math.cos(a)
    const n = (Math.abs(W * dx) + Math.abs(H * dy)) / 2, cx = W / 2, cy = H / 2
    const g = c.createLinearGradient(cx - dx * n, cy - dy * n, cx + dx * n, cy + dy * n)
    g.addColorStop(0, P.c1)
    if (P.use3) { g.addColorStop(0.5, P.c2); g.addColorStop(1, P.c3) } else g.addColorStop(1, P.c2)
    c.fillStyle = g; c.fillRect(0, 0, W, H)
  } else if (P.bg === 'mesh') {
    c.fillStyle = P.c1; c.fillRect(0, 0, W, H)
    const a = (P.angle * Math.PI) / 180, R = Math.max(W, H) * 0.75
    const cols = [P.c2, P.use3 ? P.c3 : P.c1, P.c2, P.use3 ? P.c3 : P.c2]
    cols.forEach((col, i) => {
      const t = a + i * 1.65
      const px = W * (0.5 + 0.48 * Math.cos(t)), py = H * (0.5 + 0.48 * Math.sin(t * 1.3 + i))
      const g = c.createRadialGradient(px, py, 0, px, py, R)
      g.addColorStop(0, rgba(col, 0.95)); g.addColorStop(1, rgba(col, 0))
      c.fillStyle = g; c.fillRect(0, 0, W, H)
    })
  } else if (P.bg === 'solid') {
    c.fillStyle = P.solid; c.fillRect(0, 0, W, H)
  } else if (P.bg === 'image') {
    if (st.bgImg) {
      const im = st.bgImg, s = Math.max(W / im.width, H / im.height) * (P.blur > 0 ? 1.1 : 1)
      c.save(); if (P.blur > 0) c.filter = `blur(${P.blur * q}px)`
      c.drawImage(im, (W - im.width * s) / 2, (H - im.height * s) / 2, im.width * s, im.height * s); c.restore()
    } else { c.fillStyle = '#808080'; c.fillRect(0, 0, W, H) }
  }
  if (P.bg !== 'none' && P.overlay !== 'none') {
    c.save(); c.globalAlpha = P.ovAlpha
    if (P.overlay === 'grain') {
      const pat = c.createPattern(grain(), 'repeat')
      if (pat) { pat.setTransform(new DOMMatrix().scale(Math.max(0.5, q))); c.globalAlpha = P.ovAlpha * 0.55; c.globalCompositeOperation = 'overlay'; c.fillStyle = pat; c.fillRect(0, 0, W, H) }
    } else if (P.overlay === 'dots') {
      c.fillStyle = '#fff'; const s = 26 * q
      for (let y = s / 2; y < H; y += s) for (let x = s / 2; x < W; x += s) { c.beginPath(); c.arc(x, y, 1.6 * q, 0, 7); c.fill() }
    } else {
      c.strokeStyle = '#fff'; c.lineWidth = Math.max(1, q); const s = 40 * q; c.beginPath()
      for (let x = 0; x <= W; x += s) { c.moveTo(x, 0); c.lineTo(x, H) }
      for (let y = 0; y <= H; y += s) { c.moveTo(0, y); c.lineTo(W, y) }
      c.stroke()
    }
    c.restore()
  }
}

/* ---------- frames ---------- */
function header(c: CanvasRenderingContext2D, id: FrameId, h0: number, x: number, y: number, w: number, q: number, P: Params, font: string) {
  const dk = P.ftheme === 'dark', h = h0 * q, fg = dk ? '#fff' : '#1a1a1a', mid = y + h / 2
  c.fillStyle = id === 'browser' ? (dk ? '#2b2b2b' : '#e9e9ec') : id === 'mac' ? (dk ? '#2d2d2d' : '#ececec') : (dk ? '#202020' : '#f3f3f3')
  c.fillRect(x, y, w, h)
  c.font = `${12 * q}px ${font}`; c.textBaseline = 'middle'; c.fillStyle = fg
  if (id === 'win') {
    c.textAlign = 'left'; c.fillText(P.ftitle || '', x + 14 * q, mid)
    c.strokeStyle = fg; c.lineWidth = q; const bw = 46 * q; let bx = x + w - 3 * bw
    c.beginPath(); c.moveTo(bx + bw / 2 - 5 * q, mid); c.lineTo(bx + bw / 2 + 5 * q, mid); c.stroke(); bx += bw
    c.strokeRect(bx + bw / 2 - 5 * q, mid - 5 * q, 10 * q, 10 * q); bx += bw
    c.beginPath(); c.moveTo(bx + bw / 2 - 5 * q, mid - 5 * q); c.lineTo(bx + bw / 2 + 5 * q, mid + 5 * q)
    c.moveTo(bx + bw / 2 + 5 * q, mid - 5 * q); c.lineTo(bx + bw / 2 - 5 * q, mid + 5 * q); c.stroke()
  } else {
    ;([['#ff5f57', 20], ['#febc2e', 40], ['#28c840', 60]] as const).forEach(([col, dx]) => { c.fillStyle = col; c.beginPath(); c.arc(x + dx * q, mid, 6 * q, 0, 7); c.fill() })
    c.fillStyle = fg; c.globalAlpha = 0.8; c.textAlign = 'center'
    if (id === 'mac') c.fillText(P.ftitle || '', x + w / 2, mid)
    else {
      const px = x + 84 * q, pw = w - 100 * q, ph = 26 * q
      c.globalAlpha = 1; c.fillStyle = dk ? '#3b3b3b' : '#fff'; rr(c, px, mid - ph / 2, pw, ph, ph / 2); c.fill()
      c.fillStyle = fg; c.globalAlpha = 0.75; c.fillText(P.ftitle || 'example.com', px + pw / 2, mid)
    }
    c.globalAlpha = 1
  }
  c.fillStyle = dk ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)'; c.fillRect(x, y + h - q, w, q)
}

/* ---------- annotations ---------- */
let mctx: CanvasRenderingContext2D | null = null
export function textSize(a: { s: string; size: number }, font: string) {
  mctx ??= document.createElement('canvas').getContext('2d')!
  mctx.font = `600 ${a.size}px ${font}`
  return { w: mctx.measureText(a.s).width, h: a.size * 1.2 }
}

export function annBounds(a: Ann, font: string) {
  switch (a.t) {
    case 'arrow': case 'line': return { x: Math.min(a.x, a.x1), y: Math.min(a.y, a.y1), w: Math.abs(a.x1 - a.x), h: Math.abs(a.y1 - a.y) }
    case 'text': { const m = textSize(a, font), p = a.bg ? a.size * 0.3 : 0; return { x: a.x - p, y: a.y - p, w: m.w + 2 * p, h: m.h + 2 * p } }
    case 'step': return { x: a.x - a.size / 2, y: a.y - a.size / 2, w: a.size, h: a.size }
    default: return { x: a.x, y: a.y, w: a.w, h: a.h }
  }
}

function drawAnn(c: CanvasRenderingContext2D, st: RenderState, q: number, L: Layout) {
  const list = st.cur ? st.ann.concat(st.cur) : st.ann, cr = st.crop, k = st.k
  c.save(); c.translate(L.ix * q, L.iy * q); c.scale(q, q)
  const spots = list.filter((a) => a.t === 'spot' && a.w > 2 && a.h > 2)
  if (spots.length) {
    c.save(); c.fillStyle = 'rgba(0,0,0,.55)'; c.beginPath(); c.rect(0, 0, L.iw, L.ih)
    for (const a of spots) if (a.t === 'spot') { const r = Math.min(12, a.w / 2, a.h / 2); c.roundRect(a.x, a.y, a.w, a.h, r) }
    c.fill('evenodd'); c.restore()
  }
  for (const a of list) {
    c.lineWidth = a.lw || 4; c.strokeStyle = c.fillStyle = a.c || '#ef4444'; c.lineCap = c.lineJoin = 'round'
    if (a.t === 'rect') c.strokeRect(a.x, a.y, a.w, a.h)
    else if (a.t === 'ellipse') { c.beginPath(); c.ellipse(a.x + a.w / 2, a.y + a.h / 2, Math.max(1, a.w / 2), Math.max(1, a.h / 2), 0, 0, 7); c.stroke() }
    else if (a.t === 'hl') { c.save(); c.globalAlpha = 0.38; c.fillRect(a.x, a.y, a.w, a.h); c.restore() }
    else if (a.t === 'spot') { c.save(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.setLineDash([6, 5]); c.roundRect(a.x, a.y, a.w, a.h, Math.min(12, a.w / 2, a.h / 2)); c.stroke(); c.restore() }
    else if (a.t === 'line') { c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(a.x1, a.y1); c.stroke() }
    else if (a.t === 'arrow') {
      const an = Math.atan2(a.y1 - a.y, a.x1 - a.x), hl = Math.max(14, a.lw * 4)
      c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(a.x1 - (hl * 0.6) * Math.cos(an), a.y1 - (hl * 0.6) * Math.sin(an)); c.stroke()
      c.beginPath(); c.moveTo(a.x1, a.y1)
      c.lineTo(a.x1 - hl * Math.cos(an - 0.45), a.y1 - hl * Math.sin(an - 0.45)); c.lineTo(a.x1 - hl * Math.cos(an + 0.45), a.y1 - hl * Math.sin(an + 0.45)); c.closePath(); c.fill()
    } else if (a.t === 'text') {
      c.font = `600 ${a.size}px ${st.font}`; c.textBaseline = 'top'; c.textAlign = 'left'
      if (a.bg) {
        const b = annBounds(a, st.font); c.fillStyle = a.c; rr(c, b.x, b.y, b.w, b.h, a.size * 0.35); c.fill(); c.fillStyle = '#fff'
      }
      c.fillText(a.s, a.x, a.y)
    } else if (a.t === 'step') {
      c.beginPath(); c.arc(a.x, a.y, a.size / 2, 0, 7); c.fill()
      c.lineWidth = Math.max(2, a.size / 14); c.strokeStyle = '#fff'; c.stroke()
      c.fillStyle = '#fff'; c.font = `700 ${a.size * 0.55}px ${st.font}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(a.n), a.x, a.y + a.size * 0.03)
    } else if (a.t === 'blur' && a.w > 2 && a.h > 2) {
      const tw = Math.max(1, Math.round(a.w / a.px)), th = Math.max(1, Math.round(a.h / a.px)), tcv = document.createElement('canvas')
      tcv.width = tw; tcv.height = th
      tcv.getContext('2d')!.drawImage(st.src, (cr.x + a.x) * k, (cr.y + a.y) * k, a.w * k, a.h * k, 0, 0, tw, th)
      c.save(); c.imageSmoothingEnabled = false; c.drawImage(tcv, 0, 0, tw, th, a.x, a.y, a.w, a.h); c.restore()
    }
  }
  if (st.ui && st.selId != null) {
    const a = list.find((x) => x.id === st.selId)
    if (a) {
      const b = annBounds(a, st.font), hs = (5 * st.dpr) / q
      c.save(); c.lineWidth = 1.5 * st.dpr / q; c.setLineDash([5 * st.dpr / q, 4 * st.dpr / q]); c.strokeStyle = '#2196f3'
      c.strokeRect(b.x, b.y, b.w, b.h); c.setLineDash([]); c.fillStyle = '#fff'
      const pts = a.t === 'arrow' || a.t === 'line' ? [[a.x, a.y], [a.x1, a.y1]]
        : a.t === 'text' || a.t === 'step' ? [] : [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]]
      for (const [px, py] of pts) { c.beginPath(); c.arc(px, py, hs, 0, 7); c.fill(); c.stroke() }
      c.restore()
    }
  }
  c.restore()
}

/* ---------- watermark ---------- */
function drawWatermark(c: CanvasRenderingContext2D, st: RenderState, q: number, L: Layout) {
  const P = st.P
  if (P.wmType === 'logo' ? !st.wmImg : !P.wm) return
  const m = Math.min(L.W, L.H) * 0.035 * q, W = L.W * q, H = L.H * q
  c.save(); c.globalAlpha = P.wmAlpha
  let w: number, h: number
  if (P.wmType === 'logo' && st.wmImg) { h = P.wmSize * 1.8 * q; w = (st.wmImg.width / st.wmImg.height) * h }
  else { c.font = `600 ${P.wmSize * q}px ${st.font}`; w = c.measureText(P.wm).width; h = P.wmSize * q * 1.2 }
  const x = P.wmPos === 'c' ? (W - w) / 2 : P.wmPos.endsWith('l') ? m : W - m - w
  const y = P.wmPos === 'c' ? (H - h) / 2 : P.wmPos.startsWith('t') ? m : H - m - h
  if (P.wmType === 'logo' && st.wmImg) c.drawImage(st.wmImg, x, y, w, h)
  else { c.fillStyle = P.wmColor; c.textBaseline = 'top'; c.textAlign = 'left'; c.fillText(P.wm, x, y + h * 0.08) }
  c.restore()
}

/* ---------- main draw (q = canvas pixels per layout pixel) ---------- */
export function draw(c: CanvasRenderingContext2D, q: number, L: Layout, st: RenderState, flat = false) {
  const P = st.P, F = FRAMES[P.frame] ?? FRAMES.none, k = st.k
  c.clearRect(0, 0, L.W * q, L.H * q)
  if (flat) { c.fillStyle = '#fff'; c.fillRect(0, 0, L.W * q, L.H * q) }
  drawBg(c, q, L, st)
  const x = L.x * q, y = L.y * q, w = L.cw * q, h = L.ch * q
  const dk = P.ftheme === 'dark', glass = P.frame === 'glass', dev = !!F.device
  const rOut = (P.radius + (dev ? L.g * 0.9 : 0)) * q, rIn = dev ? P.radius * q : Math.max(0, P.radius * q - (glass ? L.g * q : 0))
  c.save()
  if (P.rot || P.skew) {
    const cx = (L.x + L.cw / 2) * q, cy = (L.y + L.ch / 2) * q
    c.translate(cx, cy); c.rotate((P.rot * Math.PI) / 180); c.transform(1, 0, Math.tan((P.skew * Math.PI) / 180), 1, 0, 0); c.translate(-cx, -cy)
  }
  c.save()
  if (P.shOn) { c.shadowColor = rgba(P.shColor, P.shAlpha); c.shadowBlur = P.shBlur * q; c.shadowOffsetY = P.shY * q }
  rr(c, x, y, w, h, rOut)
  c.fillStyle = glass ? 'rgba(255,255,255,.3)' : dev ? (dk ? '#0d0d0f' : '#e4e4e7') : dk ? '#1f1f1f' : '#fff'
  c.fill(); c.restore()
  c.save(); rr(c, x, y, w, h, rOut); c.clip()
  if (F.hdr) header(c, P.frame, F.hdr, x, y, w, q, P, st.font)
  c.save()
  if (glass || dev) { rr(c, L.ix * q, L.iy * q, L.iw * q, L.ih * q, rIn); c.clip() }
  c.drawImage(st.src, st.crop.x * k, st.crop.y * k, st.crop.w * k, st.crop.h * k, L.ix * q, L.iy * q, L.iw * q, L.ih * q)
  drawAnn(c, st, q, L)
  if (P.frame === 'phone' && L.iw > 180) { c.fillStyle = '#000'; const iw = Math.min(L.iw * 0.28, 110) * q; rr(c, (L.ix + L.iw / 2) * q - iw / 2, (L.iy + 10) * q, iw, 22 * q, 11 * q); c.fill() }
  c.restore(); c.restore()
  if (dev) { c.save(); rr(c, x + 0.5 * q, y + 0.5 * q, w - q, h - q, rOut); c.strokeStyle = dk ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.18)'; c.lineWidth = q; c.stroke(); c.restore() }
  if (P.frame === 'laptop') {
    const bx = x - 18 * q, by = y + h, bw = w + 36 * q, bh = 14 * q
    c.save(); c.fillStyle = dk ? '#26262a' : '#b8b9bd'; c.beginPath()
    c.moveTo(bx, by); c.lineTo(bx + bw, by); c.lineTo(bx + bw - 6 * q, by + bh - 4 * q); c.arcTo(bx + bw - 8 * q, by + bh, bx + bw - 16 * q, by + bh, 6 * q)
    c.lineTo(bx + 16 * q, by + bh); c.arcTo(bx + 8 * q, by + bh, bx + 6 * q, by + bh - 4 * q, 6 * q); c.closePath(); c.fill()
    c.fillStyle = dk ? '#3b3b40' : '#9a9ba0'; rr(c, bx + bw / 2 - 44 * q, by, 88 * q, 5 * q, 3 * q); c.fill(); c.restore()
  }
  if (glass) { c.save(); rr(c, x + 0.5 * q, y + 0.5 * q, w - q, h - q, rOut); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = q; c.stroke(); c.restore() }
  if (P.bdW > 0) { c.save(); rr(c, x + (P.bdW * q) / 2, y + (P.bdW * q) / 2, w - P.bdW * q, h - P.bdW * q, rOut); c.strokeStyle = rgba(P.bdColor, P.bdA); c.lineWidth = P.bdW * q; c.stroke(); c.restore() }
  c.restore()
  if (P.cap) { c.font = `600 ${P.capSize * q}px ${st.font}`; c.fillStyle = P.capColor; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(P.cap, (L.W * q) / 2, L.capY * q) }
  drawWatermark(c, st, q, L)
}

/** Largest export scale that keeps both sides <= 8192 px. */
export function exportScale(P: Params, L: Layout) {
  let s: number = P.sc
  while (s > 1 && (L.W * s > 8192 || L.H * s > 8192)) s--
  return s
}

export function renderExport(st: RenderState, scale?: number, targetW?: number): HTMLCanvasElement {
  const L = layout(st.P, st.crop)
  const q = targetW ? targetW / L.W : scale ?? exportScale(st.P, L)
  const cv = document.createElement('canvas')
  cv.width = Math.max(1, Math.round(L.W * q)); cv.height = Math.max(1, Math.round(L.H * q))
  draw(cv.getContext('2d')!, cv.width / L.W, L, { ...st, ui: false, cur: null, selId: null, dpr: 1 }, st.P.fmt === 'jpeg')
  return cv
}

/* ---------- misc ---------- */
export function makePreviewSrc(src: Src, max = 2400): { pv: Src; k: number } {
  const m = Math.max(src.width, src.height)
  if (m <= max) return { pv: src, k: 1 }
  const k = max / m, c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(src.width * k)); c.height = Math.max(1, Math.round(src.height * k))
  const x = c.getContext('2d')!; x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, c.width, c.height)
  return { pv: c, k: c.width / src.width }
}

/** Dominant vibrant colours of an image (for the "auto background" feature). */
export function paletteFrom(src: Src): [string, string, string] {
  const c = document.createElement('canvas'); c.width = c.height = 48
  const x = c.getContext('2d', { willReadFrequently: true })!; x.drawImage(src, 0, 0, 48, 48)
  const d = x.getImageData(0, 0, 48, 48).data, bins = new Map<number, { n: number; r: number; g: number; b: number; s: number }>()
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5), e = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0, s: sat }
    e.n++; e.r += r; e.g += g; e.b += b; bins.set(key, e)
  }
  const hex = (v: number[]) => '#' + v.map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')
  const list = [...bins.values()].map((e) => ({ r: e.r / e.n, g: e.g / e.n, b: e.b / e.n, s: e.s, score: e.n * (0.25 + e.s) })).sort((a, b) => b.score - a.score)
  const hue = (o: { r: number; g: number; b: number }) => { const mx = Math.max(o.r, o.g, o.b), mn = Math.min(o.r, o.g, o.b), dl = mx - mn || 1; const h = mx === o.r ? ((o.g - o.b) / dl) % 6 : mx === o.g ? (o.b - o.r) / dl + 2 : (o.r - o.g) / dl + 4; return (h * 60 + 360) % 360 }
  const a = list[0] ?? { r: 102, g: 126, b: 234, s: 1, score: 1 }
  const bC = list.find((o) => { const dh = Math.abs(hue(o) - hue(a)); return Math.min(dh, 360 - dh) > 35 && o.s > 0.15 }) ?? list[1] ?? a
  const lift = (o: { r: number; g: number; b: number }, f: number) => [o.r + (255 - o.r) * f, o.g + (255 - o.g) * f, o.b + (255 - o.b) * f]
  return [hex([a.r * 0.82, a.g * 0.82, a.b * 0.82]), hex([bC.r, bC.g, bC.b]), hex(lift(bC, 0.35))]
}

export function makeSample(font: string): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = 1200; c.height = 720
  const x = c.getContext('2d')!
  x.fillStyle = '#f4f6fb'; x.fillRect(0, 0, 1200, 720); x.fillStyle = '#fff'; x.fillRect(0, 0, 230, 720)
  x.fillStyle = '#e3e8f4'; ;[70, 130, 190, 250, 310].forEach((y, i) => { rr(x, 24, y, i === 0 ? 182 : 150 + i * 6, 34, 8); x.fill() })
  x.fillStyle = '#415F91'; rr(x, 24, 70, 182, 34, 8); x.fill()
  x.fillStyle = '#191c20'; x.font = `600 30px ${font}`; x.textBaseline = 'top'; x.fillText('Dashboard', 270, 40)
  ;([['Visitors', '12,480', '#415F91'], ['Revenue', '$8,240', '#10893e'], ['Orders', '342', '#c4611a']] as const).forEach(([a, b, col], i) => {
    const X = 270 + i * 300; x.fillStyle = '#fff'; rr(x, X, 110, 276, 130, 12); x.fill()
    x.fillStyle = '#6b7280'; x.font = `16px ${font}`; x.fillText(a, X + 20, 132); x.fillStyle = col; x.font = `600 40px ${font}`; x.fillText(b, X + 20, 170)
  })
  x.fillStyle = '#fff'; rr(x, 270, 270, 876, 400, 12); x.fill(); x.strokeStyle = '#415F91'; x.lineWidth = 5; x.lineJoin = 'round'; x.beginPath()
  ;[[300, 600], [400, 520], [500, 560], [600, 430], [700, 470], [800, 360], [900, 400], [1000, 320], [1100, 300]].forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)))
  x.stroke()
  return c
}
