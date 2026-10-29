import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, Circle, Crop as CropIcon, Focus, Grid3x3, Highlighter, ListOrdered, Minus, MousePointer2, MoveUpRight, RotateCcw, Square, Trash2, Type, X, type LucideIcon } from 'lucide-react'
import type { Editor } from '../lib/editor'
import { draw, layout } from '../lib/render'
import type { ToolId } from '../lib/types'
import { useT } from '../lib/i18n'
import { cn } from '../lib/cn'
import { Button, IconButton } from './ui/Button'

export type Zoom = 'fit' | number
interface Props { ed: Editor; version: number; zoom: Zoom; onZoom: (z: Zoom) => void; onScale: (s: number, fit: number) => void; showOriginal: boolean; showTools: boolean; empty: ReactNode }

export const TOOLS: { id: ToolId; icon: LucideIcon; key: string; label: 'toolSelect' | 'toolRect' | 'toolEllipse' | 'toolArrow' | 'toolLine' | 'toolText' | 'toolStep' | 'toolHl' | 'toolBlur' | 'toolSpot' }[] = [
  { id: 'select', icon: MousePointer2, key: 'V', label: 'toolSelect' }, { id: 'rect', icon: Square, key: 'R', label: 'toolRect' },
  { id: 'ellipse', icon: Circle, key: 'O', label: 'toolEllipse' }, { id: 'arrow', icon: MoveUpRight, key: 'A', label: 'toolArrow' },
  { id: 'line', icon: Minus, key: 'L', label: 'toolLine' }, { id: 'text', icon: Type, key: 'T', label: 'toolText' },
  { id: 'step', icon: ListOrdered, key: 'N', label: 'toolStep' }, { id: 'hl', icon: Highlighter, key: 'H', label: 'toolHl' },
  { id: 'blur', icon: Grid3x3, key: 'B', label: 'toolBlur' }, { id: 'spot', icon: Focus, key: 'S', label: 'toolSpot' },
]

export function Stage({ ed, version, zoom, onZoom, onScale, showOriginal, showTools, empty }: Props) {
  const t = useT()
  const boxRef = useRef<HTMLDivElement>(null)
  const cvRef = useRef<HTMLCanvasElement>(null)
  const view = useRef({ s: 1, fit: 1, W: 1, H: 1 })
  const pan = useRef({ x: 0, y: 0 })
  const live = useRef({ zoom, showOriginal, showTools })
  live.current = { zoom, showOriginal, showTools }
  const [textBox, setTextBox] = useState<{ x: number; y: number; px: number; py: number } | null>(null)
  const [spaceDown, setSpaceDown] = useState(false)
  const gesture = useRef<'none' | 'pan' | 'crop' | 'draw' | 'select'>('none')
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 })

  const paint = useCallback(() => {
    const cv = cvRef.current, box = boxRef.current
    if (!cv || !box || !ed.pv) return
    const r = box.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1)
    const lv = live.current
    const availW = Math.max(60, r.width - 48), availH = Math.max(60, r.height - (lv.showTools ? 112 : 48))
    const c = ed.crop
    if (ed.cropMode || lv.showOriginal) {
      const fit = Math.min(1, availW / c.w, (r.height - 110) / c.h), q = fit * dpr, k = ed.pvk
      cv.width = Math.max(1, Math.round(c.w * q)); cv.height = Math.max(1, Math.round(c.h * q))
      cv.style.width = c.w * fit + 'px'; cv.style.height = c.h * fit + 'px'
      view.current = { s: fit, fit, W: c.w, H: c.h }
      const x = cv.getContext('2d')!
      x.drawImage(ed.pv, c.x * k, c.y * k, c.w * k, c.h * k, 0, 0, cv.width, cv.height)
      const s = ed.cropRect()
      if (ed.cropMode && s) {
        x.fillStyle = 'rgba(0,0,0,.55)'; x.beginPath(); x.rect(0, 0, cv.width, cv.height); x.rect(s.x * q, s.y * q, s.w * q, s.h * q); x.fill('evenodd')
        x.strokeStyle = '#fff'; x.lineWidth = 2 * dpr; x.strokeRect(s.x * q, s.y * q, s.w * q, s.h * q)
      }
      cv.style.transform = 'none'
      onScale(fit, fit)
      return
    }
    const L = layout(ed.P, c)
    const fit = Math.min(1, availW / L.W, availH / L.H), s = lv.zoom === 'fit' ? fit : lv.zoom
    const q = Math.min(s * dpr, 4096 / Math.max(L.W, L.H))
    cv.width = Math.max(1, Math.round(L.W * q)); cv.height = Math.max(1, Math.round(L.H * q))
    cv.style.width = L.W * s + 'px'; cv.style.height = L.H * s + 'px'
    view.current = { s, fit, W: L.W, H: L.H }
    if (lv.zoom === 'fit') pan.current = { x: 0, y: 0 }
    cv.style.transform = `translate(${pan.current.x}px,${pan.current.y}px)`
    draw(cv.getContext('2d')!, cv.width / L.W, L, ed.state(false, true, q / s))
    onScale(s, fit)
  }, [ed, onScale])

  useEffect(() => { paint(); return ed.onPaint(paint) }, [ed, paint])
  useEffect(() => { paint() }, [paint, zoom, showOriginal, showTools, version])
  useEffect(() => {
    const el = boxRef.current; if (!el) return
    let raf = 0
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(paint) })
    ro.observe(el)
    return () => { ro.disconnect(); cancelAnimationFrame(raf) }
  }, [paint])
  useEffect(() => { document.fonts?.ready.then(() => ed.paint()) }, [ed, ed.font])

  /* wheel: ctrl = zoom, plain = pan when zoomed in */
  useEffect(() => {
    const el = boxRef.current; if (!el) return
    const f = (e: WheelEvent) => {
      if (!ed.has || ed.cropMode) return
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const cur = live.current.zoom === 'fit' ? view.current.s : live.current.zoom
        onZoom(Math.min(8, Math.max(0.1, +(cur * (e.deltaY < 0 ? 1.12 : 1 / 1.12)).toFixed(3))))
      } else if (live.current.zoom !== 'fit') {
        pan.current = { x: pan.current.x - e.deltaX, y: pan.current.y - e.deltaY }; paint()
      }
    }
    el.addEventListener('wheel', f, { passive: false })
    return () => el.removeEventListener('wheel', f)
  }, [ed, onZoom, paint])

  useEffect(() => {
    const dn = (e: KeyboardEvent) => { if (e.code === 'Space' && !(e.target as HTMLElement)?.closest('input,textarea,button,[role=combobox]')) { e.preventDefault(); setSpaceDown(true) } }
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') setSpaceDown(false) }
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [])

  /* ---- pointer ---- */
  const toPoint = (e: React.PointerEvent) => {
    const r = cvRef.current!.getBoundingClientRect(), v = view.current
    const lx = ((e.clientX - r.left) / r.width) * v.W, ly = ((e.clientY - r.top) / r.height) * v.H
    return { lx, ly }
  }
  const imgPoint = (e: React.PointerEvent) => {
    const { lx, ly } = toPoint(e)
    if (ed.cropMode) return { x: Math.max(0, Math.min(ed.crop.w, lx)), y: Math.max(0, Math.min(ed.crop.h, ly)) }
    return ed.toImage(lx, ly)
  }
  const tol = () => 9 / Math.max(0.05, view.current.s)

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!ed.has) return
    const cv = e.currentTarget
    if (e.button === 1 || spaceDown) {
      gesture.current = 'pan'; panStart.current = { x: e.clientX, y: e.clientY, px: pan.current.x, py: pan.current.y }; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; return
    }
    if (e.button !== 0 || live.current.showOriginal) return
    const p = imgPoint(e)
    if (ed.cropMode) { ed.cropSel = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }; gesture.current = 'crop'; cv.setPointerCapture(e.pointerId); return }
    if (ed.tool === 'select') { gesture.current = ed.beginSelect(p, tol()) ? 'select' : 'none'; if (gesture.current === 'select') cv.setPointerCapture(e.pointerId); return }
    if (ed.tool === 'text') { e.preventDefault(); const r = boxRef.current!.getBoundingClientRect(); setTextBox({ x: e.clientX - r.left, y: e.clientY - r.top, px: p.x, py: p.y }); return }
    ed.beginDraw(p); if (ed.tool !== 'step') { gesture.current = 'draw'; cv.setPointerCapture(e.pointerId) }
  }
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gesture.current
    if (g === 'pan') { pan.current = { x: panStart.current.px + e.clientX - panStart.current.x, y: panStart.current.py + e.clientY - panStart.current.y }; e.currentTarget.style.transform = `translate(${pan.current.x}px,${pan.current.y}px)`; return }
    if (!ed.has) return
    if (g === 'crop' && ed.cropSel) { const p = imgPoint(e); ed.cropSel.x1 = p.x; ed.cropSel.y1 = p.y; ed.paint(); return }
    if (g === 'draw') { ed.dragDraw(imgPoint(e)); return }
    if (g === 'select') { ed.dragSelect(imgPoint(e)); return }
    const cv = e.currentTarget
    if (spaceDown) cv.style.cursor = 'grab'
    else if (ed.cropMode || (ed.tool !== 'select' && !live.current.showOriginal)) cv.style.cursor = ed.tool === 'text' && !ed.cropMode ? 'text' : 'crosshair'
    else {
      const h = ed.hitTest(imgPoint(e), tol())
      cv.style.cursor = !h ? 'default' : h.handle === 'move' ? 'move' : h.handle === 'tl' || h.handle === 'br' ? 'nwse-resize' : h.handle === 'tr' || h.handle === 'bl' ? 'nesw-resize' : 'pointer'
    }
  }
  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gesture.current; gesture.current = 'none'
    if (g === 'pan') { e.currentTarget.style.cursor = spaceDown ? 'grab' : 'default'; return }
    if (g === 'crop') { ed.paint(); ed.bump(); return }
    if (g === 'draw') ed.endDraw(imgPoint(e))
    if (g === 'select') ed.endSelect()
  }

  const commitText = (ok: boolean, v: string) => {
    const tb = textBox; setTextBox(null)
    if (ok && tb && v.trim()) ed.addText({ x: tb.px, y: tb.py }, v.trim())
  }

  const has = ed.has
  return (
    <div ref={boxRef} className="stage-bg relative h-full w-full overflow-hidden rounded-[28px]">
      {!has && <div className="absolute inset-0 overflow-auto">{empty}</div>}
      {has && (
        <div className="absolute inset-0 flex items-center justify-center">
          <canvas ref={cvRef} key={ed.name + ed.crop.w} className="anim-pop block max-h-none max-w-none rounded-[2px]" style={{ touchAction: 'none', cursor: spaceDown ? 'grab' : 'default' }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
        </div>
      )}
      {has && textBox && <TextInput x={textBox.x} y={textBox.y} size={Math.max(12, ed.P.asz * view.current.s)} color={ed.P.ac} onDone={commitText} />}

      {has && ed.cropMode && (
        <div className="anim-pop absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-surface-container-highest p-1.5 pl-4 elev-3">
          <CropIcon size={16} className="text-primary" /><span className="mr-1 hidden text-[0.8rem] font-medium sm:inline">{t('cropHint')}</span>
          <Button size="sm" variant="success" icon={Check} onClick={() => ed.applyCrop()}>{t('apply')}</Button>
          <Button size="sm" variant="tonal" icon={RotateCcw} onClick={() => ed.resetCrop()}>{t('reset')}</Button>
          <Button size="sm" variant="dangerTonal" icon={X} onClick={() => ed.exitCrop()}>{t('cancel')}</Button>
        </div>
      )}

      {has && showTools && !ed.cropMode && (
        <div className="anim-up absolute bottom-3 left-1/2 z-10 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto rounded-full bg-surface-container-highest p-1.5 elev-3">
          {TOOLS.map((o) => <IconButton key={o.id} icon={o.icon} size="sm" side="top" label={t(o.label)} shortcut={o.key} selected={ed.tool === o.id} onClick={() => ed.setTool(o.id)} />)}
          <span className="mx-1 h-6 w-px shrink-0 bg-outline-variant" />
          <IconButton icon={Trash2} size="sm" side="top" variant="danger" label={t('deleteSel')} shortcut="Del" disabled={ed.selId == null} onClick={() => ed.deleteSelected()} />
        </div>
      )}
      {has && ed.busy && <div className="absolute inset-x-6 top-0"><div className="wavy" /></div>}
      {has && showOriginal && <div className="anim-pop absolute left-3 top-3 rounded-full bg-inverse-surface px-3 py-1 text-[0.75rem] font-semibold text-inverse-on-surface">{t('original')}</div>}
    </div>
  )
}

function TextInput({ x, y, size, color, onDone }: { x: number; y: number; size: number; color: string; onDone: (ok: boolean, v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const done = useRef(false)
  useEffect(() => { const id = setTimeout(() => ref.current?.focus(), 0); return () => clearTimeout(id) }, [])
  const end = (ok: boolean) => { if (done.current) return; done.current = true; onDone(ok, ref.current?.value ?? '') }
  return (
    <input ref={ref} type="text" onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') end(true); else if (e.key === 'Escape') end(false) }} onBlur={() => end(true)}
      className={cn('absolute z-20 min-w-[8ch] rounded-md border-2 border-primary bg-surface/80 px-1 font-semibold outline-none backdrop-blur')} style={{ left: x, top: y, fontSize: size, color, lineHeight: 1.2 }} />
  )
}
