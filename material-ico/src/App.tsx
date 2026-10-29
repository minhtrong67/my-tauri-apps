import { useEffect, useRef, useState } from 'react';
import { FolderCog, Settings as Cog, Wand2, type LucideIcon } from 'lucide-react';
import Maker from './pages/Maker';
import Folders from './pages/Folders';
import Settings from './pages/Settings';
import { ScrollTop } from './components/ScrollTop';
import { useSettings } from './lib/store';
import { useFolders } from './lib/folders';
import { trackWindowSize } from './lib/windowState';
import type { Key } from './lib/i18n';

type Page = 'maker' | 'folders' | 'settings';
const NAV: { id: Page; icon: LucideIcon; label: Key }[] = [
  { id: 'maker', icon: Wand2, label: 'nav.maker' },
  { id: 'folders', icon: FolderCog, label: 'nav.folders' },
  { id: 'settings', icon: Cog, label: 'nav.settings' },
];

export default function App() {
  const { t, s } = useSettings();
  const [page, setPage] = useState<Page>('maker');
  const scroller = useRef<HTMLDivElement>(null);
  const folders = useFolders();
  const mode = useRef(s.windowMode);
  mode.current = s.windowMode;

  useEffect(() => trackWindowSize(() => mode.current), []);
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }); }, [page]);

  const view = (id: Page) => (page === id ? 'anim-page' : '');
  return (
    <div className="flex h-full bg-surface max-[720px]:flex-col-reverse">
      <nav className="flex w-[92px] shrink-0 flex-col items-center gap-3 py-5 max-[720px]:w-full max-[720px]:flex-row max-[720px]:justify-around max-[720px]:gap-0 max-[720px]:bg-sc max-[720px]:px-2 max-[720px]:py-2" aria-label="Main">
        <img src="./icon.png" alt="" draggable={false} className="mb-4 size-12 drop-shadow-md max-[720px]:hidden" />
        {NAV.map(({ id, icon: Icon, label }) => {
          const on = page === id;
          return (
            <button
              key={id} type="button" onClick={() => setPage(id)} aria-current={on ? 'page' : undefined}
              className={`group flex flex-col items-center gap-1 rounded-2xl px-2 py-1 ${id === 'settings' ? 'mt-auto max-[720px]:mt-0' : ''}`}
            >
              <span className={`ripple flex h-8 items-center justify-center rounded-full transition-[width,background-color,color] duration-400 ease-spring ${on ? 'w-16 bg-secondary-container text-on-secondary-container' : 'w-12 text-on-surface-variant group-hover:bg-on-surface/10'}`}>
                <Icon size={22} strokeWidth={on ? 2.4 : 2} className={`transition-transform duration-300 ease-spring ${on ? 'scale-110' : ''} ${id === 'settings' && on ? 'rotate-90' : ''}`} />
              </span>
              <span className={`text-xs font-medium ${on ? 'text-on-surface' : 'text-on-surface-variant'}`}>{t(label)}</span>
            </button>
          );
        })}
      </nav>
      <main className="relative min-h-0 min-w-0 flex-1 p-3 pl-0 max-[720px]:p-2 max-[720px]:pb-0">
        <div ref={scroller} className="h-full overflow-y-auto overflow-x-hidden rounded-[28px] bg-panel">
          <div hidden={page !== 'maker'} className={view('maker')}><Maker active={page === 'maker'} onApplied={folders.add} /></div>
          <div hidden={page !== 'folders'} className={view('folders')}><Folders list={folders.list} onAdd={folders.add} onRemove={folders.remove} /></div>
          <div hidden={page !== 'settings'} className={view('settings')}><Settings /></div>
        </div>
        <ScrollTop target={scroller} />
      </main>
    </div>
  );
}
