import { useEffect, useState } from 'react'
import {
  ClipboardPaste, Copy, Crop as CropIcon, Download, FileDown, FolderOpen, Info, Maximize2, Minus, MonitorUp, Redo2, Scan, Settings as Cog, SlidersHorizontal,
  Square, Undo2, X, ZoomIn, ZoomOut, Eye, Save, FileImage, Monitor, Crosshair,
} from 'lucide-react'
import type { Editor } from '../lib/editor'
import { useT } from '../lib/i18n'
import { appWindow, isTauri } from '../lib/tauri'
import { cn } from '../lib/cn'
import { Button, IconButton } from './ui/Button'
import { SplitButton } from './ui/Menu'
import type { Zoom } from './Stage'

export function TitleBar({ file }: { file: string }) {
  const t = useT()
  const [max, setMax] = useState(false)
  useEffect(() => {
    const w = appWindow(); if (!w) return
    let un: (() => void) | undefined
    const sync = () => w.isMaximized().then(setMax).catch(() => {})
    sync(); w.onResized(sync).then((u) => { un = u })
    return () => un?.()
  }, [])
  const w = appWindow()
  return (
    <header data-tauri-drag-region className="flex h-11 shrink-0 select-none items-center gap-3 pl-3.5 pr-1.5">
      <img data-tauri-drag-region src="./icon.svg" alt="" className="pointer-events-none h-6 w-6" />
      <span data-tauri-drag-region className="pointer-events-none text-[0.85rem] font-semibold tracking-tight">Material Screenshot</span>
      {file && <span data-tauri-drag-region className="pointer-events-none max-w-[40vw] truncate rounded-full bg-secondary-container px-3 py-0.5 text-[0.72rem] font-medium text-on-secondary-container anim-pop">{file}</span>}
      <div data-tauri-drag-region className="flex-1 self-stretch" />
      {w && (
        <div className="flex items-center gap-0.5">
          <IconButton icon={Minus} size="sm" label={t('minimize')} onClick={() => w.minimize()} className="!h-9 !w-11" />
          <IconButton icon={max ? Copy : Square} iconSize={15} size="sm" label={max ? t('restore') : t('maximize')} onClick={() => w.toggleMaximize()} className="!h-9 !w-11" />
          <Tip label={t('close')}><button type="button" aria-label={t('close')} onClick={() => w.close()} className="sl morph flex h-9 w-11 items-center justify-center text-on-surface-variant hover:!bg-error hover:!text-on-error"><X size={17} /></button></Tip>
        </div>
      )}
    </header>
  )
}
import { Tooltip as Tip } from './ui/Tooltip'

interface TBProps {
  ed: Editor; compact: boolean; narrow: boolean; canCapture: boolean
  onOpen: () => void; onPaste: () => void; onCapture: (region: boolean) => void; onCopy: () => void; onSave: (fmt?: 'png' | 'jpeg' | 'webp', ask?: boolean) => void
  onSettings: () => void; onAbout: () => void; onPanel: () => void; onCompare: (on: boolean) => void
}
export function Toolbar(p: TBProps) {
  const t = useT(), { ed, compact } = p, has = ed.has
  const lbl = (s: string) => (compact ? undefined : s)
  const cls = compact ? '!w-11 !px-0' : ''
  return (
    <div className="flex shrink-0 items-center gap-1.5 px-2.5 pb-2">
      <Button variant="tonal" icon={FolderOpen} tip={compact ? t('open') : undefined} shortcut="Ctrl+O" onClick={p.onOpen} className={cls}>{lbl(t('open'))}</Button>
      <Button variant="outlined" icon={ClipboardPaste} tip={compact ? t('paste') : undefined} shortcut="Ctrl+V" onClick={p.onPaste} className={cls}>{lbl(t('paste'))}</Button>
      {p.canCapture && (
        <SplitButton variant="tertiary" label={t('capture')} icon={MonitorUp} compact={compact} onMain={() => p.onCapture(false)} menuLabel={t('captureMore')} tip={compact ? t('capture') : undefined} shortcut="Ctrl+Alt+S"
          items={[{ label: t('capFull'), icon: Monitor, onClick: () => p.onCapture(false) }, { label: t('capRegion'), icon: Crosshair, onClick: () => p.onCapture(true), hint: t('capRegionHint') }]} />
      )}
      <Button variant="outlined" icon={CropIcon} disabled={!has} tip={compact ? t('crop') : undefined} shortcut="C" onClick={() => (ed.cropMode ? ed.exitCrop() : ed.enterCrop())} selected={ed.cropMode} className={cls}>{lbl(t('crop'))}</Button>
      <span className="mx-1 h-6 w-px bg-outline-variant" />
      <IconButton icon={Undo2} label={t('undo')} shortcut="Ctrl+Z" disabled={!ed.canUndo} onClick={() => ed.undo()} />
      <IconButton icon={Redo2} label={t('redo')} shortcut="Ctrl+Y" disabled={!ed.canRedo} onClick={() => ed.redo()} />
      <div className="flex-1" />
      <Tip label={t('compareHint')} shortcut="X">
        <button type="button" disabled={!has} aria-label={t('compare')} onPointerDown={() => p.onCompare(true)} onPointerUp={() => p.onCompare(false)} onPointerLeave={() => p.onCompare(false)} onPointerCancel={() => p.onCompare(false)}
          className="sl morph flex h-10 w-10 items-center justify-center text-on-surface-variant"><Eye size={20} /></button>
      </Tip>
      <Button variant="outlined" icon={Copy} disabled={!has} tip={compact ? t('copy') : undefined} shortcut="Ctrl+C" onClick={p.onCopy} className={cls}>{lbl(t('copy'))}</Button>
      <SplitButton variant="filled" label={t('save')} icon={Download} compact={compact} disabled={!has} onMain={() => p.onSave()} menuLabel={t('saveMore')} tip={compact ? t('save') : undefined} shortcut="Ctrl+S"
        items={[{ label: t('savePng'), icon: FileImage, onClick: () => p.onSave('png') }, { label: t('saveJpg'), icon: FileDown, onClick: () => p.onSave('jpeg') }, { label: t('saveWebp'), icon: FileDown, onClick: () => p.onSave('webp') }, { label: t('saveAs'), icon: Save, onClick: () => p.onSave(undefined, true) }]} />
      <span className="mx-1 h-6 w-px bg-outline-variant" />
      {p.narrow && <IconButton icon={SlidersHorizontal} label={t('options')} variant="tonal" onClick={p.onPanel} />}
      <IconButton icon={Cog} label={t('settings')} onClick={p.onSettings} />
      <IconButton icon={Info} label={t('about')} onClick={p.onAbout} />
    </div>
  )
}

export function StatusBar({ ed, zoom, scale, onZoom, version }: { ed: Editor; zoom: Zoom; scale: number; onZoom: (z: Zoom) => void; version: number }) {
  const t = useT()
  void version
  let info = t('ready')
  if (ed.has) info = ed.cropMode ? `${ed.crop.w} × ${ed.crop.h} px` : (() => { const o = ed.outputSize(); return `${ed.crop.w} × ${ed.crop.h} px  →  ${o.w} × ${o.h} px (${o.s}x)` })()
  const cur = zoom === 'fit' ? scale : zoom
  return (
    <footer className="flex h-9 shrink-0 items-center justify-between gap-3 px-4 text-[0.75rem] text-on-surface-variant">
      <span className="truncate">{info}</span>
      {ed.has && !ed.cropMode && (
        <div className={cn('flex items-center gap-0.5')}>
          <IconButton icon={ZoomOut} size="sm" side="top" label={t('zoomOut')} shortcut="−" onClick={() => onZoom(Math.max(0.1, +(cur / 1.25).toFixed(3)))} />
          <button type="button" onClick={() => onZoom('fit')} className="sl morph h-7 min-w-[3.4rem] px-2 text-[0.78rem] font-semibold tabular-nums text-on-surface">{Math.round(cur * 100)}%</button>
          <IconButton icon={ZoomIn} size="sm" side="top" label={t('zoomIn')} shortcut="+" onClick={() => onZoom(Math.min(8, +(cur * 1.25).toFixed(3)))} />
          <IconButton icon={Scan} size="sm" side="top" label={t('zoomFit')} shortcut="0" selected={zoom === 'fit'} onClick={() => onZoom('fit')} />
          <IconButton icon={Maximize2} size="sm" side="top" label={t('zoomActual')} shortcut="1" selected={zoom === 1} onClick={() => onZoom(1)} />
        </div>
      )}
    </footer>
  )
}
export const hasTauri = isTauri
