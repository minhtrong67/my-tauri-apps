import { useShallow } from 'zustand/react/shallow';
import { useEffect } from 'react';
import { useApp, boot, relocalize } from './lib/controller';
import * as C from './lib/controller';
import { useSettings } from './lib/settings';
import { useT } from './lib/i18n';
import { matchKey, cmd } from './lib/commands';
import { showOverlay } from './lib/ui';
import { cx } from './lib/utils';
import { TitleBar, CommandBar, FormatBar, StatusBar } from './components/Chrome';
import { Drawer, EditorPane, PreviewPane, Splitter, FindBar, EmptyState, ScrollTop } from './components/Workspace';
import { SettingsSheet, ShortcutsDialog, TemplatesDialog, BadgeDialog, CommandPalette } from './components/Sheets';
import { ToastHost, MenuHost, TipHost, ConfirmHost } from './components/Hosts';

export default function App() {
  const t = useT();
  const { mode, nav, hasDoc, drag } = useApp(useShallow((s) => ({ mode: s.mode, nav: s.nav, hasDoc: s.activeId !== null, drag: s.drag })));
  const focus = useApp((s) => s.focus);
  const lang = useSettings((s) => s.lang);

  useEffect(() => { boot(); }, []);
  useEffect(() => { relocalize(); }, [lang]);
  useEffect(() => { document.body.classList.toggle('nonav', !nav); }, [nav]);
  useEffect(() => { document.body.classList.toggle('focus-mode', focus); }, [focus]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return;
      if (e.key === 'Escape') {
        if (useApp.getState().findOpen) { e.preventDefault(); C.closeFind(); } else if (useApp.getState().focus) { e.preventDefault(); C.exitFocus(); }
        return;
      }
      const id = matchKey(e); if (!id) return;
      e.preventDefault();
      if (id === '_next') C.findStep(1); else if (id === '_prev') C.findStep(-1);
      else if (id === 'palette') showOverlay('palette');
      else { const c = cmd(id); if ((c.needsDoc || c.needsEditor) && !C.hasDoc()) return; c.run(); }
    };
    const wheel = (e: WheelEvent) => { if (e.ctrlKey) { e.preventDefault(); C.zoomBy(e.deltaY < 0 ? 10 : -10); } };
    const ctx = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('input,textarea,.cm-content,#doc')) e.preventDefault(); };
    addEventListener('keydown', key); addEventListener('wheel', wheel, { passive: false }); addEventListener('contextmenu', ctx);
    return () => { removeEventListener('keydown', key); removeEventListener('wheel', wheel); removeEventListener('contextmenu', ctx); };
  }, []);

  return (
    <div className="app">
      <TitleBar />
      <div className="layer">
        <CommandBar />
        <FormatBar />
        <main className="shell">
          <Drawer />
          <div className="scrim" onClick={() => C.setNav(false, false)} />
          <div className={cx('work', !hasDoc && 'no-doc', drag && 'drag')} data-mode={mode} data-drop={t('drop')}>
            <EditorPane />
            <Splitter />
            <PreviewPane />
            <EmptyState />
            <FindBar />
            <ScrollTop />
          </div>
        </main>
        <StatusBar />
      </div>
      <SettingsSheet /><ShortcutsDialog /><TemplatesDialog /><BadgeDialog /><CommandPalette /><ConfirmHost />
      <MenuHost /><ToastHost /><TipHost />
    </div>
  );
}
