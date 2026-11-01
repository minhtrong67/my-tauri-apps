import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import { cx } from './ui'

const cache = new Map<string, string | null>()
const waiting = new Set<string>()
let timer = 0
const listeners = new Set<() => void>()

function flush() {
  const paths = [...waiting]
  waiting.clear()
  if (!paths.length) return
  api.getIcons(paths).then((res) => {
    for (const p of paths) cache.set(p, res[p] ?? null)
    listeners.forEach((l) => l())
  }).catch(() => { for (const p of paths) cache.set(p, null); listeners.forEach((l) => l()) })
}

/** Shows the real program icon for `file` when available, otherwise `fallback`. */
export function IconTile({ file, fallback, className, dim }: { file?: string; fallback: ReactNode; className?: string; dim?: boolean }) {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    if (file && !cache.has(file) && !waiting.has(file)) {
      waiting.add(file)
      window.clearTimeout(timer)
      timer = window.setTimeout(flush, 60)
    }
    return () => { listeners.delete(l) }
  }, [file])
  const src = file ? cache.get(file) : null
  return (
    <span className={cx('flex shrink-0 items-center justify-center overflow-hidden transition-opacity', dim && 'opacity-40', className)}>
      {src ? <img src={src} alt="" width={24} height={24} className="h-6 w-6 object-contain" draggable={false} /> : fallback}
    </span>
  )
}
