import { useEffect, useMemo, useRef, useState } from 'react';
import { CopyPlus, FileSearch, Filter, FolderPlus, HardDrive, Palette, Pin, Plus, RefreshCw, Search, Settings as Gear, Columns2, Folder, FilePlus, Home, Monitor, Terminal, Undo2, SquareArrowOutUpRight, Maximize } from 'lucide-react';
import { closeModal, openModal, useUI } from '../../store/ui';
import { useT } from '../../lib/i18n';
import { Modal } from '../ui/Modal';
import { getView, navigate, newItem, newTab, openEntry, openNewWindow, refresh, undoLast, useExplorer, openWith } from '../../store/explorer';
import { useSettings } from '../../store/settings';
import { baseName, HOME, isVirtual, pk } from '../../lib/paths';
import { toggleDual, toggleFullscreen } from '../../lib/menus';
import { FileIcon } from '../FileIcon';
import type { LucideIcon } from 'lucide-react';

interface Cmd { key: string; label: string; hint?: string; icon?: LucideIcon; entry?: { name: string; isDir: boolean }; run: () => void }

/** Ctrl+K: search commands, places, recent folders and files of the current folder. */
export function CommandPalette() {
  const t = useT(); const open = useUI((s) => !!s.modals.palette);
  const id = useExplorer((s) => s.activePane); const path = useExplorer((s) => s.panes[s.activePane].path); const places = useExplorer((s) => s.places);
  const S = useSettings();
  const [q, setQ] = useState(''); const [hi, setHi] = useState(0); const list = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) { setQ(''); setHi(0); } }, [open]);
  const real = !!path && !isVirtual(path);
  const items = useMemo<Cmd[]>(() => {
    if (!open) return [];
    const cmds: Cmd[] = [
      { key: 'c-home', label: t('place.home'), icon: Home, run: () => navigate(id, HOME) }, { key: 'c-pc', label: t('place.thispc'), icon: Monitor, run: () => navigate(id, '') },
      { key: 'c-set', label: t('toolbar.settings'), icon: Gear, hint: 'Ctrl+,', run: () => openModal('settings') },
      { key: 'c-theme', label: t('settings.color'), icon: Palette, run: () => { useUI.setState({ settingsPanel: 'appearance' }); openModal('settings'); } },
      { key: 'c-nt', label: t('tab.new'), icon: Plus, hint: 'Ctrl+T', run: () => newTab(id) }, { key: 'c-nw', label: t('cmd.newWindow'), icon: SquareArrowOutUpRight, hint: 'Ctrl+N', run: () => openNewWindow(path) },
      { key: 'c-ref', label: t('nav.refresh'), icon: RefreshCw, hint: 'F5', run: () => refresh(id) }, { key: 'c-undo', label: t('cmd.undo'), icon: Undo2, hint: 'Ctrl+Z', run: () => undoLast() },
      { key: 'c-dual', label: t('view.dual'), icon: Columns2, hint: 'F9', run: () => toggleDual() }, { key: 'c-det', label: t('view.detailsPane'), icon: FileSearch, hint: 'Alt+P', run: () => S.set({ showDetails: !S.showDetails }) },
      { key: 'c-adv', label: t('cmd.advSearch'), icon: Filter, hint: 'Ctrl+Shift+F', run: () => openModal('search') }, { key: 'c-dup', label: t('cmd.dupes'), icon: CopyPlus, run: () => openModal('dupes') },
      { key: 'c-use', label: t('cmd.usage'), icon: HardDrive, run: () => openModal('usage') }, { key: 'c-fs', label: t('view.fullscreen'), icon: Maximize, hint: 'F11', run: toggleFullscreen }
    ];
    if (real) cmds.push({ key: 'c-nf', label: t('new.folder'), icon: FolderPlus, hint: 'Ctrl+Shift+N', run: () => newItem(id, 'folder') }, { key: 'c-nt2', label: t('new.text'), icon: FilePlus, run: () => newItem(id, 'text') }, { key: 'c-term', label: t('cmd.openTerminal'), icon: Terminal, run: () => openWith('terminal', path as string) });
    const dirs: Cmd[] = [];
    const seen = new Set<string>();
    const add = (p: string, icon: LucideIcon = Folder, hint?: string) => { if (seen.has(pk(p))) return; seen.add(pk(p)); dirs.push({ key: 'd-' + p, label: baseName(p), hint: hint || p, icon, run: () => navigate(id, p) }); };
    places.forEach((p) => add(p.path)); S.pinned.forEach((p) => add(p, Pin)); Object.keys(S.frequent).sort((a, b) => S.frequent[b] - S.frequent[a]).slice(0, 12).forEach((p) => add(p));
    const here: Cmd[] = real ? getView(id).list.slice(0, 3000).map((e) => ({ key: 'e-' + e.path, label: e.name, hint: e.isDir ? t('type.folder') : undefined, entry: e, run: () => openEntry(e, id) })) : [];
    return [...cmds, ...dirs, ...here];
  }, [open, id, path, real, places]); // eslint-disable-line react-hooks/exhaustive-deps
  const needle = q.trim().toLowerCase();
  const res = useMemo(() => (needle ? items.filter((c) => c.label.toLowerCase().includes(needle) || (c.hint || '').toLowerCase().includes(needle)) : items.slice(0, 14)).slice(0, 40), [items, needle]);
  useEffect(() => setHi(0), [needle]);
  useEffect(() => { list.current?.querySelector<HTMLElement>(`[data-i="${hi}"]`)?.scrollIntoView({ block: 'nearest' }); }, [hi]);
  const run = (c?: Cmd) => { if (!c) return; closeModal('palette'); window.setTimeout(c.run, 60); };
  return (
    <Modal open={open} onClose={() => closeModal('palette')} bare width={620}>
      <div className="flex items-center gap-3 border-b border-outline-variant/60 px-5 py-3"><Search className="size-5 text-primary" />
        <input autoFocus data-autofocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('palette.placeholder')} aria-label={t('palette.placeholder')} spellCheck={false} className="h-9 min-w-0 flex-1 bg-transparent text-base outline-none"
          onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(res.length - 1, h + 1)); } else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); } else if (e.key === 'Enter') { e.preventDefault(); run(res[hi]); } }} />
        <kbd className="rounded-md bg-surface-container-highest px-1.5 py-0.5">Esc</kbd></div>
      <div ref={list} className="max-h-[22rem] overflow-y-auto p-2" role="listbox">
        {res.length === 0 && <div className="p-8 text-center text-on-surface-variant">{t('palette.none')}</div>}
        {res.map((c, i) => (
          <button key={c.key} data-i={i} type="button" role="option" aria-selected={i === hi} onMouseMove={() => setHi(i)} onClick={() => run(c)}
            className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors ${i === hi ? 'bg-secondary-container text-on-secondary-container' : ''}`}>
            {c.entry ? <FileIcon entry={c.entry} size={20} /> : c.icon && <c.icon className="size-5 text-on-surface-variant" />}
            <span className="min-w-0 flex-1 truncate font-medium">{c.label}</span>{c.hint && <span className="max-w-[45%] truncate text-xs text-on-surface-variant">{c.hint}</span>}
          </button>
        ))}
      </div>
    </Modal>
  );
}
