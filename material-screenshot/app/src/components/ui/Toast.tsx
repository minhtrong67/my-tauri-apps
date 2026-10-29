import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle, type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

type Kind = 'info' | 'success' | 'warning' | 'error'
interface Item { id: number; kind: Kind; msg: string; dur: number }

let items: Item[] = []
let seq = 0
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())
const remove = (id: number) => { items = items.filter((i) => i.id !== id); emit() }
const push = (kind: Kind) => (msg: string, dur = kind === 'error' ? 5200 : 3200) => {
  const id = ++seq
  items = [...items.filter((i) => !(i.msg === msg && i.kind === kind)), { id, kind, msg, dur }].slice(-3)
  emit()
}
export const toast = { info: push('info'), success: push('success'), warning: push('warning'), error: push('error') }

const STYLE: Record<Kind, { icon: LucideIcon; box: string; bar: string }> = {
  info: { icon: Info, box: 'bg-primary-container text-on-primary-container', bar: 'bg-primary' },
  success: { icon: CheckCircle2, box: 'bg-success-container text-on-success-container', bar: 'bg-success' },
  warning: { icon: AlertTriangle, box: 'bg-warning-container text-on-warning-container', bar: 'bg-warning' },
  error: { icon: XCircle, box: 'bg-error-container text-on-error-container', bar: 'bg-error' },
}

function ToastItem({ it, closeLabel }: { it: Item; closeLabel: string }) {
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused) return
    const t = setTimeout(() => remove(it.id), it.dur)
    return () => clearTimeout(t)
  }, [it.id, it.dur, paused])
  const s = STYLE[it.kind], Icon = s.icon
  return (
    <div role={it.kind === 'error' ? 'alert' : 'status'} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      className={cn('pointer-events-auto relative flex max-w-[min(92vw,30rem)] items-center gap-3 overflow-hidden rounded-2xl py-3 pl-4 pr-2 elev-3', s.box)} style={{ animation: 'toast-in .45s var(--ease-spring) both' }}>
      <Icon size={22} className="shrink-0" />
      <p className="min-w-0 flex-1 break-words text-[0.875rem] font-medium leading-snug">{it.msg}</p>
      <button type="button" aria-label={closeLabel} onClick={() => remove(it.id)} className="sl morph flex h-8 w-8 items-center justify-center"><X size={16} /></button>
      <span className={cn('absolute bottom-0 left-0 h-1 w-full origin-left opacity-60', s.bar)} style={{ animation: `toast-bar ${it.dur}ms linear forwards`, animationPlayState: paused ? 'paused' : 'running' }} />
    </div>
  )
}

export function ToastHost({ closeLabel }: { closeLabel: string }) {
  const [, force] = useState(0)
  useEffect(() => { const f = () => force((n) => n + 1); subs.add(f); return () => { subs.delete(f) } }, [])
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-12 z-[400] flex flex-col items-center gap-2 px-3">
      {items.map((i) => <ToastItem key={i.id} it={i} closeLabel={closeLabel} />)}
    </div>
  )
}
