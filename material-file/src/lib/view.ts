import type { Entry, GroupBy, Kind, SortKey } from './types';
import type { Settings } from '../store/settings';
import { catOf, catOfExt, KIND_CATS } from './fileTypes';
import { coll } from './format';
import { extOf, isVirtual, pk, stripExt } from './paths';
import { translate } from './i18n';

const labelCache = new WeakMap<Entry, { lang: string; label: string }>();
/** Human readable type ("PNG image", "File folder"), memoised because sorting calls it a lot. */
export function typeLabel(e: Entry, lang: string): string {
  const c = labelCache.get(e);
  if (c && c.lang === lang) return c.label;
  const tr = (k: string, v?: Record<string, string | number>) => translate(lang, k, v);
  let r: string;
  if (e.isDir) r = tr('type.folder');
  else {
    const ext = extOf(e.name);
    const cat = catOfExt(ext);
    r = !ext ? tr('type.plain') : cat ? tr('type.cat', { ext: ext.toUpperCase(), cat: tr('cat.' + cat) }) : tr('type.file', { ext: ext.toUpperCase() });
  }
  labelCache.set(e, { lang, label: r });
  return r;
}

export const shownName = (e: Entry, showExt: boolean) => (e.isDir || showExt ? e.name : stripExt(e.name));

export interface Layout { view: Settings['view']; sortKey: SortKey; sortDir: 'asc' | 'desc'; groupBy: GroupBy }
/** Layout of a folder: the remembered one when "remember layout per folder" is on, else the global one. */
export function layoutOf(s: Pick<Settings, 'view' | 'sortKey' | 'sortDir' | 'groupBy' | 'layouts' | 'rememberLayouts'>, path: string | null): Layout {
  const l = s.rememberLayouts && path && !isVirtual(path) ? s.layouts[pk(path)] : undefined;
  return { view: l?.view ?? s.view, sortKey: l?.sortKey ?? s.sortKey, sortDir: l?.sortDir ?? s.sortDir, groupBy: l?.groupBy ?? s.groupBy };
}

export interface GroupInfo { label: string; count: number; start: number }
export interface ViewResult { list: Entry[]; groups: Map<number, GroupInfo>; index: Map<string, number> }
export interface ViewOpts {
  filter: string; kind: Kind; lang: string; showHidden: boolean; layout: Layout; tags: Settings['tags'];
}

function groupOf(e: Entry, by: GroupBy, lang: string): { key: string; label: string } {
  const tr = (k: string) => translate(lang, k);
  switch (by) {
    case 'name': {
      const c = (e.name[0] || '#').toUpperCase();
      const l = /\p{L}/u.test(c) ? c : '#';
      return { key: (l === '#' ? '0' : '1') + l, label: l };
    }
    case 'type': {
      const l = typeLabel(e, lang);
      return { key: (e.isDir ? '0' : '1') + l.toLowerCase(), label: l };
    }
    case 'modified': {
      const day = (ms: number) => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
      const diff = e.modified ? Math.round((day(Date.now()) - day(e.modified)) / 86400000) : 99999;
      const b = diff <= 0 ? 0 : diff === 1 ? 1 : diff < 7 ? 2 : diff < 30 ? 3 : diff < 365 ? 4 : 5;
      return { key: String(b), label: tr(['grp.today', 'grp.yesterday', 'grp.week', 'grp.month', 'grp.year', 'grp.old'][b]) };
    }
    case 'size': {
      const s = e.size;
      const b = e.isDir ? 0 : s === 0 ? 1 : s < 16384 ? 2 : s < 1048576 ? 3 : s < 134217728 ? 4 : s < 1073741824 ? 5 : s < 4294967296 ? 6 : 7;
      return { key: String(b), label: tr(['grp.unspecified', 'grp.empty', 'grp.tiny', 'grp.small', 'grp.medium', 'grp.large', 'grp.huge', 'grp.gigantic'][b]) };
    }
    default: return { key: '', label: '' };
  }
}

export function computeView(entries: Entry[], o: ViewOpts): ViewResult {
  let list = entries;
  if (!o.showHidden) list = list.filter((e) => !e.hidden);
  if (o.filter) { const q = o.filter.toLowerCase(); list = list.filter((e) => e.name.toLowerCase().includes(q)); }
  if (o.kind !== 'all') {
    const k = o.kind;
    list = list.filter((e) => {
      if (k === 'folders') return e.isDir;
      if (k === 'tagged') return (o.tags[pk(e.path)] || []).length > 0;
      if (k.startsWith('tag-')) return (o.tags[pk(e.path)] || []).includes(k.slice(4) as never);
      return e.isDir || (KIND_CATS[k] || []).includes(catOf(e)); // folders stay visible so you can keep navigating
    });
  }
  const { sortKey, sortDir, groupBy } = o.layout;
  const dir = sortDir === 'asc' ? 1 : -1;
  list = list.slice().sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    let r = 0;
    switch (sortKey) {
      case 'modified': r = (a.modified || 0) - (b.modified || 0); break;
      case 'created': r = (a.created || 0) - (b.created || 0); break;
      case 'type': r = coll.compare(typeLabel(a, o.lang), typeLabel(b, o.lang)); break;
      case 'size': r = a.size - b.size; break;
    }
    if (r === 0) r = coll.compare(a.name, b.name);
    return r * dir;
  });
  const groups = new Map<number, GroupInfo>();
  if (groupBy !== 'none') {
    const keyed = list.map((e) => ({ e, g: groupOf(e, groupBy, o.lang) }));
    keyed.sort((a, b) => { const r = a.g.key < b.g.key ? -1 : a.g.key > b.g.key ? 1 : 0; return sortDir === 'desc' ? -r : r; });
    list = keyed.map((k) => k.e);
    let prev: string | null = null; let cur: GroupInfo | null = null;
    keyed.forEach((k, i) => {
      if (k.g.key !== prev) { prev = k.g.key; cur = { label: k.g.label, count: 0, start: i }; groups.set(i, cur); }
      cur!.count++;
    });
  }
  return { list, groups, index: new Map(list.map((e, i) => [e.path, i])) };
}
