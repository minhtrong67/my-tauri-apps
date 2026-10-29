import { useEffect, useState, type RefObject } from 'react'
import { ArrowUp } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Tooltip } from './Tooltip'

/** Floating "scroll to top" button for a scrollable container (shown after 240px). */
export function ScrollTop({ target, label, className }: { target: RefObject<HTMLElement | null>; label: string; className?: string }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const el = target.current
    if (!el) return
    const f = () => setShow(el.scrollTop > 240)
    f(); el.addEventListener('scroll', f, { passive: true })
    return () => el.removeEventListener('scroll', f)
  })
  return (
    <div className={cn('pointer-events-none absolute bottom-4 right-4 z-10 transition-all duration-300 ease-[var(--ease-spring)]', show ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-75 opacity-0', className)}>
      <Tooltip label={label} side="left">
        <button type="button" tabIndex={show ? 0 : -1} aria-label={label} onClick={() => target.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="sl morph pointer-events-auto flex h-12 w-12 items-center justify-center bg-primary-container text-on-primary-container elev-3" style={{ borderRadius: 16 }}>
          <ArrowUp size={22} strokeWidth={2.4} />
        </button>
      </Tooltip>
    </div>
  )
}
