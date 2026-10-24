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
  return (
    <section data-pane={id} onPointerDownCapture={() => setActivePane(id)} aria-label={`Pane ${id}`}
      className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface-container transition-[box-shadow,border-radius] duration-500 ${dual ? 'rounded-3xl' : ''} ${dual && active ? 'ring-2 ring-primary/70' : dual ? 'ring-1 ring-outline-variant/60' : ''}`}>
      <TabsBar id={id} />
      <NavBar id={id} />
      <div className="relative min-h-0 flex-1 rounded-t-2xl bg-surface" data-drop-path={undefined}>
        {path === HOME ? <HomePage id={id} /> : path === '' ? <ThisPcPage id={id} /> : <FileList id={id} />}
      </div>
      <StatusBar id={id} />
    </section>
  );
}
