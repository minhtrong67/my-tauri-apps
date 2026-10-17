// Find & replace panel (match case, whole word, highlight all hits via the CSS Custom Highlight API).
import { $, el, esc } from './util.js';
import { icon } from './icons.js';
import { t } from './i18n.js';
import { editor, workspace, run, restoreSel } from './editor.js';
import { tip } from './popup.js';
import { toast } from './popup.js';
import { bus } from './state.js';

let bar, qIn, rIn, cnt, rrow, optCase, optWord;
let hits = [];
let cur = -1;
let open = false;
const canHL = typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight !== 'undefined';

function textMap() {
  const w = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      for (let p = n.parentNode; p && p !== editor; p = p.parentNode) if (p.nodeType === 1 && (p.classList.contains('pg-sp') || p.hasAttribute('data-toc'))) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  let s = '';
  let n;
  while ((n = w.nextNode())) { nodes.push({ n, start: s.length }); s += n.nodeValue; }
  return { nodes, s };
}
function locate(map, i, end) {
  const { nodes } = map;
  let lo = 0, hi = nodes.length - 1;
  while (lo < hi) { const m = (lo + hi + (end ? 0 : 1)) >> 1; if (end ? nodes[m].start + nodes[m].n.nodeValue.length < i : nodes[m].start <= i) { if (end) lo = m + 1; else lo = m; } else if (end) hi = m; else hi = m - 1; }
  const x = nodes[lo];
  return [x.n, Math.min(x.n.nodeValue.length, i - x.start)];
}
const isWordCh = (c) => !!c && /[\p{L}\p{N}_]/u.test(c);

function compute() {
  const q = qIn.value;
  const out = [];
  if (!q) return out;
  const map = textMap();
  if (!map.nodes.length) return out;
  const hay = optCase.checked ? map.s : map.s.toLowerCase();
  const nd = optCase.checked ? q : q.toLowerCase();
  let i = 0;
  while ((i = hay.indexOf(nd, i)) !== -1) {
    const j = i + nd.length;
    if (!optWord.checked || (!isWordCh(map.s[i - 1]) && !isWordCh(map.s[j]))) {
      const r = document.createRange();
      const [sn, so] = locate(map, i, false);
      const [en, eo] = locate(map, j, true);
      r.setStart(sn, so);
      r.setEnd(en, eo);
      out.push(r);
    }
    i = j;
    if (out.length > 5000) break;
  }
  return out;
}

function paint() {
  if (canHL) {
    CSS.highlights.delete('find-hit');
    CSS.highlights.delete('find-cur');
    if (open && hits.length) {
      CSS.highlights.set('find-hit', new Highlight(...hits));
      if (cur >= 0 && hits[cur]) CSS.highlights.set('find-cur', new Highlight(hits[cur]));
    }
  }
  cnt.textContent = !qIn.value ? '' : hits.length ? t('find.count', { i: cur + 1, n: hits.length }) : t('find.none');
  cnt.classList.toggle('none', !!qIn.value && !hits.length);
}

export function refresh(keepIndex) {
  if (!open) return;
  hits = compute();
  if (!keepIndex || cur >= hits.length) cur = hits.length ? 0 : -1;
  paint();
}

function reveal(r) {
  const rect = r.getBoundingClientRect();
  const w = workspace.getBoundingClientRect();
  if (rect.top < w.top + 90 || rect.bottom > w.bottom - 40) workspace.scrollTop += rect.top - w.top - w.height / 3;
}
export function go(dir = 1, fromCaret = false) {
  hits = compute();
  if (!hits.length) { cur = -1; paint(); return; }
  if (fromCaret) {
    const s = getSelection();
    cur = 0;
    if (s.rangeCount) {
      const c = s.getRangeAt(0);
      const k = hits.findIndex((h) => h.compareBoundaryPoints(Range.START_TO_START, c) >= 0);
      cur = k < 0 ? 0 : k;
    }
  } else cur = (cur + dir + hits.length) % hits.length;
  paint();
  reveal(hits[cur]);
}
function select(i) {
  const r = hits[i];
  if (!r) return;
  const s = getSelection();
  s.removeAllRanges();
  s.addRange(r.cloneRange());
}

function replaceCurrent() {
  hits = compute();
  if (!hits.length) return;
  // replace the hit at the caret (or the current one)
  const s = getSelection();
  let idx = cur;
  if (s.rangeCount && !s.isCollapsed && editor.contains(s.anchorNode)) {
    const k = hits.findIndex((h) => h.compareBoundaryPoints(Range.START_TO_START, s.getRangeAt(0)) === 0 && h.compareBoundaryPoints(Range.END_TO_END, s.getRangeAt(0)) === 0);
    if (k >= 0) idx = k;
  }
  if (idx < 0) idx = 0;
  const rep = rIn.value;
  run(() => {
    const fresh = compute();
    const r = fresh[Math.min(idx, fresh.length - 1)];
    if (!r) return;
    const ss = getSelection();
    ss.removeAllRanges();
    ss.addRange(r);
    document.execCommand('insertText', false, rep);
  });
  hits = compute();
  cur = hits.length ? Math.min(idx, hits.length - 1) : -1;
  paint();
  if (cur >= 0) { reveal(hits[cur]); select(cur); }
}
function replaceAll() {
  if (!qIn.value) return;
  const rep = rIn.value;
  let n = 0;
  run(() => {
    const fresh = compute();
    n = fresh.length;
    for (let i = fresh.length - 1; i >= 0; i--) {
      const ss = getSelection();
      ss.removeAllRanges();
      ss.addRange(fresh[i]);
      document.execCommand('insertText', false, rep);
    }
  });
  hits = compute();
  cur = -1;
  paint();
  toast(t('toast.replaced', { n }));
}

export function buildFind(host) {
  bar = host;
  bar.innerHTML = '';
  qIn = el('input', { class: 'field', type: 'text', placeholder: t('find.find'), spellcheck: 'false', 'aria-label': t('find.find') });
  rIn = el('input', { class: 'field', type: 'text', placeholder: t('find.replaceWith'), spellcheck: 'false', 'aria-label': t('find.replaceWith') });
  cnt = el('span', { class: 'find-count' });
  const mk = (ic, tp, fn, cls = '') => { const b = el('button', { class: 'icon-btn sm ' + cls, type: 'button', html: icon(ic) }); tip(b, tp); b.addEventListener('click', fn); return b; };
  const prev = mk('up', t('find.prev'), () => go(-1));
  const next = mk('down', t('find.next'), () => go(1));
  const exp = mk('replace', t('find.toggleReplace'), () => { rrow.hidden = !rrow.hidden; exp.classList.toggle('on', !rrow.hidden); if (!rrow.hidden) rIn.focus(); });
  const close = mk('close', t('btn.close'), () => closeFind());
  optCase = el('input', { type: 'checkbox' });
  optWord = el('input', { type: 'checkbox' });
  const mkOpt = (inp, label) => el('label', { class: 'chk' }, inp, el('span', { text: label }));
  const row1 = el('div', { class: 'f-row' }, exp, qIn, cnt, prev, next, close);
  rrow = el('div', { class: 'f-row f-rep', hidden: true },
    el('span', { class: 'f-pad' }), rIn,
    el('button', { class: 'btn tonal sm', type: 'button', text: t('find.replace'), onclick: replaceCurrent }),
    el('button', { class: 'btn tonal sm', type: 'button', text: t('find.replaceAll'), onclick: replaceAll }));
  const row3 = el('div', { class: 'f-row f-opts' }, el('span', { class: 'f-pad' }), mkOpt(optCase, t('find.matchCase')), mkOpt(optWord, t('find.wholeWord')));
  bar.append(row1, rrow, row3);
  qIn.addEventListener('input', () => { hits = compute(); cur = -1; if (hits.length) go(1, true); else paint(); });
  for (const o of [optCase, optWord]) o.addEventListener('change', () => { hits = compute(); cur = -1; if (hits.length) go(1, true); else paint(); });
  qIn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); go(e.shiftKey ? -1 : 1); }
    else if (e.key === 'Escape') { e.preventDefault(); closeFind(); }
  });
  rIn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); replaceCurrent(); }
    else if (e.key === 'Escape') { e.preventDefault(); closeFind(); }
  });
}

export function openFind({ replace = false } = {}) {
  open = true;
  bar.hidden = false;
  requestAnimationFrame(() => bar.classList.add('show'));
  const s = getSelection();
  if (s.rangeCount && !s.isCollapsed && editor.contains(s.anchorNode)) {
    const txt = String(s).trim();
    if (txt && !txt.includes('\n') && txt.length < 80) qIn.value = txt;
  }
  rrow.hidden = !replace && rrow.hidden;
  if (replace) rrow.hidden = false;
  qIn.focus();
  qIn.select();
  hits = compute();
  if (hits.length) { cur = -1; go(1, true); } else paint();
}
export function closeFind() {
  open = false;
  bar.classList.remove('show');
  setTimeout(() => { if (!open) bar.hidden = true; }, 160);
  paint();
  editor.focus({ preventScroll: true });
  restoreSel();
}
export const findOpen = () => open;
bus.on('settled', () => { if (open) refresh(true); });
void $; void esc;
