import type { ReactNode } from 'react';
import { Icon } from './ui';
import type { IconName } from './icons';
import { useStore } from '../lib/store';
import { useT } from '../lib/useT';

export interface NavItem<T extends string = string> {
  id: T;
  icon: IconName;
  label: string;
  /** small count / badge on the right */
  badge?: string;
}

function Item<T extends string>({ it, on, onClick, collapsed }: { it: NavItem<T>; on: boolean; onClick: () => void; collapsed: boolean }) {
  const hide = collapsed ? 'hidden' : 'max-[900px]:hidden';
  return (
    <button
      type="button" onClick={onClick} title={it.label} aria-label={it.label} aria-current={on ? 'page' : undefined}
      className={`group relative h-10 mx-1 rounded flex items-center gap-3 text-body transition-colors duration-150 ease-fluent focus-ring active:bg-subtle-press ${collapsed ? 'justify-center px-0' : 'px-3 max-[900px]:justify-center max-[900px]:px-0'} ${on ? 'bg-subtle text-fg' : 'text-fg hover:bg-subtle'}`}
    >
      {/* selection indicator */}
      <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full bg-accent transition-all duration-200 ease-fluent ${on ? 'h-4 opacity-100' : 'h-0 opacity-0'}`} />
      <Icon name={it.icon} size={18} fill={on} className={`transition-transform duration-150 group-active:scale-90 ${on ? 'text-accent-text' : ''}`} />
      <span className={`truncate flex-1 text-left ${hide}`}>{it.label}</span>
      {it.badge && <span className={`text-caption text-fg-3 ${hide}`}>{it.badge}</span>}
    </button>
  );
}

/**
 * WinUI NavigationView: a pane on the left that the user can collapse to an icon rail (hamburger button; remembered),
 * and the content in a rounded "layer" that carries the window material through. Below 900px it collapses by itself.
 */
export function NavView<T extends string>({
  items, footer, selected, onSelect, onFooter, footerSelected, children,
}: {
  items: NavItem<T>[]; footer?: NavItem<string>[]; selected: T | null; onSelect: (id: T) => void;
  onFooter?: (id: string) => void; footerSelected?: string; children: ReactNode;
}) {
  const t = useT();
  const collapsed = useStore((s) => s.settings.sidebarCollapsed);
  const toggle = () => useStore.getState().updateSettings({ sidebarCollapsed: !collapsed });
  const label = collapsed ? t('expandSidebar') : t('collapseSidebar');
  return (
    <div className="flex-1 min-h-0 flex">
      <nav className={`shrink-0 ${collapsed ? 'w-[52px]' : 'w-[240px] max-[900px]:w-[52px]'} flex flex-col gap-0.5 pt-1 pb-2 overflow-y-auto overflow-x-hidden transition-[width] duration-300 ease-fluent`}>
        <button
          type="button" onClick={toggle} title={label} aria-label={label} aria-expanded={!collapsed}
          className="h-10 w-10 mx-1 mb-1 rounded flex items-center justify-center text-fg hover:bg-subtle active:bg-subtle-press transition-colors duration-150 focus-ring shrink-0"
        >
          <Icon name="menu" size={18} />
        </button>
        {items.map((it) => <Item key={it.id} it={it} on={it.id === selected} collapsed={collapsed} onClick={() => onSelect(it.id)} />)}
        <div className="flex-1" />
        {footer?.map((it) => <Item key={it.id} it={it} on={it.id === footerSelected} collapsed={collapsed} onClick={() => onFooter?.(it.id)} />)}
      </nav>
      <section className="flex-1 min-w-0 rounded-tl-lg bg-layer border-t border-l border-stroke-card overflow-hidden">{children}</section>
    </div>
  );
}
