import type { ReactNode } from 'react';
import { Icon } from './ui';
import type { IconName } from './icons';

export interface NavItem<T extends string = string> {
  id: T;
  icon: IconName;
  label: string;
  /** small count / badge on the right */
  badge?: string;
}

function Item<T extends string>({ it, on, onClick }: { it: NavItem<T>; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick} title={it.label} aria-current={on ? 'page' : undefined}
      className={`group relative h-10 mx-1 rounded flex items-center gap-3 px-3 max-[900px]:justify-center max-[900px]:px-0 text-body transition-colors duration-150 ease-fluent focus-ring active:bg-subtle-press ${on ? 'bg-subtle text-fg' : 'text-fg hover:bg-subtle'}`}
    >
      {/* selection indicator */}
      <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full bg-accent transition-all duration-200 ease-fluent ${on ? 'h-4 opacity-100' : 'h-0 opacity-0'}`} />
      <Icon name={it.icon} size={18} fill={on} className={`transition-transform duration-150 group-active:scale-90 ${on ? 'text-accent-text' : ''}`} />
      <span className="truncate flex-1 text-left max-[900px]:hidden">{it.label}</span>
      {it.badge && <span className="text-caption text-fg-3 max-[900px]:hidden">{it.badge}</span>}
    </button>
  );
}

/**
 * WinUI NavigationView: a pane on the left (collapses to icons below 900px) over the window material,
 * and the content in a rounded "layer" that carries the material through.
 */
export function NavView<T extends string>({
  items, footer, selected, onSelect, onFooter, footerSelected, children,
}: {
  items: NavItem<T>[]; footer?: NavItem<string>[]; selected: T | null; onSelect: (id: T) => void;
  onFooter?: (id: string) => void; footerSelected?: string; children: ReactNode;
}) {
  return (
    <div className="flex-1 min-h-0 flex">
      <nav className="shrink-0 w-[240px] max-[900px]:w-[52px] flex flex-col gap-0.5 pt-1 pb-2 overflow-y-auto transition-[width] duration-300 ease-fluent">
        {items.map((it) => <Item key={it.id} it={it} on={it.id === selected} onClick={() => onSelect(it.id)} />)}
        <div className="flex-1" />
        {footer?.map((it) => <Item key={it.id} it={it} on={it.id === footerSelected} onClick={() => onFooter?.(it.id)} />)}
      </nav>
      <section className="flex-1 min-w-0 rounded-tl-lg bg-layer border-t border-l border-stroke-card overflow-hidden">{children}</section>
    </div>
  );
}
