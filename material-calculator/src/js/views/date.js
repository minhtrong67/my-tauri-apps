// Date calculator: difference between two dates, or add / subtract time from a date.
import { t, getLang } from '../i18n.js';
import { h, $, $$, animate, copyText, esc } from '../ui.js';

const iso = (d) => d.toISOString().slice(0, 10);
const todayIso = () => { const n = new Date(); return iso(new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()))); };
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const dim = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

function diff(a, b) {
  let from = parse(a), to = parse(b), sign = 1;
  if (from > to) { [from, to] = [to, from]; sign = -1; }
  let y = to.getUTCFullYear() - from.getUTCFullYear();
  let m = to.getUTCMonth() - from.getUTCMonth();
  let d = to.getUTCDate() - from.getUTCDate();
  if (d < 0) { m--; d += dim(to.getUTCFullYear(), to.getUTCMonth() - 1 < 0 ? 11 : to.getUTCMonth() - 1) ; }
  if (m < 0) { y--; m += 12; }
  const total = Math.round((to - from) / 86400000);
  return { y, m, d, total, sign };
}
function addTo(start, y, m, d, sign) {
  const s = parse(start);
  let yy = s.getUTCFullYear() + sign * y, mm = s.getUTCMonth() + sign * m;
  yy += Math.floor(mm / 12); mm = ((mm % 12) + 12) % 12;
  const day = Math.min(s.getUTCDate(), dim(yy, mm));
  const out = new Date(Date.UTC(yy, mm, day));
  out.setUTCDate(out.getUTCDate() + sign * d);
  return out;
}

const state = { tab: 'diff', from: todayIso(), to: todayIso(), start: todayIso(), y: 0, m: 0, d: 0, sign: 1 };

export function createDateView() {
  const el = h(`
    <section class="view view-date" aria-label="${esc(t('nav.date'))}">
      <div class="segmented segmented-lg" role="tablist">
        <button role="tab" data-tab="diff" data-ripple>${esc(t('date.diff'))}</button>
        <button role="tab" data-tab="add" data-ripple>${esc(t('date.add'))}</button>
      </div>
      <div class="date-panel" data-panel="diff">
        <h2 class="section-title">${esc(t('date.diffTitle'))}</h2>
        <div class="field-row">
          <label class="field"><span>${esc(t('date.from'))}</span><input type="date" data-f="from"></label>
          <label class="field"><span>${esc(t('date.to'))}</span><input type="date" data-f="to"></label>
        </div>
        <button class="text-btn" data-today="both" data-ripple>${esc(t('common.today'))}</button>
      </div>
      <div class="date-panel" data-panel="add" hidden>
        <h2 class="section-title">${esc(t('date.addTitle'))}</h2>
        <label class="field"><span>${esc(t('date.start'))}</span><input type="date" data-f="start"></label>
        <div class="segmented" role="group">
          <button data-sign="1" data-ripple>${esc(t('date.plus'))}</button>
          <button data-sign="-1" data-ripple>${esc(t('date.minus'))}</button>
        </div>
        <div class="field-row field-row-3">
          <label class="field"><span>${esc(t('date.years'))}</span><input type="number" min="0" max="9999" inputmode="numeric" data-n="y"></label>
          <label class="field"><span>${esc(t('date.months'))}</span><input type="number" min="0" max="99999" inputmode="numeric" data-n="m"></label>
          <label class="field"><span>${esc(t('date.days'))}</span><input type="number" min="0" max="999999" inputmode="numeric" data-n="d"></label>
        </div>
        <button class="text-btn" data-today="start" data-ripple>${esc(t('common.today'))}</button>
      </div>
      <div class="date-result" aria-live="polite"></div>
    </section>`);

  const resultEl = $('.date-result', el);
  let lastText = '';

  function fmtDate(d) { return new Intl.DateTimeFormat(getLang(), { dateStyle: 'full', timeZone: 'UTC' }).format(d); }
  function rows(list) { return list.map(([k, v]) => `<div class="kv"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join(''); }

  function render() {
    $$('[data-tab]', el).forEach((b) => { const on = b.dataset.tab === state.tab; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
    $$('[data-panel]', el).forEach((p) => { p.hidden = p.dataset.panel !== state.tab; });
    $$('[data-sign]', el).forEach((b) => b.classList.toggle('active', +b.dataset.sign === state.sign));
    $$('[data-f]', el).forEach((i) => { if (i.value !== state[i.dataset.f]) i.value = state[i.dataset.f]; });
    $$('[data-n]', el).forEach((i) => { const v = String(state[i.dataset.n]); if (i.value !== v && document.activeElement !== i) i.value = v; });

    if (state.tab === 'diff') {
      if (!state.from || !state.to) { resultEl.innerHTML = ''; lastText = ''; return; }
      const r = diff(state.from, state.to);
      const parts = [];
      if (r.y) parts.push(t('unit.y', { n: r.y })); if (r.m) parts.push(t('unit.m', { n: r.m })); if (r.d) parts.push(t('unit.d', { n: r.d }));
      lastText = parts.length ? parts.join(', ') : t('date.same');
      const wk = Math.floor(r.total / 7), rest = r.total % 7;
      const nf = new Intl.NumberFormat(getLang());
      resultEl.innerHTML = `<div class="big">${esc(lastText)}</div>` + rows([
        [t('date.totalDays'), nf.format(r.total)],
        [t('date.weeks'), [wk ? t('unit.w', { n: nf.format(wk) }) : '', rest || !wk ? t('unit.d', { n: rest }) : ''].filter(Boolean).join(', ')],
      ]);
    } else {
      if (!state.start) { resultEl.innerHTML = ''; lastText = ''; return; }
      const out = addTo(state.start, state.y, state.m, state.d, state.sign);
      lastText = fmtDate(out);
      resultEl.innerHTML = `<div class="big">${esc(lastText)}</div>` + rows([[t('date.result'), iso(out)]]);
    }
  }

  el.addEventListener('input', (e) => {
    const i = e.target;
    if (i.dataset.f) state[i.dataset.f] = i.value;
    else if (i.dataset.n) state[i.dataset.n] = Math.max(0, parseInt(i.value, 10) || 0);
    render();
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.tab) { state.tab = b.dataset.tab; render(); animate(resultEl, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 240 }); }
    else if (b.dataset.sign) { state.sign = +b.dataset.sign; render(); }
    else if (b.dataset.today === 'both') { state.from = state.to = todayIso(); render(); }
    else if (b.dataset.today === 'start') { state.start = todayIso(); render(); }
  });

  return {
    el, mode: 'date',
    refresh() { render(); },
    onShow() { render(); },
    onKey() { return false; },
    copy() { return copyText(lastText); },
  };
}
