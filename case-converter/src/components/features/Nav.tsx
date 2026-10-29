import { CaseSensitive, ListChecks, Wrench, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TFn } from '@/lib/i18n';

export type Tab = 'convert' | 'all' | 'tools';
const ITEMS: { id: Tab; icon: LucideIcon; key: 'tConvert' | 'tAll' | 'tTools' }[] = [
  { id: 'convert', icon: CaseSensitive, key: 'tConvert' },
  { id: 'all', icon: ListChecks, key: 'tAll' },
  { id: 'tools', icon: Wrench, key: 'tTools' },
];

/** Navigation rail on wide windows, navigation bar at the bottom on narrow ones. */
export function Nav({ tab, onTab, t }: { tab: Tab; onTab: (t: Tab) => void; t: TFn }) {
  return (
    <nav
      aria-label={t('navLabel')}
      className="flex h-20 shrink-0 items-center justify-around bg-surface-container md:h-auto md:w-24 md:flex-col md:justify-start md:gap-3 md:bg-transparent md:pt-3"
    >
      {ITEMS.map(({ id, icon: Icon, key }, i) => {
        const on = tab === id;
        return (
          <button
            key={id} type="button" aria-current={on ? 'page' : undefined} onClick={() => onTab(id)}
            data-tip={t(key)} data-tip-kbd={`Alt+${i + 1}`}
            className="group flex flex-1 flex-col items-center gap-1 outline-none md:flex-none md:w-full"
          >
            <span className="rip relative grid h-8 w-16 place-items-center overflow-hidden rounded-full group-focus-visible:outline-3 group-focus-visible:outline-primary/70">
              <span
                className={cn(
                  'absolute inset-0 rounded-full bg-secondary-container transition-[transform,opacity] duration-500 ease-bounce',
                  on ? 'scale-100 opacity-100' : 'scale-x-50 scale-y-75 opacity-0 group-hover:scale-100 group-hover:bg-on-surface/8 group-hover:opacity-100',
                )}
              />
              <Icon className={cn('relative size-6 transition-colors duration-300', on ? 'text-on-secondary-container' : 'text-on-surface-variant')} strokeWidth={on ? 2.4 : 2} aria-hidden />
            </span>
            <span className={cn('text-xs transition-colors', on ? 'font-semibold text-on-surface' : 'font-medium text-on-surface-variant')}>{t(key)}</span>
          </button>
        );
      })}
    </nav>
  );
}
