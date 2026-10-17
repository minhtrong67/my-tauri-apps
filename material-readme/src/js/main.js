import { ICONS } from './icons.js';
import { $, $$, esc, icon, hydrateIcons, store, debounce, clamp, fmtBytes, baseName, dirName } from './util.js';
import { t, setLang, getLang, getPref } from './i18n.js';
import * as theme from './theme.js';
import { translateDom, toast, openMenu, showDialog, closeDialog, wireDialog, thumb } from './ui.js';
import { api, isTauri, DOC_RE, readBrowserFile } from './bridge.js';
import { createEditor } from './editor.js';
import { createPreview, parseDoc } from './preview.js';
import { openSettings, creditHTML } from './settings.js';
import { sampleText } from './sample.js';

const CM = window.CM;
const VERSION = '2.0.0';

/* ====================================================================== state */
const DEFAULTS = { wrap: true, lineNumbers: false, autosave: false, syncScroll: true, zoom: 100, lang: 'auto' };
const P = { ...DEFAULTS, ...store.get('prefs', {}) };
const S = { docs: [], active: null, pref: store.get('mode', 'split'), mode: 'split', nav: store.get('nav', true), uid: 0, untitled: 0, driver: 'editor', stale: true, parsed: null, findOpen: false };
const savePrefs = () => store.set('prefs', P);
setLang(P.lang);

const body = document.body;
if (isTauri) body.classList.add('tauri');
hydrateIcons();

/* ================================================================ components */
const mdEl = $('#md'), docEl = $('#doc');
const preview = createPreview(mdEl, docEl);
const ed = createEditor($('#cm'), {
  change: (u) => onChange(u),
  cursor: () => updateCursor(),
  scroll: () => onEditorScroll(),
  wheel: () => { S.driver = 'editor'; },
  key: () => { S.driver = 'editor'; },
  focus: () => { S.driver = 'editor'; },
});
ed.opts.wrap = P.wrap; ed.opts.lineNumbers = P.lineNumbers;

const cur = () => S.active;
const isDirty = (d) => !getText(d).eq(d.saved) || d.eol !== d.savedEol;
const getText = (d) => (d === S.active ? ed.getState().doc : d.state.doc);
const docName = (d) => (d.path ? baseName(d.path) : d.name || `${t('untitled')}-${d.n}.md`);
const toDisk = (d) => { const s = getText(d).toString(); return d.eol === 'crlf' ? s.replace(/\n/g, '\r\n') : s; };

/* ===================================================================== docs */
function makeDoc({ path = '', text = '', size = 0, mtime = 0, lossy = false } = {}) {
  const eol = /\r\n/.test(text) ? 'crlf' : 'lf';
  text = text.replace(/\r\n?/g, '\n');
  const state = ed.makeState(text);
  return { id: ++S.uid, path, n: path ? 0 : ++S.untitled, state, saved: state.doc, eol, savedEol: eol, size: size || text.length, mtime, eScroll: 0, pScroll: 0, extSeen: 0, lossy };
}
function remember(d) {
  if (!d.path) return;
  const list = store.get('recent', []).filter((r) => r.path.toLowerCase() !== d.path.toLowerCase());
  list.unshift({ path: d.path, name: baseName(d.path) });
  store.set('recent', list.slice(0, 8));
  renderRecent();
}
const samePath = (a, b) => a && b && a.toLowerCase() === b.toLowerCase();

function stash(d) {
  if (!d) return;
  d.state = ed.getState(); d.eScroll = ed.view.scrollDOM.scrollTop; d.pScroll = docEl.scrollTop;
}

async function openDocs(list, { silent = false } = {}) {
  let first = null;
  for (const raw of list) {
    let d = S.docs.find((x) => samePath(x.path, raw.path));
    if (d) {
      if (!isDirty(d) && raw.mtime && raw.mtime !== d.mtime) { reloadFrom(d, raw); }
      first = first || d; continue;
    }
    // a pristine untitled document is replaced by the first opened file
    const lone = S.docs.length === 1 && !S.docs[0].path && !isDirty(S.docs[0]) && getText(S.docs[0]).length === 0 ? S.docs[0] : null;
    d = makeDoc(raw);
    if (lone) { S.docs.splice(0, 1, d); if (S.active === lone) S.active = null; } else S.docs.push(d);
    d.fresh = true;
    remember(d);
    if (raw.lossy) toast(t('lossy', { n: baseName(raw.path) }), null, null, 5000);
    first = first || d;
  }
  if (first) activate(first);
  else if (!silent) toast(t('read_fail'));
}

function activate(d) {
  if (S.active === d && !d.fresh) return;
  const prev = S.active;
  if (prev && prev !== d && S.docs.includes(prev)) stash(prev);
  S.active = d;
  body.classList.remove('no-doc');
  ed.setState(d.state);
  d.state = ed.getState();
  S.stale = true; S.parsed = null; preview.clear();
  if (d.fresh) { mdEl.classList.remove('still'); void mdEl.offsetWidth; }
  refresh(true);
  ed.view.scrollDOM.scrollTop = d.eScroll;
  requestAnimationFrame(() => { docEl.scrollTop = d.pScroll; updateToc(); });
  if (d.fresh) { d.fresh = false; setTimeout(() => mdEl.classList.add('still'), 600); }
  renderTabs(); updateChrome(); updateCursor();
  if (S.findOpen) runFind(true);
  if (S.mode !== 'preview') ed.focus();
}

function showEmpty() {
  S.active = null;
  body.classList.add('no-doc');
  renderTabs(); updateChrome(); renderToc();
  renderRecent();
}

async function newDoc(text = '', name) {
  const d = makeDoc({ text });
  if (name) d.n = 0;
  S.docs.push(d); d.fresh = true; d.isNew = true;
  activate(d);
  return d;
}

async function closeDoc(d, { force = false } = {}) {
  if (!force && isDirty(d)) {
    activate(d);
    const r = await showDialog({ title: t('save_q_title'), body: t('save_q', { n: docName(d) }), actions: [{ id: 'cancel', label: t('cancel') }, { id: 'no', label: t('dont_save') }, { id: 'yes', label: t('save'), kind: 'filled' }] });
    if (r === 'cancel') return false;
    if (r === 'yes' && !(await save(d))) return false;
  }
  const i = S.docs.indexOf(d);
  const tabEl = $(`.tab[data-id="${d.id}"]`);
  S.docs.splice(i, 1);
  if (tabEl) { tabEl.classList.add('out'); setTimeout(() => { tabEl.remove(); tabEls.delete(d.id); renderTabs(); }, 230); }
  if (S.active === d) {
    S.active = null;
    const next = S.docs[Math.min(i, S.docs.length - 1)];
    if (next) activate(next); else showEmpty();
  } else renderTabs();
  syncDirty();
  return true;
}

function reloadFrom(d, raw) {
  const text = raw.text.replace(/\r\n?/g, '\n');
  const wasActive = d === S.active, es = ed.view.scrollDOM.scrollTop, ps = docEl.scrollTop;
  d.state = ed.makeState(text); d.saved = d.state.doc; d.eol = d.savedEol = /\r\n/.test(raw.text) ? 'crlf' : 'lf';
  d.mtime = raw.mtime; d.size = raw.size; d.extSeen = 0;
  if (wasActive) {
    ed.setState(d.state); d.state = ed.getState(); S.stale = true; refresh(true);
    ed.view.scrollDOM.scrollTop = es; requestAnimationFrame(() => { docEl.scrollTop = ps; });
    updateChrome(); updateCursor(); if (S.findOpen) runFind(true);
  }
  renderTabs();
}

/* ===================================================================== save */
async function save(d = S.active, as = false) {
  if (!d) return false;
  let path = d.path;
  if (!path || as) {
    if (!isTauri) { download(docName(d), toDisk(d), 'text/markdown'); d.saved = getText(d); d.savedEol = d.eol; afterSave(d); return true; }
    path = await api.pickSave(d.path ? baseName(d.path) : docName(d));
    if (!path) return false;
    if (!/\.[A-Za-z0-9]+$/.test(baseName(path))) path += '.md';
  }
  const text = toDisk(d), snap = getText(d), eol = d.eol;
  try {
    const r = await api.writeDoc(path, text);
    const renamed = d.path !== path;
    d.path = path; d.mtime = r.mtime; d.size = r.size; d.saved = snap; d.savedEol = eol; d.extSeen = 0;
    if (renamed) remember(d);
    afterSave(d);
    return true;
  } catch (e) { toast(t('save_fail')); return false; }
}
function afterSave(d) {
  renderTabs(); updateChrome(); syncDirty();
  if (d === S.active) toast(t('saved'), null, null, 1600);
}
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
  a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const syncDirty = () => api.setDirty(S.docs.some(isDirty));
const autosave = debounce(() => { const d = S.active; if (P.autosave && d && d.path && isDirty(d)) save(d); }, 1500);

/* =================================================================== change */
function onChange() {
  const d = S.active; if (!d) return;
  d.state = ed.getState();
  const dirty = isDirty(d), was = d.wasDirty;
  d.wasDirty = dirty;
  if (dirty !== was) { renderTabs(); updateChrome(); syncDirty(); }
  const len = d.state.doc.length;
  const wait = clamp(80 + len / 1200, 80, 700);
  clearTimeout(onChange.t); onChange.t = setTimeout(() => refresh(), wait);
  if (P.autosave) autosave();
}
function wantsParse() { return S.mode !== 'edit' || S.nav; }
function refresh(immediate = false) {
  const d = S.active; if (!d) { renderToc(); return; }
  const text = ed.text();
  updateStats(text);
  if (!wantsParse() && !immediate) { S.stale = true; return; }
  S.parsed = parseDoc(text);
  renderToc();
  if (S.mode !== 'edit') { preview.render(S.parsed, d.path); S.stale = false; if (S.findOpen && S.findTarget === 'preview') runFind(false); }
  else S.stale = true;
  updateToc();
}
function updateStats(text) {
  const w = (text.match(/\S+/g) || []).length;
  $('#sStats').textContent = `${w.toLocaleString()} ${t('words')} · ${text.length.toLocaleString()} ${t('chars')} · ~${Math.max(1, Math.ceil(w / 200))} ${t('min')}`;
}
function updateCursor() {
  const d = S.active, pos = $('#sPos');
  if (!d) { pos.textContent = ''; return; }
  const st = ed.getState(), m = st.selection.main, ln = st.doc.lineAt(m.head);
  const sel = st.selection.ranges.reduce((a, r) => a + (r.to - r.from), 0);
  pos.textContent = `${t('ln')} ${ln.number}, ${t('col')} ${m.head - ln.from + 1}` + (sel ? ` (${sel.toLocaleString()} ${t('selected')})` : '');
  $('[data-cmd=undo]').disabled = !CM.undoDepth(st); $('[data-cmd=redo]').disabled = !CM.redoDepth(st);
}

/* ===================================================================== chrome */
function updateChrome() {
  const d = S.active, dirty = d && isDirty(d);
  const name = d ? docName(d) : '';
  $('#tbFile').textContent = d ? (dirty ? '● ' : '') + name : '';
  const title = d ? `${dirty ? '● ' : ''}${name} — Material Readme` : 'Material Readme';
  document.title = title; api.setTitle(title);
  $('#bSave').disabled = !d; $('#bSave').classList.toggle('accent', !!dirty);
  $('#bFind').disabled = !d;
  const s = $('#sSave'); s.textContent = !d ? '' : dirty ? t('unsaved') : d.path ? t('saved_s') : t('new_file');
  s.classList.toggle('dirty', !!dirty);
  $('#sEol').textContent = d ? d.eol.toUpperCase() : '';
  $('#sEol').style.display = d ? '' : 'none';
  $('#sStats').style.display = d ? '' : 'none';
  $('.s-enc').style.display = d ? '' : 'none';
  $('#fmtWrap').classList.toggle('off', !d || S.mode === 'preview');
  $('#bNav').classList.toggle('on', S.nav);
  $('#zVal').textContent = P.zoom + '%';
}

const tabEls = new Map();
function renderTabs() {
  const bar = $('#tabs');
  bar.classList.toggle('none', S.docs.length === 0);
  const live = new Set(S.docs.map((d) => d.id));
  for (const [id, el] of tabEls) if (!live.has(id) && !el.classList.contains('out')) { el.remove(); tabEls.delete(id); }
  for (const [id, el] of [...tabEls]) if (!live.has(id) && !el.isConnected) tabEls.delete(id);
  let add = $('.tab-add', bar);
  if (!add) { add = document.createElement('button'); add.className = 'ibtn sm tab-add'; add.dataset.tk = 'new'; add.dataset.sc = 'Ctrl+N'; add.innerHTML = icon('add'); bar.append(add); translateDom(add); }
  S.docs.forEach((d, i) => {
    let el = tabEls.get(d.id);
    if (!el) {
      el = document.createElement('div'); el.className = 'tab'; el.dataset.id = d.id; el.setAttribute('role', 'tab'); el.tabIndex = 0;
      el.innerHTML = `${icon('file')}<span class="tn"></span><span class="dot"></span><button class="x" tabindex="-1" aria-label="${esc(t('close'))}">${icon('close')}</button>`;
      tabEls.set(d.id, el);
    }
    const want = bar.children[i];
    if (want !== el) bar.insertBefore(el, want && want !== add ? want : add);
    el.classList.toggle('on', d === S.active);
    el.classList.toggle('dirty', isDirty(d));
    el.setAttribute('aria-selected', d === S.active);
    const tn = $('.tn', el), nm = docName(d);
    if (tn.textContent !== nm) tn.textContent = nm;
    el.dataset.tip = d.path || nm;
    if (d === S.active) el.scrollIntoView?.({ inline: 'nearest', block: 'nearest' });
  });
}
$('#tabs').addEventListener('click', (e) => {
  if (e.target.closest('.tab-add')) { newDoc(); return; }
  const el = e.target.closest('.tab'); if (!el) return;
  const d = S.docs.find((x) => x.id == el.dataset.id); if (!d) return;
  if (e.target.closest('.x')) closeDoc(d); else activate(d);
});
$('#tabs').addEventListener('auxclick', (e) => { if (e.button !== 1) return; const el = e.target.closest('.tab'); const d = el && S.docs.find((x) => x.id == el.dataset.id); if (d) { e.preventDefault(); closeDoc(d); } });
$('#tabs').addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('tab')) { e.preventDefault(); e.target.click(); } });
$('#tabs').addEventListener('wheel', (e) => { if (!e.ctrlKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { $('#tabs').scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });

/* =================================================================== outline */
function renderToc() {
  const nav = $('#toc'), o = S.active && S.parsed ? S.parsed.outline : [];
  if (!o.length) { nav.innerHTML = `<div class="toc-i toc-none">${esc(S.active ? t('no_toc') : '')}</div>`; return; }
  const min = Math.min(...o.map((x) => x.level));
  nav.innerHTML = o.map((x, i) => `<a class="toc-i l${x.level - min + 1}" data-i="${i}" style="padding-left:${16 + (x.level - min) * 14}px" data-tip="${esc(x.text)}">${esc(x.text)}</a>`).join('');
}
function currentLine() {
  return S.mode === 'preview' ? preview.lineForY(docEl.scrollTop + 90) : ed.topLine() + 0.01;
}
let tocRaf = 0;
function updateToc() {
  cancelAnimationFrame(tocRaf);
  tocRaf = requestAnimationFrame(() => {
    const o = S.parsed ? S.parsed.outline : []; if (!o.length || !S.nav) return;
    const line = currentLine(); let a = -1;
    o.forEach((x, i) => { if (x.line <= line + 0.5) a = i; });
    $$('.toc-i[data-i]').forEach((e) => { const on = +e.dataset.i === a; if (on !== e.classList.contains('on')) { e.classList.toggle('on', on); if (on) e.scrollIntoView({ block: 'nearest' }); } });
  });
}
$('#toc').addEventListener('click', (e) => {
  const a = e.target.closest('.toc-i[data-i]'); if (!a || !S.parsed) return;
  const h = S.parsed.outline[+a.dataset.i];
  if (S.mode === 'preview') { const el = preview.elForLine(h.line); if (el) docEl.scrollTo({ top: el.offsetTop - 12, behavior: 'smooth' }); }
  else {
    S.driver = 'editor'; ed.goToLine(h.line);
    if (S.mode === 'split') { const y = preview.yForLine(h.line); docEl.scrollTo({ top: Math.max(0, y - 12), behavior: 'smooth' }); }
    ed.focus();
  }
  if (innerWidth <= 860) setNav(false, false);
});
function setNav(on, persist = true) {
  S.nav = on; if (persist) store.set('nav', on); body.classList.toggle('nonav', !on);
  const b = $('#bNav'); b.classList.toggle('on', on);
  b.innerHTML = icon(on ? 'view_sidebar_close' : 'view_sidebar');
  b.dataset.tip = t(on ? 'outline_hide' : 'outline_show'); b.setAttribute('aria-label', b.dataset.tip); b.setAttribute('aria-pressed', on);
  if (on && S.stale) refresh(true);
}
$('#bNav').onclick = () => setNav(!S.nav);
$('#drawerClose').onclick = () => setNav(false);
$('#drawerScrim').onclick = () => setNav(false, false);

/* ================================================================ scroll sync */
let syncRaf = 0;
function onEditorScroll() {
  updateToc();
  if (S.mode !== 'split' || !P.syncScroll || S.driver !== 'editor') return;
  cancelAnimationFrame(syncRaf);
  syncRaf = requestAnimationFrame(() => { docEl.scrollTop = preview.yForLine(ed.topLine()); });
}
docEl.addEventListener('scroll', () => {
  updateToc();
  if (S.mode !== 'split' || !P.syncScroll || S.driver !== 'preview') return;
  cancelAnimationFrame(syncRaf);
  syncRaf = requestAnimationFrame(() => ed.scrollToLineFrac(preview.lineForY(docEl.scrollTop)));
}, { passive: true });
$('#panePreview').addEventListener('pointerenter', () => { S.driver = 'preview'; });
$('#paneEditor').addEventListener('pointerenter', () => { S.driver = 'editor'; });
docEl.addEventListener('wheel', () => { S.driver = 'preview'; }, { passive: true });

/* ====================================================================== mode */
function setMode(m, store_ = true) {
  if (store_) { S.pref = m; store.set('mode', m); }
  const eff = innerWidth <= 700 && m === 'split' ? 'edit' : m;
  const was = S.mode; S.mode = eff;
  body.dataset.mode = eff;
  $$('#modeSeg button').forEach((b) => { b.classList.toggle('on', b.dataset.mode === (store_ ? m : eff)); b.setAttribute('aria-selected', b.dataset.mode === eff); });
  thumb($('#modeSeg'));
  if (S.active && was !== eff) {
    if (eff !== 'edit' && (S.stale || !S.parsed)) { refresh(true); }
    requestAnimationFrame(() => {
      if (eff === 'preview' && was !== 'preview') docEl.scrollTop = preview.yForLine(ed.topLine());
      if (eff === 'edit' && was === 'preview') ed.scrollToLineFrac(preview.lineForY(docEl.scrollTop));
      if (eff === 'split') docEl.scrollTop = preview.yForLine(ed.topLine());
      updateToc();
    });
    if (eff !== 'preview') setTimeout(() => ed.focus(), 120);
    if (S.findOpen) runFind(true);
  }
  updateChrome();
}
let narrowed = false;
$('#modeSeg').addEventListener('click', (e) => { const b = e.target.closest('button[data-mode]'); if (b) setMode(b.dataset.mode); });
addEventListener('resize', () => {
  thumb($('#modeSeg'));
  const want = S.pref === 'split' && innerWidth > 700 ? 'split' : S.mode === 'split' && innerWidth <= 700 ? 'edit' : S.mode;
  if (want !== S.mode) setMode(S.pref, false);
  if (innerWidth <= 860 && !narrowed) { narrowed = true; setNav(false, false); } else if (innerWidth > 860) narrowed = false;
});

/* ================================================================ find / replace */
const fq = $('#fq'), fr = $('#fr'), fbar = $('#findbar');
const F = { cs: false, re: false };
S.findTarget = 'editor';
let hits = [], hitCur = -1;
function clearMarks() { mdEl.querySelectorAll('mark.hit').forEach((m) => m.replaceWith(document.createTextNode(m.textContent))); mdEl.normalize(); hits = []; hitCur = -1; }
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function setCount(txt, bad) { const c = $('#fqc'); c.textContent = txt; c.classList.toggle('bad', !!bad); }
function runFind(moveSel = true) {
  if (!S.findOpen) return;
  S.findTarget = S.mode === 'preview' ? 'preview' : 'editor';
  fbar.classList.toggle('rep', fbar.dataset.rep === '1' && S.findTarget === 'editor');
  $('#fRepToggle').disabled = S.findTarget !== 'editor';
  const q = fq.value;
  if (S.findTarget === 'editor') {
    clearMarks();
    if (!q) { ed.clearQuery(); setCount(''); return; }
    const ok = ed.setQuery({ search: q, caseSensitive: F.cs, regexp: F.re, replace: fr.value });
    if (!ok) { setCount(t('bad_regex'), true); return; }
    if (moveSel) ed.next();
    updateCount();
  } else {
    ed.clearQuery(); clearMarks();
    if (!q || !S.active) { setCount(''); return; }
    let re; try { re = new RegExp(F.re ? q : escRe(q), F.cs ? 'g' : 'gi'); } catch { setCount(t('bad_regex'), true); return; }
    const walker = document.createTreeWalker(mdEl, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement.closest('.ch') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    const nodes = []; let n; while ((n = walker.nextNode())) nodes.push(n);
    for (const node of nodes) {
      const s = node.nodeValue; re.lastIndex = 0; let m, last = 0, frag = null;
      while ((m = re.exec(s))) {
        if (!m[0]) { re.lastIndex++; continue; }
        frag = frag || document.createDocumentFragment(); frag.append(s.slice(last, m.index));
        const k = document.createElement('mark'); k.className = 'hit'; k.textContent = m[0]; frag.append(k); last = m.index + m[0].length;
      }
      if (frag) { frag.append(s.slice(last)); node.replaceWith(frag); }
    }
    hits = [...mdEl.querySelectorAll('mark.hit')];
    gotoHit(moveSel ? 0 : Math.max(0, hitCur));
  }
}
function gotoHit(i) {
  if (!hits.length) { setCount(fq.value ? t('no_match') : '', !!fq.value); return; }
  hits[hitCur]?.classList.remove('cur'); hitCur = (i + hits.length) % hits.length;
  hits[hitCur].classList.add('cur'); hits[hitCur].scrollIntoView({ block: 'center', behavior: 'smooth' });
  setCount(`${hitCur + 1}/${hits.length}`);
}
function updateCount() {
  const c = ed.count();
  if (!c.valid) { setCount(t('bad_regex'), true); return; }
  setCount(c.total ? `${c.current || '–'}/${c.total}` : fq.value ? t('no_match') : '', !c.total && !!fq.value);
}
function openFind(rep = false) {
  if (!S.active) return;
  S.findOpen = true; fbar.classList.add('open');
  if (rep) { fbar.dataset.rep = '1'; $('#fRepToggle').classList.add('on'); }
  const sel = S.mode !== 'preview' ? ed.getState().sliceDoc(ed.getState().selection.main.from, ed.getState().selection.main.to) : getSelection().toString();
  if (sel && !sel.includes('\n') && sel.length < 120) fq.value = sel;
  runFind(!!fq.value && !!sel);
  (rep && S.mode !== 'preview' && fq.value ? fr : fq).focus(); (rep && fq.value ? fr : fq).select();
}
function closeFind() {
  if (!S.findOpen) return;
  S.findOpen = false; fbar.classList.remove('open'); ed.clearQuery(); clearMarks(); setCount('');
  if (S.mode !== 'preview') ed.focus();
}
const findStep = (dir) => { if (S.findTarget === 'editor') { dir > 0 ? ed.next() : ed.prev(); updateCount(); } else gotoHit(hitCur + dir); };
const onFindInput = debounce(() => runFind(true), 110);
fq.addEventListener('input', onFindInput);
fr.addEventListener('input', () => { if (S.findTarget === 'editor' && fq.value) { ed.setQuery({ search: fq.value, caseSensitive: F.cs, regexp: F.re, replace: fr.value }); } });
fbar.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); if (e.target === fr) { ed.replaceOne(); updateCount(); } else findStep(e.shiftKey ? -1 : 1); }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeFind(); }
});
$('#fNext').onclick = () => findStep(1); $('#fPrev').onclick = () => findStep(-1); $('#fClose').onclick = closeFind;
$('#fCase').onclick = (e) => { F.cs = !F.cs; e.currentTarget.classList.toggle('on', F.cs); runFind(true); };
$('#fRe').onclick = (e) => { F.re = !F.re; e.currentTarget.classList.toggle('on', F.re); runFind(true); };
$('#fRepToggle').onclick = (e) => { const on = fbar.dataset.rep !== '1'; fbar.dataset.rep = on ? '1' : '0'; e.currentTarget.classList.toggle('on', on); fbar.classList.toggle('rep', on && S.findTarget === 'editor'); if (on) fr.focus(); };
$('#fRepOne').onclick = () => { ed.replaceOne(); updateCount(); };
$('#fRepAll').onclick = () => { const n = ed.count().total; ed.replaceAll(); updateCount(); if (n) toast(t('replaced', { n })); };
$('#bFind').onclick = () => (S.findOpen ? closeFind() : openFind());

$('#sEol').onclick = () => {
  const d = S.active; if (!d) return;
  d.eol = d.eol === 'lf' ? 'crlf' : 'lf';
  d.wasDirty = isDirty(d); renderTabs(); updateChrome(); syncDirty();
};

/* ==================================================================== zoom */
function setZoom(z) {
  P.zoom = clamp(Math.round(z / 10) * 10, 60, 220); savePrefs();
  document.documentElement.style.setProperty('--z', P.zoom / 100);
  $('#zVal').textContent = P.zoom + '%';
  requestAnimationFrame(() => ed.view.requestMeasure());
}
$('#zIn').onclick = () => setZoom(P.zoom + 10); $('#zOut').onclick = () => setZoom(P.zoom - 10); $('#zVal').onclick = () => setZoom(100);
document.addEventListener('wheel', (e) => { if (e.ctrlKey && !e.target.closest('dialog')) { e.preventDefault(); setZoom(P.zoom + (e.deltaY < 0 ? 10 : -10)); } }, { passive: false, capture: true });

/* ============================================================ format toolbar */
$('#fmt').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cmd]'); if (!b || !S.active) return;
  const cmd = b.dataset.cmd;
  if (cmd === 'heading') {
    const items = [{ label: t('h_para'), run: () => ed.run('heading', 0) }, ...[1, 2, 3, 4, 5, 6].map((n) => ({ label: `${t('h_n')} ${n}`, shortcut: '#'.repeat(n), run: () => ed.run('heading', n) }))];
    openMenu(b, items);
  } else ed.run(cmd);
});

/* ===================================================================== menus */
function itemsMore() {
  const d = S.active;
  return [
    { label: t('save_as'), icon: 'save_as', shortcut: 'Ctrl+Shift+S', run: () => save(d, true), disabled: !d },
    { label: t('export_html'), icon: 'export', run: exportHtml, disabled: !d },
    { label: t('print'), icon: 'print', shortcut: 'Ctrl+P', run: printDoc, disabled: !d },
    { sep: true },
    { label: t('find_replace'), icon: 'replace', shortcut: 'Ctrl+H', run: () => openFind(true), disabled: !d },
    { label: t('copy_path'), icon: 'copy', run: async () => { if (await api.copy(d.path)) toast(t('copied')); }, disabled: !d || !d.path },
    { label: t('reveal'), icon: 'folder', run: () => api.reveal(d.path), disabled: !d || !d.path || !isTauri },
    { sep: true },
    { label: t('shortcuts'), icon: 'keyboard', shortcut: 'F1', run: showShortcuts },
    { label: t('about'), icon: 'info', run: showAbout },
  ];
}
$('#bMore').onclick = (e) => openMenu(e.currentTarget, itemsMore(), { alignRight: false });
$('#bRecent').onclick = (e) => {
  const list = store.get('recent', []);
  const items = list.length ? [...list.map((r) => ({ label: r.name, sub: r.path, icon: 'file', run: () => openRecent(r) })), { sep: true }, { label: t('clear_recent'), icon: 'delete', run: () => { store.set('recent', []); renderRecent(); } }] : [{ label: t('no_recent'), icon: 'history', disabled: true }];
  openMenu(e.currentTarget, items);
};
async function openRecent(r) {
  try { openDocs([await api.readDoc(r.path)]); } catch { toast(t('read_fail')); store.set('recent', store.get('recent', []).filter((x) => x.path !== r.path)); renderRecent(); }
}
function renderRecent() {
  const list = store.get('recent', []).slice(0, 5), el = $('#eRecent');
  el.innerHTML = list.length ? `<h4>${esc(t('recent'))}</h4>` + list.map((r, i) => `<button class="item" data-i="${i}">${icon('file')}<span class="tx"><b>${esc(r.name)}</b><small>${esc(r.path)}</small></span></button>`).join('') : '';
}
$('#eRecent').addEventListener('click', (e) => { const b = e.target.closest('.item'); if (b) openRecent(store.get('recent', [])[+b.dataset.i]); });

function showAbout() {
  showDialog({
    cls: 'about', raw: true, title: '',
    body: `<svg class="hero"><use href="#logo"/></svg><h2>Material Readme</h2><div class="ver">${esc(t('version'))} ${VERSION}</div><p style="margin-bottom:18px">${esc(t('tagline'))}</p>${creditHTML()}`,
    actions: [{ id: 'ok', label: t('close'), kind: 'tonal' }],
  });
}
function showShortcuts() {
  const rows = [['new', 'Ctrl+N'], ['open', 'Ctrl+O'], ['save', 'Ctrl+S'], ['save_as', 'Ctrl+Shift+S'], ['close_tab', 'Ctrl+W'], ['next_tab', 'Ctrl+Tab'], ['prev_tab', 'Ctrl+Shift+Tab'],
    ['m_edit', 'Ctrl+1'], ['m_split', 'Ctrl+2'], ['m_preview', 'Ctrl+3'], ['find', 'Ctrl+F'], ['find_replace', 'Ctrl+H'], ['f_next', 'F3 / Enter'], ['f_prev', 'Shift+F3'],
    ['c_bold', 'Ctrl+B'], ['c_italic', 'Ctrl+I'], ['c_strike', 'Ctrl+Shift+X'], ['c_code', 'Ctrl+E'], ['c_link', 'Ctrl+K'], ['outline', 'Ctrl+\\'], ['print', 'Ctrl+P'],
    ['zoom_in', 'Ctrl+= / Ctrl+Wheel'], ['zoom_out', 'Ctrl+-'], ['zoom_reset', 'Ctrl+0'], ['settings', 'Ctrl+,']];
  showDialog({ title: t('shortcuts'), raw: true, cls: '', body: `<div class="kbd-grid">${rows.map(([k, s]) => `<div class="r"><span>${esc(t(k))}</span><span>${esc(s)}</span></div>`).join('')}</div>`, actions: [{ id: 'ok', label: t('close'), kind: 'tonal' }] });
}

/* ===================================================================== export */
async function exportHtml() {
  const d = S.active; if (!d) return;
  refresh(true); if (S.mode === 'edit') preview.render(S.parsed, d.path);
  await new Promise((r) => setTimeout(r, 250));
  const clone = mdEl.cloneNode(true); clone.classList.add('still');
  $$('.cp', clone).forEach((b) => b.remove()); $$('mark.hit', clone).forEach((m) => m.replaceWith(m.textContent));
  const s = theme.currentScheme(theme.state.seed, false, 0);
  const vars = Object.entries(s).map(([k, v]) => `--md-sys-color-${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}:${v}`).join(';');
  let css = ''; for (const f of ['css/theme.css', 'css/markdown.css']) { try { css += await (await fetch(f)).text(); } catch { /* ignore */ } }
  const name = docName(d).replace(/\.\w+$/, '');
  const html = `<!doctype html><html lang="${getLang()}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(name)}</title><style>:root{${vars};--z:1}body{margin:0;background:var(--md-sys-color-surface);color:var(--md-sys-color-on-surface);font:400 14px/20px 'Roboto',system-ui,'Segoe UI',sans-serif}${css.replace(/@media \(prefers-reduced-motion[^}]*\{[^}]*\}[^}]*\}/, '')}.md,.md .blk{animation:none!important}</style></head><body>${clone.outerHTML}</body></html>`;
  if (!isTauri) { download(name + '.html', html, 'text/html'); return; }
  const path = await api.pickSave(name + '.html', [{ name: 'HTML', extensions: ['html'] }]);
  if (!path) return;
  try { await api.writeDoc(path, html); toast(t('exported'), t('show'), () => api.reveal(path)); } catch { toast(t('save_fail')); }
}
function printDoc() {
  if (!S.active) return;
  refresh(true); if (S.mode === 'edit') preview.render(S.parsed, S.active.path);
  setTimeout(() => window.print(), 300);
}

/* ================================================================ preview clicks */
function resolvePath(base, rel) {
  const sep = base.includes('\\') ? '\\' : '/', p = base.split(/[\\/]/); p.pop();
  for (const s of decodeURIComponent(rel).split('/')) { if (s === '..') p.pop(); else if (s && s !== '.') p.push(s); }
  return p.join(sep);
}
mdEl.addEventListener('click', async (e) => {
  const cp = e.target.closest('.cp');
  if (cp) {
    const ok = await api.copy(cp.closest('.cb').querySelector('code').textContent);
    const lbl = cp.querySelector('span:last-child'); if (ok && lbl) { lbl.textContent = t('copied'); setTimeout(() => { lbl.textContent = t('copy'); }, 1200); } else if (!ok) toast(t('copy_fail'));
    return;
  }
  const a = e.target.closest('a[href]'); if (!a) return;
  e.preventDefault(); const h = a.getAttribute('href'); const d = S.active;
  if (h[0] === '#') { const el = document.getElementById(decodeURIComponent(h.slice(1))); if (el) docEl.scrollTo({ top: el.parentElement.offsetTop - 12, behavior: 'smooth' }); return; }
  if (/^(https?:|mailto:|tel:)/i.test(h)) { api.openUrl(h); return; }
  if (d && d.path && /\.(md|markdown|mdown|mkd)(#.*)?$/i.test(h)) { try { openDocs([await api.readDoc(resolvePath(d.path, h.split('#')[0]))]); } catch { toast(t('read_fail')); } }
});

/* ============================================================ file operations */
async function pick() {
  try { const docs = await api.pickDocs(); if (docs.length) openDocs(docs); } catch { toast(t('read_fail')); }
}
$('#bOpen').onclick = $('#eOpen').onclick = pick;
$('#bNew').onclick = $('#eNew').onclick = () => newDoc();
$('#eSample').onclick = () => { const d = makeDoc({ text: sampleText(getLang()) }); S.untitled--; d.n = 0; d.name = 'sample.md'; S.docs.push(d); d.fresh = true; activate(d); };
$('#bSave').onclick = () => save();

/* Drag and drop */
const work = $('#work'); work.dataset.drop = t('drop');
if (isTauri) {
  api.listen('tauri://drag-enter', () => work.classList.add('drag'));
  api.listen('tauri://drag-leave', () => work.classList.remove('drag'));
  api.listen('tauri://drag-drop', async (e) => {
    work.classList.remove('drag');
    const paths = (e.payload?.paths || []).filter((p) => DOC_RE.test(p));
    const docs = (await Promise.all(paths.map((p) => api.readDoc(p).catch(() => null)))).filter(Boolean);
    if (docs.length) openDocs(docs); else toast(t('drop_bad'));
  });
} else {
  document.addEventListener('dragover', (e) => { e.preventDefault(); work.classList.add('drag'); });
  document.addEventListener('dragleave', (e) => { if (!e.relatedTarget) work.classList.remove('drag'); });
  document.addEventListener('drop', async (e) => {
    e.preventDefault(); work.classList.remove('drag');
    const files = [...(e.dataTransfer?.files || [])].filter((f) => DOC_RE.test(f.name));
    if (files.length) openDocs(await Promise.all(files.map(readBrowserFile))); else toast(t('drop_bad'));
  });
}
api.listen('open-docs', (e) => openDocs(e.payload || []));

/* External changes */
async function checkExternal() {
  const d = S.active; if (!d || !d.path || !isTauri || document.hidden) return;
  try {
    const m = await api.mtime(d.path);
    if (!m || m === d.mtime || m === d.extSeen) return;
    if (!isDirty(d)) { reloadFrom(d, await api.readDoc(d.path)); toast(t('reloaded')); }
    else { d.extSeen = m; toast(t('ext_changed'), t('reload'), async () => { try { reloadFrom(d, await api.readDoc(d.path)); } catch { toast(t('read_fail')); } }, 10000); }
  } catch { /* file may be gone */ }
}
setInterval(checkExternal, 2000);
addEventListener('focus', checkExternal);

/* Closing the window */
async function requestClose() {
  for (const d of [...S.docs]) { if (isDirty(d)) { const ok = await closeDoc(d); if (!ok) return; } }
  api.forceClose().catch(() => {});
}
api.listen('close-requested', requestClose);
addEventListener('beforeunload', (e) => { if (!isTauri && S.docs.some(isDirty)) { e.preventDefault(); e.returnValue = ''; } });

/* ================================================================== settings */
const ctx = {
  prefs: P,
  themeChanged: () => { api.setTheme(theme.state.mode); updateThemeBtn(); },
  about: showAbout,
  set(key, val) {
    P[key] = val; savePrefs();
    if (key === 'lang') { setLang(val); relocalize(); }
    else if (key === 'wrap') { ed.opts.wrap = val; ed.applyOptions(); }
    else if (key === 'lineNumbers') { ed.opts.lineNumbers = val; ed.applyOptions(); }
    else if (key === 'zoom') setZoom(val);
  },
  async reset() {
    Object.assign(P, DEFAULTS); savePrefs(); setLang('auto'); setZoom(100);
    ed.opts.wrap = true; ed.opts.lineNumbers = false; ed.applyOptions();
    theme.set({ mode: 'system', seed: theme.DEFAULT_SEED, preset: 'sky', contrast: 0 }); api.setTheme('system'); updateThemeBtn();
    await api.setWinMode('remember'); relocalize(); toast(t('reset_done'));
  },
};
$('#bSettings').onclick = () => openSettings(ctx);
function updateThemeBtn() {
  const m = theme.state.mode, b = $('#bTheme');
  b.innerHTML = icon(m === 'system' ? 'system' : m === 'light' ? 'sun' : 'moon');
  b.dataset.tip = t('theme_' + m);
}
$('#bTheme').onclick = (e) => {
  const order = ['system', 'light', 'dark'], next = order[(order.indexOf(theme.state.mode) + 1) % 3];
  const r = e.currentTarget.getBoundingClientRect();
  theme.set({ mode: next }, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
  api.setTheme(next); updateThemeBtn(); toast(t('theme_' + next), null, null, 1400);
};

function relocalize() {
  document.documentElement.lang = getLang();
  translateDom(); updateThemeBtn(); setNav(S.nav, false); renderTabs(); updateChrome(); updateCursor(); renderRecent(); renderToc(); updateToc();
  work.dataset.drop = t('drop');
  if (S.active) updateStats(ed.text());
  requestAnimationFrame(() => thumb($('#modeSeg')));
}

/* ================================================================== shortcuts */
document.addEventListener('keydown', (e) => {
  if (e.key === 'F1') { e.preventDefault(); showShortcuts(); return; }
  if (e.key === 'F3') { e.preventDefault(); if (S.findOpen) findStep(e.shiftKey ? -1 : 1); else openFind(); return; }
  if (e.key === 'Escape' && S.findOpen && !e.defaultPrevented && !document.querySelector('dialog[open]')) { closeFind(); return; }
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
  const k = e.key.toLowerCase(), sh = e.shiftKey, inDlg = !!e.target.closest?.('dialog');
  const go = (fn) => { e.preventDefault(); e.stopPropagation(); fn(); };
  if (inDlg && !['s', ','].includes(k)) return;
  switch (k) {
    case 'n': go(() => newDoc()); break;
    case 'o': go(pick); break;
    case 's': go(() => save(S.active, sh)); break;
    case 'w': go(() => S.active && closeDoc(S.active)); break;
    case 'f': go(() => openFind()); break;
    case 'h': go(() => openFind(true)); break;
    case 'p': go(printDoc); break;
    case '\\': go(() => setNav(!S.nav)); break;
    case ',': go(() => openSettings(ctx)); break;
    case '1': go(() => setMode('edit')); break;
    case '2': go(() => setMode('split')); break;
    case '3': go(() => setMode('preview')); break;
    case '=': case '+': go(() => setZoom(P.zoom + 10)); break;
    case '-': go(() => setZoom(P.zoom - 10)); break;
    case '0': go(() => setZoom(100)); break;
    case 'tab': case 'pagedown': case 'pageup': {
      if (S.docs.length < 2) break;
      const dir = k === 'pageup' || (k === 'tab' && sh) ? -1 : 1, i = S.docs.indexOf(S.active);
      go(() => activate(S.docs[(i + dir + S.docs.length) % S.docs.length]));
      break;
    }
    default:
  }
}, true);
document.addEventListener('contextmenu', (e) => { if (!e.target.closest('input, .cm-content, #doc')) e.preventDefault(); });

/* ===================================================================== boot */
async function boot() {
  document.documentElement.lang = getLang();
  translateDom(); updateThemeBtn();
  if (!S.nav || innerWidth <= 860) body.classList.add('nonav');
  S.nav = !body.classList.contains('nonav');
  setNav(S.nav, false);
  setZoom(P.zoom);
  body.classList.add('no-doc');
  setMode(S.pref, false);
  renderTabs(); updateChrome(); renderRecent(); renderToc();
  if (isTauri) {
    api.setTheme(theme.state.mode);
    const W = api.win();
    W.isDecorated().then((d) => { if (d) body.classList.add('native'); }).catch(() => {});
    const sync = () => W.isMaximized().then((m) => { $('#wMax .ic').innerHTML = `<svg viewBox="0 -960 960 960"><path d="${ICONS[m ? 'restore' : 'maximize']}"/></svg>`; $('#wMax').dataset.tip = t(m ? 'w_restore' : 'w_max'); }).catch(() => {});
    $('#wMin').onclick = () => W.minimize(); $('#wMax').onclick = () => W.toggleMaximize(); $('#wClose').onclick = () => W.close();
    sync(); W.onResized(sync);
    const docs = await api.startupDocs().catch(() => []);
    if (docs.length) openDocs(docs);
  } else if (new URLSearchParams(location.search).has('demo')) {
    $('#eSample').click();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => api.ready()));
  document.fonts?.ready.then(() => thumb($('#modeSeg')));
  window.__app = { S, ed, preview, P, openDocs, setMode, save, activate };
}
boot();
