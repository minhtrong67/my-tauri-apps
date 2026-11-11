import { Icon } from './ui';
import type { IconName } from './icons';
import { useT } from '../lib/useT';
import type { ViewMode } from '../lib/types';

/** List / grid switch (two toggle buttons with a sliding selection) */
export function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (m: ViewMode) => void }) {
  const t = useT();
  const opts: { m: ViewMode; icon: IconName; label: string }[] = [
    { m: 'list', icon: 'view_list', label: t('viewList') },
    { m: 'grid', icon: 'grid_view', label: t('viewGrid') },
  ];
  return (
    <div className="relative inline-flex h-8 rounded bg-control border border-stroke p-0.5 shrink-0" role="group">
      <span
        className="absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-[3px] bg-subtle transition-transform duration-200 ease-fluent"
        style={{ transform: `translateX(${value === 'list' ? 0 : 100}%)` }}
      />
      {opts.map((o) => (
        <button
          key={o.m} type="button" title={o.label} aria-label={o.label} aria-pressed={value === o.m} onClick={() => onChange(o.m)}
          className={`relative w-9 inline-flex items-center justify-center rounded-[3px] transition-colors duration-150 focus-ring ${value === o.m ? 'text-fg' : 'text-fg-2 hover:bg-subtle'}`}
        >
          <Icon name={o.icon} size={16} fill={value === o.m} />
        </button>
      ))}
    </div>
  );
}
