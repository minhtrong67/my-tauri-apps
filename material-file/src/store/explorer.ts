import { create } from 'zustand';
import { AlertTriangle, Copy as CopyIcon, Trash2, X, Check, Replace, SkipForward, Pencil } from 'lucide-react';
import { api } from '../lib/api';
import type { Drive, Entry, Kind, PaneId, Place, TagId, Tools } from '../lib/types';
import { baseName, crumbsOf, HOME, isVirtual, parentOf, pk, samePath, stripExt } from '../lib/paths';
import { computeView, layoutOf, type ViewOpts, type ViewResult } from '../lib/view';
import { coll } from '../lib/format';
import { getSettings, useSettings, type Layout } from './settings';
import { t } from '../lib/i18n';
import { dialog, openModal, patchOp, setLoading, setOp, toast } from './ui';

export interface Tab { id: number; path: string | null; back: string[]; fwd: string[]; isNew?: boolean }
export interface PaneState {
  path: string | null;
  entries: Entry[];
  search: { query: string } | null;
  filter: string;
  kind: Kind;
  selected: Set<string>;
  anchor: string | null;
  focus: string | null;
  tabs: Tab[];
  active: number;
  sig: string;
  renaming: string | null;
  token: number;
  loading: boolean;
  reveal: { path: string; n: number } | null;
}
export interface TreeNode { name: string; path: string; hidden: boolean }
export type UndoOp =
  | { type: 'rename'; from: string; to: string }
  | { type: 'rename-many'; pairs: { from: string; to: string }[] }
  | { type: 'move'; pairs: { from: string; to: string }[] }
  | { type: 'create'; paths: string[] };

interface Explorer {
  panes: Record<PaneId, PaneState>;
  activePane: PaneId;
  places: Place[];
  drives: Drive[];
  tools: Tools;
  clip: { paths: string[]; cut: boolean } | null;
  undo: UndoOp[];
  treeOpen: Set<string>;
  treeCache: Record<string, TreeNode[]>;
  ready: boolean;
}

let tabSeq = 1;
const newTabObj = (path: string | null): Tab => ({ id: tabSeq++, path, back: [], fwd: [] });
const emptyPane = (): PaneState => ({
  path: null, entries: [], search: null, filter: '', kind: 'all', selected: new Set(), anchor: null, focus: null,
  tabs: [newTabObj(null)], active: 0, sig: '', renaming: null, token: 0, loading: false, reveal: null
});

export const useExplorer = create<Explorer>(() => ({
  panes: { a: emptyPane(), b: emptyPane() }, activePane: 'a', places: [], drives: [],
  tools: { winrar: false, sevenzip: false, code: false, terminal: false },
  clip: null, undo: [], treeOpen: new Set(), treeCache: {}, ready: false
}));
const S = useExplorer;
const st = () => S.getState();
const pane = (id: PaneId) => st().panes[id];
const patch = (id: PaneId, p: Partial<PaneState>) => S.setState((s) => ({ panes: { ...s.panes, [id]: { ...s.panes[id], ...p } } }));
const otherPane = (id: PaneId): PaneId => (id === 'a' ? 'b' : 'a');
export const activeTab = (p: PaneState) => p.tabs[p.active];
const patchTab = (id: PaneId, fn: (t: Tab) => Tab, index?: number) => {
  const p = pane(id); const i = index ?? p.active;
  patch(id, { tabs: p.tabs.map((tb, k) => (k === i ? fn(tb) : tb)) });
};

/* ------------------------------------------------------------------ views */
const viewCache: Partial<Record<PaneId, { deps: unknown[]; res: ViewResult }>> = {};
export function getView(id: PaneId): ViewResult {
  const p = pane(id); const s = getSettings(); const layout = layoutOf(s, p.path);
  const deps = [p.entries, p.filter, p.kind, s.showHidden, layout.sortKey, layout.sortDir, layout.groupBy, s.lang, s.tags];
  const c = viewCache[id];
  if (c && c.deps.every((d, i) => d === deps[i])) return c.res;
  const opts: ViewOpts = { filter: p.filter, kind: p.kind, lang: s.lang, showHidden: s.showHidden, layout, tags: s.tags };
  const res = computeView(p.entries, opts);
  viewCache[id] = { deps, res };
  return res;
}
export const entryOf = (id: PaneId, path: string) => {
  const v = getView(id); const i = v.index.get(path);
  return i === undefined ? undefined : v.list[i];
};
export const selectedEntries = (id: PaneId): Entry[] => {
  const p = pane(id); const v = getView(id);
  return v.list.filter((e) => p.selected.has(e.path));
};

/* ----------------------------------------------------------- settings glue */
export function setLayout(path: string | null, patchL: Partial<Layout>) {
  const s = getSettings();
  if (s.rememberLayouts && path && !isVirtual(path)) {
    const k = pk(path);
    const layouts = { ...s.layouts, [k]: { ...(s.layouts[k] || {}), ...patchL } };
    const keys = Object.keys(layouts);
    if (keys.length > 400) delete layouts[keys[0]];
    s.set({ layouts });
  } else s.set(patchL as never);
}
export function bumpFrequent(path: string) {
  if (parentOf(path) === '') return;
  const s = getSettings();
  const frequent = { ...s.frequent, [path]: (s.frequent[path] || 0) + 1 };
  const keys = Object.keys(frequent);
  if (keys.length > 60) keys.sort((a, b) => frequent[b] - frequent[a]).slice(40).forEach((k) => delete frequent[k]);
  s.set({ frequent });
}
export function addRecent(path: string) {
  const s = getSettings();
  s.set({ recent: [{ path, t: Date.now() }, ...s.recent.filter((r) => !samePath(r.path, path))].slice(0, 20) });
}
export const isPinned = (p: string) => getSettings().pinned.some((x) => samePath(x, p));
export function togglePin(p: string) {
  const s = getSettings();
  s.set({ pinned: isPinned(p) ? s.pinned.filter((x) => !samePath(x, p)) : [...s.pinned, p] });
}
export function toggleTag(paths: string[], tag: TagId) {
  const s = getSettings();
  const tags = { ...s.tags };
  const all = paths.every((p) => (tags[pk(p)] || []).includes(tag));
  paths.forEach((p) => {
    const k = pk(p); const cur = tags[k] || [];
    const next = all ? cur.filter((x) => x !== tag) : cur.includes(tag) ? cur : [...cur, tag];
    if (next.length) tags[k] = next; else delete tags[k];
  });
  s.set({ tags });
}
export function clearTags(paths: string[]) {
  const s = getSettings(); const tags = { ...s.tags };
  paths.forEach((p) => delete tags[pk(p)]);
  s.set({ tags });
}

/* ------------------------------------------------------------ navigation */
export async function loadDrives() {
  try { S.setState({ drives: await api.getDrives() }); } catch { S.setState({ drives: [] }); }
}
export const errText = (err: unknown): string => {
  const s = String((err as { message?: string })?.message ?? err);
  if (s.includes('exists')) return t('err.exists');
  if (s.includes('invalid-name')) return t('err.invalidName');
  if (s.includes('into-itself')) return t('err.intoItself');
  if (s.includes('cancelled')) return t('op.cancelled');
  if (s.includes('wallpaper-failed')) return t('err.wallpaper');
  if (s.includes('no-extractor')) return t('err.noExtractor');
  if (s.includes('no-winrar')) return t('err.noWinrar');
  if (s.includes('not-found')) return t('err.notFound');
  if (s.includes('compress-failed')) return t('err.compress');
  if (s.includes('bad-regex')) return t('err.regex');
  return s || t('err.generic');
};

const dirsOf = (list: Entry[]): TreeNode[] => list.filter((e) => e.isDir).map((e) => ({ name: e.name, path: e.path, hidden: e.hidden })).sort((a, b) => coll.compare(a.name, b.name));
async function loadTreeChildren(path: string) {
  let nodes: TreeNode[] = [];
  try { nodes = dirsOf(await api.listDir(path)); } catch { /* unreadable */ }
  S.setState((s) => ({ treeCache: { ...s.treeCache, [pk(path)]: nodes } }));
}
export async function toggleTree(path: string) {
  const k = pk(path);
  const open = new Set(st().treeOpen);
  if (open.has(k)) { open.delete(k); S.setState({ treeOpen: open }); return; }
  open.add(k); S.setState({ treeOpen: open });
  if (!st().treeCache[k]) await loadTreeChildren(path);
}
export async function expandNode(path: string) {
  const k = pk(path);
  if (!st().treeOpen.has(k)) S.setState({ treeOpen: new Set(st().treeOpen).add(k) });
  if (!st().treeCache[k]) await loadTreeChildren(path);
}
export async function revealInTree(path: string) {
  const parts = crumbsOf(path);
  const open = new Set(st().treeOpen);
  const need: string[] = [];
  for (const a of parts) { const k = pk(a.path); open.add(k); if (!st().treeCache[k]) need.push(a.path); }
  S.setState({ treeOpen: open });
  await Promise.all(need.map(loadTreeChildren));
}

export interface NavOpts { push?: boolean; silent?: boolean; select?: string[] | null }
export async function navigate(id: PaneId, path: string, { push = true, silent = false, select = null }: NavOpts = {}): Promise<boolean> {
  const token = pane(id).token + 1;
  patch(id, silent ? { token } : { token, loading: true });
  if (!silent) setLoading(true);
  try {
    let entries: Entry[] = [];
    if (isVirtual(path)) await loadDrives(); else entries = await api.listDir(path);
    if (pane(id).token !== token) return false;
    const cur = pane(id);
    const changed = cur.path !== path;
    const sig = entries.length + ':' + entries.reduce((h, e) => (h * 31 + e.size + (e.modified || 0) + e.name.length) % 2147483647, 7);
    if (silent && !changed && !select && !cur.search && !isVirtual(path) && sig === cur.sig) return true;
    let tabs = cur.tabs;
    const i = cur.active;
    if (push && cur.path !== null && changed) tabs = tabs.map((tb, k) => (k === i ? { ...tb, back: [...tb.back, cur.path as string], fwd: [] } : tb));
    tabs = tabs.map((tb, k) => (k === i ? { ...tb, path } : tb));
    const keep = changed ? {} : { selected: new Set([...cur.selected].filter((p) => entries.some((e) => e.path === p))) };
    patch(id, {
      path, entries, search: null, sig, tabs, loading: false,
      ...(changed ? { selected: new Set<string>(), anchor: null, focus: null, filter: '', kind: 'all' as Kind, renaming: null } : keep)
    });
    if (changed) { if (!isVirtual(path)) bumpFrequent(path); void api.watchDir(id, isVirtual(path) ? '' : path).catch(() => {}); }
    if (!isVirtual(path)) S.setState((s) => ({ treeCache: { ...s.treeCache, [pk(path)]: dirsOf(entries) } }));
    if (getSettings().autoExpandTree && !isVirtual(path)) void revealInTree(path);
    if (select?.length) selectPaths(id, select);
    return true;
  } catch (err) {
    if (pane(id).token === token) toast(t('err.path') + ': ' + errText(err), 'error');
    return false;
  } finally {
    if (!silent) { setLoading(false); if (pane(id).token === token) patch(id, { loading: false }); }
  }
}
export const refresh = (id: PaneId, select?: string[]) => { const p = pane(id).path; return p === null ? Promise.resolve(false) : navigate(id, p, { push: false, silent: true, select }); };
export const refreshAll = () => { (['a', 'b'] as PaneId[]).forEach((id) => { if (id === 'a' || getSettings().dualPane) void refresh(id); }); };

export async function goBack(id: PaneId) {
  const tb = activeTab(pane(id));
  if (!tb.back.length) return;
  const target = tb.back[tb.back.length - 1]; const from = pane(id).path;
  if (await navigate(id, target, { push: false })) patchTab(id, (x) => ({ ...x, back: x.back.slice(0, -1), fwd: from === null ? x.fwd : [...x.fwd, from] }));
}
export async function goForward(id: PaneId) {
  const tb = activeTab(pane(id));
  if (!tb.fwd.length) return;
  const target = tb.fwd[tb.fwd.length - 1]; const from = pane(id).path;
  if (await navigate(id, target, { push: false })) patchTab(id, (x) => ({ ...x, fwd: x.fwd.slice(0, -1), back: from === null ? x.back : [...x.back, from] }));
}
export async function jumpHistory(id: PaneId, kind: 'back' | 'fwd', idx: number) {
  const tb = activeTab(pane(id)); const from = pane(id).path as string;
  const list = kind === 'back' ? tb.back : tb.fwd;
  const target = list[idx];
  const nearer = list.slice(idx + 1).reverse();
  if (!(await navigate(id, target, { push: false }))) return;
  patchTab(id, (x) => kind === 'back'
    ? { ...x, back: x.back.slice(0, idx), fwd: [...x.fwd, from, ...nearer] }
    : { ...x, fwd: x.fwd.slice(0, idx), back: [...x.back, from, ...nearer] });
}
export function goUp(id: PaneId) {
  const p = pane(id).path; const par = parentOf(p);
  if (par !== null && p !== '' && p !== null) void navigate(id, par, { select: [p] });
}

/* -------------------------------------------------------------------- tabs */
async function loadTab(id: PaneId, i: number) {
  const tb = pane(id).tabs[i];
  patch(id, { active: i, path: null });
  const ok = await navigate(id, tb.path === null ? '' : tb.path, { push: false });
  // only fall back when this tab is still the active one (a newer click may have superseded this load)
  if (!ok && pane(id).active === i && pane(id).path === null) await navigate(id, '', { push: false });
}
export async function newTab(id: PaneId, path?: string | null) {
  const start = path === undefined || path === null ? pane(id).path || '' : path;
  const p = pane(id);
  patch(id, { tabs: [...p.tabs, { ...newTabObj(start), isNew: true }] });
  await loadTab(id, pane(id).tabs.length - 1);
}
export async function closeTab(id: PaneId, i: number) {
  const p = pane(id);
  if (p.tabs.length === 1) return;
  const wasActive = i === p.active;
  const tabs = p.tabs.filter((_, k) => k !== i);
  if (wasActive) { patch(id, { tabs }); await loadTab(id, Math.min(i, tabs.length - 1)); } else patch(id, { tabs, active: i < p.active ? p.active - 1 : p.active });
}
export async function switchTab(id: PaneId, i: number) { if (i !== pane(id).active && pane(id).tabs[i]) await loadTab(id, i); }
export function moveTab(id: PaneId, from: number, to: number) {
  const p = pane(id);
  if (from === to || to < 0 || to >= p.tabs.length) return;
  const tabs = p.tabs.slice(); const [m] = tabs.splice(from, 1); tabs.splice(to, 0, m);
  const cur = p.tabs[p.active];
  patch(id, { tabs, active: tabs.indexOf(cur) });
}

/* --------------------------------------------------------------- selection */
export function setSelection(id: PaneId, selected: Set<string>, focus: string | null = null, anchor: string | null = null) {
  patch(id, { selected, focus, anchor: anchor ?? pane(id).anchor });
}
export function selectIndex(id: PaneId, i: number, { ctrl = false, shift = false } = {}) {
  const v = getView(id); const e = v.list[i]; const p = pane(id);
  if (!e) return;
  let selected = new Set(p.selected); let anchor = p.anchor;
  if (shift && anchor !== null && v.index.has(anchor)) {
    const ai = v.index.get(anchor) as number;
    const [a, b] = [Math.min(ai, i), Math.max(ai, i)];
    if (!ctrl) selected = new Set();
    for (let k = a; k <= b; k++) selected.add(v.list[k].path);
  } else if (ctrl) {
    if (selected.has(e.path)) selected.delete(e.path); else selected.add(e.path);
    anchor = e.path;
  } else { selected = new Set([e.path]); anchor = e.path; }
  patch(id, { selected, anchor, focus: e.path });
}
export function selectPaths(id: PaneId, paths: string[]) {
  const set = new Set(paths); const v = getView(id);
  const selected = new Set<string>(); let first: string | null = null;
  v.list.forEach((e) => { if (set.has(e.path)) { selected.add(e.path); if (!first) first = e.path; } });
  patch(id, { selected, anchor: first, focus: first, reveal: first ? { path: first, n: Date.now() } : null });
}
export const clearSelection = (id: PaneId) => patch(id, { selected: new Set(), anchor: null, focus: null });
export function selectAll(id: PaneId) { const v = getView(id); patch(id, { selected: new Set(v.list.map((e) => e.path)), focus: pane(id).focus ?? v.list[0]?.path ?? null }); }
export function invertSelection(id: PaneId) { const v = getView(id); const p = pane(id); patch(id, { selected: new Set(v.list.filter((e) => !p.selected.has(e.path)).map((e) => e.path)) }); }
export function selectGroup(id: PaneId, start: number, n: number, additive: boolean) {
  const v = getView(id); const selected = additive ? new Set(pane(id).selected) : new Set<string>();
  for (let k = start; k < start + n && k < v.list.length; k++) selected.add(v.list[k].path);
  patch(id, { selected, anchor: v.list[start]?.path ?? null, focus: v.list[start]?.path ?? null });
}
export function moveFocus(id: PaneId, delta: number, shift: boolean) {
  const v = getView(id); const n = v.list.length; const p = pane(id);
  if (!n) return;
  const cur = p.focus !== null ? v.index.get(p.focus) ?? -1 : -1;
  const i = cur < 0 ? (delta > 0 ? 0 : n - 1) : Math.min(n - 1, Math.max(0, cur + delta));
  selectIndex(id, i, { shift });
  patch(id, { reveal: { path: v.list[i].path, n: Date.now() } });
}
export function focusIndex(id: PaneId, i: number, shift = false) {
  const v = getView(id); if (!v.list.length) return;
  const k = Math.min(v.list.length - 1, Math.max(0, i));
  selectIndex(id, k, { shift }); patch(id, { reveal: { path: v.list[k].path, n: Date.now() } });
}
let typeBuf = ''; let typeTimer = 0;
export function typeAhead(id: PaneId, ch: string) {
  typeBuf += ch.toLowerCase();
  window.clearTimeout(typeTimer);
  typeTimer = window.setTimeout(() => { typeBuf = ''; }, 700);
  const v = getView(id); const i = v.list.findIndex((e) => e.name.toLowerCase().startsWith(typeBuf));
  if (i >= 0) focusIndex(id, i);
}

/* ------------------------------------------------------------ filter/search */
export const setFilter = (id: PaneId, filter: string) => patch(id, { filter });
export const setKind = (id: PaneId, kind: Kind) => patch(id, { kind });
let searchSeq = 0;
export interface DeepSearchOpts { regex: boolean; exts: string[]; minSize?: number; maxSize?: number; after?: number; before?: number }
export async function deepSearch(id: PaneId, query: string, opts: Partial<DeepSearchOpts> = {}) {
  const root = pane(id).path;
  if (!root || isVirtual(root) || (!query && !opts.exts?.length && opts.minSize === undefined && opts.maxSize === undefined && !opts.after && !opts.before)) return;
  setLoading(true);
  try {
    const res = await api.searchDir(root, query, 2000, { id: ++searchSeq, regex: !!opts.regex, exts: opts.exts || [], minSize: opts.minSize, maxSize: opts.maxSize, after: opts.after, before: opts.before });
    patch(id, { entries: res, search: { query: query || t('search.advanced') }, filter: '', selected: new Set(), anchor: null, focus: null });
  } catch (err) {
    if (!String(err).includes('cancelled')) toast(errText(err), 'error');
  } finally { setLoading(false); }
}
export function clearSearch(id: PaneId): boolean {
  const p = pane(id); const had = !!(p.search || p.filter);
  patch(id, { filter: '' });
  if (p.search) void refresh(id);
  return had;
}

/* ------------------------------------------------------------------ actions */
export async function openEntry(e: Entry | undefined, id: PaneId) {
  if (!e) return;
  if (e.isDir) { await navigate(id, e.path); return; }
  try { await api.openItem(e.path); addRecent(e.path); } catch (err) { toast(errText(err), 'error'); }
}
export function openSelection(id: PaneId) {
  const sel = selectedEntries(id);
  if (sel.length === 1) void openEntry(sel[0], id); else sel.filter((e) => !e.isDir).forEach((e) => void openEntry(e, id));
}
export async function openRecent(path: string) {
  try { await api.openItem(path); addRecent(path); }
  catch (err) { getSettings().set({ recent: getSettings().recent.filter((r) => !samePath(r.path, path)) }); toast(errText(err), 'error'); }
}
export const openNewWindow = (path: string | null) => api.newWindow(path).catch((err) => toast(errText(err), 'error'));
export const revealItem = (path: string) => api.revealItem(path).catch((err) => toast(errText(err), 'error'));
export const openWith = (tool: string, path: string) => api.openWith(tool, path).catch((err) => toast(errText(err), 'error'));
export const openRecycle = () => api.openItem('shell:RecycleBinFolder').catch((err) => toast(errText(err), 'error'));
export async function setWallpaper(path: string) { try { await api.setWallpaper(path); toast(t('msg.wallpaper'), 'success'); } catch (err) { toast(errText(err), 'error'); } }

export function copyToClipboard(id: PaneId, cut: boolean) {
  const paths = [...pane(id).selected];
  if (!paths.length) return;
  S.setState({ clip: { paths, cut } });
  toast(cut ? t('msg.cutN', { n: paths.length }) : t('msg.copiedN', { n: paths.length }), 'info', 1800);
}
export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); } catch {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  toast(t('msg.copied'), 'success', 1800);
}
export function copyPaths(id: PaneId) {
  const sel = selectedEntries(id); const p = pane(id).path;
  const list = sel.length ? sel.map((e) => `"${e.path}"`) : p && !isVirtual(p) ? [`"${p}"`] : [];
  if (list.length) void copyText(list.join('\n'));
}

export const confirmDialog = async (o: { title: string; message: string; confirmLabel: string; confirmIcon?: typeof Trash2; tone?: 'info' | 'warning' | 'danger'; icon?: typeof Trash2 }) => {
  const danger = o.tone === 'danger';
  const r = await dialog({
    kind: 'confirm', title: o.title, message: o.message, tone: o.tone || 'info', icon: o.icon,
    buttons: [
      { id: 'cancel', label: t('common.cancel'), icon: X, tone: 'text' },
      { id: 'ok', label: o.confirmLabel, icon: o.confirmIcon || Check, tone: danger ? 'danger' : 'primary' }
    ]
  });
  return r.id === 'ok';
};
export const promptDialog = async (o: { title: string; label: string; value?: string; okLabel?: string; icon?: typeof Trash2 }) => {
  const r = await dialog({
    kind: 'prompt', title: o.title, icon: o.icon, input: { label: o.label, value: o.value || '' },
    buttons: [
      { id: 'cancel', label: t('common.cancel'), icon: X, tone: 'text' },
      { id: 'ok', label: o.okLabel || t('common.ok'), icon: Check, tone: 'primary' }
    ]
  });
  return r.id === 'ok' ? (r.value ?? '').trim() : null;
};

let opTimer = 0;
const startOp = (labelKey: string) => {
  setOp({ title: t(labelKey), name: '', done: 0, total: 0, visible: false });
  opTimer = window.setTimeout(() => patchOp({ visible: true }), 350);
  return () => { window.clearTimeout(opTimer); setOp(null); };
};
export const onFileOp = (p: { done: number; total: number; name: string }) => patchOp({ name: p.name, done: p.done, total: p.total });

function pushUndo(op: UndoOp) { S.setState((s) => ({ undo: [...s.undo, op].slice(-30) })); }

export async function runPaste(sources: string[], dest: string, mv: boolean) {
  let policy = 'rename';
  try {
    const conflicts = await api.checkConflicts(sources, dest);
    if (conflicts.length) {
      const shown = conflicts.slice(0, 3).join(', ') + (conflicts.length > 3 ? ', …' : '');
      const r = await dialog({
        kind: 'confirm', title: t('conflict.title'), message: t('conflict.msg', { n: conflicts.length, names: shown }), tone: 'warning', icon: AlertTriangle,
        buttons: [
          { id: 'cancel', label: t('common.cancel'), icon: X, tone: 'text' },
          { id: 'skip', label: t('conflict.skip'), icon: SkipForward, tone: 'tonal' },
          { id: 'rename', label: t('conflict.both'), icon: CopyIcon, tone: 'tonal' },
          { id: 'replace', label: t('conflict.replace'), icon: Replace, tone: 'danger' }
        ]
      });
      if (r.id === 'cancel') return;
      policy = r.id;
    }
  } catch { /* keep both */ }
  setLoading(true);
  const stop = startOp(mv ? 'op.moving' : 'op.copying');
  try {
    const created = await api.pasteItems(sources, dest, mv, policy);
    pushUndo(mv ? { type: 'move', pairs: sources.map((s, i) => ({ from: s, to: created[i] })).filter((p) => p.to && p.to !== p.from) } : { type: 'create', paths: created });
    if (mv && st().clip?.cut) S.setState({ clip: null });
    toast(t('msg.pasted', { n: created.length }), 'success');
    const a = st().activePane;
    if (pane(a).path === dest) await refresh(a, created);
    refreshAll();
  } catch (err) {
    toast(errText(err), String(err).includes('cancelled') ? 'warning' : 'error');
    refreshAll();
  } finally { stop(); setLoading(false); }
}
export async function pasteClipboard(id: PaneId) {
  const c = st().clip; const p = pane(id).path;
  if (!c || !p || isVirtual(p)) return;
  await runPaste(c.paths, p, c.cut);
}
export async function copyToOtherPane(id: PaneId, mv: boolean) {
  const dest = pane(otherPane(id)).path; const sel = [...pane(id).selected];
  if (!dest || isVirtual(dest) || !sel.length) { toast(t('msg.noTarget'), 'warning'); return; }
  await runPaste(sel, dest, mv);
}

export async function deleteSelection(id: PaneId, permanent: boolean) {
  const sel = selectedEntries(id);
  if (!sel.length) return;
  if (permanent || getSettings().confirmDelete) {
    const one = sel.length === 1;
    const ok = await confirmDialog({
      title: permanent ? t('confirm.permTitle') : t('confirm.title'), tone: 'danger', icon: Trash2, confirmIcon: Trash2,
      message: permanent ? (one ? t('confirm.permOne', { name: sel[0].name }) : t('confirm.permMany', { n: sel.length })) : (one ? t('confirm.one', { name: sel[0].name }) : t('confirm.many', { n: sel.length })),
      confirmLabel: permanent ? t('cmd.deletePerm') : t('cmd.delete')
    });
    if (!ok) return;
  }
  setLoading(true);
  try {
    await api.deleteItems(sel.map((e) => e.path), permanent);
    clearSelection(id);
    toast(t('msg.deleted'), 'success');
  } catch (err) { toast(errText(err), 'error'); } finally { setLoading(false); refreshAll(); }
}

export const NEW_NAMES: Record<string, string> = { folder: 'name.newFolder', text: 'name.newText', markdown: 'name.newMarkdown', json: 'name.newJson', html: 'name.newHtml', csv: 'name.newCsv' };
export async function newItem(id: PaneId, kind: string) {
  const p = pane(id).path;
  if (!p || isVirtual(p)) return;
  try {
    const path = await api.createItem(p, t(NEW_NAMES[kind] || NEW_NAMES.text), kind === 'folder');
    pushUndo({ type: 'create', paths: [path] });
    patch(id, { filter: '' });
    await refresh(id, [path]);
    patch(id, { renaming: path });
  } catch (err) { toast(errText(err), 'error'); }
}
export const beginRename = (id: PaneId, path: string) => patch(id, { renaming: path, reveal: { path, n: Date.now() } });
export const cancelRename = (id: PaneId) => patch(id, { renaming: null });
export async function commitRename(id: PaneId, path: string, newName: string) {
  patch(id, { renaming: null });
  const e = pane(id).entries.find((x) => x.path === path);
  if (!e || !newName || newName === e.name) return;
  try {
    const np = await api.renameItem(path, newName);
    pushUndo({ type: 'rename', from: path, to: np });
    await refresh(id, [np]);
  } catch (err) { toast(errText(err), 'error'); }
}
export async function renameSelection(id: PaneId) {
  const sel = selectedEntries(id);
  if (sel.length === 1) { beginRename(id, sel[0].path); return; }
  if (sel.length < 2) return;
  const base = await promptDialog({ title: t('rename.title', { n: sel.length }), label: t('rename.label'), icon: Pencil, okLabel: t('cmd.rename') });
  if (!base) return;
  setLoading(true);
  const pairs: { from: string; to: string }[] = [];
  try {
    for (let i = 0; i < sel.length; i++) {
      const e = sel[i]; const dot = e.name.lastIndexOf('.');
      const ext = !e.isDir && dot > 0 ? e.name.slice(dot) : '';
      pairs.push({ from: e.path, to: await api.renameItem(e.path, `${base} (${i + 1})${ext}`) });
    }
  } catch (err) { toast(errText(err), 'error'); } finally {
    if (pairs.length) pushUndo({ type: 'rename-many', pairs });
    setLoading(false);
    await refresh(id, pairs.map((p) => p.to));
  }
}

export async function undoLast() {
  const ops = st().undo; const op = ops[ops.length - 1];
  S.setState({ undo: ops.slice(0, -1) });
  if (!op) { toast(t('msg.nothingUndo'), 'warning'); return; }
  setLoading(true);
  try {
    if (op.type === 'rename') await api.renameItem(op.to, baseName(op.from));
    else if (op.type === 'rename-many') for (const p of op.pairs.slice().reverse()) await api.renameItem(p.to, baseName(p.from));
    else if (op.type === 'move') for (const p of op.pairs) await api.pasteItems([p.to], parentOf(p.from) || '', true, 'rename');
    else await api.deleteItems(op.paths, false);
    toast(t('msg.undone'), 'success');
  } catch (err) { toast(errText(err), 'error'); } finally { setLoading(false); refreshAll(); }
}

export async function extractArchive(id: PaneId, e: Entry, toFolder: boolean) {
  setLoading(true);
  try {
    const out = await api.extractArchive(e.path, parentOf(e.path) || (pane(id).path as string), toFolder);
    toast(t('msg.extracted'), 'success');
    await refresh(id, toFolder ? [out] : undefined);
  } catch (err) { toast(errText(err), 'error'); } finally { setLoading(false); }
}
export async function compressSelection(id: PaneId, kind: 'zip' | 'rar') {
  const sel = selectedEntries(id); const p = pane(id).path;
  if (!sel.length || !p) return;
  const name = sel.length === 1 ? (sel[0].isDir ? sel[0].name : stripExt(sel[0].name)) : baseName(p) || 'Archive';
  setLoading(true);
  try {
    const out = await api.compressItems(sel.map((e) => e.path), p, name, kind);
    pushUndo({ type: 'create', paths: [out] });
    toast(t('msg.compressed'), 'success');
    await refresh(id, [out]);
  } catch (err) { toast(errText(err), 'error'); } finally { setLoading(false); }
}

export function showProperties(id: PaneId, only?: Entry[]) {
  const p = pane(id);
  const sel = only || selectedEntries(id);
  if (sel.length) { openModal('props', { targets: sel }); return; }
  if (p.path && !isVirtual(p.path)) openModal('props', { targets: [{ name: baseName(p.path), path: p.path, isDir: true, size: 0, modified: null, created: null, hidden: false, readonly: false } as Entry] });
}
export function showDriveProperties(d: Drive) { openModal('props', { drive: d }); }
export const previewEntry = (e: Entry | undefined) => { if (e && !e.isDir) openModal('lightbox', e); };

/* ------------------------------------------------------- sidebar + helpers */
export const setActivePane = (id: PaneId) => { if (st().activePane !== id) S.setState({ activePane: id }); };

/* -------------------------------------------------------------------- init */
export async function initExplorer() {
  const [places, drives, start, tools] = await Promise.all([
    api.getPlaces().catch(() => []), api.getDrives().catch(() => []), api.startupPath().catch(() => null),
    api.toolsAvailable().catch(() => st().tools)
  ]);
  S.setState({ places, drives, tools });
  const s = getSettings();
  const sess = s.session.a;
  if (!start && s.restoreTabs && sess && sess.paths.length) {
    const tabs = sess.paths.map((p) => newTabObj(p));
    const active = Math.min(sess.active, tabs.length - 1);
    patch('a', { tabs, active });
    const ok = await navigate('a', tabs[active].path || HOME, { push: false });
    if (!ok) await navigate('a', HOME, { push: false });
  } else {
    patch('a', { tabs: [newTabObj(start || HOME)], active: 0 });
    const ok = await navigate('a', start || HOME, { push: false });
    if (!ok) await navigate('a', '', { push: false });
  }
  S.setState({ ready: true });
  // keep the saved tab session fresh
  S.subscribe((state, prev) => {
    if (state.panes.a.tabs === prev.panes.a.tabs && state.panes.a.active === prev.panes.a.active && state.panes.a.path === prev.panes.a.path) return;
    const a = state.panes.a;
    if (getSettings().restoreTabs) useSettings.getState().set({ session: { a: { paths: a.tabs.map((x) => x.path || HOME), active: a.active } } });
  });
}
export async function ensureSecondPane() {
  const b = pane('b');
  if (b.path === null) await navigate('b', pane('a').path || HOME, { push: false });
}

/** Drop a folder from the sidebar tree cache so the next expand re-reads it (called by the file watcher). */
export function toggleTreeRefresh(path: string) {
  const k = pk(path);
  if (!st().treeCache[k]) return;
  void loadTreeChildren(path);
}
