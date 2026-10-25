import { ArrowUp } from 'lucide-react';
import { useStore } from '../lib/store';
import { useT, wmoKey } from '../lib/i18n';
import { deg } from '../lib/format';
import { WxIcon } from './WxIcon';
import { cn } from './ui/cn';

/** Compact weather pill that slides in once the hero has scrolled out of view; click to jump back to the top. */
export function MiniBar({ show, onTop }: { show: boolean; onTop: () => void }) {
  const m = useStore((s) => s.model);
  const t = useT();
  if (!m) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[4.25rem] z-30 flex justify-center">
    <button
      onClick={onTop}
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      aria-label={t('action.top')}
      className={cn('ripple press-morph group flex h-12 items-center gap-2.5 rounded-full bg-inverse-surface py-1 pl-2 pr-4 text-inverse-on-surface shadow-e3 hover:rounded-2xl active:scale-95', show ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-6 opacity-0')}
      style={{ transition: 'transform .55s var(--ease-spring), opacity .25s, border-radius .45s var(--ease-spring)' }}
    >
      <WxIcon code={m.now.code} isDay={m.now.isDay} size={34} />
      <span className="text-xl font-semibold tabular-nums">{deg(m.now.temp)}</span>
      <span className="max-w-40 truncate text-sm opacity-80 max-sm:hidden">{m.place.name} · {t(wmoKey(m.now.code))}</span>
      <ArrowUp size={17} className="transition-transform duration-300 group-hover:-translate-y-0.5" />
    </button>
    </div>
  );
}
