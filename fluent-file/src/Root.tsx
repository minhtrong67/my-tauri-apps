import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { FolderUp } from './lib/icons';
import { Loader } from './components/ui/Progress';
import { useExplorer, initExplorer } from './store/explorer';
import { useSettings } from './store/settings';
import { useUI, type ModalName } from './store/ui';
import { useT } from './lib/i18n';
import { useAppEffects } from './hooks/useAppEffects';
import { useShortcuts } from './hooks/useShortcuts';
import { CommandBar } from './components/CommandBar';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { FilePane } from './components/FilePane';
import { DetailsPane } from './components/DetailsPane';
import { SelectionBar } from './components/SelectionBar';
import { OperationCard } from './components/OperationCard';
import { Toaster } from './components/ui/Toaster';
import { ContextMenu } from './components/ui/ContextMenu';
import { AppDialog } from './components/AppDialog';

/* heavy dialogs are separate chunks: they load the first time they are opened, which keeps start-up light and memory low */
const lazyDialog = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, key: K) => lazy(() => load().then((m) => ({ default: m[key] })));
const SettingsDialog = lazyDialog(() => import('./components/dialogs/SettingsDialog'), 'SettingsDialog');
const PropertiesDialog = lazyDialog(() => import('./components/dialogs/PropertiesDialog'), 'PropertiesDialog');
const SearchDialog = lazyDialog(() => import('./components/dialogs/SearchDialog'), 'SearchDialog');
const Lightbox = lazyDialog(() => import('./components/dialogs/Lightbox'), 'Lightbox');
const CommandPalette = lazyDialog(() => import('./components/dialogs/CommandPalette'), 'CommandPalette');
const RenameDialog = lazyDialog(() => import('./components/dialogs/RenameDialog'), 'RenameDialog');
const FolderStyleDialog = lazyDialog(() => import('./components/dialogs/FolderStyleDialog'), 'FolderStyleDialog');
function Gate({ name, children }: { name: ModalName; children: ReactNode }) {
  const open = useUI((s) => s.modals[name] !== undefined);
  const [seen, setSeen] = useState(false);
  useEffect(() => { if (open) setSeen(true); }, [open]);
  return seen || open ? <Suspense fallback={null}>{children}</Suspense> : null;
}

function DragLayer() {
  const t = useT(); const d = useUI((s) => s.dragging); const ext = useUI((s) => s.extDrop.active);
  return (
    <>
      {d && <div className="drag-ghost" style={{ left: d.x, top: d.y }}>{d.copy ? t('drag.copy', { n: d.paths.length }) : t('drag.move', { n: d.paths.length })}</div>}
      {ext && <div className="pointer-events-none fixed inset-2 z-[190] grid place-items-center rounded-lg border-2 border-dashed border-primary bg-primary/10 anim-fade"><div className="flex items-center gap-3 rounded-md bg-primary px-5 py-2.5 text-on-primary shadow-[var(--shadow-3)]"><FolderUp className="size-5" strokeWidth={1.75} />{t('drag.drop')}</div></div>}
    </>
  );
}

export default function App() {
  const t = useT();
  const dual = useSettings((s) => s.dualPane); const nav = useSettings((s) => s.showNav); const details = useSettings((s) => s.showDetails);
  const ready = useExplorer((s) => s.ready); const busy = useUI((s) => s.loading > 0);
  useAppEffects(); useShortcuts();
  useEffect(() => { void initExplorer().then(() => requestAnimationFrame(() => document.body.classList.remove('booting'))); }, []);
  return (
    <div className="flex h-full flex-col bg-surface-container">
      <div className={`h-0.5 flex-none overflow-hidden transition-opacity duration-150 ${busy ? 'indet bg-primary/15 opacity-100' : 'opacity-0'}`} role="progressbar" aria-hidden={!busy} aria-label={t('common.loading')} />
      <TitleBar />
      <CommandBar />
      <div className={`flex min-h-0 flex-1 gap-2 pr-2 pb-2 ${nav ? '' : 'pl-2'}`}>
        {nav && <Sidebar />}
        <main className="relative flex min-h-0 min-w-0 flex-1 gap-2">
          {ready ? <><FilePane id="a" />{dual && <FilePane id="b" />}</> : <div className="grid flex-1 place-items-center"><Loader /></div>}
          <SelectionBar />
        </main>
        {details && <DetailsPane />}
      </div>
      <OperationCard /><Toaster /><ContextMenu /><DragLayer />
      <AppDialog />
      <Gate name="settings"><SettingsDialog /></Gate><Gate name="props"><PropertiesDialog /></Gate><Gate name="search"><SearchDialog /></Gate><Gate name="lightbox"><Lightbox /></Gate>
      <Gate name="palette"><CommandPalette /></Gate><Gate name="rename"><RenameDialog /></Gate><Gate name="folderStyle"><FolderStyleDialog /></Gate>
    </div>
  );
}
