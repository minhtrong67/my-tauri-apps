import { useEffect, useRef } from 'react';
import { app, cur, useApp, emit } from './lib/store';
import { handleKey } from './lib/commands';
import * as IO from './lib/io';
import * as O from './lib/ops';
import * as A from './lib/actions';
import * as TH from './lib/theme';
import { win, onFiles, onDragDrop, inTauri } from './lib/tauri';
import { hasModal, menuOpen, toast } from './lib/overlay';
import { listDrafts, clearDrafts, draftToDoc, startRecovery } from './lib/recovery';
import { t } from './lib/i18n';
import { Titlebar } from './components/Titlebar';
import { CommandBar } from './components/CommandBar';
import { FindBar, AdvBar, FormulaBar, closeFind } from './components/Bars';
import { Grid } from './components/Grid';
import { Cards, Details, StatusBar, Welcome } from './components/Views';
import { ToastHost, ModalHost, MenuHost, TooltipHost, useRipple } from './components/ui';
import { confirmDialog } from './components/Dialogs';

export function App() {
  useApp();
  useRipple();
  const booted = useRef(false);
  const d = cur();

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    (async () => {
      // Show the window first so nothing (a dialog, a failed call) can leave it hidden.
      try { await TH.applyWindowMode(); } catch { /* ignore */ }
      try { await win?.show(); await win?.setFocus(); } catch { /* ignore */ }
      document.documentElement.classList.add('ready');
      try {
        const files = await IO.startupFiles();
        if (files.length) await IO.openPaths(files);
      } catch { /* ignore */ }
      try {
        // offer to restore drafts left behind by a crash
        const drafts = app.settings.autosave ? await listDrafts() : [];
        if (drafts.length && !app.docs.length) {
          const r = await confirmDialog({
            title: t('recover.title'), body: t('recover.body', { n: drafts.length }), tone: 'info',
            buttons: [{ id: 'restore', label: t('recover.restore'), icon: 'restore', variant: 'primary' }, { id: 'discard', label: t('recover.discard'), icon: 'trash', variant: 'danger-tonal' }],
          });
          if (r === 'restore') { for (const x of drafts) IO.addDoc(draftToDoc(x)); }
        }
        await clearDrafts();
      } catch { /* ignore */ }
      startRecovery();
    })();

    const un: (() => void)[] = [];
    onFiles(paths => { IO.openPaths(paths); }).then(f => un.push(f));
    const drop = (on: boolean) => document.body.classList.toggle('dragging-over', on);
    if (inTauri) {
      onDragDrop(ev => {
        if (ev.type === 'enter' || ev.type === 'over') drop(true);
        else if (ev.type === 'drop') { drop(false); if (ev.paths?.length) IO.openPaths(ev.paths); }
        else drop(false);
      }).then(f => un.push(f));
    } else {
      const over = (e: DragEvent) => { e.preventDefault(); drop(true); };
      const leave = (e: DragEvent) => { if (!e.relatedTarget) drop(false); };
      const dr = (e: DragEvent) => { e.preventDefault(); drop(false); if (e.dataTransfer?.files.length) IO.openFileObjects([...e.dataTransfer.files]); };
      document.addEventListener('dragover', over); document.addEventListener('dragleave', leave); document.addEventListener('drop', dr);
      un.push(() => { document.removeEventListener('dragover', over); document.removeEventListener('dragleave', leave); document.removeEventListener('drop', dr); });
    }
    if (win) {
      win!.onCloseRequested(async e => {
        const dirty = app.docs.filter(x => x.dirty);
        if (!dirty.length) return;
        e.preventDefault();
        for (const x of dirty) { A.activate(x); if (!(await A.closeTab(x))) return; }
        win!.close();
      }).then(f => un.push(f));
    }
    const beforeUnload = (e: BeforeUnloadEvent) => { if (!inTauri && app.docs.some(x => x.dirty)) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    return () => { un.forEach(f => f()); window.removeEventListener('beforeunload', beforeUnload); };
  }, []);

  // keyboard, paste and context menu
  useEffect(() => {
    let pasteSeen = false;
    const key = (e: KeyboardEvent) => {
      if (hasModal()) return;
      if (e.key === 'Escape' && !menuOpen() && app.find.open && !(e.target as HTMLElement).closest?.('.editor')) { closeFind(); return; }
      const tag = ((e.target as HTMLElement).tagName || '').toLowerCase();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && tag !== 'input' && tag !== 'textarea') {
        pasteSeen = false;
        setTimeout(() => { if (!pasteSeen && cur()) A.clipboard('paste'); }, 120);
        return;
      }
      handleKey(e);
    };
    const paste = (e: ClipboardEvent) => {
      if (!cur() || (e.target as HTMLElement).closest?.('input,textarea')) return;
      e.preventDefault(); pasteSeen = true;
      O.pasteText(e.clipboardData?.getData('text/plain') || '');
    };
    const ctx = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('input,textarea,[data-grid]')) e.preventDefault(); };
    document.addEventListener('keydown', key); document.addEventListener('paste', paste); document.addEventListener('contextmenu', ctx);
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('paste', paste); document.removeEventListener('contextmenu', ctx); };
  }, []);

  // window title
  useEffect(() => {
    const title = d ? `${d.dirty ? '● ' : ''}${d.name} - Material CSV` : 'Material CSV';
    document.title = title;
    try { win?.setTitle(title); } catch { /* ignore */ }
  }, [d, d?.dirty, d?.name]);

  // theme-color / html lang follow the settings
  useEffect(() => { TH.applyAppearance(); }, [app.settings.accent, app.settings.variant, app.settings.contrast, app.settings.font, app.settings.fontSize, app.settings.anim]);

  return (
    <div className="flex h-full flex-col bg-surface text-on-surface">
      <Titlebar />
      <CommandBar />
      <FindBar />
      <AdvBar />
      <FormulaBar />
      <main className="flex min-h-0 flex-1 gap-2 px-2">
        {d ? (app.mode === 'table' ? <Grid key="grid" /> : <Cards key={'cards' + d.id} />) : <Welcome />}
        {d && <Details />}
      </main>
      <StatusBar />
      <input id="fileInput" type="file" hidden multiple accept=".csv,.tsv,.txt,.tab,.xlsx,.xls,.xlsm,.ods" onChange={e => { if (e.target.files?.length) IO.openFileObjects([...e.target.files]); e.target.value = ''; }} />
      <ModalHost /><MenuHost /><ToastHost /><TooltipHost />
    </div>
  );
}
void emit;
