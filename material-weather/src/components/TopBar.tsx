import { forwardRef } from 'react';
import { Menu, Pin, RefreshCw, Settings } from 'lucide-react';
import { useStore } from '../lib/store';
import { useT } from '../lib/i18n';
import { changeSetting, reload } from '../lib/actions';
import { useUI } from '../lib/ui';
import { IconBtn } from './ui/Button';
import { SearchBar, type SearchHandle } from './SearchBar';
import { cn } from './ui/cn';

export const TopBar = forwardRef<SearchHandle>(function TopBar(_, ref) {
  const t = useT();
  const loading = useStore((s) => s.loading);
  const onTop = useStore((s) => s.settings.alwaysOnTop);
  const set = useUI((s) => s.set);
  return (
    <header className="flex shrink-0 items-center gap-3 px-6 pb-2 pt-3 max-[960px]:px-4">
      <IconBtn label={t('nav.menu')} icon={Menu} className="min-[961px]:hidden" onClick={() => set({ navOpen: true })} />
      <SearchBar ref={ref} />
      <div className="ml-auto flex gap-1">
        <IconBtn label={t('action.pin')} icon={Pin} active={onTop} className={cn(onTop && '[&_svg]:-rotate-[35deg]', '[&_svg]:transition-transform')} onClick={() => void changeSetting({ alwaysOnTop: !onTop })} />
        <IconBtn label={t('action.refresh')} icon={RefreshCw} disabled={loading} className={cn(loading && '[&_svg]:animate-[spin_0.9s_linear_infinite]')} onClick={() => void reload(true)} />
        <IconBtn label={t('action.settings')} icon={Settings} className="[&_svg]:transition-transform [&_svg]:duration-500 hover:[&_svg]:rotate-[60deg]" onClick={() => set({ settings: true })} />
      </div>
    </header>
  );
});
