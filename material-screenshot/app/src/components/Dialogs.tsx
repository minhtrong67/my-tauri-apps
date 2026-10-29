import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowRightLeft, BookmarkPlus, Check, ClipboardCopy, ClipboardPaste, Download, ExternalLink, Globe, Keyboard, Loader2, Play, Plus, Trash2, X, XCircle, Info, CircleCheck } from 'lucide-react'
import type { Editor } from '../lib/editor'
import { useT } from '../lib/i18n'
import type { K } from '../lib/dict'
import { isTauri, openExternal, pickImages, readImageFile, saveBlob } from '../lib/tauri'
import { presetStore, pickStyle, type UserPreset } from '../lib/presetStore'
import { Dialog } from './ui/Dialog'
import { Card, inputCls } from './ui/Controls'
import { toast } from './ui/Toast'
import { AUTHOR, REPO } from './SettingsDialog'
import { TOOLS } from './Stage'

export const VERSION = '2.0.0'

export function ConfirmDialog({ open, title, message, confirmLabel, icon, danger, onConfirm, onClose }: { open: boolean; title: string; message: string; confirmLabel: string; icon: typeof Trash2; danger?: boolean; onConfirm: () => void; onClose: () => void }) {
  const t = useT()
  return (
    <Dialog open={open} onClose={onClose} title={title} icon={AlertTriangle} tone={danger ? 'danger' : 'primary'} size="sm" closeLabel={t('close')}
      actions={[{ label: t('cancel'), icon: X, variant: 'tonal', onClick: onClose }, { label: confirmLabel, icon, variant: danger ? 'danger' : 'filled', onClick: onConfirm }]}>
      <p className="text-[0.9rem] leading-relaxed text-on-surface-variant">{message}</p>
    </Dialog>
  )
}

export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  return (
    <Dialog open={open} onClose={onClose} title={t('about')} icon={Info} size="sm" closeLabel={t('close')}
      actions={[{ label: t('releases'), icon: Download, variant: 'tonal', onClick: () => openExternal(REPO + '/releases') }, { label: 'GitHub', icon: Globe, variant: 'tonal', onClick: () => openExternal(REPO) }, { label: t('close'), icon: Check, variant: 'filled', onClick: onClose }]}>
      <div className="flex flex-col items-center gap-3 pb-2 text-center">
        <img src="./icon.svg" alt="" className="anim-float h-24 w-24 drop-shadow-lg" />
        <div><h3 className="text-[1.5rem] font-bold tracking-tight">Material Screenshot</h3><p className="text-[0.8rem] text-on-surface-variant">{t('version')} {VERSION}</p></div>
        <p className="max-w-xs text-[0.875rem] text-on-surface-variant">{t('tagline')}</p>
        <Card tone="highlight" className="w-full !py-3">
          <div className="text-[0.7rem] font-semibold uppercase tracking-wider opacity-75">{t('author')}</div>
          <div className="text-[1.05rem] font-bold">{AUTHOR}</div>
          <div className="text-[0.8rem] opacity-85">{t('aiBy')} <b>Claude</b></div>
        </Card>
        <p className="text-[0.75rem] text-on-surface-variant">{t('license')}</p>
      </div>
    </Dialog>
  )
}

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const rows: [string, K][] = [['Ctrl+O', 'open'], ['Ctrl+V', 'paste'], ['Ctrl+Alt+S', 'capture'], ['Ctrl+C', 'copy'], ['Ctrl+S', 'save'], ['Ctrl+Z', 'undo'], ['Ctrl+Y', 'redo'], ['C', 'crop'], ['Del', 'deleteSel'], ['X', 'original'], ['Ctrl+Wheel', 'zoom'], ['Space+Drag', 'pan'], ['0 / 1', 'fitActual'], ['Ctrl+/', 'shortcuts']]
  return (
    <Dialog open={open} onClose={onClose} title={t('shortcuts')} icon={Keyboard} closeLabel={t('close')} scrollTopLabel={t('scrollTop')} actions={[{ label: t('close'), icon: Check, variant: 'filled', onClick: onClose }]}>
      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {rows.map(([k, l]) => <div key={k + l} className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-[0.85rem]"><span>{t(l)}</span><span className="flex gap-1">{k.split('+').map((p) => <kbd key={p}>{p}</kbd>)}</span></div>)}
        {TOOLS.map((o) => <div key={o.id} className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-[0.85rem]"><span className="flex items-center gap-2"><o.icon size={15} className="text-primary" />{t(o.label)}</span><kbd>{o.key}</kbd></div>)}
      </div>
    </Dialog>
  )
}

export function SavePresetDialog({ open, onClose, ed }: { open: boolean; onClose: () => void; ed: Editor }) {
  const t = useT()
  const [name, setName] = useState('')
  useEffect(() => { if (open) setName('') }, [open])
  const save = () => {
    const n = name.trim(); if (!n) return
    const p: UserPreset = { id: Date.now().toString(36), name: n.slice(0, 40), params: pickStyle(ed.P) }
    presetStore.set((s) => ({ list: [...s.list, p] })); toast.success(t('styleSaved')); onClose()
  }
  return (
    <Dialog open={open} onClose={onClose} title={t('saveStyle')} icon={BookmarkPlus} size="sm" closeLabel={t('close')}
      actions={[{ label: t('cancel'), icon: X, variant: 'tonal', onClick: onClose }, { label: t('save'), icon: BookmarkPlus, variant: 'filled', onClick: save, disabled: !name.trim() }]}>
      <input data-autofocus className={inputCls} value={name} maxLength={40} placeholder={t('styleName')} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save() }} />
    </Dialog>
  )
}

export function PresetIODialog({ open, onClose, presets }: { open: boolean; onClose: () => void; presets: UserPreset[] }) {
  const t = useT()
  const [txt, setTxt] = useState('')
  useEffect(() => { if (open) setTxt('') }, [open])
  const doCopy = async () => { try { await navigator.clipboard.writeText(JSON.stringify(presets)); toast.success(t('copied')) } catch { toast.error(t('copyFail')) } }
  const doImport = () => {
    try {
      const arr = JSON.parse(txt) as UserPreset[]
      const ok = Array.isArray(arr) ? arr.filter((p) => p && typeof p.name === 'string' && typeof p.params === 'object') : []
      if (!ok.length) throw new Error('bad')
      presetStore.set((s) => ({ list: [...s.list, ...ok.map((p) => ({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: String(p.name).slice(0, 40), params: p.params }))] }))
      toast.success(t('imported', { n: ok.length })); onClose()
    } catch { toast.error(t('importFail')) }
  }
  return (
    <Dialog open={open} onClose={onClose} title={t('importExport')} icon={ArrowRightLeft} closeLabel={t('close')}
      actions={[{ label: t('copyAll'), icon: ClipboardCopy, variant: 'tonal', onClick: doCopy, disabled: !presets.length }, { label: t('import'), icon: ClipboardPaste, variant: 'filled', onClick: doImport, disabled: !txt.trim() }]}>
      <p className="mb-2 text-[0.82rem] text-on-surface-variant">{t('ioHint')}</p>
      <textarea value={txt} onChange={(e) => setTxt(e.target.value)} rows={7} spellCheck={false} placeholder='[{"name":"…","params":{…}}]' className={inputCls + ' h-auto resize-none py-3 font-mono text-[0.78rem]'} />
    </Dialog>
  )
}

interface Job { id: number; name: string; src: string | File; state: 'wait' | 'run' | 'ok' | 'err' }
export function BatchDialog({ open, onClose, ed, dir, initial }: { open: boolean; onClose: () => void; ed: Editor; dir: string; initial: (string | File)[] }) {
  const t = useT()
  const [jobs, setJobs] = useState<Job[]>([])
  const [running, setRunning] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const seq = useRef(1)
  const mk = (l: (string | File)[]): Job[] => l.map((s) => ({ id: seq.current++, name: typeof s === 'string' ? s.split(/[\\/]/).pop()! : s.name, src: s, state: 'wait' }))
  useEffect(() => { if (open) setJobs(mk(initial)) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    if (isTauri()) { const p = await pickImages(true); if (p.length) setJobs((j) => [...j, ...mk(p)]) } else fileRef.current?.click()
  }
  const start = async () => {
    setRunning(true); let ok = 0
    for (const job of jobs) {
      setJobs((j) => j.map((x) => (x.id === job.id ? { ...x, state: 'run' } : x)))
      try {
        const blob = typeof job.src === 'string' ? await readImageFile(job.src) : job.src
        const bm = await createImageBitmap(blob, { imageOrientation: 'from-image' })
        const out = await ed.renderOther(bm), base = job.name.replace(/\.[^.]+$/, '')
        await saveBlob(out, `${base}-beautified.${ed.ext}`, dir, false)
        ok++; setJobs((j) => j.map((x) => (x.id === job.id ? { ...x, state: 'ok' } : x)))
      } catch { setJobs((j) => j.map((x) => (x.id === job.id ? { ...x, state: 'err' } : x))) }
    }
    setRunning(false)
    ok === jobs.length ? toast.success(t('batchDone', { n: ok })) : toast.warning(t('batchPartial', { n: ok, m: jobs.length }))
  }
  const done = jobs.filter((j) => j.state === 'ok' || j.state === 'err').length
  return (
    <Dialog open={open} onClose={() => !running && onClose()} title={t('batch')} icon={Download} closeLabel={t('close')} scrollTopLabel={t('scrollTop')}
      actions={[{ label: t('addImages'), icon: Plus, variant: 'tonal', onClick: add, disabled: running }, { label: t('startBatch'), icon: Play, variant: 'filled', onClick: start, disabled: running || !jobs.length }]}>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { setJobs((j) => [...j, ...mk([...(e.target.files ?? [])])]); e.target.value = '' }} />
      <p className="mb-3 text-[0.82rem] text-on-surface-variant">{t('batchHint')}</p>
      {running && <div className="mb-3"><div className="wavy" /><p className="mt-1 text-[0.75rem] text-on-surface-variant">{done} / {jobs.length}</p></div>}
      <div className="flex flex-col gap-1.5">
        {jobs.length === 0 && <div className="rounded-2xl border border-dashed border-outline-variant p-6 text-center text-[0.85rem] text-on-surface-variant">{t('batchEmpty')}</div>}
        {jobs.map((j) => (
          <div key={j.id} className="anim-fade flex items-center gap-3 rounded-2xl bg-surface-container px-3.5 py-2.5 text-[0.85rem]">
            {j.state === 'run' ? <Loader2 size={18} className="animate-spin text-primary" /> : j.state === 'ok' ? <CircleCheck size={18} className="text-success" /> : j.state === 'err' ? <XCircle size={18} className="text-error" /> : <span className="h-[18px] w-[18px] rounded-full border-2 border-outline-variant" />}
            <span className="min-w-0 flex-1 truncate">{j.name}</span>
            {!running && j.state === 'wait' && <button type="button" aria-label={t('delete')} onClick={() => setJobs((x) => x.filter((y) => y.id !== j.id))} className="sl morph flex h-8 w-8 items-center justify-center text-error"><Trash2 size={16} /></button>}
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[0.75rem] text-on-surface-variant"><ExternalLink size={13} />{t('batchSaveTo')}: {dir || t('saveDefault')}</p>
    </Dialog>
  )
}
