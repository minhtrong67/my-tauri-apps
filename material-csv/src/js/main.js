// Material CSV: application bootstrap, tabs, window chrome and hook wiring.
import { app, cur, loadSettings, saveSettings, rebuildView, visCols, activeFilters } from './state.js';
import { setLang, applyI18n, t } from './i18n.js';
import { hydrateIcons, IC } from './icons.js';
import { $, $$, esc, clamp, fmtNum, fmtSize, toast, confirmDialog, promptDialog, initRipple, closeDialog, menuOpen } from './ui.js';
import { initGrid, renderAll, renderRows, refreshBody, setSel, restoreScroll, describeSelection, scrollerEl, grid } from './grid.js';
import { CMD, label, keyOf, isEnabled, isChecked, run, handleKey } from './commands.js';
import * as IO from './io.js';
import * as O from './ops.js';
import * as P from './panels.js';
import * as M from './menus.js';
import * as D from './dialogs.js';
import * as TH from './theme.js';

const H = app.hooks;
const TA = window.__TAURI__;

/* ------------------------------ tabs ------------------------------ */

function renderTabs() {
  $('#tabs').innerHTML = app.docs.map(d =>
    `<div class="tab${d === app.doc ? ' on' : ''}" role="tab" data-id="${d.id}" title="${esc(d.path || d.name)}">` +
    `<svg class="ic" viewBox="0 0 24 24"><path d="${IC.table}"/></svg><span class="tname">${esc(d.name)}</span>` +
    `<i class="tdirty${d.dirty ? ' on' : ''}"></i><button class="tclose" tabindex="-1" aria-label="${esc(t('close'))}"><svg class="ic" viewBox="0 0 24 24"><path d="${IC.x}"/></svg></button></div>`).join('');
  $('#tabs .tab.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function initTabs() {
  const tabs = $('#tabs');
  tabs.addEventListener('mousedown', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    const d = app.docs.find(x => x.id === +tab.dataset.id);
    if (e.button === 1) { e.preventDefault(); closeTab(d); }
    else if (e.button === 0 && !e.target.closest('.tclose')) activate(d);
  });
  tabs.addEventListener('click', e => {
    const c = e.target.closest('.tclose');
    if (c) closeTab(app.docs.find(x => x.id === +c.closest('.tab').dataset.id));
  });
  tabs.addEventListener('wheel', e => { tabs.scrollLeft += e.deltaY; }, { passive: true });
}

async function closeTab(d) {
  if (!d) return false;
  if (d.dirty) {
    const r = await confirmDialog({
      title: t('unsaved.title'), body: t('unsaved.body', { name: d.name }),
      buttons: [{ id: 'save', label: t('save'), primary: true }, { id: 'discard', label: t('dontSave') }, { id: 'cancel', label: t('cancel') }],
    });
    if (r === 'cancel') return false;
    if (r === 'save' && !(await IO.saveDoc(d))) return false;
  }
  const i = app.docs.indexOf(d);
  app.docs.splice(i, 1);
  if (app.doc === d) activate(app.docs[i] || app.docs[i - 1] || null);
  else renderTabs();
  return true;
}
H.closeTab = closeTab;

H.cycleTab = dir => {
  if (app.docs.length < 2) return;
  const i = app.docs.indexOf(app.doc);
  activate(app.docs[(i + dir + app.docs.length) % app.docs.length]);
};

/* ------------------------------ activation ------------------------------ */

function applyMode() {
  const table = app.mode === 'table';
  $('#scroller').hidden = !table || !app.doc;
  $('#cards').hidden = table || !app.doc;
  if (!table) { P.resetCards(); P.renderCards(); }
}

function activate(d) {
  if (app.doc && app.doc !== d && app.doc.sel) app.doc.scroll = { top: scrollerEl().scrollTop, left: scrollerEl().scrollLeft };
  app.doc = d;
  const has = !!d;
  $('#welcome').hidden = has;
  $('#work').hidden = !has;
  $('#status').classList.toggle('empty', !has);
  if (has) {
    renderAll();
    if (d.sel.ar < 0 && d.view.length && grid.cols.length) setSel(0, 0, 0, 0, { scroll: false });
    restoreScroll();
    P.renderAdv();
    applyMode();
    if (app.find.open) H.findRefresh?.();
    else if (app.mode === 'table' && !document.querySelector('dialog[open]')) scrollerEl().focus({ preventScroll: true });
  } else renderRecent();
  renderTabs();
  refreshChrome();
}
H.activate = activate;

/* ------------------------------ chrome refresh ------------------------------ */

const DELIM_NAMES = { ',': 'delim.comma', ';': 'delim.semicolon', '\t': 'delim.tab', '|': 'delim.pipe' };

export function refreshChrome() {
  const d = cur();
  $$('[data-cmd]').forEach(b => {
    const id = b.dataset.cmd;
    if (!CMD[id]) return;
    b.disabled = !isEnabled(id);
    b.classList.toggle('on', !!CMD[id].checked && isChecked(id));
  });
  $$('[data-menu]').forEach(b => { b.disabled = !d; });
  $$('#viewseg button').forEach(b => b.classList.toggle('on', isChecked(b.dataset.cmd)));
  P.refreshFx();
  P.refreshDetails();
  P.updateFilterBadge();
  $('#details').classList.toggle('off', !app.settings.details || !d || app.mode !== 'table');
  const nf = d ? activeFilters(d).length + Object.keys(d.cf).length : 0;
  if (d) {
    const filtered = d.view.length !== d.rows.length;
    $('#sInfo').textContent = `${fmtNum(d.view.length)}${filtered ? ' / ' + fmtNum(d.rows.length) : ''} ${t('rows')} · ${fmtNum(visCols(d).length)}${d.hidden.size ? ' / ' + d.head.length : ''} ${t('cols')}${d.size ? ' · ' + fmtSize(d.size) : ''}`;
    $('#sDelim').textContent = t(DELIM_NAMES[d.delim] || 'delim.comma');
    $('#sEnc').textContent = d.enc + (d.bom ? ' BOM' : '');
    $('#sEol').textContent = d.eol === '\n' ? 'LF' : 'CRLF';
    $('#sHeader').textContent = d.hasHeader ? t('status.headerOn') : t('status.headerOff');
    $('#sSel').textContent = describeSelection();
    void nf;
  } else { $('#sInfo').textContent = ''; $('#sSel').textContent = ''; }
  $('#zVal').textContent = app.settings.zoom + '%';
  $('#zRange').value = app.settings.zoom;
  const title = d ? `${d.dirty ? '● ' : ''}${d.name} - Material CSV` : 'Material CSV';
  document.title = title;
  try { TH.win?.setTitle(title); } catch { /* ignore */ }
  $('.tabnew').title = label('file.new') + ' (' + keyOf('file.new') + ')';
  $$('#tabs .tab').forEach(el => { const x = app.docs.find(z => z.id === +el.dataset.id); el.querySelector('.tdirty').classList.toggle('on', !!x?.dirty); el.querySelector('.tname').textContent = x?.name || ''; });
}

function refreshTitles() {
  $$('[data-menu]').forEach(b => { b.title = b.querySelector('span')?.textContent || ''; });
  $$('[data-cmd]').forEach(b => {
    const id = b.dataset.cmd;
    if (CMD[id]) b.title = label(id) + (keyOf(id) ? ` (${keyOf(id)})` : '');
  });
}

/* ------------------------------ data hooks ------------------------------ */

H.changed = structural => {
  const d = cur();
  if (!d) return;
  if (structural) { renderAll(); P.renderAdv(); if (app.mode !== 'table') { P.resetCards(); P.renderCards(); } }
  else { renderRows(true); if (app.mode !== 'table') P.renderCards(); }
  H.findRefresh?.();
  P.refreshDetails(true);
  refreshChrome();
  renderTabs();
};

H.selChanged = () => { P.refreshFx(); P.refreshDetails(); $('#sSel').textContent = describeSelection(); $$('#cmdbar [data-cmd]').forEach(b => { if (CMD[b.dataset.cmd]) b.disabled = !isEnabled(b.dataset.cmd); }); };

H.viewChanged = mode => {
  const d = cur();
  if (!d) return;
  rebuildView(d);
  if (mode === 'typing') refreshBody(); else renderAll();
  if (mode === true) P.renderAdv();
  if (app.mode !== 'table') { P.resetCards(); P.renderCards(); }
  H.findRefresh?.();
  refreshChrome();
};

H.docsChanged = () => { renderTabs(); refreshChrome(); };

/* ------------------------------ clipboard ------------------------------ */

let pasteSeen = false;
H.clipboard = async kind => {
  if (kind === 'paste') {
    try { O.pasteText(await navigator.clipboard.readText()); } catch { toast(t('clipDenied'), 'err'); }
    return;
  }
  const text = O.selectionText(kind === 'copyh');
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  if (kind === 'cut') O.clearSelection();
  toast(kind === 'cut' ? t('cut') : t('copied'), 'ok', 1400);
};

document.addEventListener('paste', e => {
  const d = cur();
  if (!d || e.target.closest?.('input,textarea')) return;
  e.preventDefault();
  pasteSeen = true;
  O.pasteText(e.clipboardData.getData('text/plain'));
});

/* ------------------------------ misc hooks ------------------------------ */

H.renameCol = async c => {
  const d = cur();
  if (c == null || c < 0) return;
  const v = await promptDialog({ title: t('c.cols.rename'), label: t('rename.label'), value: d.head[c] });
  if (v != null) O.renameCol(c, v);
  scrollerEl().focus();
};

H.hideCols = () => {
  const d = cur(), s = O.selection(d);
  if (!s) return;
  if (s.cols.length >= visCols(d).length) return toast(t('keepOneCol'), 'err');
  d.hidden = new Set([...d.hidden, ...s.cols]);
  H.viewChanged(true);
};

H.toggleSort = c => {
  const d = cur();
  if (d.sc === c) { if (d.sd === 1) d.sd = -1; else d.sc = -1; } else { d.sc = c; d.sd = 1; }
  H.viewChanged();
};

H.colMenu = (anchor, vi) => {
  const d = cur(), s = O.rect(d);
  if (!(s && vi >= s.c1 && vi <= s.c2 && s.r1 === 0)) setSel(0, vi, Math.max(0, d.view.length - 1), vi);
  M.openColMenu(anchor);
};
H.context = M.openContext;

H.toggleFilterRow = () => { const d = cur(); d.showFilterRow = !d.showFilterRow; renderAll(); refreshChrome(); };
H.toggleAdvFilter = () => {
  app.advOpen = !app.advOpen;
  $('#advbar').hidden = !app.advOpen;
  if (app.advOpen && !cur().flt.length) cur().flt.push({ c: 0, o: 'ct', v: '' });
  P.renderAdv(); refreshChrome();
};
H.clearFilters = () => { const d = cur(); d.flt = []; d.cf = {}; d.sc = -1; H.viewChanged(true); };

H.gotoRow = async () => {
  const d = cur();
  const v = await promptDialog({ title: t('c.data.goto'), label: t('goto.label', { n: fmtNum(d.rows.length) }), type: 'number', min: 1, max: d.rows.length });
  if (v == null || v === '') return;
  const vi = d.view.indexOf(clamp(parseInt(v, 10) || 1, 1, d.rows.length) - 1);
  if (vi < 0) toast(t('goto.hidden'), 'err'); else setSel(vi, 0, vi, 0);
  scrollerEl().focus();
};

H.setMode = m => { app.mode = m; applyMode(); if (m === 'table') renderAll(); refreshChrome(); };
H.toggleDetails = () => { app.settings.details = !app.settings.details; saveSettings(); refreshChrome(); P.refreshDetails(true); if (cur()) renderRows(true); };
H.zoom = delta => {
  app.settings.zoom = delta === 0 ? 100 : clamp(app.settings.zoom + delta, 60, 200);
  saveSettings();
  if (cur()) renderAll();
  refreshChrome();
};
H.cycleTheme = () => { app.settings.theme = { system: 'light', light: 'dark', dark: 'system' }[app.settings.theme]; saveSettings(); TH.applyTheme(true); refreshChrome(); };
H.toggleLang = () => { app.settings.lang = app.lang === 'vi' ? 'en' : 'vi'; saveSettings(); applyLanguage(); };
H.toggleFullscreen = () => TH.toggleFullscreen();
H.openSettings = D.openSettings;
H.openShortcuts = D.openShortcuts;
H.openPalette = D.openPalette;
H.openStats = D.openStats;
H.openFind = P.openFind;

H.settingsChanged = key => {
  const s = app.settings;
  if (key === 'theme') { TH.applyTheme(true); refreshChrome(); }
  else if (key === 'accent' || key === 'contrast') TH.applyScheme();
  else if (key === 'anim') TH.applyMotion();
  else if (key === 'zebra' || key === 'gridLines') TH.applyAppearance();
  else if (key === 'density') { if (cur()) renderAll(); }
  else if (key === 'lang') applyLanguage();
  else if (key === 'details') { refreshChrome(); P.refreshDetails(true); }
  else if (key === 'windowMode') TH.applyWindowMode();
  else if (key === 'recent') renderRecent();
};

function applyLanguage() {
  setLang(app.settings.lang);
  document.documentElement.lang = app.lang;
  applyI18n(document);
  refreshTitles();
  renderRecent();
  renderTabs();
  P.updateFindCount();
  if (cur()) { P.renderAdv(); renderAll(); if (app.mode !== 'table') P.renderCards(); P.refreshDetails(true); }
  refreshChrome();
}

/* ------------------------------ status bar ------------------------------ */

function initStatus() {
  $('#sDelim').onclick = e => {
    const d = cur(); if (!d) return;
    M.delimMenu(e.currentTarget, d.delim, v => {
      if (!d.dirty && d.raw != null) {
        d.delim = v; IO.parseInto(d, d.raw);
        d.undo = []; d.redo = []; d.cleanId = 0; d.sc = -1; d.flt = []; d.cf = {}; d.hidden = new Set(); d.version++;
        rebuildView(d); renderAll(); P.renderAdv();
      } else { d.delim = v; toast(t('delim.saveOnly')); }
      refreshChrome();
    });
  };
  $('#sEol').onclick = e => { const d = cur(); if (d) M.eolMenu(e.currentTarget, d.eol, v => { d.eol = v; refreshChrome(); toast(t('applyOnSave')); }); };
  $('#sEnc').onclick = e => {
    const d = cur(); if (!d) return;
    M.encMenu(e.currentTarget, d,
      v => { d.enc = v; d.bom = v.startsWith('UTF-16'); refreshChrome(); toast(t('applyOnSave')); },
      async v => { if (await IO.reopenWithEncoding(v)) toast(t('reopened', { enc: v }), 'ok'); },
      () => { d.bom = !d.bom; refreshChrome(); });
  };
  $('#zRange').addEventListener('input', e => { app.settings.zoom = +e.target.value; saveSettings(); if (cur()) renderAll(); refreshChrome(); });
}

/* ------------------------------ welcome ------------------------------ */

function renderRecent() {
  const r = app.settings.recent;
  $('#recentBox').hidden = !r.length;
  $('#recent').innerHTML = r.map(p => `<button class="rec" data-p="${esc(p)}"><svg class="ic" viewBox="0 0 24 24"><path d="${IC.file}"/></svg><span><b>${esc(IO.baseName(p))}</b><small>${esc(p)}</small></span></button>`).join('');
}

/* ------------------------------ window controls ------------------------------ */

function initWindow() {
  const w = TH.win;
  if (!w) { $('#wc').hidden = true; return; }
  $('#wMin').onclick = () => w.minimize();
  $('#wMax').onclick = () => w.toggleMaximize();
  $('#wClose').onclick = () => w.close();
  const sync = async () => {
    try {
      const m = await w.isMaximized(), f = await w.isFullscreen();
      $('#wMax svg').innerHTML = `<path d="${IC[m ? 'restore' : 'max']}"/>`;
      document.documentElement.classList.toggle('maxed', m || f);
      document.documentElement.classList.toggle('fs', f);
      $('#wMax').setAttribute('aria-label', m ? 'Restore' : 'Maximize');
    } catch { /* ignore */ }
  };
  w.onResized(sync); sync();
  w.onCloseRequested(async e => {
    const dirty = app.docs.filter(d => d.dirty);
    if (!dirty.length) return;
    e.preventDefault();
    for (const d of dirty) { activate(d); if (!(await closeTab(d))) return; }
    w.close();
  });
}

/* ------------------------------ input events ------------------------------ */

function initEvents() {
  document.addEventListener('click', e => {
    const m = e.target.closest('[data-menu]');
    if (m) { M.openNamedMenu(m.dataset.menu, m); return; }
    const c = e.target.closest('[data-cmd]');
    if (c && !c.disabled) { run(c.dataset.cmd); return; }
    const r = e.target.closest('.rec');
    if (r) IO.openPaths([r.dataset.p]);
  });
  $('#fileInput').addEventListener('change', e => { if (e.target.files.length) IO.openFileObjects([...e.target.files]); e.target.value = ''; });
  $('#bSample').onclick = () => IO.addDoc(IO.sampleDoc());
  document.addEventListener('keydown', e => {
    if (document.querySelector('dialog[open]') && !e.ctrlKey) return;
    if (e.key === 'Escape' && !menuOpen() && app.find.open && !e.target.closest('#editor')) { P.closeFind(); return; }
    const tag = (e.target.tagName || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && tag !== 'input' && tag !== 'textarea') {
      pasteSeen = false;
      setTimeout(() => { if (!pasteSeen && cur()) H.clipboard('paste'); }, 120);
      return;
    }
    if (document.querySelector('dialog[open]') && !['Ctrl+Shift+P', 'Ctrl+,'].includes(`${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`)) return;
    handleKey(e);
  });
  document.addEventListener('contextmenu', e => { if (!e.target.closest('input,textarea,#scroller')) e.preventDefault(); });
  window.addEventListener('beforeunload', e => { if (!TA && app.docs.some(d => d.dirty)) { e.preventDefault(); e.returnValue = ''; } });

  // drag and drop of files
  const drop = on => document.body.classList.toggle('dropping', on);
  if (TA) {
    TA.webview.getCurrentWebview().onDragDropEvent(ev => {
      const p = ev.payload;
      if (p.type === 'enter' || p.type === 'over') drop(true);
      else if (p.type === 'drop') { drop(false); if (p.paths?.length) IO.openPaths(p.paths); }
      else drop(false);
    });
    TA.event.listen('open-files', ev => IO.openPaths(ev.payload));
  } else {
    document.addEventListener('dragover', e => { e.preventDefault(); drop(true); });
    document.addEventListener('dragleave', e => { if (!e.relatedTarget) drop(false); });
    document.addEventListener('drop', e => { e.preventDefault(); drop(false); if (e.dataTransfer.files.length) IO.openFileObjects([...e.dataTransfer.files]); });
  }
}

/* ------------------------------ boot ------------------------------ */

async function boot() {
  loadSettings();
  setLang(app.settings.lang);
  document.documentElement.lang = app.lang;
  TH.applyAppearance();
  TH.applyTheme();
  hydrateIcons();
  applyI18n(document);
  refreshTitles();
  initRipple();
  initGrid();
  P.initFx(); P.initDetails(); P.initCards(); P.initFind(); P.initAdv();
  D.initSettings();
  initTabs(); initStatus(); initWindow(); initEvents();
  activate(null);
  const files = await IO.startupFiles();
  if (files.length) await IO.openPaths(files);
  await TH.applyWindowMode();
  try { await TH.win?.show(); await TH.win?.setFocus(); } catch { /* ignore */ }
  document.documentElement.classList.add('ready');
}

boot();
