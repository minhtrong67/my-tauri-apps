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
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface-container">
      <TabsBar id={id} />
      <div className={`pane-surface flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-surface transition-colors duration-150 ${dual && active ? 'border-primary' : 'border-outline-variant'}`}>
        <NavBar id={id} />
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div key={String(path)} className="h-full animate-[nav-in_.3s_var(--ease-fast)]" style={{ ['--nx' as string]: navDir * 20 + 'px' }}>
            {path === HOME ? <HomePage id={id} /> : path === '' ? <ThisPcPage id={id} /> : <FileList id={id} />}
          </div>
        </div>
        <StatusBar id={id} />
      </div>
    </section>
  );
}
