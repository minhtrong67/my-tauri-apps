import { memo } from 'react';
import { ChevronRight, Folder, HardDrive, Home, Monitor, Pin, Trash2 } from 'lucide-react';
import { useExplorer, navigate, toggleTree, openRecycle, setActivePane } from '../store/explorer';
import { useSettings } from '../store/settings';
import { showMenu } from '../store/ui';
import { useT } from '../lib/i18n';
import { baseName, HOME, parentOf, pk, samePath } from '../lib/paths';
import type { Drive, PaneId } from '../lib/types';
import { PLACE_ICON, driveLabel } from './Pages';
import { sidebarMenuItems } from '../lib/menus';
import type { LucideIcon } from 'lucide-react';

function NavItem({ icon: Icon, label, path, active, onClick, drive, id, depth = 0, folder, trailing }: { icon?: LucideIcon; label: string; path: string; active: boolean; onClick: () => void; drive?: Drive; id: PaneId; depth?: number; folder?: boolean; trailing?: React.ReactNode }) {
  return (
    <div className={`group/n flex items-center rounded-[1.125rem] transition-[background-color,border-radius] duration-300 ease-emph hover:rounded-xl ${active ? 'bg-secondary-container text-on-secondary-container font-semibold' : 'hover:bg-on-surface/8'}`} style={{ paddingLeft: depth * 12 }}>
      {trailing}
      <button type="button" title={path || label} data-drop-path={path && path !== HOME ? path : undefined} onClick={onClick}
        onContextMenu={(e) => { e.preventDefault(); showMenu(sidebarMenuItems(id, path, drive), e.clientX, e.clientY); }}
        className="ripple flex min-h-9 min-w-0 flex-1 items-center gap-3 rounded-[inherit] py-1 pr-3 pl-3 text-left">
        {folder || !Icon ? <Folder className="size-5" style={{ color: 'var(--folder)', fill: 'color-mix(in oklab, var(--folder) 80%, transparent)' }} /> : <Icon className={`size-5 ${active ? '' : 'text-on-surface-variant'}`} />}
        <span className="min-w-0 flex-1">
          <span className="block truncate">{label}</span>
          {drive && drive.total > 0 && (() => { const u = Math.round(((drive.total - drive.free) / drive.total) * 100); return <span className="mt-1 block h-1 overflow-hidden rounded-full bg-on-surface/12"><span className={`block h-full rounded-full transition-[width] duration-700 ease-emph ${u >= 90 ? 'bg-error' : 'bg-primary'}`} style={{ width: u + '%' }} /></span>; })()}
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
    <button type="button" tabIndex={-1} aria-label={open ? 'Collapse' : 'Expand'} aria-expanded={open} onClick={() => void toggleTree(path)} className={`ibtn sm !size-7 flex-none ${hasKids ? '' : 'invisible'}`}>
      <ChevronRight className={`!size-4 transition-transform duration-300 ease-spring ${open ? 'rotate-90' : ''}`} />
    </button>
  );
  return (
    <>
      <NavItem id={id} path={path} depth={depth} label={drive ? driveLabel(drive, t) : name} icon={drive ? HardDrive : undefined} folder={!drive} drive={drive} active={!!cur && samePath(cur, path)} trailing={chev} onClick={() => { setActivePane(id); void navigate(id, path); }} />
      <Tree path={path} depth={depth + 1} cur={cur} id={id} />
    </>
  );
}

export function Sidebar() {
  const t = useT();
  const id = useExplorer((s) => s.activePane); const cur = useExplorer((s) => s.panes[s.activePane].path);
  const places = useExplorer((s) => s.places); const drives = useExplorer((s) => s.drives);
  const pinned = useSettings((s) => s.pinned);
  const go = (p: string) => () => void navigate(id, p);
  const Sec = ({ children }: { children: string }) => <div className="px-4 pt-3 pb-1 text-xs font-bold tracking-wider text-primary uppercase">{children}</div>;
  return (
    <nav aria-label={t('sidebar.aria')} className="flex w-60 flex-none flex-col gap-0.5 overflow-y-auto bg-surface-container px-2 pt-1 pb-3 max-[860px]:w-52 anim-slide">
      <NavItem id={id} icon={Home} label={t('place.home')} path={HOME} active={cur === HOME} onClick={go(HOME)} />
      <Sec>{t('sidebar.quick')}</Sec>
      {places.filter((p) => p.id !== 'home').map((p) => <NavItem key={p.id} id={id} icon={PLACE_ICON[p.id]} label={t('place.' + p.id)} path={p.path} active={!!cur && samePath(cur, p.path)} onClick={go(p.path)} />)}
      {pinned.map((p) => <NavItem key={p} id={id} icon={Pin} label={baseName(p)} path={p} active={!!cur && samePath(cur, p)} onClick={go(p)} />)}
      <Sec>{t('sidebar.thispc')}</Sec>
      <NavItem id={id} icon={Monitor} label={t('place.thispc')} path="" active={cur === ''} onClick={go('')} />
      {drives.map((d) => <TreeRow key={d.path} path={d.path} name={d.name} drive={d} depth={0} cur={cur} id={id} />)}
      <div className="mt-2 border-t border-outline-variant/50 pt-2">
        <NavItem id={id} icon={Trash2} label={t('place.recycle')} path="shell:RecycleBinFolder" active={false} onClick={() => void openRecycle()} />
      </div>
      <span hidden>{parentOf('')}</span>
    </nav>
  );
}
