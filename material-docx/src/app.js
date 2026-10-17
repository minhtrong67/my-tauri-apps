// Material Docx — application bootstrap: wires the editor, ribbon, views, dialogs and the desktop window together.
import { $, el, esc } from './util.js';
import { installIcons, icon } from './icons.js';
import { t } from './i18n.js';
import { doc, bus } from './state.js';
import { settings, saveSettings } from './settings.js';
import { refreshTheme, refreshLanguage, setTheme } from './appearance.js';
import { initTooltips, wireDialogs, tip, toast, askConfirm, openContextMenu } from './popup.js';
import { editor, sheet, workspace, settle, initEditorDefaults, isComposing, setContent, historyReset, markDirty, undo, redo, canUndo, canRedo } from './editor.js';
import { initPaginate, layout, applyPageVars, paginate } from './paginate.js';
import * as C from './cmds.js';
import * as D from './dialogs.js';
import * as V from './view.js';
import * as IM from './images.js';
import { initTableResize, TABLE_STYLES } from './tables.js';
import { buildRibbon, setContextTab, refreshRibbon, rebuildRibbon, showTab, currentTab } from './ribbon.js';
import { ribbonDef, isSpeaking } from './ribbon-def.js';
import { buildFind, openFind } from './find.js';
import { openBackstage, closeBackstage } from './backstage.js';
import { initKeyboard, initAutoFormat, initClipboard, initContextMenu, initLinks } from './input.js';
import { T, invoke, docName, setDocName, updateTitle, readDraft, clearDraft, loadBytes, pruneRecent, confirmDiscard, newDoc } from './fileio.js';
import './ripple.js';

/* ------------------------------ desktop window ------------------------------ */
const win = T ? T.window.getCurrentWindow() : null;

async function toggleFullscreen() {
  try {
    if (win) await win.setFullscreen(!(await win.isFullscreen()));
    else if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { /* ignore */ }
}

/** Shows the window once the UI is laid out: remembered size (window-state plugin) or maximised, depending on the setting. */
async function revealWindow() {
  if (!win) return;
  try {
    if (settings.start === 'maximized') await win.maximize();
    await win.show();
    await win.setFocus();
  } catch { /* ignore */ }
}
bus.on('start-changed', async (v) => { if (win && v === 'maximized') { try { await win.maximize(); } catch { /* ignore */ } } });

/* ------------------------------ header / footer inside the page overlay ------------------------------ */
function renderHF(zone, n, total) {
  if (!layout.enabled) return '';
  const h = doc[zone];
  if (!h || !h.text) return '';
  if (doc.diffFirst && n === 1) return '';
  const txt = h.text
    .replace(/\{page\}/g, String(n)).replace(/\{pages\}/g, String(total))
    .replace(/\{date\}/g, C.formatDate('short')).replace(/\{title\}/g, docName());
  return `<div class="hf-in" style="text-align:${h.align || 'left'}">${esc(txt).replace(/\n/g, '<br>')}</div>`;
}

/* ------------------------------ title bar ------------------------------ */
const THEME_ICON = { light: 'sun', dark: 'moon', system: 'auto' };
function buildTitlebar() {
  const quick = $('#quick');
  quick.innerHTML = '';
  const mk = (ic, label, kbd, fn, id) => {
    const b = el('button', { class: 'icon-btn sm', type: 'button', html: icon(ic), id });
    tip(b, label, kbd);
    b.addEventListener('click', fn);
    quick.append(b);
    return b;
  };
  mk('save', t('file.save'), 'Ctrl+S', () => import('./fileio.js').then((m) => m.saveDoc(false)), 'q-save');
  mk('undo', t('tip.undo'), 'Ctrl+Z', () => C.doUndo(), 'q-undo');
  mk('redo', t('tip.redo'), 'Ctrl+Y', () => C.doRedo(), 'q-redo');

  const name = $('#doc-name');
  name.placeholder = t('doc.untitled');
  name.setAttribute('aria-label', t('doc.name'));
  const sp = $('#btn-search');
  sp.innerHTML = icon('search') + `<span>${esc(t('search.placeholder'))}</span><kbd>Ctrl+F</kbd>`;
  sp.onclick = () => openFind();
  const th = $('#btn-theme');
  th.innerHTML = icon(THEME_ICON[settings.theme] || 'auto');
  tip(th, t('tip.theme'));
  th.onclick = () => cycleTheme();
  const st = $('#btn-settings');
  st.innerHTML = icon('gear');
  tip(st, t('tip.settings'), 'Ctrl+,');
  st.onclick = () => D.openSettings();
  syncQuick();
}
function cycleTheme(to) {
  const order = ['light', 'dark', 'system'];
  const next = to || order[(order.indexOf(settings.theme) + 1) % order.length];
  setTheme(next);
  $('#btn-theme').innerHTML = icon(THEME_ICON[next]);
  toast(t('toast.theme', { name: t('theme.' + next) }), 1600);
  refreshRibbon();
}
function syncQuick() {
  const u = $('#q-undo'), r = $('#q-redo');
  if (u) u.disabled = !canUndo();
  if (r) r.disabled = !canRedo();
  const s = $('#save-state');
  s.textContent = doc.dirty ? t('state.unsaved') : doc.path ? t('state.saved') : '';
  s.classList.toggle('dirty', !!doc.dirty);
  V.setSaveState(doc.dirty ? t('state.unsaved') : doc.path ? t('state.saved') : '', doc.dirty ? 'dirty' : '');
}

/* ------------------------------ ribbon state ------------------------------ */
function ribbonState() {
  const s = C.queryState();
  s.painter = C.painterActive();
  s.view = settings.view;
  const wantTable = !!s.inTable && settings.view !== 'read';
  const wantPic = !!IM.selectedImage() && settings.view !== 'read';
  setContextTab('table', wantTable, { focus: wantTable && !tabWasShown.table });
  setContextTab('picture', wantPic, { focus: wantPic && !tabWasShown.picture });
  tabWasShown.table = wantTable;
  tabWasShown.picture = wantPic;
  return s;
}
const tabWasShown = { table: false, picture: false };

/* ------------------------------ language ------------------------------ */
function rebuildAll() {
  buildTitlebar();
  rebuildRibbon();
  V.buildStatus();
  V.buildSide();
  V.fillSide();
  buildFind($('#findbar'));
  $('#doc-name').placeholder = t('doc.untitled');
  $('#drop-hint').textContent = t('drop.hint');
  updateTitle();
  V.updateStatus();
  refreshRibbon();
  syncQuick();
}

/* ------------------------------ startup helpers ------------------------------ */
async function recoverDraft() {
  const d = await readDraft();
  if (!d || !d.html) return false;
  const probe = document.createElement('div');
  probe.innerHTML = d.html;
  if (!probe.textContent.trim() && !probe.querySelector('img, table, hr')) { clearDraft(); return false; }
  const r = await askConfirm({ title: t('recover.title'), msg: t('recover.msg', { name: d.name || t('doc.untitled') }), yes: t('recover.yes'), no: t('recover.no'), cancel: false });
  if (r === 'yes') {
    setContent(d.html, { meta: d.meta });
    setDocName(d.name || '');
    doc.path = d.path || null;
    doc.dirty = true;
    markDirty();
    bus.emit('dirty');
    updateTitle();
    return true;
  }
  clearDraft();
  return false;
}

function wireTocClicks() {
  editor.addEventListener('click', (e) => {
    const p = e.target.closest && e.target.closest('[data-toc] p[data-lvl]');
    if (!p) return;
    const rows = [...p.parentElement.querySelectorAll('p[data-lvl]')];
    const hs = C.headingList().filter((h) => h.level <= 3);
    const h = hs[rows.indexOf(p)];
    if (h) V.goToElement(h.el);
  });
}

/* ------------------------------ init ------------------------------ */
async function init() {
  installIcons();
  initTooltips();
  wireDialogs();
  refreshLanguage();
  refreshTheme();
  document.documentElement.style.setProperty('--doc-size', settings.fontSize + 'pt');
  editor.spellcheck = !!settings.spell;
  initEditorDefaults();
  initPaginate(editor, $('#overlay'), renderHF);
  applyPageVars();

  buildTitlebar();
  $('#ribbon').addEventListener('wheel', (e) => { const r = e.currentTarget; if (r.scrollWidth > r.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { r.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
  buildRibbon(ribbonDef({ openBackstage, toggleFullscreen, cycleTheme }), $('#tabs'), $('#ribbon'), { stateFn: ribbonState });
  V.buildStatus();
  V.initView();
  buildFind($('#findbar'));
  IM.initImages();
  initTableResize(workspace);
  initKeyboard({ toggleFullscreen });
  initAutoFormat();
  initClipboard();
  initContextMenu();
  initLinks();
  wireTocClicks();

  // view state
  V.setZoom(settings.zoom || 100, false);
  V.setView(settings.view, false);
  V.showRuler(!!settings.ruler);
  if (settings.marks) V.toggleMarks(true);
  V.toggleSide(!!settings.nav);

  // events
  const refresh = () => { refreshRibbon(); syncQuick(); };
  for (const ev of ['selection', 'history', 'settled', 'image', 'view', 'zoom', 'meta', 'dirty', 'saved', 'title']) bus.on(ev, refresh);
  bus.on('typing', () => { if (!isComposing()) C.fixPendingInline(); });
  bus.on('meta', () => {
    const r = document.documentElement.style;
    r.setProperty('--page-bg', doc.page.color || '');
    r.setProperty('--hd', (doc.page.headerDist ?? 48) + 'px');
    r.setProperty('--fd', (doc.page.footerDist ?? 48) + 'px');
    V.sizeZoomer();
    paginate();
  });
  bus.on('lang', rebuildAll);
  bus.on('set-lang', (l) => { settings.lang = l; saveSettings(); refreshLanguage(); });
  bus.on('goto-page', () => D.openGoto());
  bus.on('word-count', () => D.openWordCount());
  bus.on('language', () => {
    const b = document.querySelectorAll('#statusbar .sb-item')[2];
    const r = b ? b.getBoundingClientRect() : { left: 12, top: innerHeight - 40 };
    openContextMenu(r.left, r.top - 90, [
      { label: 'English', checked: document.documentElement.lang === 'en', run: () => bus.emit('set-lang', 'en') },
      { label: 'Tiếng Việt', checked: document.documentElement.lang === 'vi', run: () => bus.emit('set-lang', 'vi') },
    ]);
  });
  bus.on('image-dialog', () => D.openImageDialog());
  bus.on('settings-doc', () => paginate());
  bus.on('before-output', () => { if (editor.querySelector('[data-toc]')) C.updateToc(); });
  bus.on('toc-update', () => {});

  $('#doc-name').addEventListener('input', () => { doc.title = $('#doc-name').value; updateTitle(); });
  $('#doc-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); editor.focus(); } });
  $('#overlay').addEventListener('dblclick', (e) => { const z = e.target.closest('.pg-zone'); if (z) D.openHeaderFooter(z.dataset.zone); });
  editor.addEventListener('mouseup', () => { if (C.painterActive()) setTimeout(() => C.applyPainter(), 0); });
  editor.addEventListener('mousedown', () => { if (!C.painterActive()) return; });
  window.addEventListener('beforeprint', () => bus.emit('before-output'));

  // first document
  historyReset();
  settle({ record: false });
  const opened = await openInitialFile();
  if (!opened) await recoverDraftLater();
  pruneRecent();
  bus.emit('meta');
  updateTitle();
  syncQuick();
  if (settings.zoom === 'fit') V.fitWidth();

  // close request → ask to save
  if (win) {
    try { await win.onCloseRequested(async (ev) => { if (!(await confirmDiscard())) ev.preventDefault(); }); } catch { /* ignore */ }
  } else {
    window.addEventListener('beforeunload', (e) => { if (doc.dirty) { e.preventDefault(); e.returnValue = ''; } });
  }

  // reveal after the first frames so the saved layout is already applied (no flash of the default window)
  requestAnimationFrame(() => requestAnimationFrame(() => { revealWindow(); editor.focus({ preventScroll: true }); }));
}

async function openInitialFile() {
  if (!T) return false;
  try {
    const p = await invoke('initial_file');
    if (!p) return false;
    const { b64ToBytes } = await import('./util.js');
    await loadBytes(p, b64ToBytes(await invoke('read_file_b64', { path: p })));
    return true;
  } catch { return false; }
}
async function recoverDraftLater() {
  await new Promise((r) => setTimeout(r, 350));
  return recoverDraft();
}

init().catch((e) => { console.error(e); try { toast(String(e && e.message ? e.message : e), 8000); } catch { /* ignore */ } if (win) win.show().catch(() => {}); });

// exposed for debugging / tests
window.__mdx = { doc, bus, settings, C, D, V, IM, newDoc, undo, redo, showTab, currentTab, closeBackstage, TABLE_STYLES, sheet, isSpeaking };
