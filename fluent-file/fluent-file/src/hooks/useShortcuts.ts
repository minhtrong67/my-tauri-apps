import { useEffect } from 'react';
import { useExplorer, selectedEntries, openSelection, copyToClipboard, pasteClipboard, deleteSelection, renameSelection, undoLast, newItem, newTab, closeTab, goBack, goForward, goUp, refresh, selectAll, clearSelection, clearSearch, moveFocus, focusIndex, typeAhead, showProperties, getView, copyPaths, previewEntry, navigate, switchTab } from '../store/explorer';
import { closeMenu, isModalOpen, openModal, useUI } from '../store/ui';
import { gridInfo } from '../components/FileList';
import { useSettings } from '../store/settings';
import { openNewWindow } from '../store/explorer';
import { isVirtual, HOME } from '../lib/paths';
import { setLayout } from '../store/explorer';
import { layoutOf } from '../lib/view';
import { toggleDual, toggleFullscreen } from '../lib/menus';
import { listen } from '../lib/api';

/** Keyboard shortcuts, mouse back/forward buttons and Ctrl+wheel zoom of the list. */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement; const typing = !!tgt.closest?.('input,textarea,[contenteditable]');
      const ctrl = e.ctrlKey || e.metaKey; const k = e.key;
      if (isModalOpen() && !(ctrl && k.toLowerCase() === 'k')) return;
      const ex = useExplorer.getState(); const id = ex.activePane; const p = ex.panes[id]; const real = p.path !== null && !isVirtual(p.path);
      if (k === 'F5' || (ctrl && k.toLowerCase() === 'r')) { e.preventDefault(); void refresh(id); return; }
      if (k === 'F11') { e.preventDefault(); void toggleFullscreen(); return; }
      if (k === 'F9') { e.preventDefault(); void toggleDual(); return; }
      if (ctrl && k === ',') { e.preventDefault(); openModal('settings'); return; }
      if (ctrl && k.toLowerCase() === 'k') { e.preventDefault(); if (useUI.getState().modals.palette) return; openModal('palette'); return; }
      if (ctrl && e.shiftKey && k.toLowerCase() === 'f') { e.preventDefault(); if (real) openModal('search'); return; }
      if (ctrl && k.toLowerCase() === 'f') { e.preventDefault(); document.querySelector<HTMLInputElement>(`[data-search="${id}"]`)?.focus(); return; }
      if (ctrl && k.toLowerCase() === 'l') { e.preventDefault(); document.querySelector<HTMLElement>(`[data-pane="${id}"] [data-drop-path=""]`)?.parentElement?.click(); return; }
      if (ctrl && k.toLowerCase() === 't') { e.preventDefault(); void newTab(id); return; }
      if (ctrl && k.toLowerCase() === 'w') { e.preventDefault(); void closeTab(id, p.active); return; }
      if (ctrl && k.toLowerCase() === 'n' && !e.shiftKey) { e.preventDefault(); void openNewWindow(p.path); return; }
      if (ctrl && e.shiftKey && k.toLowerCase() === 'n') { e.preventDefault(); if (real) void newItem(id, 'folder'); return; }
      if (ctrl && (k === '1' || k === '2')) { e.preventDefault(); if (real) setLayout(p.path, { view: k === '1' ? 'details' : 'grid' }); return; }
      if (ctrl && k === 'Tab') { e.preventDefault(); const n = p.tabs.length; if (n > 1) void switchTab(id, (p.active + (e.shiftKey ? -1 : 1) + n) % n); return; }
      if (e.altKey && k === 'p') { e.preventDefault(); const s = useSettings.getState(); s.set({ showDetails: !s.showDetails }); return; }
      if (e.altKey && k === 'ArrowLeft') { e.preventDefault(); void goBack(id); return; }
      if (e.altKey && k === 'ArrowRight') { e.preventDefault(); void goForward(id); return; }
      if (e.altKey && k === 'ArrowUp') { e.preventDefault(); goUp(id); return; }
      if (e.altKey && k === 'Enter') { e.preventDefault(); showProperties(id); return; }
      if (e.altKey && k === 'Home') { e.preventDefault(); void navigate(id, HOME); return; }
      if (typing) return;
      if (ctrl && k.toLowerCase() === 'a') { e.preventDefault(); selectAll(id); return; }
      if (ctrl && e.shiftKey && k.toLowerCase() === 'c') { e.preventDefault(); copyPaths(id); return; }
      if (ctrl && k.toLowerCase() === 'c') { e.preventDefault(); copyToClipboard(id, false); return; }
      if (ctrl && k.toLowerCase() === 'x') { e.preventDefault(); copyToClipboard(id, true); return; }
      if (ctrl && k.toLowerCase() === 'v') { e.preventDefault(); void pasteClipboard(id); return; }
      if (ctrl && k.toLowerCase() === 'z') { e.preventDefault(); void undoLast(); return; }
      if (k === 'F2') { e.preventDefault(); void renameSelection(id); return; }
      if (k === 'Delete') { e.preventDefault(); void deleteSelection(id, e.shiftKey); return; }
      if (k === 'Escape') { closeMenu(); if (clearSearch(id)) return; if (p.selected.size) clearSelection(id); return; }
      if (k === 'Enter') { e.preventDefault(); openSelection(id); return; }
      if (k === 'Backspace') { e.preventDefault(); void goBack(id); return; }
      if (k === ' ' && real) { e.preventDefault(); const sel = selectedEntries(id); const f = sel.length === 1 ? sel[0] : p.focus ? getView(id).list.find((x) => x.path === p.focus) : undefined; previewEntry(f); return; }
      if (!real) return;
      const cols = gridInfo[id].cols;
      const L = layoutOf(useSettings.getState(), p.path); const grid = L.view !== 'details';
      if (k === 'ArrowDown') { e.preventDefault(); moveFocus(id, grid ? cols : 1, e.shiftKey); }
      else if (k === 'ArrowUp') { e.preventDefault(); moveFocus(id, grid ? -cols : -1, e.shiftKey); }
      else if (k === 'ArrowRight' && grid) { e.preventDefault(); moveFocus(id, 1, e.shiftKey); }
      else if (k === 'ArrowLeft' && grid) { e.preventDefault(); moveFocus(id, -1, e.shiftKey); }
      else if (k === 'Home') { e.preventDefault(); focusIndex(id, 0, e.shiftKey); }
      else if (k === 'End') { e.preventDefault(); focusIndex(id, 1e9, e.shiftKey); }
      else if (k === 'PageDown') { e.preventDefault(); moveFocus(id, 10 * (grid ? cols : 1), e.shiftKey); }
      else if (k === 'PageUp') { e.preventDefault(); moveFocus(id, -10 * (grid ? cols : 1), e.shiftKey); }
      else if (k.length === 1 && !ctrl && !e.altKey) typeAhead(id, k);
    };
    /* Mouse side buttons (3 = back, 4 = forward) arrive as DOM events and, on Windows, as a native
       "mouse-nav" event from Rust. One small state machine makes sure a press never navigates twice. */
    const held = { back: 0, forward: 0 }; const upAt = { back: 0, forward: 0 };
    const kindOf = (b: number) => (b === 3 ? 'back' : b === 4 ? 'forward' : null);
    const fire = (kind: 'back' | 'forward') => {
      if (isModalOpen() || useExplorer.getState().panes[useExplorer.getState().activePane].renaming) return;
      const id = useExplorer.getState().activePane;
      if (kind === 'back') void goBack(id); else void goForward(id);
    };
    const side = (kind: 'back' | 'forward', phase: string) => {
      const now = Date.now(); const isHeld = held[kind] && now - held[kind] < 1500;
      if (phase === 'down') { if (!isHeld) { held[kind] = now; fire(kind); } return; }
      if (now - upAt[kind] < 80) return;
      upAt[kind] = now; if (!isHeld) fire(kind); held[kind] = 0;
    };
    const onSide = (phase: string) => (e: MouseEvent) => { const k = kindOf(e.button); if (!k) return; e.preventDefault(); e.stopPropagation(); side(k, phase); };
    const dn = onSide('down'), up = onSide('up');
    const noAux = (e: MouseEvent) => { if (kindOf(e.button)) { e.preventDefault(); e.stopPropagation(); } };
    let unlisten: (() => void) | undefined;
    void listen<string>('mouse-nav', (p) => { if (!document.hasFocus()) return; const [k, ph] = String(p).split(':'); if (k === 'back' || k === 'forward') side(k, ph); }).then((u) => { unlisten = u; });
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return; e.preventDefault();
      const ex = useExplorer.getState(); const p = ex.panes[ex.activePane]; if (!p.path || isVirtual(p.path)) return;
      const order = ['details', 'small', 'grid', 'large'] as const; const cur = layoutOf(useSettings.getState(), p.path).view; const i = order.indexOf(cur === 'details' ? 'details' : cur);
      const n = Math.max(0, Math.min(order.length - 1, i + (e.deltaY < 0 ? 1 : -1)));
      if (n !== i) setLayout(p.path, { view: order[n] });
    };
    const onCtx = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('input,textarea')) e.preventDefault(); };
    window.addEventListener('keydown', onKey);
    (['mousedown', 'pointerdown'] as const).forEach((n) => window.addEventListener(n, dn, true));
    (['mouseup', 'pointerup'] as const).forEach((n) => window.addEventListener(n, up, true));
    window.addEventListener('auxclick', noAux, true);
    window.addEventListener('wheel', onWheel, { passive: false }); window.addEventListener('contextmenu', onCtx);
    return () => { window.removeEventListener('keydown', onKey); unlisten?.();
      (['mousedown', 'pointerdown'] as const).forEach((n) => window.removeEventListener(n, dn, true));
      (['mouseup', 'pointerup'] as const).forEach((n) => window.removeEventListener(n, up, true));
      window.removeEventListener('auxclick', noAux, true);
      window.removeEventListener('wheel', onWheel); window.removeEventListener('contextmenu', onCtx); };
  }, []);
}
