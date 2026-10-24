import { Icon } from './ui';
import { tr } from '../lib/i18n';
import type { ViewMode } from '../lib/types';

/** Nút chuyển chế độ hiển thị: danh sách / lưới */
export function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (m: ViewMode) => void }) {
  const opts: { m: ViewMode; icon: string; label: string }[] = [
    { m: 'list', icon: 'view_list', label: tr('viewList') },
    { m: 'grid', icon: 'grid_view', label: tr('viewGrid') },
  ];
  return (
    <div className="cbg cbg-icon" role="group" aria-label={tr('viewMode')}>
      {opts.map((o) => (
        <button key={o.m} type="button" title={o.label} aria-label={o.label} aria-pressed={value === o.m} onClick={() => onChange(o.m)} className="ripple cbg-item focus-ring">
          <Icon name={o.icon} size={20} fill={value === o.m} />
        </button>
      ))}
    </div>
  );
}
