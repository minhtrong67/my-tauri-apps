import './styles/fonts.css';
import './styles/base.css';
import './styles/app.css';
import './styles/views.css';
import './styles/expressive.css';
import { bus } from './bus';
import { applyI18n, onLang, setLang, t, type Key } from './i18n';
import { settings, update } from './settings';
import { applyTheme, isDark, onThemeApplied } from './theme';
import { hydrateIcons, icon, type IconName } from './icons';
import { $, copyText, dialog, esc, h, initRipple, menu, toast } from './ui';
import { createEditor, ed, errText } from './editor';
import * as docs from './docs';
import * as act from './actions';
import { analyze, byteLength, formatBytes, formatPath, pathAt, statsOf } from './json';
import { initTooltips } from './tooltip';
import { openPalette, type Command } from './palette';
import { currentView, setView, VIEWS, type ViewName } from './nav';
import { initWindow, isTauri, launchFiles, onCloseRequested, onFilesDropped, onOpenFiles, pickFiles, setWindowTitle } from './tauri';
import { mountTree } from './views/tree';
import { mountQuery } from './views/query';
import { mountCompare } from './views/compare';
import { mountConvert } from './views/convert';
import { mountSchema } from './views/schema';
import { mountSettings } from './views/settings';

/* ───────────────────────── boot: theme + language first ───────────────────────── */
setLang(settings.lang);
applyTheme();
onLang(() => bus.emit('lang'));
onThemeApplied(() => { if (ed.view) ed.syncConfig(); });

hydrateIcons();
applyI18n(document);
initRipple();
initTooltips();

// Never let a stray error freeze the UI: report it as a toast and keep going.
let lastErr = 0;
const onFault = (e: unknown) => {
  console.error(e);
  if (Date.now() - lastErr > 4000) { lastErr = Date.now(); toast(t('toast.runtime'), 'error'); }
};
window.addEventListener('error', (e) => onFault(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => onFault(e.reason));

/* ───────────────────────────── editor ───────────────────────────── */
createEditor($('#editor-host'), { change: docs.onEditorChange, selection: () => paintCursor() });
mountTree($('#pane-tree'));
mountQuery($('#view-query'));
mountCompare($('#view-compare'));
mountConvert($('#view-convert'));
mountSchema($('#view-schema'));
mountSettings($('#view-settings'));

/* ───────────────────────────── navigation rail ───────────────────────────── */
const NAV: { id: ViewName; icon: IconName; key: Key }[] = [
  { id: 'editor', icon: 'braces', key: 'nav.editor' }, { id: 'query', icon: 'query', key: 'nav.query' },
  { id: 'compare', icon: 'compare', key: 'nav.compare' }, { id: 'convert', icon: 'convert', key: 'nav.convert' },
  { id: 'schema', icon: 'schema', key: 'nav.schema' },
];
const rail = $('#rail');
function paintRail() {
  const item = (n: { id: ViewName; icon: IconName; key: Key }) =>
    `<button class="nav-item" data-view="${n.id}" aria-current="${currentView() === n.id}"><span class="pill">${icon(n.icon)}</span><span class="nav-label">${esc(t(n.key))}</span></button>`;
  rail.innerHTML = `<div class="rail-main">${NAV.map(item).join('')}</div><div class="rail-end">${item({ id: 'settings', icon: 'settings', key: 'nav.settings' })}</div>`;
}
rail.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('[data-view]'); if (b) setView(b.dataset.view as ViewName); });
bus.on('view', (v: ViewName) => {
  paintRail();
  for (const name of VIEWS) {
    const s = $(`#view-${name}`);
    const on = name === v;
    if (on && !s.classList.contains('active')) { s.classList.remove('enter'); void s.offsetWidth; s.classList.add('active', 'enter'); }
    else if (!on) s.classList.remove('active', 'enter');
  }
  if (v === 'editor') { requestAnimationFrame(() => ed.measure()); }
});
paintRail();
$('#view-editor').classList.add('active', 'enter');

/* ───────────────────────────── toolbar ───────────────────────────── */
interface Tool { id: string; icon: IconName; key: Key; run: (b: HTMLElement) => void; toggle?: () => boolean; sep?: boolean; hint?: string }
const TOOLS: Tool[] = [
  { id: 'format', icon: 'wand', key: 'act.format', run: act.format, hint: 'Alt+Shift+F' },
  { id: 'minify', icon: 'minify', key: 'act.minify', run: act.minify, hint: 'Alt+Shift+M' },
  { id: 'sort', icon: 'sortAsc', key: 'act.sort', run: (b) => menu(b, [
    { label: t('act.sortAsc'), icon: 'sortAsc', onClick: () => act.sortKeys('asc') }, { label: t('act.sortDesc'), icon: 'sortDesc', onClick: () => act.sortKeys('desc') }]) },
  { id: 'repair', icon: 'tool', key: 'act.repair', run: act.repair },
  { id: 'escape', icon: 'quote', key: 'act.escape', run: act.escapeSel, sep: true },
  { id: 'unescape', icon: 'eraser', key: 'act.unescape', run: act.unescapeSel },
  { id: 'undo', icon: 'undo', key: 'act.undo', run: () => { ed.undo(); ed.focus(); }, sep: true },
  { id: 'redo', icon: 'redo', key: 'act.redo', run: () => { ed.redo(); ed.focus(); } },
  { id: 'find', icon: 'search', key: 'act.find', run: () => { ed.find(); }, hint: 'Ctrl+F' },
  { id: 'fold', icon: 'fold', key: 'act.foldAll', run: () => ed.foldAll() },
  { id: 'unfold', icon: 'unfold', key: 'act.unfoldAll', run: () => ed.unfoldAll() },
  { id: 'wrap', icon: 'wrap', key: 'act.wrap', run: () => { update({ wrap: !settings.wrap }); ed.syncConfig(); paintToolbar(); }, toggle: () => settings.wrap, sep: true },
  { id: 'copy', icon: 'copy', key: 'act.copy', run: () => { void act.copyDoc(); } },
  { id: 'paste', icon: 'paste', key: 'act.paste', run: () => { void act.pasteDoc(); } },
  { id: 'stats', icon: 'stats', key: 'act.stats', run: () => showStats() },
];
const toolbar = $('#toolbar');
function paintToolbar() {
  toolbar.innerHTML = TOOLS.map((x) => `${x.sep ? '<span class="tb-sep"></span>' : ''}<button class="icon-btn${x.toggle ? ' toggle' : ''}" data-tool="${x.id}" ${x.toggle ? `aria-pressed="${x.toggle()}"` : ''} title="${esc(t(x.key))}${x.hint ? ` (${x.hint})` : ''}" aria-label="${esc(t(x.key))}">${icon(x.icon)}</button>`).join('')
    + `<span class="grow"></span><div class="seg" id="mode-seg" role="radiogroup">${(['code', 'split', 'tree'] as const).map((m) => `<button role="radio" data-mode="${m}" aria-pressed="${settings.viewMode === m}">${icon(m === 'code' ? 'code' : m === 'split' ? 'split' : 'tree')}<span>${esc(t(`view.${m}` as Key))}</span></button>`).join('')}</div>`;
}
toolbar.addEventListener('click', (e) => {
  const tg = e.target as HTMLElement;
  const mode = tg.closest<HTMLElement>('[data-mode]');
  if (mode) { update({ viewMode: mode.dataset.mode as typeof settings.viewMode }); applyMode(); paintToolbar(); return; }
  const b = tg.closest<HTMLElement>('[data-tool]');
  if (b) TOOLS.find((x) => x.id === b.dataset.tool)!.run(b);
});

/* ───────────────────────────── panes / splitter ───────────────────────────── */
const panes = $('#panes');
function applyMode() {
  panes.dataset.mode = settings.viewMode;
  panes.style.setProperty('--split', String(settings.splitRatio));
  requestAnimationFrame(() => ed.measure());
}
const splitter = $('#splitter');
splitter.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  splitter.setPointerCapture(e.pointerId);
  panes.classList.add('dragging');
  const vertical = getComputedStyle(panes).flexDirection === 'column';
  const move = (ev: PointerEvent) => {
    const r = panes.getBoundingClientRect();
    const ratio = vertical ? (ev.clientY - r.top) / r.height : (ev.clientX - r.left) / r.width;
    panes.style.setProperty('--split', String(Math.min(0.8, Math.max(0.2, ratio))));
  };
  const up = () => {
    splitter.removeEventListener('pointermove', move); splitter.removeEventListener('pointerup', up);
    panes.classList.remove('dragging');
    update({ splitRatio: Number(panes.style.getPropertyValue('--split')) || settings.splitRatio });
    ed.measure();
  };
  splitter.addEventListener('pointermove', move); splitter.addEventListener('pointerup', up);
});
splitter.addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
  e.preventDefault();
  const d = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -0.03 : 0.03;
  update({ splitRatio: Math.min(0.8, Math.max(0.2, settings.splitRatio + d)) }); applyMode();
});

/* ───────────────────────────── tabs ───────────────────────────── */
const tabsEl = $('#tabs');
const tabEls = new Map<string, HTMLElement>();
function paintTabs() {
  const cur = docs.active();
  const ids = new Set(docs.docs.map((d) => d.id));
  for (const [id, node] of tabEls) {
    if (!ids.has(id)) {
      tabEls.delete(id);
      node.classList.add('closing');
      setTimeout(() => node.remove(), settings.motion ? 180 : 0);
    }
  }
  let prev: HTMLElement | null = null;
  for (const d of docs.docs) {
    let node = tabEls.get(d.id);
    if (!node) {
      node = h(`<div class="tab new" role="tab" data-id="${d.id}"><span class="tab-ic">${icon('file')}</span><span class="tab-name"></span><span class="tab-dot"></span><button class="tab-x" tabindex="-1">${icon('close')}</button></div>`);
      tabEls.set(d.id, node);
      node.addEventListener('animationend', () => node!.classList.remove('new'), { once: true });
    }
    const name = docs.displayName(d);
    (node.querySelector('.tab-name') as HTMLElement).textContent = name;
    node.title = d.path ?? name;
    node.classList.toggle('active', d === cur);
    node.classList.toggle('dirty', d.dirty);
    node.setAttribute('aria-selected', String(d === cur));
    (node.querySelector('.tab-x') as HTMLElement).title = t('tab.close');
    const anchor: ChildNode | null = prev ? prev.nextSibling : tabsEl.firstChild;
    if (node.parentElement !== tabsEl || anchor !== node) tabsEl.insertBefore(node, anchor);
    prev = node;
  }
  tabEls.get(cur?.id)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const title = `${cur.dirty ? '● ' : ''}${docs.displayName(cur)} — ${t('win.title')}`;
  void setWindowTitle(title);
}
tabsEl.addEventListener('click', (e) => {
  const tab = (e.target as HTMLElement).closest<HTMLElement>('.tab');
  if (!tab) return;
  if ((e.target as HTMLElement).closest('.tab-x')) void docs.close(tab.dataset.id!);
  else { docs.switchTo(tab.dataset.id!); ed.focus(); setView('editor'); }
});
tabsEl.addEventListener('auxclick', (e) => { const tab = (e.target as HTMLElement).closest<HTMLElement>('.tab'); if (tab && e.button === 1) { e.preventDefault(); void docs.close(tab.dataset.id!); } });
tabsEl.addEventListener('dblclick', (e) => { if (e.target === tabsEl) docs.create(''); });
tabsEl.addEventListener('wheel', (e) => { if (e.deltaY) { tabsEl.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
bus.on('docs', paintTabs);

/* ───────────────────────────── app bar ───────────────────────────── */
const openFiles = async () => { try { docs.openLoaded(await pickFiles()); setView('editor'); } catch { toast(t('toast.readError'), 'error'); } };
$('#btn-new').addEventListener('click', () => { docs.create(''); setView('editor'); ed.focus(); });
$('#btn-newtab').addEventListener('click', () => { docs.create(''); setView('editor'); ed.focus(); });
$('#btn-open').addEventListener('click', openFiles);
$('#btn-save').addEventListener('click', () => { void docs.save(); });
$('#btn-recent').addEventListener('click', (e) => {
  const list = docs.recent();
  menu(e.currentTarget as HTMLElement, list.length
    ? [...list.map((p) => ({ label: p.replace(/^.*[\\/]/, ''), icon: 'file' as IconName, hint: '', onClick: () => { void docs.openPaths([p]); setView('editor'); } })),
      { divider: true }, { label: t('recent.clear'), icon: 'trash' as IconName, onClick: docs.clearRecent }]
    : [{ label: t('recent.empty'), disabled: true }], 'end');
});
$('#btn-more').addEventListener('click', (e) => {
  menu(e.currentTarget as HTMLElement, [
    { label: t('act.saveAs'), icon: 'saveAll', hint: 'Ctrl+Shift+S', onClick: () => { void docs.save(docs.active(), true); } },
    { label: t('act.stats'), icon: 'stats', onClick: showStats },
    { divider: true },
    { label: t('act.close'), icon: 'close', hint: 'Ctrl+W', onClick: () => { void docs.close(docs.active().id); } },
  ], 'end');
});

/* ───────────────────────────── status bar ───────────────────────────── */
const status = $('#status');
let lastValid: 'ok' | 'bad' | 'empty' | '' = '';
function paintStatus() {
  const text = ed.text();
  const r = analyze(text);
  const kind = r.empty ? 'empty' : r.ok ? 'ok' : 'bad';
  const pop = kind !== lastValid ? ' pop' : '';
  lastValid = kind;
  const chip = r.empty ? `<span class="st-chip empty">${icon('info')}${esc(t('st.empty'))}</span>`
    : r.ok ? `<span class="st-chip ok${pop}">${icon('ok')}${esc(t('st.valid'))}</span>`
    : `<button class="st-chip bad${pop}" id="st-err" title="${esc(errText(r.error!))}">${icon('error')}<span class="st-msg">${esc(errText(r.error!))}</span><em>${r.error!.line}:${r.error!.col}</em></button>${r.repairable ? `<button class="st-fix" id="st-fix">${icon('tool')}${esc(t('st.fix'))}</button>` : ''}`;
  status.innerHTML = `${chip}<button class="st-path" id="st-path" title="${esc(t('st.path'))}" hidden></button><span class="grow"></span><span class="st-item" id="st-pos"></span><span class="st-item st-hide" id="st-lines">${esc(t('st.lines', { n: ed.state.doc.lines }))}</span><span class="st-item st-hide">${formatBytes(byteLength(text))}</span>${isTauri ? '' : `<span class="st-item st-hide st-web">${esc(t('st.web'))}</span>`}`;
  paintCursor();
}
function paintCursor() {
  const pos = document.getElementById('st-pos');
  if (!pos) return;
  const crumb = document.getElementById('st-path');
  if (crumb) {
    const r = ed.state.doc.length < 1_000_000 ? analyze(ed.text()) : null;
    if (r?.ok && r.node) { crumb.textContent = formatPath(pathAt(r.node, ed.state.selection.main.head)); crumb.hidden = false; } else crumb.hidden = true;
  }
  const s = ed.state.selection.main;
  const line = ed.state.doc.lineAt(s.head);
  pos.textContent = `${t('st.ln', { n: line.number })}, ${t('st.col', { n: s.head - line.from + 1 })}${s.empty ? '' : ` · ${t('st.sel', { n: s.to - s.from })}`}`;
}
status.addEventListener('click', (e) => {
  const tg = e.target as HTMLElement;
  if (tg.closest('#st-fix')) act.repair();
  else if (tg.closest('#st-path')) { void copyText((tg.closest('#st-path') as HTMLElement).textContent ?? '').then(() => toast(t('toast.pathCopied'), 'success')); }
  else if (tg.closest('#st-err')) { const r = analyze(ed.text()); if (r.error) { setView('editor'); ed.selectRange(r.error.pos, Math.min(r.error.pos + 1, ed.state.doc.length), true); } }
});
bus.on('content', paintStatus); bus.on('active', paintStatus);

function showStats() {
  const text = ed.text();
  const r = analyze(text);
  const s = r.node ? statsOf(r.node) : null;
  const items: [Key, string][] = [['stat.size', formatBytes(byteLength(text))], ['stat.lines', String(ed.state.doc.lines)]];
  if (s) items.push(['stat.depth', String(s.depth)], ['stat.values', String(s.values)], ['stat.keys', String(s.keys)], ['stat.objects', String(s.objects)], ['stat.arrays', String(s.arrays)], ['stat.strings', String(s.strings)], ['stat.numbers', String(s.numbers)], ['stat.booleans', String(s.booleans)], ['stat.nulls', String(s.nulls)]);
  const el = h(`<div class="stats-grid">${items.map(([k, v]) => `<div><span>${esc(t(k))}</span><strong>${esc(v)}</strong></div>`).join('')}</div>`);
  void dialog({ title: t('dlg.stats'), content: el, icon: 'stats', actions: [{ id: 'ok', label: t('act.ok'), icon: 'check', primary: true }] });
}

/* ───────────────────────────── command palette ───────────────────────────── */
function showPalette() {
  const G = (k: Key) => t(k);
  const cmds: Command[] = [
    { id: 'new', label: t('act.new'), icon: 'filePlus', hint: 'Ctrl+N', group: G('cmd.group.file'), run: () => { docs.create(''); setView('editor'); ed.focus(); } },
    { id: 'open', label: t('act.open'), icon: 'open', hint: 'Ctrl+O', group: G('cmd.group.file'), run: () => { void openFiles(); } },
    { id: 'save', label: t('act.save'), icon: 'save', hint: 'Ctrl+S', group: G('cmd.group.file'), run: () => { void docs.save(); } },
    { id: 'saveas', label: t('act.saveAs'), icon: 'saveAll', hint: 'Ctrl+Shift+S', group: G('cmd.group.file'), run: () => { void docs.save(docs.active(), true); } },
    { id: 'close', label: t('act.close'), icon: 'close', hint: 'Ctrl+W', group: G('cmd.group.file'), run: () => { void docs.close(docs.active().id); } },
    ...TOOLS.filter((x) => x.id !== 'sort').map((x): Command => ({ id: x.id, label: t(x.key), icon: x.icon, hint: x.hint, group: G('cmd.group.edit'), run: () => x.run(document.body) })),
    { id: 'sortA', label: t('act.sortAsc'), icon: 'sortAsc', group: G('cmd.group.edit'), run: () => act.sortKeys('asc') },
    { id: 'sortD', label: t('act.sortDesc'), icon: 'sortDesc', group: G('cmd.group.edit'), run: () => act.sortKeys('desc') },
    ...NAV.map((n, i): Command => ({ id: 'v-' + n.id, label: t(n.key), icon: n.icon, hint: `Ctrl+${i + 1}`, group: G('cmd.group.view'), run: () => setView(n.id) })),
    ...(['code', 'split', 'tree'] as const).map((m): Command => ({ id: 'm-' + m, label: t(`view.${m}` as Key), icon: m === 'code' ? 'code' : m === 'split' ? 'split' : 'tree', group: G('cmd.group.view'), run: () => { setView('editor'); update({ viewMode: m }); applyMode(); paintToolbar(); } })),
    ...(['light', 'dark', 'system'] as const).map((m): Command => ({ id: 't-' + m, label: `${t('cmd.theme')}: ${t(`set.${m}` as Key)}`, icon: m === 'light' ? 'sun' : m === 'dark' ? 'moon' : 'monitor', group: G('cmd.group.app'), run: () => { update({ theme: m }); applyTheme(); } })),
    { id: 'settings', label: t('nav.settings'), icon: 'settings', hint: 'Ctrl+,', group: G('cmd.group.app'), run: () => setView('settings') },
  ];
  openPalette(cmds);
}
$('#btn-palette').addEventListener('click', showPalette);

/* ───────────────────────────── scroll to top (long pages) ───────────────────────────── */
const fab = h(`<button class="fab-top" id="fab-top" aria-label="${esc(t('tip.top'))}" title="${esc(t('tip.top'))}">${icon('up')}</button>`);
$('#views').appendChild(fab);
let fabTarget: HTMLElement | null = null;
const paintFab = () => {
  const v = document.querySelector<HTMLElement>('.view.active');
  fabTarget = v && v.id !== 'view-editor' ? v : null;
  fab.classList.toggle('show', !!fabTarget && fabTarget.scrollTop > 280);
};
$('#views').addEventListener('scroll', (e) => { if ((e.target as HTMLElement).classList?.contains('view')) paintFab(); }, true);
bus.on('view', () => requestAnimationFrame(paintFab));
fab.addEventListener('click', () => fabTarget?.scrollTo({ top: 0, behavior: settings.motion ? 'smooth' : 'auto' }));
bus.on('lang', () => { fab.title = t('tip.top'); fab.setAttribute('aria-label', t('tip.top')); });

/* ───────────────────────────── shortcuts ───────────────────────────── */
window.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();
  if (mod && !e.altKey) {
    if (k === 'n') { e.preventDefault(); docs.create(''); setView('editor'); ed.focus(); }
    else if (k === 'o') { e.preventDefault(); void openFiles(); }
    else if (k === 's') { e.preventDefault(); void docs.save(docs.active(), e.shiftKey); }
    else if (k === 'w') { e.preventDefault(); void docs.close(docs.active().id); }
    else if (k === 'tab') { e.preventDefault(); docs.next(e.shiftKey ? -1 : 1); }
    else if (k === ',') { e.preventDefault(); setView('settings'); }
    else if (k === 'k') { e.preventDefault(); showPalette(); }
    else if (/^[1-5]$/.test(k)) { e.preventDefault(); setView(VIEWS[+k - 1]); }
  } else if (e.altKey && e.shiftKey && k === 'f') { e.preventDefault(); act.format(); }
  else if (e.altKey && e.shiftKey && k === 'm') { e.preventDefault(); act.minify(); }
});
// Block the browser's own context menu / zoom keys in the desktop app only.
if (isTauri) window.addEventListener('contextmenu', (e) => { if (!(e.target as HTMLElement).closest('.cm-content,input,textarea')) e.preventDefault(); });

/* ───────────────────────────── drag & drop, external opens ───────────────────────────── */
const drop = $('#dropzone');
onFilesDropped((files) => { docs.openLoaded(files); setView('editor'); }, (on) => drop.classList.toggle('show', on));
onOpenFiles((paths) => { void docs.openPaths(paths); setView('editor'); });

/* ───────────────────────────── settings reactions ───────────────────────────── */
bus.on('settings', (keys: string[]) => {
  if (keys.includes('wrap') || keys.includes('indent') || keys.includes('theme') || keys.includes('color')) ed.syncConfig();
  if (keys.includes('viewMode') || keys.includes('splitRatio')) applyMode();
  if (keys.includes('wrap')) paintToolbar();
});
bus.on('lang', () => { paintToolbar(); paintRail(); paintTabs(); paintStatus(); applyI18n(document); ed.syncConfig(); });

/* ───────────────────────────── start ───────────────────────────── */
paintToolbar();
applyMode();
const reveal = () => {
  const splash = document.getElementById('splash');
  splash?.classList.add('done');
  setTimeout(() => splash?.remove(), 600);
};
// Hard guarantee: whatever happens below, the splash never blocks the UI for more than a few seconds.
setTimeout(reveal, 4500);
(async () => {
  try {
    const restored = await docs.restoreSession();
    const files = await launchFiles();
    if (files.length) await docs.openPaths(files);
    else if (!restored) docs.create('');
  } catch (e) { console.error('startup', e); if (!docs.docs.length) docs.create(''); }
  try { paintTabs(); paintStatus(); } catch (e) { console.error(e); }
  reveal(); // show the app first, then take care of the native window
  try { await initWindow(); } catch (e) { console.error('window', e); }
  try { ed.focus(); } catch { /* ignore */ }
})();

onCloseRequested(async () => {
  const n = docs.unsavedCount();
  if (!n) return true;
  const r = await dialog({ title: t('dlg.quitTitle'), body: t('dlg.quitBody', { n }), icon: 'error', actions: [{ id: 'cancel', label: t('dlg.cancel'), icon: 'close' }, { id: 'quit', label: t('dlg.quit'), icon: 'power', primary: true, danger: true }] });
  return r === 'quit';
});
window.addEventListener('beforeunload', (e) => { if (!isTauri && docs.unsavedCount()) { e.preventDefault(); e.returnValue = ''; } });
void isDark;
