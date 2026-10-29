import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { LucideIcon } from 'lucide-react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button, type Variant } from './Button'
import { Tooltip } from './Tooltip'

export interface MenuItem { label: string; icon: LucideIcon; onClick: () => void; hint?: string; disabled?: boolean }

/** Split button: primary action + chevron that opens a menu of alternatives. */
export function SplitButton({ label, icon, variant = 'filled', onMain, items, menuLabel, disabled, compact, tip, shortcut }: {
  label: string; icon: LucideIcon; variant?: Variant; onMain: () => void; items: MenuItem[]; menuLabel: string; disabled?: boolean; compact?: boolean; tip?: ReactNode; shortcut?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ right: number; top: number } | null>(null)

  useEffect(() => {
    if (!pos) return
    const away = (e: PointerEvent) => { if (!pop.current?.contains(e.target as Node) && !ref.current?.contains(e.target as Node)) setPos(null) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setPos(null) } }
    document.addEventListener('pointerdown', away); window.addEventListener('keydown', key, true); window.addEventListener('blur', () => setPos(null))
    return () => { document.removeEventListener('pointerdown', away); window.removeEventListener('keydown', key, true) }
  }, [pos])

  const toggle = () => { const r = ref.current!.getBoundingClientRect(); setPos(pos ? null : { right: window.innerWidth - r.right, top: r.bottom + 6 }) }
  return (
    <>
      <div ref={ref} className="inline-flex gap-0.5">
        <Button variant={variant} icon={icon} onClick={onMain} disabled={disabled} tip={tip} shortcut={shortcut} className={cn('!rounded-r-md', compact && '!w-11 !px-0')} style={{ borderTopRightRadius: 6, borderBottomRightRadius: 6 }}>{compact ? undefined : label}</Button>
        <Tooltip label={menuLabel}>
          <Button variant={variant} aria-label={menuLabel} aria-haspopup="menu" aria-expanded={!!pos} onClick={toggle} disabled={disabled} className="!w-9 !px-0" style={{ borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }} trailing={ChevronDown} />
        </Tooltip>
      </div>
      {pos && createPortal(
        <div ref={pop} role="menu" className="anim-pop fixed z-[300] min-w-[13rem] rounded-2xl border border-outline-variant bg-surface-container-high p-1.5 elev-3" style={{ right: pos.right, top: pos.top, transformOrigin: 'top right' }}>
          {items.map((it) => (
            <button key={it.label} type="button" role="menuitem" disabled={it.disabled} onClick={() => { setPos(null); it.onClick() }}
              className="sl morph sq flex w-full items-center gap-3 px-3 py-2.5 text-left text-[0.85rem] font-medium" style={{ borderRadius: 14 }}>
              <it.icon size={18} className="text-primary" /><span className="flex-1">{it.label}</span>{it.hint && <span className="text-[0.72rem] text-on-surface-variant">{it.hint}</span>}
            </button>
          ))}
        </div>, document.body)}
    </>
  )
}
