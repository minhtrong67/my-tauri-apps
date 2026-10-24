import { useEffect } from 'react';
import { FolderUp, Loader } from 'lucide-react';
import { useExplorer, initExplorer } from './store/explorer';
import { useSettings } from './store/settings';
import { useUI } from './store/ui';
import { useT } from './lib/i18n';
import { useAppEffects } from './hooks/useAppEffects';
import { useShortcuts } from './hooks/useShortcuts';
import { CommandBar } from './components/CommandBar';
import { Sidebar } from './components/Sidebar';
import { FilePane } from './components/FilePane';
import { DetailsPane } from './components/DetailsPane';
import { SelectionBar } from './components/SelectionBar';
import { OperationCard } from './components/OperationCard';
import { Toaster } from './components/ui/Toaster';
import { ContextMenu } from './components/ui/ContextMenu';
import { AppDialog } from './components/AppDialog';
import { SettingsDialog } from './components/dialogs/SettingsDialog';
import { PropertiesDialog } from './components/dialogs/PropertiesDialog';
import { DupesDialog } from './components/dialogs/DupesDialog';
import { UsageDialog } from './components/dialogs/UsageDialog';
import { SearchDialog } from './components/dialogs/SearchDialog';
import { Lightbox } from './components/dialogs/Lightbox';
import { CommandPalette } from './components/dialogs/CommandPalette';
import { UpdateDialog } from './components/dialogs/UpdateDialog';

function DragLayer() {
  const t = useT(); const d = useUI((s) => s.dragging); const ext = useUI((s) => s.extDrop.active);
  return (
    <>
      {d && <div className="drag-ghost" style={{ left: d.x, top: d.y }}>{d.copy ? t('drag.copy', { n: d.paths.length }) : t('drag.move', { n: d.paths.length })}</div>}
      {ext && <div className="pointer-events-none fixed inset-2 z-[190] grid place-items-center rounded-[2rem] border-4 border-dashed border-primary bg-primary/10 anim-fade"><div className="flex items-center gap-3 rounded-full bg-primary px-6 py-3 font-semibold text-on-primary shadow-[var(--shadow-3)]"><FolderUp className="size-6" />{t('drag.drop')}</div></div>}
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
      <div className={`h-0.5 flex-none overflow-hidden transition-opacity duration-300 ${busy ? 'indet bg-primary/15 opacity-100' : 'opacity-0'}`} role="progressbar" aria-hidden={!busy} aria-label={t('common.loading')} />
      <CommandBar />
      <div className={`flex min-h-0 flex-1 gap-2 pr-2 pb-2 ${nav ? '' : 'pl-2'}`}>
        {nav && <Sidebar />}
        <main className="relative flex min-h-0 min-w-0 flex-1 gap-2">
          {ready ? <><FilePane id="a" />{dual && <FilePane id="b" />}</> : <div className="grid flex-1 place-items-center"><Loader className="size-8 animate-spin text-primary" /></div>}
          <SelectionBar />
        </main>
        {details && <DetailsPane />}
      </div>
      <OperationCard /><Toaster /><ContextMenu /><DragLayer />
      <AppDialog /><SettingsDialog /><PropertiesDialog /><DupesDialog /><UsageDialog /><SearchDialog /><Lightbox /><CommandPalette /><UpdateDialog />
    </div>
  );
}
