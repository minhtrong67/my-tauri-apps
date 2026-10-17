import { CASES, CASE_GROUPS, TOOLS, displayName, textStats } from './engine.js';
import { t, setLanguage, getLanguage, detectLanguage } from './i18n.js';
import { icon, hydrateIcons } from './icons.js';
import { PRESETS, DEFAULT_SEED, schemeFor, applyScheme } from './theme.js';
import { availableFonts, applyFont, findFont } from './fonts.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const TA = window.__TAURI__;
const invoke = TA && TA.core ? TA.core.invoke : null;
const win = TA && TA.window ? TA.window.getCurrentWindow() : null;

/* ---------- persistence ---------- */
const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage full or blocked */ } },
};

const state = {
  tab: store.get('tab', 'convert'),
  cse: store.get('cse', 'camel'),
  tool: store.get('tool', 'dedupe'),
  smart: store.get('smart', '1') !== '0',
  theme: store.get('theme', 'system'),          // system | light | dark
  seed: (store.get('seed', DEFAULT_SEED) || DEFAULT_SEED).toUpperCase(),
  langPref: store.get('lang', 'auto'),           // auto | en | vi
  font: store.get('font', 'system'),
  winMode: 'remember',
};
if (!['convert', 'all', 'tools'].includes(state.tab)) state.tab = 'convert';
if (!CASES.some((c) => c.id === state.cse)) state.cse = 'camel';
if (!TOOLS.some((c) => c.id === state.tool)) state.tool = 'dedupe';
if (!['system', 'light', 'dark'].includes(state.theme)) state.theme = 'system';
if (!['auto', 'en', 'vi'].includes(state.langPref)) state.langPref = 'auto';
if (!/^#[0-9A-F]{6}$/.test(state.seed)) state.seed = DEFAULT_SEED;

const lang = () => getLanguage();
const opts = () => ({ smart: state.smart, lang: lang() });
const currentItem = () => (state.tab === 'tools' ? TOOLS.find((x) => x.id === state.tool) : CASES.find((c) => c.id === state.cse));
let out = '';

/* ---------- small helpers ---------- */
function debounce(fn, ms) {
  let id;
  return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); };
}
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function retrigger(el, cls = 'swap-in') {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

function setChecked(group, value) {
  $$('[data-v]', group).forEach((b) => b.setAttribute('aria-checked', String(b.dataset.v === value)));
}

/* ---------- ripple ---------- */
document.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  const el = e.target.closest('.rip');
  if (!el || el.disabled) return;
  const r = el.getBoundingClientRect();
  const size = Math.hypot(Math.max(e.clientX - r.left, r.right - e.clientX), Math.max(e.clientY - r.top, r.bottom - e.clientY)) * 2;
  const s = document.createElement('span');
  s.className = 'ripple';
  s.style.width = s.style.height = size + 'px';
  s.style.left = e.clientX - r.left - size / 2 + 'px';
  s.style.top = e.clientY - r.top - size / 2 + 'px';
  el.appendChild(s);
  s.addEventListener('animationend', () => s.remove(), { once: true });
});

/* ---------- snackbar ---------- */
let sbTimer;
function toast(msg, action) {
  const sb = $('#sb');
  $('#sbText').textContent = msg;
  const btn = $('#sbAct');
  btn.hidden = !action;
  btn.onclick = null;
  if (action) {
    btn.textContent = action.label;
    btn.onclick = () => { hideToast(); action.run(); };
  }
  sb.classList.add('on');
  clearTimeout(sbTimer);
  sbTimer = setTimeout(hideToast, action ? 5000 : 2400);
}
function hideToast() { $('#sb').classList.remove('on'); }

/* ---------- clipboard ---------- */
async function copyText(text) {
  let ok = true;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    ok = false;
    const a = document.createElement('textarea');
    a.value = text;
    a.className = 'sr';
    document.body.append(a);
    a.select();
    try { ok = document.execCommand('copy'); } catch { /* ignore */ }
    a.remove();
  }
  toast(t(ok ? 'copiedToast' : 'copyFail'));
  return ok;
}

let copyTimer;
function flashCopied() {
  const b = $('#bCopy');
  $('#copyIc').innerHTML = icon('check');
  $('#copyTx').textContent = t('copied');
  b.classList.add('done');
  clearTimeout(copyTimer);
  copyTimer = setTimeout(resetCopyButton, 1600);
}
function resetCopyButton() {
  clearTimeout(copyTimer);
  $('#copyIc').innerHTML = icon('copy');
  $('#copyTx').textContent = t('copy');
  $('#bCopy').classList.remove('done');
}

/* ---------- rendering ---------- */
const input = $('#inp');
const output = $('#out');

function chipHtml(attr, id, label, on) {
  return `<button class="chip rip" role="radio" ${attr}="${id}" aria-checked="${on}"><span class="chk">${icon('check')}</span><span>${label}</span></button>`;
}
const groupNames = () => ({ text: t('gText'), code: t('gCode'), other: t('gOther') });

function buildChips() {
  const G = groupNames();
  $('#chips').innerHTML = CASE_GROUPS.map(
    (g) =>
      `<div class="pgroup"><div class="glabel">${G[g]}</div><div class="chips" role="radiogroup">` +
      CASES.filter((c) => c.g === g).map((c) => chipHtml('data-c', c.id, esc(displayName(c, lang())), c.id === state.cse)).join('') +
      '</div></div>',
  ).join('');
  $('#tools').innerHTML = TOOLS.map((x) => chipHtml('data-tool', x.id, esc(displayName(x, lang())), x.id === state.tool)).join('');
}

function renderStats(s) {
  const st = textStats(s);
  $('#stat').textContent = `${st.chars.toLocaleString()} ${t('chars')}  ·  ${st.words.toLocaleString()} ${t('wordsU')}  ·  ${st.lines.toLocaleString()} ${t('linesU')}`;
}

/* "All cases": rows are built once per language, then only their text is refreshed while typing. */
let allRows = [];
function buildAllRows() {
  const G = groupNames();
  let n = 0;
  $('#list').innerHTML =
    `<div class="empty">${esc(t('emptyAll'))}</div>` +
    CASE_GROUPS.map(
      (g) =>
        `<div class="pgroup"><div class="glabel">${G[g]}</div>` +
        CASES.filter((c) => c.g === g).map((c) =>
          `<button class="row rip" data-c="${c.id}" style="--n:${n++}"><span class="rn">${esc(displayName(c, lang()))}</span><span class="rv"></span>${icon('copy')}</button>`,
        ).join('') +
        '</div>',
    ).join('');
  allRows = $$('#list .row').map((el) => ({ el, c: CASES.find((c) => c.id === el.dataset.c), rv: $('.rv', el) }));
}

function updateAll(s) {
  const list = $('#list');
  list.classList.toggle('is-empty', !s);
  if (!s) return;
  const sample = s.length > 20000 ? s.slice(0, 20000) : s;
  for (const { el, c, rv } of allRows) {
    const r = c.f(sample, opts());
    const first = r.split(/\r?\n/)[0];
    const shown = first.length > 140 ? first.slice(0, 140) + '…' : first;
    rv.textContent = shown + (r.includes('\n') || s.length > sample.length ? ' …' : '');
    el.title = first;
  }
}

let lastTag = '';
function updateTag() {
  const tag = $('#oTag');
  tag.hidden = state.tab === 'all';
  if (tag.hidden) return;
  const name = displayName(currentItem(), lang());
  if (name !== lastTag) { tag.textContent = name; retrigger(tag, 'pop'); lastTag = name; }
}

function update() {
  const s = input.value;
  renderStats(s);
  saveDraft(s);
  $('#bSample').hidden = !!s;
  if (state.tab === 'all') {
    out = '';
    updateAll(s);
  } else {
    out = currentItem().f(s, opts());
    output.value = out;
  }
  $('#bCopy').disabled = $('#bSwap').disabled = $('#bSave').disabled = !out;
  if (!out) resetCopyButton();
}

const saveDraft = debounce((s) => store.set('draft', s.length < 2_000_000 ? s : ''), 500);
let raf = 0;
let big = 0;
function schedule() {
  cancelAnimationFrame(raf);
  clearTimeout(big);
  if (input.value.length > 30000) big = setTimeout(update, 160);
  else raf = requestAnimationFrame(update);
}

function syncSmart() {
  $('#smartWrap').hidden = !(state.tab === 'convert' && state.cse === 'title');
}

function setTab(k, animate = true) {
  state.tab = k;
  store.set('tab', k);
  $('#content').dataset.tab = k;
  $$('.rail-item').forEach((b) => {
    const on = b.dataset.tab === k;
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
  });
  $('#chips').hidden = k !== 'convert';
  $('#tools').hidden = k !== 'tools';
  $('#cardPick').hidden = k === 'all';
  $('#list').hidden = k !== 'all';
  $('#outField').hidden = k === 'all';
  $('#outActions').hidden = k === 'all';
  $('#oTitle').textContent = t(k === 'all' ? 'allTitle' : k === 'tools' ? 'toolsTitle' : 'result');
  $('#pTitle').textContent = t(k === 'tools' ? 'pickTool' : 'pickStyle');
  syncSmart();
  updateTag();
  update();
  if (animate) {
    [$('#cardPick'), $('#outField')].filter((e) => !e.hidden).forEach((e) => retrigger(e));
    const list = $('#list');
    if (!list.hidden) {
      list.classList.remove('enter');
      void list.offsetWidth;
      list.classList.add('enter');
      setTimeout(() => list.classList.remove('enter'), 900);
    }
  }
}

/* ---------- i18n ---------- */
function activeLang() { return state.langPref === 'auto' ? detectLanguage() : state.langPref; }

function applyI18n() {
  setLanguage(activeLang());
  $$('[data-i]').forEach((e) => { e.textContent = t(e.dataset.i); });
  $$('[data-tt]').forEach((e) => {
    e.title = t(e.dataset.tt);
    if (e.tagName !== 'LABEL') e.setAttribute('aria-label', t(e.dataset.tt));
  });
  $$('[data-ph]').forEach((e) => { e.placeholder = t(e.dataset.ph); });
  $$('[data-tt-label]').forEach((e) => e.setAttribute('aria-label', t(e.dataset.ttLabel)));
  buildChips();
  buildAllRows();
  buildSwatches();
  buildFonts();
  updateWinHint();
  syncMaxIcon();
  lastTag = '';
  resetCopyButton();
  setTab(state.tab, false);
}

/* ---------- theme ---------- */
const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
const isDark = () => state.theme === 'dark' || (state.theme === 'system' && !!mq && mq.matches);

function paint() {
  applyScheme(state.seed, isDark());
  if (win) win.setTheme(state.theme === 'system' ? null : state.theme).catch(() => {});
  paintSwatches();
}
if (mq) mq.addEventListener('change', () => { if (state.theme === 'system') paint(); });

function swatchColors(el, seed) {
  const s = schemeFor(seed, isDark());
  el.style.setProperty('--sw-a', s.primary);
  el.style.setProperty('--sw-b', s.primaryContainer);
}

function buildSwatches() {
  const host = $('#swatches');
  host.textContent = '';
  PRESETS.forEach((p) => {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.setAttribute('role', 'radio');
    b.dataset.seed = p.seed;
    b.title = t(p.key);
    b.setAttribute('aria-label', t(p.key));
    b.innerHTML = icon('check');
    host.append(b);
  });
  const c = document.createElement('label');
  c.className = 'swatch custom';
  c.setAttribute('role', 'radio');
  c.title = t('custom');
  c.innerHTML = `${icon('check')}<span class="pip">${icon('pipette')}</span><input type="color" aria-label="${esc(t('custom'))}">`;
  host.append(c);
  paintSwatches();
}

function colorLabel() {
  const p = PRESETS.find((x) => x.seed === state.seed);
  return `${p ? t(p.key) : t('custom')} · ${state.seed}`;
}

function paintSwatches() {
  $$('#swatches .swatch').forEach((b) => {
    if (b.dataset.seed) {
      swatchColors(b, b.dataset.seed);
      b.setAttribute('aria-checked', String(b.dataset.seed === state.seed));
    } else {
      const isCustom = !PRESETS.some((p) => p.seed === state.seed);
      b.setAttribute('aria-checked', String(isCustom));
      swatchColors(b, state.seed);
      const inp = $('input', b);
      if (inp.value.toUpperCase() !== state.seed) inp.value = state.seed.toLowerCase();
      b.title = isCustom ? `${t('custom')}: ${state.seed}` : t('custom');
    }
  });
  $('#colorName').textContent = colorLabel();
}

function setSeed(seed) {
  state.seed = seed.toUpperCase();
  store.set('seed', state.seed);
  paint();
}

/* ---------- font ---------- */
function buildFonts() {
  const host = $('#fontGrid');
  host.textContent = '';
  availableFonts().forEach((f) => {
    const b = document.createElement('button');
    b.className = 'font-tile rip';
    b.setAttribute('role', 'radio');
    b.dataset.font = f.id;
    b.style.setProperty('--f', f.stack);
    b.innerHTML = `<span class="aa">Aa</span><span class="fn">${esc(f.id === 'system' ? t('fSystem') : f.name)}</span>${icon('check')}`;
    host.append(b);
  });
  paintFonts();
}
function paintFonts() {
  $$('#fontGrid .font-tile').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.font === state.font)));
}
function setFont(id) {
  state.font = findFont(id).id;
  store.set('font', state.font);
  applyFont(state.font);
  paintFonts();
}

/* ---------- window (Tauri) ---------- */
function updateWinHint() {
  $('#winHint').textContent = t(state.winMode === 'maximized' ? 'wMaximizedHint' : 'wRememberHint');
}

function syncMaxIcon() {
  if (!win) return;
  win.isMaximized().then((m) => {
    const b = $('#wMax');
    b.innerHTML = icon(m ? 'restore' : 'max');
    b.title = t(m ? 'restore' : 'maximize');
    b.setAttribute('aria-label', b.title);
  }).catch(() => {});
}

async function setWindowMode(mode) {
  if (!invoke) return;
  try {
    await invoke('set_window_mode', { mode });
    state.winMode = mode;
    setChecked($('#segWin'), mode);
    updateWinHint();
  } catch { /* keep previous value */ }
}

async function initWindow() {
  if (!win || !invoke) return;
  $('#wc').hidden = false;
  $('#wMin').onclick = () => win.minimize();
  $('#wMax').onclick = () => win.toggleMaximize();
  $('#wClose').onclick = () => win.close();
  win.onResized(debounce(syncMaxIcon, 60));
  syncMaxIcon();
  try {
    state.winMode = await invoke('get_window_mode');
    $('#secWindow').hidden = false;
    setChecked($('#segWin'), state.winMode);
    updateWinHint();
  } catch { /* command unavailable */ }
  TA.event.listen('tauri://drag-enter', () => { $('#drop').hidden = false; });
  TA.event.listen('tauri://drag-leave', () => { $('#drop').hidden = true; });
  TA.event.listen('tauri://drag-drop', (e) => {
    $('#drop').hidden = true;
    const p = e.payload && e.payload.paths && e.payload.paths[0];
    if (p) readPath(p);
  });
}

/* ---------- files ---------- */
function setInput(text) {
  input.value = text;
  update();
}

async function readPath(path) {
  try {
    setInput(await invoke('read_text', { path }));
  } catch (err) {
    toast(String(err).includes('too_large') ? t('tooLarge') : t('readFail'));
  }
}

async function openFile() {
  if (TA && TA.dialog) {
    try {
      const p = await TA.dialog.open({ multiple: false, directory: false, filters: [{ name: 'Text', extensions: ['txt', 'md', 'csv', 'log', 'json'] }] });
      if (p) readPath(p);
    } catch { toast(t('readFail')); }
  } else {
    $('#file').click();
  }
}

async function saveFile() {
  if (!out) return;
  if (invoke) {
    try {
      if (await invoke('save_text', { name: 'result.txt', text: out })) toast(t('saved'));
    } catch { toast(t('saveFail')); }
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([out], { type: 'text/plain' }));
    a.download = 'result.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(t('saved'));
  }
}

/* ---------- dialogs ---------- */
function openDlg(d) { if (!d.open) d.showModal(); }
function closeDlg(d) {
  if (!d.open || d.classList.contains('closing')) return;
  d.classList.add('closing');
  let timer;
  const fin = () => {
    clearTimeout(timer);
    d.removeEventListener('animationend', onEnd);
    d.classList.remove('closing');
    if (d.open) d.close();
  };
  const onEnd = (e) => { if (e.target === d && e.animationName === 'dlg-out') fin(); };
  d.addEventListener('animationend', onEnd);
  timer = setTimeout(fin, 320);
}
$$('dialog').forEach((d) => {
  d.addEventListener('cancel', (e) => { e.preventDefault(); closeDlg(d); });
  d.addEventListener('click', (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDlg(d);
    }
  });
  $$('[data-close]', d).forEach((b) => b.addEventListener('click', () => closeDlg(d)));
});

/* ---------- events ---------- */
input.addEventListener('input', schedule);

$('#chips').addEventListener('click', (e) => {
  const b = e.target.closest('[data-c]');
  if (!b) return;
  state.cse = b.dataset.c;
  store.set('cse', state.cse);
  $$('#chips [data-c]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  syncSmart();
  updateTag();
  update();
});
$('#tools').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tool]');
  if (!b) return;
  state.tool = b.dataset.tool;
  store.set('tool', state.tool);
  $$('#tools [data-tool]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  updateTag();
  update();
});
$('#list').addEventListener('click', (e) => {
  const r = e.target.closest('[data-c]');
  if (r) copyText(CASES.find((c) => c.id === r.dataset.c).f(input.value, opts()));
});
$('#smart').checked = state.smart;
$('#smart').addEventListener('change', (e) => {
  state.smart = e.target.checked;
  store.set('smart', state.smart ? '1' : '0');
  update();
});

$$('.rail-item').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
$('.rail').addEventListener('keydown', (e) => {
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  const tabs = $$('.rail-item');
  const i = tabs.findIndex((b) => b.dataset.tab === state.tab);
  const d = e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 1;
  const nb = tabs[(i + d + tabs.length) % tabs.length];
  nb.focus();
  setTab(nb.dataset.tab);
});

$('#bCopy').addEventListener('click', async () => { if (out && (await copyText(out))) flashCopied(); });

function clearAll() {
  const prev = input.value;
  if (!prev) { input.focus(); return; }
  setInput('');
  input.focus();
  toast(t('cleared'), { label: t('undo'), run: () => setInput(prev) });
}
$('#bClear').addEventListener('click', clearAll);
$('#bSwap').addEventListener('click', () => {
  if (!out) return;
  const prev = input.value;
  setInput(out);
  toast(t('swapped'), { label: t('undo'), run: () => setInput(prev) });
});
$('#bPaste').addEventListener('click', async () => {
  try {
    setInput(await navigator.clipboard.readText());
    input.focus();
  } catch { input.focus(); toast(t('pasteFail')); }
});
$('#bSample').addEventListener('click', () => { setInput(t('sampleText')); input.focus(); });
$('#bSave').addEventListener('click', saveFile);
$('#bOpen').addEventListener('click', openFile);
$('#file').addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (f) {
    if (f.size > 10 * 1024 * 1024) toast(t('tooLarge'));
    else { const r = new FileReader(); r.onload = () => setInput(String(r.result)); r.readAsText(f); }
  }
  e.target.value = '';
});

$('#bSet').addEventListener('click', () => openDlg($('#dSet')));
$('#bAbout').addEventListener('click', () => openDlg($('#dAbout')));

$('#segTheme').addEventListener('click', (e) => {
  const b = e.target.closest('[data-v]');
  if (!b) return;
  state.theme = b.dataset.v;
  store.set('theme', state.theme);
  setChecked($('#segTheme'), state.theme);
  paint();
});
$('#segLang').addEventListener('click', (e) => {
  const b = e.target.closest('[data-v]');
  if (!b) return;
  state.langPref = b.dataset.v;
  store.set('lang', state.langPref);
  setChecked($('#segLang'), state.langPref);
  applyI18n();
});
$('#segWin').addEventListener('click', (e) => {
  const b = e.target.closest('[data-v]');
  if (b) setWindowMode(b.dataset.v);
});
$('#swatches').addEventListener('click', (e) => {
  const b = e.target.closest('.swatch[data-seed]');
  if (b) setSeed(b.dataset.seed);
});
$('#swatches').addEventListener('input', (e) => {
  if (e.target.matches('input[type=color]')) setSeed(e.target.value);
});
$('#fontGrid').addEventListener('click', (e) => {
  const b = e.target.closest('[data-font]');
  if (b) setFont(b.dataset.font);
});
$('#bReset').addEventListener('click', async () => {
  state.theme = 'system'; state.langPref = 'auto'; state.seed = DEFAULT_SEED; state.smart = true;
  ['theme', 'lang', 'seed'].forEach((k) => store.set(k, k === 'seed' ? DEFAULT_SEED : k === 'theme' ? 'system' : 'auto'));
  store.set('smart', '1');
  $('#smart').checked = true;
  setChecked($('#segTheme'), 'system');
  setChecked($('#segLang'), 'auto');
  setFont('system');
  await setWindowMode('remember');
  paint();
  applyI18n();
  toast(t('resetDone'));
});

document.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.shiftKey && k === 'c') { e.preventDefault(); if (out) copyText(out).then((ok) => ok && flashCopied()); }
  else if (mod && e.shiftKey && k === 'x') { e.preventDefault(); clearAll(); }
  else if (mod && !e.shiftKey && k === 'o') { e.preventDefault(); openFile(); }
  else if (mod && !e.shiftKey && k === 's') { e.preventDefault(); saveFile(); }
  else if (mod && k === ',') { e.preventDefault(); openDlg($('#dSet')); }
  else if (e.altKey && ['1', '2', '3'].includes(e.key)) { e.preventDefault(); setTab(['convert', 'all', 'tools'][+e.key - 1]); }
});
// Block the browser context menu and accidental page drops (files are handled by Tauri).
document.addEventListener('contextmenu', (e) => { if (!e.target.closest('textarea')) e.preventDefault(); });
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

/* ---------- start ---------- */
async function start() {
  hydrateIcons();
  setChecked($('#segTheme'), state.theme);
  setChecked($('#segLang'), state.langPref);
  state.font = findFont(state.font).id;
  applyFont(state.font);
  paint();
  applyI18n();
  input.value = store.get('draft', '') || '';
  update();
  await initWindow();
  await nextFrame();
  $('#app').classList.add('ready');
  await nextFrame();
  if (invoke) invoke('app_ready').catch(() => {});
}
start();
