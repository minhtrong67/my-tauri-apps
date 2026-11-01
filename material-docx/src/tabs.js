// Several documents at once: every tab keeps a snapshot (content, page setup, undo history, path, dirty state).
// The active document always lives in the editor; switching swaps snapshots in and out.
import { $, el, esc } from './util.js';
import { icon } from './icons.js';
import { t } from './i18n.js';
import { doc, bus, cloneMeta } from './state.js';
import { editor, workspace, cleanHtml, setContent, getHistory, setHistory } from './editor.js';
import { tip } from './popup.js';
import { tabHooks, confirmDiscardCurrent, clearDraft, resetDocModel, updateTitle, newDoc } from './fileio.js';

const nameInput = $('#doc-name');
const tabs = [{ id: 1 }];      // background snapshots; the active entry is refreshed from the editor when needed
let cur = 0;
let nextId = 2;
let bar;

const liveName = () => nameInput.value.trim() || t('doc.untitled');
const isPristine = () => !doc.path && !doc.dirty && !editor.querySelector('img, table, hr') && !editor.textContent.trim();

function capture() {
  return { html: cleanHtml(), meta: { ...cloneMeta(), keep: doc.keep }, name: nameInput.value, path: doc.path, dirty: doc.dirty, created: doc.created, hist: getHistory(), scroll: workspace.scrollTop };
}
function stash() { tabs[cur] = Object.assign(tabs[cur], capture()); }
function apply(r) {
  resetDocModel();
  setContent(r.html || '<p><br></p>', { meta: r.meta, resetHistory: !r.hist });
  if (r.hist) setHistory(r.hist);
  doc.path = r.path || null;
  doc.created = r.created || Date.now();
  nameInput.value = r.name || '';
  doc.title = r.name || '';
  doc.dirty = !!r.dirty;
  updateTitle();
  bus.emit(doc.dirty ? 'dirty' : 'saved');
  workspace.scrollTop = r.scroll || 0;
  render();
}

export function switchTo(i) {
  if (i === cur || !tabs[i]) return;
  stash();
  cur = i;
  apply(tabs[i]);
  editor.focus({ preventScroll: true });
}

/** Opens a fresh tab for the document that is about to be loaded. */
async function prepare(path) {
  if (path) {
    const k = tabs.findIndex((r, i) => (i === cur ? doc.path : r.path) === path);
    if (k >= 0) { switchTo(k); return false; } // already open: just show it
  }
  if (isPristine()) return true;
  stash();
  tabs.push({ id: nextId++ });
  cur = tabs.length - 1;
  render();
  return true;
}

/** Drops an empty tab that was opened for a load that failed. */
function cleanup() {
  if (tabs.length > 1 && isPristine()) { tabs.splice(cur, 1); cur = Math.min(cur, tabs.length - 1); apply(tabs[cur]); }
}

export async function closeTab(i = cur) {
  if (i !== cur) switchTo(i);
  if (!(await confirmDiscardCurrent())) return false;
  if (tabs.length === 1) { await newDoc('', { force: true }); return true; }
  tabs.splice(cur, 1);
  cur = Math.min(cur, tabs.length - 1);
  apply(tabs[cur]);
  clearDraft();
  return true;
}

async function closeAll() {
  for (let i = 0; i < tabs.length; i++) {
    const dirty = i === cur ? doc.dirty : tabs[i].dirty;
    if (!dirty) continue;
    switchTo(i);
    if (!(await confirmDiscardCurrent())) return false;
  }
  return true;
}

function dirtyRecords() {
  const out = [];
  const rec = (r) => ({ html: r.html, meta: r.meta, name: r.name, path: r.path });
  if (doc.dirty) out.push({ html: cleanHtml(), meta: { ...cloneMeta(), keep: doc.keep }, name: nameInput.value, path: doc.path });
  tabs.forEach((r, i) => { if (i !== cur && r.dirty) out.push(rec(r)); });
  return out;
}

/** Adds a recovered document as its own (unsaved) tab. */
export async function addRecovered(r) {
  if (!r || !r.html) return;
  stash();
  tabs.push({ id: nextId++, html: r.html, meta: r.meta, name: r.name || '', path: r.path || null, dirty: true, created: Date.now() });
  render();
}

/* ------------------------------ tab strip ------------------------------ */
function move(from, to) {
  if (from === to) return;
  stash();
  const [r] = tabs.splice(from, 1);
  tabs.splice(to, 0, r);
  cur = tabs.indexOf(r) === -1 ? cur : (from === cur ? to : (from < cur && to >= cur ? cur - 1 : (from > cur && to <= cur ? cur + 1 : cur)));
  render();
}

let raf = 0;
export function render() {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(draw);
}
function draw() {
  if (!bar) return;
  bar.hidden = tabs.length < 2;
  document.body.classList.toggle('has-doctabs', tabs.length > 1);
  if (tabs.length < 2) { bar.innerHTML = ''; return; }
  bar.innerHTML = '';
  tabs.forEach((r, i) => {
    const active = i === cur;
    const name = active ? liveName() : ((r.name || '').trim() || t('doc.untitled'));
    const dirty = active ? doc.dirty : r.dirty;
    const item = el('div', { class: 'dt' + (active ? ' on' : ''), role: 'tab', tabindex: active ? '0' : '-1', draggable: 'true' });
    item.setAttribute('aria-selected', String(active));
    item.dataset.i = i;
    item.innerHTML = `<span class="dt-name">${esc(name)}</span>${dirty ? '<span class="dt-dot" aria-hidden="true"></span>' : ''}`;
    item.dataset.tip = ((active ? doc.path : r.path) || name);
    const x = el('button', { class: 'dt-x', type: 'button', html: icon('close') });
    x.setAttribute('aria-label', t('tab.close'));
    x.addEventListener('click', (e) => { e.stopPropagation(); closeTab(i); });
    item.append(x);
    item.addEventListener('click', () => switchTo(i));
    item.addEventListener('auxclick', (e) => { if (e.button === 1) { e.preventDefault(); closeTab(i); } });
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); switchTo(i); }
      if (e.key === 'ArrowRight') switchTo((i + 1) % tabs.length);
      if (e.key === 'ArrowLeft') switchTo((i + tabs.length - 1) % tabs.length);
      if (e.key === 'Delete') closeTab(i);
    });
    item.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/x-dt', String(i)); e.dataTransfer.effectAllowed = 'move'; });
    item.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('text/x-dt')) { e.preventDefault(); item.classList.add('over'); } });
    item.addEventListener('dragleave', () => item.classList.remove('over'));
    item.addEventListener('drop', (e) => { e.preventDefault(); item.classList.remove('over'); move(+e.dataTransfer.getData('text/x-dt'), i); });
    bar.append(item);
  });
  const plus = el('button', { class: 'dt-new', type: 'button', html: icon('plus') });
  tip(plus, t('tab.new'), 'Ctrl+N');
  plus.addEventListener('click', () => newDoc(''));
  bar.append(plus);
  const on = bar.querySelector('.dt.on');
  if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

export function initTabs() {
  bar = el('div', { id: 'doctabs', role: 'tablist', hidden: '' });
  bar.setAttribute('aria-label', t('tab.list'));
  const body = $('#body');
  body.parentNode.insertBefore(bar, body);
  tabHooks.prepare = prepare;
  tabHooks.closeAll = closeAll;
  tabHooks.dirtyRecords = dirtyRecords;
  tabHooks.cleanup = cleanup;
  for (const ev of ['title', 'dirty', 'saved', 'modified']) bus.on(ev, render);
  nameInput.addEventListener('input', render);
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    if (e.key === 'Tab' && tabs.length > 1) { e.preventDefault(); switchTo((cur + (e.shiftKey ? tabs.length - 1 : 1)) % tabs.length); }
    else if ((e.key === 'w' || e.key === 'W' || e.key === 'F4') && !e.shiftKey) { e.preventDefault(); closeTab(cur); }
  }, true);
  render();
}
export const tabCount = () => tabs.length;
