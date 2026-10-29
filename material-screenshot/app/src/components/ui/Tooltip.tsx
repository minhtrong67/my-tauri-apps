import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props { label?: ReactNode; shortcut?: string; side?: 'top' | 'bottom' | 'left' | 'right'; children: ReactNode; className?: string }

/** Custom tooltip: spring animation, themed, shows the keyboard shortcut. */
export function Tooltip({ label, shortcut, side = 'bottom', children, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [pos, setPos] = useState<{ x: number; y: number; side: string } | null>(null)

  const hide = useCallback(() => { clearTimeout(timer.current); setPos(null) }, [])
  const show = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const el = ref.current?.firstElementChild ?? ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      let s = side
      if (s === 'bottom' && r.bottom + 56 > window.innerHeight) s = 'top'
      if (s === 'top' && r.top < 56) s = 'bottom'
      const x = s === 'left' ? r.left - 8 : s === 'right' ? r.right + 8 : r.left + r.width / 2
      const y = s === 'top' ? r.top - 8 : s === 'bottom' ? r.bottom + 8 : r.top + r.height / 2
      setPos({ x, y, side: s })
    }, 380)
  }, [side])

  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => {
    if (!pos) return
    window.addEventListener('scroll', hide, true)
    window.addEventListener('blur', hide)
    return () => { window.removeEventListener('scroll', hide, true); window.removeEventListener('blur', hide) }
  }, [pos, hide])

  if (!label) return <>{children}</>
  const tr = pos?.side === 'top' ? 'translate(-50%,-100%)' : pos?.side === 'bottom' ? 'translate(-50%,0)' : pos?.side === 'left' ? 'translate(-100%,-50%)' : 'translate(0,-50%)'
  return (
    <span ref={ref} className={className ?? 'inline-flex'} onMouseEnter={show} onMouseLeave={hide} onMouseDown={hide} onFocus={show} onBlur={hide}>
      {children}
      {pos && createPortal(
        <div role="tooltip" className="pointer-events-none fixed z-[200]" style={{ left: pos.x, top: pos.y, transform: tr }}>
          <div className="anim-pop flex items-center gap-2 rounded-lg bg-inverse-surface px-2.5 py-1.5 text-[0.75rem] font-medium leading-none text-inverse-on-surface shadow-lg" style={{ transformOrigin: pos.side === 'top' ? 'bottom center' : 'top center' }}>
            <span>{label}</span>
            {shortcut && <span className="rounded bg-white/15 px-1.5 py-0.5 text-[0.68rem] font-semibold">{shortcut}</span>}
          </div>
        </div>, document.body)}
    </span>
  )
}
