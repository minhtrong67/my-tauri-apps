import { useExplorer, setActivePane } from '../store/explorer';
import { useSettings } from '../store/settings';
import { HOME } from '../lib/paths';
import type { PaneId } from '../lib/types';
import { FileList } from './FileList';
import { HomePage, ThisPcPage } from './Pages';
import { NavBar, StatusBar, TabsBar } from './PaneChrome';

export function FilePane({ id }: { id: PaneId }) {
  const path = useExplorer((s) => s.panes[id].path);
  const active = useExplorer((s) => s.activePane === id);
  const dual = useSettings((s) => s.dualPane);
  const navDir = useExplorer((s) => s.panes[id].navDir);
  return (
    <section data-pane={id} onPointerDownCapture={() => setActivePane(id)} aria-label={`Pane ${id}`}
      className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface-container transition-[box-shadow,border-radius] duration-500 ${dual ? 'rounded-3xl' : ''} ${dual && active ? 'ring-2 ring-primary/70' : dual ? 'ring-1 ring-outline-variant/60' : ''}`}>
      <TabsBar id={id} />
      <NavBar id={id} />
      <div className="relative mx-2 min-h-0 flex-1 overflow-hidden rounded-[1.75rem] bg-surface">
        <div key={String(path)} className="h-full animate-[nav-in_.42s_var(--ease-emph)]" style={{ ['--nx' as string]: navDir * 28 + 'px' }}>
          {path === HOME ? <HomePage id={id} /> : path === '' ? <ThisPcPage id={id} /> : <FileList id={id} />}
        </div>
      </div>
      <StatusBar id={id} />
    </section>
  );
}
