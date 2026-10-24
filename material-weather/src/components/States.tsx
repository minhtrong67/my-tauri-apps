import { CloudOff, LocateFixed, RefreshCw } from 'lucide-react';
import { useT } from '../lib/i18n';
import { reload, startLocate } from '../lib/actions';
import { Btn } from './ui/Button';

export const Skeletons = () => (
  <div className="flex flex-col gap-4" aria-busy="true">
    <div className="skeleton h-[17rem] animate-[pop_0.5s_var(--ease-emphasized)_both] rounded-[28px]" />
    <div className="skeleton h-28 rounded-[28px]" />
    <div className="skeleton h-52 rounded-[28px]" />
    <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-[7.5rem] rounded-[28px]" style={{ animationDelay: `${i * 80}ms` }} />)}</div>
  </div>
);
export function ErrorState() {
  const t = useT();
  return (
    <div className="flex animate-rise flex-col items-center gap-2.5 px-4 py-20 text-center text-on-surface-variant">
      <CloudOff size={56} />
      <h2 className="text-[1.4rem] font-medium text-on-surface">{t('status.error')}</h2>
      <p>{t('status.errorHint')}</p>
      <Btn icon={RefreshCw} className="mt-3" onClick={() => void reload()}>{t('action.retry')}</Btn>
    </div>
  );
}
export function EmptyState() {
  const t = useT();
  return (
    <div className="flex animate-rise flex-col items-center gap-2.5 px-4 py-20 text-center text-on-surface-variant">
      <img src="/logo.svg" width={96} height={96} alt="" className="animate-[float_4s_ease-in-out_infinite]" />
      <h2 className="text-[1.4rem] font-medium text-on-surface">{t('empty.title')}</h2>
      <p>{t('empty.hint')}</p>
      <Btn variant="tonal" icon={LocateFixed} className="mt-3" onClick={() => void startLocate()}>{t('nav.detect')}</Btn>
    </div>
  );
}
