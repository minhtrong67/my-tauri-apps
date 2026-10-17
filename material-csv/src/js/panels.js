// Side panels and bars: formula bar, row details, card view, find bar, advanced filter.
import { app, cur, visCols, editCells, rebuildView, OPS, isUnary, activeFilters } from './state.js';
import { $, $$, esc, debounce, fmtNum } from './ui.js';
import { hydrateIcons, icon } from './icons.js';
import { t } from './i18n.js';
import { setSel, renderAll, renderRows, cellRef, grid, scrollerEl } from './grid.js';
import * as F from './find.js';

/* ------------------------------ formula bar ------------------------------ */

export function refreshFx() {
  const d = cur(), fx = $('#fx');
  $('#fxbar').hidden = !d;
  if (!d) return;
  const ok = d.sel.ar >= 0;
  $('#nameBox').textContent = ok ? cellRef(d) : '—';
  fx.disabled = !ok;
  if (document.activeElement !== fx) fx.value = ok ? (d.rows[d.view[d.sel.ar]]?.[visCols(d)[d.sel.ac]] ?? '') : '';
}

export function initFx() {
  const fx = $('#fx');
  const commit = () => {
    const d = cur();
    if (!d || d.sel.ar < 0) return;
    const r = d.view[d.sel.ar], c = visCols(d)[d.sel.ac];
    if (r == null || c == null) return;
    editCells(t('h_edit'), [{ r, c, o: d.rows[r][c] ?? '', n: fx.value }], d);
  };
  fx.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); scrollerEl().focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); fx.value = ''; refreshFx(); scrollerEl().focus(); }
  });
  fx.addEventListener('change', commit);
}

/* ------------------------------ details pane ------------------------------ */

let detKey = '';
export function refreshDetails(force = false) {
  const d = cur(), box = $('#dbody');
  $('#details').classList.toggle('off', !app.settings.details || !d);
  if (!d || !app.settings.details) return;
  const src = d.sel.ar >= 0 ? d.view[d.sel.ar] : -1;
  const key = d.id + ':' + src + ':' + d.version + ':' + d.head.length;
  if (!force && key === detKey) return;
  if (!force && box.contains(document.activeElement)) return;
  detKey = key;
  if (src < 0) { box.innerHTML = `<p class="muted">${esc(t('details.empty'))}</p>`; return; }
  const row = d.rows[src];
  box.innerHTML = `<div class="dnum">${esc(t('row'))} <b>${src + 1}</b></div>` +
    d.head.map((h, c) => {
      const v = row[c] ?? '', long = v.length > 48 || v.includes('\n');
      return `<label class="kv"><small>${esc(h)}</small>` + (long
        ? `<textarea data-c="${c}" rows="${Math.min(6, Math.max(2, v.split('\n').length))}" spellcheck="false">${esc(v)}</textarea>`
        : `<input data-c="${c}" value="${esc(v)}" spellcheck="false" autocomplete="off">`) + '</label>';
    }).join('');
}

export function initDetails() {
  $('#dbody').addEventListener('change', e => {
    const c = e.target.dataset?.c, d = cur();
    if (c == null || !d || d.sel.ar < 0) return;
    const r = d.view[d.sel.ar];
    editCells(t('h_edit'), [{ r, c: +c, o: d.rows[r][+c] ?? '', n: e.target.value }], d);
  });
  $('#dbody').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.target.blur(); scrollerEl().focus(); }
    if (e.key === 'Escape') { refreshDetails(true); scrollerEl().focus(); }
  });
  $('#dClose').onclick = () => app.hooks.run('view.details');
}

/* ------------------------------ cards ------------------------------ */

let cardsShown = 0;
const CHUNK = 60;

function cardHtml(vi) {
  const d = cur(), src = d.view[vi], row = d.rows[src], cols = visCols(d);
  const title = row[cols[0]] ?? '';
  return `<article class="card${vi === d.sel.ar ? ' sel' : ''}" data-vi="${vi}"><header><b title="${esc(title)}">${esc(title) || '—'}</b><span>#${src + 1}</span></header>` +
    cols.slice(1).map(c => `<div class="f"><small>${esc(d.head[c])}</small><span title="${esc(row[c] ?? '')}">${esc(row[c] ?? '') || '—'}</span></div>`).join('') + '</article>';
}

export function renderCards() {
  const d = cur(), host = $('#cards');
  if (!d || app.mode === 'table') return;
  cardsShown = Math.min(d.view.length, Math.max(CHUNK, cardsShown));
  let h = '';
  for (let i = 0; i < cardsShown; i++) h += cardHtml(i);
  host.innerHTML = `<div class="cgrid m-${app.mode}">${h}</div>` + (d.view.length ? '' : `<div class="none">${esc(t('noMatch'))}</div>`);
}

export function resetCards() { cardsShown = 0; }

export function initCards() {
  const host = $('#cards');
  host.addEventListener('scroll', () => {
    const d = cur();
    if (!d || cardsShown >= d.view.length) return;
    if (host.scrollTop + host.clientHeight > host.scrollHeight - 400) {
      const grid2 = host.querySelector('.cgrid');
      let h = '';
      const end = Math.min(d.view.length, cardsShown + CHUNK);
      for (let i = cardsShown; i < end; i++) h += cardHtml(i);
      grid2.insertAdjacentHTML('beforeend', h);
      cardsShown = end;
    }
  }, { passive: true });
  host.addEventListener('click', e => {
    const c = e.target.closest('.card');
    if (!c) return;
    const vi = +c.dataset.vi;
    setSel(vi, 0, vi, Math.max(0, grid.cols.length - 1));
    host.querySelectorAll('.card.sel').forEach(x => x.classList.remove('sel'));
    c.classList.add('sel');
  });
}

/* ------------------------------ find bar ------------------------------ */

export function updateFindCount() {
  const f = app.find, el = $('#fCount');
  el.textContent = f.error ? t('find.invalid') : !f.q ? '' : !f.matches.length ? t('find.none')
    : f.cur >= 0 ? t('find.of', { i: fmtNum(f.cur + 1), n: fmtNum(f.matches.length) }) : t('find.results', { n: fmtNum(f.matches.length) });
  el.classList.toggle('bad', f.error || (!!f.q && !f.matches.length));
}

function runFind(keepIndex = false) {
  const f = app.find, d = cur();
  if (!d) return;
  const was = f.cur;
  F.recompute();
  if (keepIndex && f.matches.length && was >= 0) f.cur = Math.min(was, f.matches.length - 1);
  if (f.filterRows) { rebuildView(d); renderAll(); app.hooks.chrome?.(); }
  else renderRows(true);
  updateFindCount();
}

export function openFind(replace) {
  const f = app.find;
  f.open = true;
  $('#findbar').hidden = false;
  $('#repRow').hidden = !replace;
  const q = $('#fq');
  q.focus(); q.select();
  if (f.q) runFind();
}

export function closeFind() {
  const f = app.find, d = cur();
  if (!f.open) return;
  const was = f.filterRows && f.q;
  f.open = false;
  $('#findbar').hidden = true;
  if (d) { if (was) { rebuildView(d); renderAll(); app.hooks.chrome?.(); } else renderRows(true); scrollerEl().focus(); }
}

export function initFind() {
  const f = app.find, q = $('#fq');
  const sync = () => { $('#fCase').classList.toggle('on', f.matchCase); $('#fWhole').classList.toggle('on', f.whole); $('#fRegex').classList.toggle('on', f.regex); };
  q.addEventListener('input', debounce(() => { f.q = q.value; runFind(); }, 90));
  q.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); if (!f.matches.length) runFind(); F.step(e.shiftKey ? -1 : 1); updateFindCount(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeFind(); }
  });
  $('#fr').addEventListener('input', e => { f.rep = e.target.value; });
  $('#fr').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); F.replaceCurrent(); updateFindCount(); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeFind(); }
  });
  const tog = (id, key) => $(id).addEventListener('click', () => { f[key] = !f[key]; sync(); runFind(); });
  tog('#fCase', 'matchCase'); tog('#fWhole', 'whole'); tog('#fRegex', 'regex');
  $('#fFilter').addEventListener('change', e => { f.filterRows = e.target.checked; runFind(); });
  $('#fNext').onclick = () => { if (!f.matches.length) runFind(); F.step(1); updateFindCount(); };
  $('#fPrev').onclick = () => { if (!f.matches.length) runFind(); F.step(-1); updateFindCount(); };
  $('#fRep').onclick = () => { F.replaceCurrent(); updateFindCount(); };
  $('#fRepAll').onclick = () => { F.replaceAll(false); updateFindCount(); };
  $('#fRepSel').onclick = () => { F.replaceAll(true); updateFindCount(); };
  $('#fClose').onclick = closeFind;
  sync();
  app.hooks.findRefresh = debounce(() => { if (f.open && f.q) runFind(true); }, 150);
}

/* ------------------------------ advanced filter ------------------------------ */

export function renderAdv() {
  const d = cur();
  if (!d) return;
  const cols = d.head.map((h, i) => `<option value="${i}">${esc(h)}</option>`).join('');
  const ops = OPS.map(o => `<option value="${o}">${esc(t('op.' + o))}</option>`).join('');
  $('#advrows').innerHTML = d.flt.map((f, j) => `<div class="advrow" data-j="${j}"><select class="in" data-k="c">${cols}</select><select class="in" data-k="o">${ops}</select>` +
    `<input class="in" data-k="v" placeholder="${esc(t('adv.value'))}" value="${esc(f.v)}"${isUnary(f.o) ? ' disabled' : ''}><button class="btn ic" data-del title="${esc(t('remove'))}">${icon('x')}</button></div>`).join('');
  $$('#advrows .advrow').forEach(r => {
    const f = d.flt[+r.dataset.j];
    r.querySelector('[data-k=c]').value = f.c; r.querySelector('[data-k=o]').value = f.o;
  });
}

export function updateFilterBadge() {
  const d = cur(), n = d ? activeFilters(d).length + Object.keys(d.cf).length : 0;
  const b = $('#fBadge');
  b.hidden = !n; b.textContent = n;
}

export function initAdv() {
  const rows = $('#advrows');
  rows.addEventListener('input', e => {
    const d = cur(), r = e.target.closest('.advrow'), k = e.target.dataset.k;
    if (!r || !k) return;
    const f = d.flt[+r.dataset.j];
    f[k] = k === 'c' ? +e.target.value : e.target.value;
    if (k === 'o') renderAdv();
    app.hooks.viewChanged?.('adv');
  });
  rows.addEventListener('click', e => {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    const d = cur();
    d.flt.splice(+b.closest('.advrow').dataset.j, 1);
    renderAdv(); app.hooks.viewChanged?.('adv');
  });
  $('#advAdd').onclick = () => { cur().flt.push({ c: Math.max(0, cur().sel.ac >= 0 ? visCols(cur())[cur().sel.ac] : 0), o: 'ct', v: '' }); renderAdv(); $('#advrows .advrow:last-child [data-k=v]')?.focus(); };
  $('#advClear').onclick = () => { cur().flt = []; renderAdv(); app.hooks.viewChanged?.('adv'); };
  $('#advClose').onclick = () => app.hooks.toggleAdvFilter();
}

export function hydratePanels() { hydrateIcons(document); }
