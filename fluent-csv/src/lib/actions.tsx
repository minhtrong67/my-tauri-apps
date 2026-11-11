// App level actions used by commands, menus, keyboard and components.
import { app, cur, saveSettings, rebuildView, setSel, startEdit, visCols, emit, DEFAULTS, type Doc, type Settings } from './store';
import { setLang } from './i18n';
import { t } from './i18n';
import * as IO from './io';
import * as O from './ops';
import * as TH from './theme';
import { toast, openModal } from './overlay';
import { clamp, fmtNum } from './util';
import { confirmDialog, promptDialog } from '../components/Dialogs';
import { SettingsDialog } from '../components/Settings';
import { ShortcutsDialog, PaletteDialog, StatsDialog } from '../components/Panels';
import { flushDrafts } from './recovery';

/* ------------------------------ tabs ------------------------------ */

export function activate(d: Doc | null) {
  const el = document.querySelector('[data-scroll-main]') as HTMLElement | null;
  if (app.doc && el) app.doc.scroll = { top: el.scrollTop, left: el.scrollLeft };
  app.doc = d;
  app.editing = null;
  emit();
}

export async function closeTab(d: Doc | null): Promise<boolean> {
  if (!d) return false;
  if (d.dirty) {
    app.doc = d; emit();
    const r = await confirmDialog({
      title: t('unsaved.title'), body: t('unsaved.body', { name: d.name }), tone: 'warning',
      buttons: [
        { id: 'save', label: t('save'), icon: 'save', variant: 'primary' },
        { id: 'discard', label: t('dontSave'), icon: 'trash', variant: 'danger' },
        { id: 'cancel', label: t('cancel'), icon: 'x', variant: 'tonal' },
      ],
    });
    if (r === 'cancel') return false;
    if (r === 'save' && !(await IO.saveDoc(d))) return false;
  }
  const i = app.docs.indexOf(d);
  app.docs.splice(i, 1);
  if (app.doc === d) app.doc = app.docs[i] || app.docs[i - 1] || null;
  emit();
  flushDrafts();
  return true;
}

export function cycleTab(dir: number) {
  if (app.docs.length < 2) return;
  const i = app.docs.indexOf(app.doc!);
  activate(app.docs[(i + dir + app.docs.length) % app.docs.length]);
}

/* ------------------------------ view / data ------------------------------ */

export function setSort(c: number, dir: number) {
  const d = cur(); if (!d) return;
  d.sc = c; d.sd = dir; rebuildView(d); emit();
}
export function toggleSort(c: number) {
  const d = cur(); if (!d) return;
  if (d.sc === c) { if (d.sd === 1) d.sd = -1; else d.sc = -1; } else { d.sc = c; d.sd = 1; }
  rebuildView(d); emit();
}
export function viewChanged() { const d = cur(); if (d) { rebuildView(d); emit(); } }

export function hideCols() {
  const d = cur(), s = d && O.selection(d);
  if (!d || !s) return;
  if (s.cols.length >= visCols(d).length) return toast(t('keepOneCol'), 'warning');
  d.hidden = new Set([...d.hidden, ...s.cols]);
  rebuildView(d); emit();
}
export function toggleColVisible(i: number) {
  const d = cur(); if (!d) return;
  if (!d.hidden.has(i) && d.hidden.size >= d.head.length - 1) return toast(t('keepOneCol'), 'warning');
  d.hidden = new Set(d.hidden);
  if (d.hidden.has(i)) d.hidden.delete(i); else d.hidden.add(i);
  rebuildView(d); emit();
}
export function showAllCols() { const d = cur(); if (d) { d.hidden = new Set(); rebuildView(d); emit(); } }

export function toggleFilterRow() { const d = cur(); if (d) { d.showFilterRow = !d.showFilterRow; emit(); } }
export function toggleAdvFilter() {
  const d = cur(); if (!d) return;
  app.advOpen = !app.advOpen;
  if (app.advOpen && !d.flt.length) d.flt.push({ c: 0, o: 'ct', v: '' });
  emit();
}
export function clearFilters() { const d = cur(); if (!d) return; d.flt = []; d.cf = {}; d.sc = -1; rebuildView(d); emit(); }
export function toggleFreeze() { const d = cur(); if (d) { d.freeze = !d.freeze; emit(); } }
export function setMode(m: 'table' | 'cards' | 'list') { app.mode = m; emit(); }
export function toggleDetails() { app.settings.details = !app.settings.details; saveSettings(); }
export function zoom(delta: number) { app.settings.zoom = delta === 0 ? 100 : clamp(app.settings.zoom + delta, 60, 200); saveSettings(); }

export function selectAll() {
  const d = cur(); if (!d || !d.view.length) return;
  setSel(0, 0, d.view.length - 1, visCols(d).length - 1);
}
export const beginEdit = () => startEdit();

export function autoFitColumn(vi: number) {
  const d = cur(); if (!d) return;
  const c = visCols(d)[vi]; if (c == null) return;
  let m = String(d.head[c]).length + 4;
  const lim = Math.min(d.rows.length, 400);
  for (let i = 0; i < lim; i++) m = Math.max(m, String(d.rows[i][c] ?? '').length);
  d.widths = d.widths.slice();
  d.widths[c] = clamp(m * 8 + 36, 60, 520);
  emit();
}

export function scrollToTop() {
  document.querySelectorAll('[data-scroll-main]').forEach(el => (el as HTMLElement).scrollTo({ top: 0, behavior: app.settings.anim ? 'smooth' : 'auto' }));
}

/* ------------------------------ prompts ------------------------------ */

export async function renameCol(c: number) {
  const d = cur();
  if (!d || c == null || c < 0) return;
  const v = await promptDialog({ title: t('c.cols.rename'), label: t('rename.label'), value: d.head[c], icon: 'pencil' });
  if (v != null) O.renameCol(c, v);
  app.focusGrid++; emit();
}

export async function gotoRow() {
  const d = cur(); if (!d) return;
  const v = await promptDialog({ title: t('c.data.goto'), label: t('goto.label', { n: fmtNum(d.rows.length) }), type: 'number', min: 1, max: d.rows.length, icon: 'goto' });
  if (v == null || v === '') return;
  const vi = d.view.indexOf(clamp(parseInt(v, 10) || 1, 1, d.rows.length) - 1);
  if (vi < 0) toast(t('goto.hidden'), 'warning'); else setSel(vi, 0, vi, 0);
  app.focusGrid++; emit();
}

/* ------------------------------ dialogs ------------------------------ */

export const openSettings = (page?: string) => { openModal(close => <SettingsDialog initialPage={page} onClose={close} />, { size: 'xl', className: 'p-0' }); };
export const openShortcuts = () => { openModal(close => <ShortcutsDialog onClose={close} />, { size: 'lg' }); };
export const openPalette = () => { openModal(close => <PaletteDialog onClose={close} />, { size: 'md', align: 'top', className: 'p-0' }); };
export const openStats = () => { const d = cur(); if (d && d.sel.ar >= 0) openModal(close => <StatsDialog onClose={close} />, { size: 'md' }); };

export function openFind(replace: boolean) {
  const f = app.find;
  f.open = true; f.replace = replace; app.findFocus++;
  emit();
}

/* ------------------------------ clipboard ------------------------------ */

export async function clipboard(kind: 'cut' | 'copy' | 'copyh' | 'paste') {
  if (kind === 'paste') {
    try { O.pasteText(await navigator.clipboard.readText()); } catch { toast(t('clipDenied'), 'error'); }
    return;
  }
  const text = O.selectionText(kind === 'copyh');
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  if (kind === 'cut') O.clearSelection();
}

/* ------------------------------ settings ------------------------------ */

export function applySetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  app.settings[key] = value;
  saveSettings();
  switch (key) {
    case 'theme': TH.applyTheme(); break;
    case 'accent': TH.applyAccent(); break;
    case 'material': TH.applyMaterial(); break;
    case 'anim': case 'zebra': case 'gridLines': TH.applyAppearance(); break;
    case 'font': case 'fontSize': TH.applyTypography(); break;
    case 'lang': setLang(app.settings.lang); break;
    case 'windowMode': TH.applyWindowMode(); break;
  }
}

export function resetSettings() {
  const keep = app.settings.recent;
  Object.assign(app.settings, DEFAULTS, { recent: keep });
  saveSettings();
  setLang(app.settings.lang);
  TH.applyAppearance();
}

export function cycleTheme() { applySetting('theme', { system: 'light', light: 'dark', dark: 'system' }[app.settings.theme] as Settings['theme']); }
export function toggleLang() { applySetting('lang', document.documentElement.lang === 'vi' ? 'en' : 'vi'); }
export const toggleFullscreen = () => TH.toggleFullscreen();
