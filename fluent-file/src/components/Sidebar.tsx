import { FolderIcon } from './FolderIcon';
import { memo, useMemo, useRef, useState } from 'react';
import { ChevronRight, HardDrive, Home, Monitor, Trash2 } from '../lib/icons';
import { useExplorer, navigate, toggleTree, openRecycle, setActivePane } from '../store/explorer';
import { useSettings } from '../store/settings';
import { showMenu } from '../store/ui';
import { useT } from '../lib/i18n';
import { baseName, HOME, parentOf, pk, samePath } from '../lib/paths';
import type { Drive, PaneId } from '../lib/types';
import { PLACE_ICON, driveLabel } from './Pages';
import { sidebarMenuItems } from '../lib/menus';
import { moveQuick, quickItems } from '../lib/quick';
import type { LucideIcon } from '../lib/icons';

function NavItem({ icon: Icon, tint, label, path, active, onClick, drive, id, depth = 0, folder, trailing, qk, onQuickDown, dragging, qline }: { qk?: string; onQuickDown?: (e: React.PointerEvent) => void; dragging?: boolean; qline?: 'before' | 'after'; tint?: string; icon?: LucideIcon; label: string; path: string; active: boolean; onClick: () => void; drive?: Drive; id: PaneId; depth?: number; folder?: boolean; trailing?: React.ReactNode }) {
  return (
    <div data-qk={qk} className={`group/n relative flex items-center rounded-md transition-colors duration-100 ${dragging ? 'opacity-45' : ''} ${active ? 'bg-on-surface/6' : 'hover:bg-on-surface/5'}`} style={{ paddingLeft: depth * 12 }}>
      {qline && <span aria-hidden className={`pointer-events-none absolute right-1 left-1 z-10 h-0.5 rounded-full bg-primary ${qline === 'before' ? '-top-[3px]' : '-bottom-[3px]'}`} />}
      {active && <span aria-hidden className="absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-full bg-primary" />}
      {trailing}
      <button type="button" title={path || label} data-drop-path={path && path !== HOME ? path : undefined} onClick={onClick} onPointerDown={onQuickDown}
        onContextMenu={(e) => { e.preventDefault(); showMenu(sidebarMenuItems(id, path, drive), e.clientX, e.clientY); }}
        className="flex min-h-8 min-w-0 flex-1 items-center gap-3 rounded-[inherit] py-1 pr-3 pl-3 text-left">
        {folder || !Icon ? <FolderIcon path={path} size={20} /> : <Icon className={`size-[1.125rem] ${active && !tint ? 'text-primary' : ''}`} strokeWidth={1.6} style={tint ? { color: tint } : undefined} />}
        <span className="min-w-0 flex-1">
          <span className="block truncate">{label}</span>
          {drive && drive.total > 0 && (() => { const u = Math.round(((drive.total - drive.free) / drive.total) * 100); return <span className="mt-1 block h-1 overflow-hidden rounded-full bg-on-surface/15"><span className={`block h-full rounded-full transition-[width] duration-150 ease-emph ${u >= 90 ? 'bg-error' : 'bg-primary'}`} style={{ width: u + '%' }} /></span>; })()}
        </span>
      </button>
    </div>
  );
}

const Tree = memo(function Tree({ path, depth, cur, id }: { path: string; depth: number; cur: string | null; id: PaneId }) {
  const k = pk(path); const open = useExplorer((s) => s.treeOpen.has(k)); const kids = useExplorer((s) => s.treeCache[k]); const hidden = useSettings((s) => s.showHidden);
  const list = (kids || []).filter((n) => hidden || !n.hidden);
  return (
    <>
      {open && list.map((n) => <TreeRow key={n.path} path={n.path} name={n.name} depth={depth} cur={cur} id={id} />)}
    </>
  );
});
function TreeRow({ path, name, depth, cur, id, drive }: { path: string; name: string; depth: number; cur: string | null; id: PaneId; drive?: Drive }) {
  const t = useT();
  const k = pk(path); const open = useExplorer((s) => s.treeOpen.has(k)); const kids = useExplorer((s) => s.treeCache[k]);
  const hasKids = !kids || kids.length > 0;
  const chev = (
    <button type="button" tabIndex={-1} aria-label={open ? 'Collapse' : 'Expand'} aria-expanded={open} onClick={() => void toggleTree(path)} className={`ibtn sm !size-6 flex-none ${hasKids ? '' : 'invisible'}`}>
      <ChevronRight className={`!size-3.5 transition-transform duration-150 ease-fast ${open ? 'rotate-90' : ''}`} strokeWidth={1.75} />
    </button>
  );
  return (
    <>
      <NavItem id={id} path={path} depth={depth} label={drive ? driveLabel(drive, t) : name} icon={drive ? HardDrive : undefined} tint={drive && useSettings.getState().colorIcons ? 'var(--pc-drive)' : undefined} folder={!drive} drive={drive} active={!!cur && samePath(cur, path)} trailing={chev} onClick={() => { setActivePane(id); void navigate(id, path); }} />
      <Tree path={path} depth={depth + 1} cur={cur} id={id} />
    </>
  );
}

export function Sidebar() {
  const t = useT();
  const id = useExplorer((s) => s.activePane); const cur = useExplorer((s) => s.panes[s.activePane].path);
  const places = useExplorer((s) => s.places); const drives = useExplorer((s) => s.drives);
  const pinned = useSettings((s) => s.pinned); const unpinned = useSettings((s) => s.unpinned); const colorful = useSettings((s) => s.colorIcons); const order = useSettings((s) => s.quickOrder);
  const quick = useMemo(() => quickItems(places, pinned, unpinned, order), [places, pinned, unpinned, order]);
  const navRef = useRef<HTMLElement>(null); const suppress = useRef(false);
  const [drag, setDrag] = useState<{ key: string; slot: number } | null>(null);
  /* drag a Quick access item up or down to reorder it; the line shows where it will land (also: right-click > Move up / Move down) */
  const onQuickDown = (key: string) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const startY = e.clientY; let active = false; let slot = 0;
    const move = (ev: PointerEvent) => {
      if (!active && Math.abs(ev.clientY - startY) < 6) return;
      active = true;
      const els = [...(navRef.current?.querySelectorAll<HTMLElement>('[data-qk]') ?? [])];
      slot = els.filter((el) => { const r = el.getBoundingClientRect(); return ev.clientY > r.top + r.height / 2; }).length;
      setDrag({ key, slot });
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      setDrag(null);
      if (!active) return;
      suppress.current = true; setTimeout(() => { suppress.current = false; }, 0);
      const from = quick.findIndex((q) => q.key === key);
      moveQuick(quick, key, from < slot ? slot - 1 : slot);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  };
  const qline = (i: number): 'before' | 'after' | undefined => (drag ? (drag.slot === i ? 'before' : drag.slot === quick.length && i === quick.length - 1 ? 'after' : undefined) : undefined);
  const tc = (k: string) => (colorful ? `var(--pc-${k})` : undefined);
  const go = (p: string) => () => void navigate(id, p);
  const Sec = ({ children }: { children: string }) => <div className="px-3 pt-3 pb-1 text-xs font-semibold text-on-surface-variant">{children}</div>;
  return (
    <nav ref={navRef} aria-label={t('sidebar.aria')} className="flex h-full w-full flex-none flex-col gap-0.5 overflow-y-auto bg-surface-container px-2 pt-1 pb-3 ">
      <NavItem id={id} icon={Home} tint={tc('home')} label={t('place.home')} path={HOME} active={cur === HOME} onClick={go(HOME)} />
      <Sec>{t('sidebar.quick')}</Sec>
      {quick.map((q, i) => q.placeId
        ? <NavItem key={q.key} qk={q.key} onQuickDown={onQuickDown(q.key)} dragging={drag?.key === q.key} qline={qline(i)} id={id} icon={PLACE_ICON[q.placeId]} tint={tc(q.placeId)} label={t('place.' + q.placeId)} path={q.path} active={!!cur && samePath(cur, q.path)} onClick={() => { if (!suppress.current) go(q.path)(); }} />
        : <NavItem key={q.key} qk={q.key} onQuickDown={onQuickDown(q.key)} dragging={drag?.key === q.key} qline={qline(i)} id={id} folder label={baseName(q.path)} path={q.path} active={!!cur && samePath(cur, q.path)} onClick={() => { if (!suppress.current) go(q.path)(); }} />)}
      <Sec>{t('sidebar.thispc')}</Sec>
      <NavItem id={id} icon={Monitor} tint={tc('thispc')} label={t('place.thispc')} path="" active={cur === ''} onClick={go('')} />
      {drives.map((d) => <TreeRow key={d.path} path={d.path} name={d.name} drive={d} depth={0} cur={cur} id={id} />)}
      <div className="mt-2 border-t border-outline-variant/50 pt-2">
        <NavItem id={id} icon={Trash2} tint={tc('recycle')} label={t('place.recycle')} path="shell:RecycleBinFolder" active={false} onClick={() => void openRecycle()} />
      </div>
      <span hidden>{parentOf('')}</span>
    </nav>
  );
}
