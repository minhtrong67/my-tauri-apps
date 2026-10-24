import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronRight } from 'lucide-react';
import { closeMenu, useUI, type MenuItem } from '../../store/ui';

function MenuList({ items, onClose, depth = 0 }: { items: MenuItem[]; onClose: () => void; depth?: number }) {
  const [open, setOpen] = useState<{ i: number; rect: DOMRect } | null>(null);
  return (
    <div role="menu" className="min-w-[13.5rem] max-w-[22rem] rounded-2xl bg-surface-container-high p-1.5 shadow-[var(--shadow-3)] ring-1 ring-outline-variant/50" style={{ maxHeight: 'calc(100vh - 16px)', overflowY: 'auto' }}>
      {items.map((it, i) => {
        if (it.sep) return <div key={i} className="mx-2 my-1 h-px bg-outline-variant/70" />;
        const Icon = it.icon;
        return (
          <button key={i} type="button" role="menuitem" disabled={it.disabled}
            onMouseEnter={(e) => { if (it.items) setOpen({ i, rect: e.currentTarget.getBoundingClientRect() }); else setOpen(null); }}
            onClick={(e) => { if (it.items) { setOpen({ i, rect: e.currentTarget.getBoundingClientRect() }); return; } onClose(); it.run?.(); }}
            className={`ripple flex h-9 w-full items-center gap-3 rounded-xl px-3 text-left transition-[border-radius,background-color] duration-300 hover:rounded-lg disabled:opacity-40 ${it.danger ? 'text-error' : ''} ${open?.i === i ? 'bg-on-surface/10' : ''}`}>
            <span className="grid size-5 flex-none place-items-center text-on-surface-variant">
              {it.check ? <Check className="size-[1.125rem] text-primary" strokeWidth={2.6} /> : it.swatch ? <span className="tag-dot !size-3.5" style={{ background: it.swatch }} /> : Icon ? <Icon className={`size-[1.125rem] ${it.danger ? 'text-error' : ''}`} /> : null}
            </span>
            <span className="min-w-0 flex-1 truncate">{it.label}</span>
            {it.kbd && <kbd className="ml-4">{it.kbd}</kbd>}
            {it.items && <ChevronRight className="size-4 text-on-surface-variant" />}
          </button>
        );
      })}
      {open && items[open.i]?.items && <SubMenu items={items[open.i].items!} rect={open.rect} onClose={onClose} depth={depth + 1} />}
    </div>
  );
}
function SubMenu({ items, rect, onClose, depth }: { items: MenuItem[]; rect: DOMRect; onClose: () => void; depth: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [p, setP] = useState({ x: rect.right - 6, y: rect.top - 6 });
  useLayoutEffect(() => {
    const r = ref.current?.getBoundingClientRect(); if (!r) return;
    let x = rect.right - 6; if (x + r.width > innerWidth - 8) x = Math.max(8, rect.left - r.width + 6);
    setP({ x, y: Math.max(8, Math.min(rect.top - 6, innerHeight - r.height - 8)) });
  }, [rect]);
  return <div ref={ref} className="anim-menu fixed" style={{ left: p.x, top: p.y, zIndex: 250 + depth }}><MenuList items={items} onClose={onClose} depth={depth} /></div>;
}

export function ContextMenu() {
  const menu = useUI((s) => s.menu);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useLayoutEffect(() => {
    if (!menu) return;
    const r = ref.current?.getBoundingClientRect(); const w = r?.width ?? 220; const h = r?.height ?? 300;
    setPos({ x: Math.max(8, Math.min(menu.x, innerWidth - w - 8)), y: Math.max(8, Math.min(menu.y, innerHeight - h - 8)) });
  }, [menu]);
  useEffect(() => {
    if (!menu) return;
    const down = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest('[data-ctxmenu]')) closeMenu(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); closeMenu(); } };
    document.addEventListener('pointerdown', down, true); document.addEventListener('keydown', key, true);
    window.addEventListener('blur', closeMenu); window.addEventListener('resize', closeMenu);
    return () => { document.removeEventListener('pointerdown', down, true); document.removeEventListener('keydown', key, true); window.removeEventListener('blur', closeMenu); window.removeEventListener('resize', closeMenu); };
  }, [menu]);
  if (!menu) return null;
  return createPortal(<div ref={ref} data-ctxmenu className="anim-menu fixed z-[250]" style={{ left: pos.x, top: pos.y }} onContextMenu={(e) => e.preventDefault()}><MenuList items={menu.items} onClose={closeMenu} /></div>, document.body);
}
