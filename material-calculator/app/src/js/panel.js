// Right-hand side panel: History + Memory tabs, or "All conversions" for the converter.
import { history, memory } from './history.js';
import { settings } from './store.js';
import { t, formatDisplay } from './i18n.js';
import { icon } from './icons.js';
import { h, $, $$, esc, copyText, toast, confirmDialog } from './ui.js';
import { renderAllConversions, pickTargetUnit, convEvents } from './views/converter.js';
import { formatNumber } from './engine.js';

const MODE_ICON = { standard: 'standard', scientific: 'scientific', programmer: 'programmer' };

export function createPanel(app) {
  const el = h(`
    <aside class="panel" aria-label="${esc(t('panel.history'))}">
      <header class="panel-head">
        <div class="panel-tabs" role="tablist">
          <button role="tab" data-tab="history" data-ripple>${esc(t('panel.history'))}</button>
          <button role="tab" data-tab="memory" data-ripple>${esc(t('panel.memory'))}<span class="count" hidden></span></button>
        </div>
        <div class="panel-title" hidden>${esc(t('conv.all'))}</div>
        <button class="icon-btn" data-clear data-ripple aria-label="${esc(t('history.clear'))}" title="${esc(t('history.clear'))}">${icon('trash')}</button>
        <button class="icon-btn panel-close" data-close data-ripple aria-label="${esc(t('common.close'))}">${icon('close')}</button>
      </header>
      <div class="panel-body" tabindex="-1"></div>
    </aside>`);
  const body = $('.panel-body', el), tabs = $('.panel-tabs', el), title = $('.panel-title', el), clearBtn = $('[data-clear]', el), count = $('.count', el);

  function renderHistory() {
    if (!history.items.length) { body.innerHTML = empty('history', t('history.empty'), t('history.emptyHint')); return; }
    const g = settings.get('grouping');
    body.innerHTML = history.items.map((it) => {
      const prog = it.mode === 'programmer';
      const res = prog ? `${esc(it.result)}` : esc(formatDisplay(it.result, g));
      const sub = prog ? `HEX ${esc(it.hex)}` : '';
      return `<div class="hist-item" data-id="${it.id}" tabindex="0" role="button" data-ripple>
        <div class="hist-expr">${icon(MODE_ICON[it.mode] || 'standard')}<span>${esc(prog ? it.expr : formatDisplay(it.expr, g))}</span></div>
        <div class="hist-res">= ${res}</div>${sub ? `<div class="hist-sub">${sub}</div>` : ''}
        <div class="hist-actions">
          <button class="icon-btn sm" data-a="use" aria-label="${esc(t('history.useResult'))}" title="${esc(t('history.useResult'))}">${icon('enter')}</button>
          <button class="icon-btn sm" data-a="copy" aria-label="${esc(t('common.copy'))}" title="${esc(t('common.copy'))}">${icon('copy')}</button>
          <button class="icon-btn sm" data-a="del" aria-label="${esc(t('common.delete'))}" title="${esc(t('common.delete'))}">${icon('trash')}</button>
        </div></div>`;
    }).join('');
  }
  function renderMemory() {
    if (!memory.has) { body.innerHTML = empty('memory', t('memory.empty'), t('memory.emptyHint')); return; }
    const g = settings.get('grouping');
    body.innerHTML = memory.items.map((v, i) => `
      <div class="hist-item mem-item" data-i="${i}" tabindex="0" role="button" data-ripple>
        <div class="hist-res">${esc(formatDisplay(formatNumber(v), g))}</div>
        <div class="hist-actions always">
          <button class="mem-btn sm" data-a="mc" title="${esc(t('mem.mc'))}">MC</button>
          <button class="mem-btn sm" data-a="mplus" title="${esc(t('mem.mplus'))}">M+</button>
          <button class="mem-btn sm" data-a="mminus" title="${esc(t('mem.mminus'))}">M&minus;</button>
        </div></div>`).join('');
  }
  const empty = (ic, a, b) => `<div class="empty">${icon(ic === 'memory' ? 'memory' : 'history')}<div class="empty-title">${esc(a)}</div><div>${esc(b)}</div></div>`;

  function render() {
    const conv = app.mode === 'converter';
    tabs.hidden = conv; title.hidden = !conv; clearBtn.hidden = conv;
    if (conv) { renderAllConversions(body); return; }
    const tab = settings.get('panelTab');
    $$('[data-tab]', el).forEach((b) => { const on = b.dataset.tab === tab; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
    count.hidden = !memory.has; count.textContent = memory.items.length;
    clearBtn.setAttribute('aria-label', t(tab === 'history' ? 'history.clear' : 'memory.clear'));
    clearBtn.title = clearBtn.getAttribute('aria-label');
    clearBtn.hidden = tab === 'history' ? !history.items.length : !memory.has;
    tab === 'history' ? renderHistory() : renderMemory();
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b?.dataset.tab) { settings.set('panelTab', b.dataset.tab); return render(); }
    if (b?.hasAttribute('data-close')) return app.closePanel();
    if (b?.hasAttribute('data-clear')) {
      const isH = settings.get('panelTab') === 'history';
      confirmDialog({ title: t(isH ? 'dlg.hist.t' : 'dlg.mem.t'), message: t(isH ? 'dlg.hist.m' : 'dlg.mem.m'), confirmLabel: t('common.confirmClear'), icon: 'trash', tone: 'danger' })
        .then((ok) => { if (ok) { isH ? history.clear() : memory.clear(); toast(t(isH ? 'history.cleared' : 'memory.cleared'), 'success'); } });
      return;
    }
    const unit = e.target.closest('[data-unit]');
    if (unit) return pickTargetUnit(unit.dataset.unit);
    const item = e.target.closest('.hist-item');
    if (!item) return;
    if (item.classList.contains('mem-item')) {
      const i = +item.dataset.i, a = b?.dataset.a;
      if (a === 'mc') memory.remove(i);
      else if (a === 'mplus' || a === 'mminus') {
        const v = app.currentValue();
        if (v !== null && v !== undefined) (a === 'mplus' ? memory.add(v, i) : memory.sub(v, i));
      } else app.insertNumber(memory.items[i]);
      return;
    }
    const entry = history.items.find((x) => x.id === item.dataset.id);
    if (!entry) return;
    const a = b?.dataset.a;
    if (a === 'del') history.remove(entry.id);
    else if (a === 'copy') copyText(entry.result);
    else if (a === 'use') app.useResult(entry);
    else app.openHistory(entry);
  });
  el.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('hist-item')) { e.preventDefault(); e.target.click(); }
  });

  const unsub = [history.on('change', () => { if (app.mode !== 'converter') render(); }), memory.on('change', render),
    convEvents.on('change', () => { if (app.mode === 'converter') renderAllConversions(body); }),
    settings.on('grouping', render)];
  return { el, render, destroy() { unsub.forEach((u) => u()); } };
}
