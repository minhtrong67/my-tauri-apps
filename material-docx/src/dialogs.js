// Dialogs: settings, page setup, paragraph, tables, links, header & footer, word count, shortcuts, about.
import { $, el, esc, pxToCm, cmToPx, round, ptToPx, pxToPt } from './util.js';
import { icon } from './icons.js';
import { t, lang } from './i18n.js';
import { doc, bus, PAPERS, MARGIN_PRESETS } from './state.js';
import { settings, saveSettings, units, DEFAULTS } from './settings.js';
import { SWATCHES } from './theme.js';
import { formDialog, closePopup, openPopover, toast, askConfirm } from './popup.js';
import { refreshTheme, setTheme, setSeed, refreshLanguage, applyUiFont } from './appearance.js';
import { FONTS, SIZES, SYMBOLS, insertText, setParagraph, setLink, currentLink, removeLink, formatDate, setHeaderFooter, queryState, setFont, setSize, setColor, toggle } from './cmds.js';
import { insertTable, TABLE_STYLES, splitCell } from './tables.js';
import { setImageSize, imageSize, setAlt } from './images.js';
import { editor, run, selectedBlocks, restoreSel } from './editor.js';
import { applyPageVars, paginate } from './paginate.js';
import { countText, sizeZoomer, drawRuler, goToPage } from './view.js';
import { layout } from './paginate.js';

const U = () => units();
const toU = (px) => (U() === 'cm' ? round(pxToCm(px), 2) : round(px / 96, 2));
const fromU = (v) => (U() === 'cm' ? cmToPx(v) : v * 96);
const uLabel = () => (U() === 'cm' ? 'cm' : 'in');

/* ------------------------------ page setup ------------------------------ */
export async function openPageSetup() {
  const p = doc.page;
  const m = p.margins;
  const sizes = Object.entries(PAPERS).map(([k, v]) => [k, `${k}  (${round(pxToCm(v.tw / 15), 1)} × ${round(pxToCm(v.th / 15), 1)} cm)`]);
  const r = await formDialog({
    title: t('ps.title'),
    width: 520,
    fields: [
      { type: 'heading', label: t('ps.margins') },
      { id: 'top', type: 'number', label: t('ps.top'), value: toU(m.top), step: 0.1, min: 0, unit: uLabel() },
      { id: 'bottom', type: 'number', label: t('ps.bottom'), value: toU(m.bottom), step: 0.1, min: 0, unit: uLabel() },
      { id: 'left', type: 'number', label: t('ps.left'), value: toU(m.left), step: 0.1, min: 0, unit: uLabel() },
      { id: 'right', type: 'number', label: t('ps.right'), value: toU(m.right), step: 0.1, min: 0, unit: uLabel() },
      { type: 'heading', label: t('ps.paper') },
      { id: 'size', type: 'select', label: t('ps.size'), value: p.size, options: sizes },
      { id: 'orientation', type: 'select', label: t('ps.orientation'), value: p.orientation, options: [['portrait', t('orient.portrait')], ['landscape', t('orient.landscape')]] },
      { type: 'heading', label: t('ps.hf') },
      { id: 'hd', type: 'number', label: t('ps.headerDist'), value: toU(p.headerDist), step: 0.1, min: 0, unit: uLabel() },
      { id: 'fd', type: 'number', label: t('ps.footerDist'), value: toU(p.footerDist), step: 0.1, min: 0, unit: uLabel() },
      { id: 'diff', type: 'check', label: t('ps.diffFirst'), value: doc.diffFirst, wide: true },
      { id: 'def', type: 'check', label: t('ps.setDefault'), value: false, wide: true },
    ],
    ok: t('btn.ok'),
  });
  if (!r) return;
  run(() => {
    const px = (v, d) => (Number.isFinite(v) && v >= 0 ? fromU(v) : d);
    doc.page.margins = { top: px(r.top, m.top), bottom: px(r.bottom, m.bottom), left: px(r.left, m.left), right: px(r.right, m.right) };
    doc.page.size = r.size;
    doc.page.orientation = r.orientation;
    doc.page.headerDist = px(r.hd, p.headerDist);
    doc.page.footerDist = px(r.fd, p.footerDist);
    doc.diffFirst = r.diff;
    applyPageVars();
    bus.emit('meta');
  });
  if (r.def) { settings.size = r.size; settings.orientation = r.orientation; settings.margins = { ...doc.page.margins }; saveSettings(); }
}

export function setMargins(preset) {
  run(() => { doc.page.margins = { ...MARGIN_PRESETS[preset] }; applyPageVars(); bus.emit('meta'); });
}
export function setOrientation(o) { run(() => { doc.page.orientation = o; applyPageVars(); bus.emit('meta'); }); }
export function setPaper(s) { run(() => { doc.page.size = s; applyPageVars(); bus.emit('meta'); }); }
export function setPageColor(c) { run(() => { doc.page.color = c || ''; bus.emit('meta'); }); }

/* ------------------------------ paragraph ------------------------------ */
export async function openParagraph() {
  const b = selectedBlocks()[0];
  if (!b) return;
  const cs = getComputedStyle(b);
  const fs = parseFloat(cs.fontSize) || 15;
  const lh = parseFloat(cs.lineHeight);
  const r = await formDialog({
    title: t('para.title'),
    width: 480,
    fields: [
      { id: 'align', type: 'select', label: t('para.align'), value: ['center', 'right', 'justify'].includes(cs.textAlign) ? cs.textAlign : 'left', options: [['left', t('tip.alignLeft')], ['center', t('tip.alignCenter')], ['right', t('tip.alignRight')], ['justify', t('tip.alignJustify')]] },
      { id: 'line', type: 'select', label: t('para.line'), value: String(lh && fs ? Math.round((lh / fs) * 100) / 100 : 1.15), options: ['1', '1.15', '1.5', '2', '2.5', '3'].map((v) => [v, v === '1' ? t('lh.single') : v]) },
      { type: 'heading', label: t('para.indent') },
      { id: 'left', type: 'number', label: t('ps.left'), value: toU(parseFloat(cs.marginLeft) || 0), step: 0.1, min: 0, unit: uLabel() },
      { id: 'right', type: 'number', label: t('ps.right'), value: toU(parseFloat(cs.marginRight) || 0), step: 0.1, min: 0, unit: uLabel() },
      { id: 'first', type: 'number', label: t('para.first'), value: toU(parseFloat(cs.textIndent) || 0), step: 0.1, unit: uLabel() },
      { type: 'heading', label: t('para.spacing') },
      { id: 'before', type: 'number', label: t('para.before'), value: round(pxToPt(parseFloat(cs.marginTop) || 0), 1), step: 1, min: 0, unit: 'pt' },
      { id: 'after', type: 'number', label: t('para.after'), value: round(pxToPt(parseFloat(cs.marginBottom) || 0), 1), step: 1, min: 0, unit: 'pt' },
    ],
  });
  if (!r) return;
  setParagraph({
    align: r.align, line: r.line, left: fromU(r.left || 0), right: fromU(r.right || 0), first: fromU(r.first || 0), before: ptToPx(r.before || 0), after: ptToPx(r.after || 0),
  });
}

/* ------------------------------ font ------------------------------ */
export async function openFontDialog() {
  const st = queryState();
  const r = await formDialog({
    title: t('font.title'), width: 460,
    fields: [
      { id: 'font', type: 'select', label: t('tip.fontFamily'), value: FONTS.includes(st.font) ? st.font : FONTS[0], options: FONTS.map((f) => [f, f]) },
      { id: 'size', type: 'number', label: t('tip.fontSize'), value: st.size || 11, min: 1, max: 1000, step: 0.5, unit: 'pt' },
      { id: 'color', type: 'color', label: t('tip.color'), value: st.color || '#000000' },
      { id: 'bold', type: 'check', label: t('tip.bold').replace(/ \(.*\)/, ''), value: st.bold },
      { id: 'italic', type: 'check', label: t('tip.italic').replace(/ \(.*\)/, ''), value: st.italic },
      { id: 'underline', type: 'check', label: t('tip.underline').replace(/ \(.*\)/, ''), value: st.underline },
      { id: 'strike', type: 'check', label: t('tip.strike'), value: st.strike },
    ],
  });
  if (!r) return;
  restoreSel();
  setFont(r.font);
  if (r.size) setSize(r.size);
  if (r.color && r.color.toLowerCase() !== (st.color || '#000000').toLowerCase()) setColor(r.color);
  const now = queryState();
  if (!!now.bold !== r.bold) toggle('bold');
  if (!!now.italic !== r.italic) toggle('italic');
  if (!!now.underline !== r.underline) toggle('underline');
  if (!!now.strike !== r.strike) toggle('strikeThrough');
}

/* ------------------------------ tables ------------------------------ */
export async function openInsertTable() {
  const r = await formDialog({
    title: t('tbl.insertTitle'),
    width: 420,
    fields: [
      { id: 'cols', type: 'number', label: t('tbl.cols'), value: 3, min: 1, max: 20, step: 1 },
      { id: 'rows', type: 'number', label: t('tbl.rows'), value: 3, min: 1, max: 100, step: 1 },
      { id: 'style', type: 'select', label: t('tbl.style'), value: 'grid', options: TABLE_STYLES.map((s) => [s.id, t(s.label)]), wide: true },
      { id: 'header', type: 'check', label: t('tbl.headerRow'), value: true, wide: true },
    ],
  });
  if (!r) return;
  insertTable(Math.max(1, Math.min(100, r.rows | 0)), Math.max(1, Math.min(20, r.cols | 0)), { style: r.style, header: r.header });
}
export async function openSplitCells(cell) {
  const r = await formDialog({
    title: t('tbl.splitTitle'), width: 380,
    fields: [
      { id: 'cols', type: 'number', label: t('tbl.cols'), value: 2, min: 1, max: 10, step: 1 },
      { id: 'rows', type: 'number', label: t('tbl.rows'), value: 1, min: 1, max: 10, step: 1 },
    ],
  });
  if (r) splitCell(cell, Math.max(1, r.cols | 0), Math.max(1, r.rows | 0));
}

/* ------------------------------ link ------------------------------ */
export async function openLinkDialog() {
  restoreSel();
  const a = currentLink();
  const selText = String(getSelection());
  const r = await formDialog({
    title: a ? t('link.edit') : t('link.insert'),
    width: 460,
    fields: [
      { id: 'text', type: 'text', label: t('link.text'), value: a ? a.textContent : selText, wide: true },
      { id: 'url', type: 'text', label: t('link.address'), value: a ? a.getAttribute('href') : 'https://', wide: true, placeholder: 'https://' },
    ],
    onOk: (v) => { if (!v.url.trim() || v.url.trim() === 'https://') { toast(t('toast.emptyUrl')); return false; } return true; },
    extra: () => (a ? el('button', { class: 'btn text danger', type: 'button', text: t('link.remove'), onclick: () => { document.querySelector('dialog.form [data-cancel]')?.click(); removeLink(); } }) : el('span')),
  });
  if (!r) return;
  let url = r.url.trim();
  if (!/^(https?:|mailto:|tel:|#)/i.test(url)) url = /^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(url) ? 'mailto:' + url : 'https://' + url;
  setLink(url, r.text.trim() || url);
}

/* ------------------------------ symbols ------------------------------ */
export function openSymbols(anchor) {
  const box = el('div', { class: 'sym-box' });
  const tabs = el('div', { class: 'seg sm' });
  const grid = el('div', { class: 'sym-grid' });
  let cur = 'common';
  const fill = () => {
    grid.innerHTML = '';
    for (const c of SYMBOLS[cur]) {
      const b = el('button', { class: 'sym', type: 'button', text: c, title: 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0') });
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', () => { closePopup(); restoreSel(); insertText(c); });
      grid.append(b);
    }
    for (const b of tabs.children) b.classList.toggle('on', b.dataset.k === cur);
  };
  for (const k of Object.keys(SYMBOLS)) {
    const b = el('button', { type: 'button', dataset: { k }, text: t('sym.' + k) });
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => { cur = k; fill(); });
    tabs.append(b);
  }
  box.append(tabs, grid);
  fill();
  return box;
}
export function dateMenuItems() {
  const now = new Date();
  return ['long', 'short', 'iso', 'time', 'datetime'].map((f) => ({ label: formatDate(f, now), run: () => { restoreSel(); insertText(formatDate(f)); } }));
}

/* ------------------------------ header / footer ------------------------------ */
export async function openHeaderFooter(zone = 'header') {
  const H = doc.header, F = doc.footer;
  let focusEl = null;
  const r = await formDialog({
    title: t('hf.title'),
    width: 520,
    fields: [
      { type: 'heading', label: t('hf.header') },
      { id: 'ht', type: 'textarea', label: t('hf.text'), value: H.text, rows: 2, wide: true },
      { id: 'ha', type: 'select', label: t('hf.align'), value: H.align, options: [['left', t('tip.alignLeft')], ['center', t('tip.alignCenter')], ['right', t('tip.alignRight')]] },
      { type: 'heading', label: t('hf.footer') },
      { id: 'ft', type: 'textarea', label: t('hf.text'), value: F.text, rows: 2, wide: true },
      { id: 'fa', type: 'select', label: t('hf.align'), value: F.align, options: [['left', t('tip.alignLeft')], ['center', t('tip.alignCenter')], ['right', t('tip.alignRight')]] },
      { id: 'diff', type: 'check', label: t('ps.diffFirst'), value: doc.diffFirst, wide: true },
    ],
    extra: (inputs) => {
      const wrap = el('div', { class: 'tok-row' }, el('span', { class: 'tok-l', text: t('hf.insert') }));
      for (const [tok, label] of [['{page}', t('hf.tokPage')], ['{pages}', t('hf.tokPages')], ['{date}', t('hf.tokDate')], ['{title}', t('hf.tokTitle')]]) {
        const b = el('button', { class: 'chip', type: 'button', text: label });
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', () => {
          const ta = focusEl || (zone === 'header' ? inputs.ht : inputs.ft);
          const s = ta.selectionStart ?? ta.value.length, e = ta.selectionEnd ?? s;
          ta.value = ta.value.slice(0, s) + tok + ta.value.slice(e);
          ta.focus();
          ta.selectionStart = ta.selectionEnd = s + tok.length;
        });
        wrap.append(b);
      }
      inputs.ht.addEventListener('focus', () => { focusEl = inputs.ht; });
      inputs.ft.addEventListener('focus', () => { focusEl = inputs.ft; });
      setTimeout(() => (zone === 'footer' ? inputs.ft : inputs.ht).focus(), 30);
      return wrap;
    },
  });
  if (!r) return;
  run(() => {
    doc.header = { text: r.ht, align: r.ha };
    doc.footer = { text: r.ft, align: r.fa };
    doc.diffFirst = r.diff;
    bus.emit('meta');
  });
}
export function removeHeaderFooter(zone) { setHeaderFooter(zone, { text: '' }); }

/* ------------------------------ info dialogs ------------------------------ */
export function openWordCount() {
  const c = countText();
  const dlg = el('dialog', { class: 'dialog form' });
  const row = (k, v) => `<tr><td>${esc(t(k))}</td><td>${v.toLocaleString(lang())}</td></tr>`;
  dlg.innerHTML = `<h2>${esc(t('wc.title'))}</h2><div class="dlg-body"><table class="kv">${row('wc.pages', c.pages)}${row('wc.words', c.words)}${row('wc.chars', c.chars)}${row('wc.charsNo', c.charsNoSpaces)}${row('wc.paras', c.paragraphs)}</table></div><div class="dlg-actions"><span class="spacer"></span><button class="btn filled" type="button">${esc(t('btn.close'))}</button></div>`;
  document.body.append(dlg);
  const done = () => { dlg.close(); setTimeout(() => dlg.remove(), 250); };
  dlg.querySelector('button').onclick = done;
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); done(); });
  dlg.showModal();
}
export async function openGoto() {
  const r = await formDialog({ title: t('goto.title'), width: 340, fields: [{ id: 'n', type: 'number', label: t('goto.page', { total: layout.count }), value: 1, min: 1, max: layout.count, step: 1, wide: true }] });
  if (r && r.n) goToPage(r.n | 0);
}
export async function openImageDialog() {
  const s = imageSize();
  if (!s) return;
  const ratio = s.w / s.h;
  const img = $('#editor img.sel');
  const r = await formDialog({
    title: t('img.title'), width: 440,
    fields: [
      { id: 'w', type: 'number', label: t('img.width'), value: toU(s.w), step: 0.1, min: 0.1, unit: uLabel() },
      { id: 'h', type: 'number', label: t('img.height'), value: toU(s.h), step: 0.1, min: 0.1, unit: uLabel() },
      { id: 'lock', type: 'check', label: t('img.lock'), value: true, wide: true },
      { id: 'alt', type: 'textarea', label: t('img.alt'), value: (img && img.getAttribute('alt')) || '', rows: 2, wide: true, hint: t('img.altHint') },
    ],
  });
  if (!r) return;
  let w = fromU(r.w), h = fromU(r.h);
  if (r.lock) h = w / ratio;
  if (w > 0 && h > 0) setImageSize(w, h);
  setAlt(r.alt);
}

const SHORTCUTS = [
  ['sc.file', [['Ctrl+N', 'file.new'], ['Ctrl+O', 'file.open'], ['Ctrl+S', 'file.save'], ['Ctrl+Shift+S', 'file.saveAs'], ['Ctrl+P', 'file.print']]],
  ['sc.edit', [['Ctrl+Z / Ctrl+Y', 'sc.undoRedo'], ['Ctrl+X / C / V', 'sc.clipboard'], ['Ctrl+Shift+V', 'sc.pasteText'], ['Ctrl+A', 'sc.selectAll'], ['Ctrl+F', 'sc.find'], ['Ctrl+H', 'sc.replace'], ['Ctrl+G', 'sc.goto']]],
  ['sc.format', [['Ctrl+B / I / U', 'sc.bius'], ['Ctrl+Shift+X', 'tip.strike'], ['Ctrl+= / Ctrl+Shift+=', 'sc.subsup'], ['Ctrl+Shift+> / <', 'sc.size'], ['Ctrl+L / E / R / J', 'sc.align'], ['Ctrl+Alt+1 / 2 / 3', 'sc.headings'], ['Ctrl+Shift+N', 'style.normal'], ['Ctrl+Shift+L', 'tip.ul'], ['Tab / Shift+Tab', 'sc.indent'], ['Ctrl+K', 'tip.link'], ['Ctrl+Enter', 'tip.pageBreak']]],
  ['sc.view', [['Ctrl+Wheel', 'sc.zoom'], ['Ctrl+0', 'tip.zoom100'], ['F11', 'sc.fullscreen'], ['Ctrl+F1', 'tip.collapseRibbon'], ['Ctrl+,', 'tip.settings']]],
];
export function openShortcuts() {
  const dlg = el('dialog', { class: 'dialog form wide' });
  let h = `<h2>${esc(t('sc.title'))}</h2><div class="dlg-body sc-body">`;
  for (const [g, rows] of SHORTCUTS) {
    h += `<h3 class="form-h">${esc(t(g))}</h3><table class="kv sc">`;
    for (const [k, l] of rows) h += `<tr><td>${esc(t(l))}</td><td>${k.split(' / ').map((x) => `<kbd>${esc(x)}</kbd>`).join(' ')}</td></tr>`;
    h += '</table>';
  }
  h += `</div><div class="dlg-actions"><span class="spacer"></span><button class="btn filled" type="button">${esc(t('btn.close'))}</button></div>`;
  dlg.innerHTML = h;
  document.body.append(dlg);
  const done = () => { dlg.close(); setTimeout(() => dlg.remove(), 250); };
  dlg.querySelector('button').onclick = done;
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); done(); });
  dlg.showModal();
}

export function aboutNode() {
  const w = el('div', { class: 'about' });
  w.innerHTML = `
    <svg viewBox="0 0 32 32" class="about-logo"><rect width="32" height="32" rx="8" fill="var(--md-primary)"/><path d="M9 8h9l5 5v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" fill="var(--md-on-primary)"/><path d="M18 8v5h5z" fill="var(--md-primary-container)"/><path d="M11 17h10M11 20.500h10M11 24h6" stroke="var(--md-primary)" stroke-width="1.700" stroke-linecap="round"/></svg>
    <h3>Material Docx</h3>
    <p class="about-v">${esc(t('about.version'))} 2.0.0</p>
    <p class="about-d">${esc(t('about.desc'))}</p>
    <div class="credit"><span>${esc(t('about.by'))}</span><b class="author">minhtrong67</b><span>${esc(t('about.with'))}</span><b class="ai">Claude</b></div>`;
  return w;
}
export function openAbout() {
  const dlg = el('dialog', { class: 'dialog confirm about-dlg' });
  dlg.append(aboutNode(), el('div', { class: 'dlg-actions' }, el('span', { class: 'spacer' }), el('button', { class: 'btn filled', type: 'button', text: t('btn.close'), onclick: () => { dlg.close(); setTimeout(() => dlg.remove(), 250); } })));
  document.body.append(dlg);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); dlg.close(); setTimeout(() => dlg.remove(), 250); });
  dlg.showModal();
}

/* ------------------------------ settings ------------------------------ */
const UI_FONTS = ['Segoe UI', 'Roboto', 'Inter', 'Arial', 'Calibri', 'Tahoma', 'Verdana', 'Trebuchet MS', 'Georgia', 'Times New Roman', 'Consolas'];

export function openSettings(startPage) {
  if ($('#dlg-settings')) return;
  const dlg = el('dialog', { class: 'dialog settings', id: 'dlg-settings' });

  /* ---- small builders ---- */
  const card = (...rows) => el('div', { class: 'set-card' }, ...rows);
  const row = (label, ctl, hint, ic) => el('div', { class: 'set-row' },
    ic ? el('span', { class: 'set-ic', html: icon(ic) }) : null,
    el('div', { class: 'set-l' }, el('span', { class: 'set-t', text: label }), hint ? el('small', { text: hint }) : null),
    el('div', { class: 'set-c' }, ctl));
  const stack = (label, hint, ctl) => el('div', { class: 'set-row stack' },
    el('div', { class: 'set-l' }, el('span', { class: 'set-t', text: label }), hint ? el('small', { text: hint }) : null), ctl);
  const segBtns = (items, get, set) => {
    const seg = el('div', { class: 'seg' });
    const paint = () => { for (const b of seg.children) b.classList.toggle('on', b.dataset.v === get()); };
    for (const [v, label, ic] of items) {
      const b = el('button', { type: 'button', dataset: { v }, html: (ic ? icon(ic) : '') + `<span>${esc(label)}</span>` });
      b.onclick = () => { set(v); paint(); };
      seg.append(b);
    }
    paint();
    return seg;
  };
  const select = (opts, get, set) => {
    const s = el('select', { class: 'select' });
    for (const [v, l] of opts) s.append(el('option', { value: v, text: l }));
    s.value = get();
    s.onchange = () => set(s.value);
    return s;
  };
  const toggle = (get, set) => {
    const i = el('input', { type: 'checkbox', class: 'switch' });
    i.checked = !!get();
    i.onchange = () => set(i.checked);
    return i;
  };

  /* ---- appearance ---- */
  const vi = lang() === 'vi';
  const swatches = el('div', { class: 'swatches' });
  const paintSw = () => { for (const b of swatches.children) b.classList.toggle('on', !!b.dataset.hex && b.dataset.hex.toLowerCase() === settings.seed.toLowerCase()); };
  const custom = el('input', { type: 'color', class: 'custom-color', value: /^#[0-9a-f]{6}$/i.test(settings.seed) ? settings.seed : DEFAULTS.seed, 'aria-label': t('set.customColor') });
  for (const s of SWATCHES) {
    const name = vi ? s.vi : s.name;
    const b = el('button', { class: 'swatch', type: 'button', dataset: { hex: s.hex }, title: name, 'aria-label': name, html: icon('check') });
    b.style.setProperty('--c', s.hex);
    b.onclick = () => { setSeed(s.hex); custom.value = s.hex; paintSw(); };
    swatches.append(b);
  }
  custom.oninput = () => { setSeed(custom.value); paintSw(); };
  swatches.append(el('label', { class: 'swatch custom', title: t('set.customColor') }, el('span', { html: icon('accent') }), custom));
  paintSw();
  const resetColor = el('button', { class: 'btn text sm', type: 'button', text: t('set.resetColor'), onclick: () => { setSeed(DEFAULTS.seed); custom.value = DEFAULTS.seed; paintSw(); } });

  const uiFontSel = select([['system', t('set.fontSystem')], ...UI_FONTS.map((f) => [f, f])], () => settings.uiFont || 'system', (v) => { settings.uiFont = v; saveSettings(); applyUiFont(); });

  const pageAppearance = el('div', { class: 'set-page' },
    el('h3', { class: 'set-h', text: t('set.appearance') }),
    card(
      row(t('set.theme'), segBtns([['light', t('theme.light'), 'sun'], ['dark', t('theme.dark'), 'moon'], ['system', t('theme.system'), 'auto']], () => settings.theme, (v) => setTheme(v)), t('set.themeD'), 'accent'),
      row(t('set.darkPage'), toggle(() => settings.darkPage, (v) => { settings.darkPage = v; saveSettings(); refreshTheme(); }), t('set.darkPageD'), 'moon')),
    card(stack(t('set.accent'), t('set.accentD'), swatches), el('div', { class: 'set-foot' }, resetColor)),
    card(row(t('set.uiFont'), uiFontSel, t('set.uiFontD'), 'textcolor')));

  /* ---- window ---- */
  const startCards = el('div', { class: 'start-cards' });
  const paintStart = () => { for (const b of startCards.children) { const on = b.dataset.v === settings.start; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); } };
  for (const [v, ic, title, desc] of [['remember', 'window', t('set.startRemember'), t('set.startRememberD')], ['maximized', 'fullscreen', t('set.startMax'), t('set.startMaxD')]]) {
    const b = el('button', { class: 'start-card', type: 'button', role: 'radio', dataset: { v }, html: `<span class="sc-ic">${icon(ic)}</span><span class="sc-t"><b>${esc(title)}</b><small>${esc(desc)}</small></span><span class="sc-radio"></span>` });
    b.onclick = () => { if (settings.start === v) return; settings.start = v; saveSettings(); bus.emit('start-changed', v); paintStart(); toast(t('set.startNote')); };
    startCards.append(b);
  }
  paintStart();
  const pageWindow = el('div', { class: 'set-page' },
    el('h3', { class: 'set-h', text: t('set.window') }),
    el('p', { class: 'set-note', text: t('set.windowD') }), startCards);

  /* ---- language ---- */
  const pageLang = el('div', { class: 'set-page' },
    el('h3', { class: 'set-h', text: t('set.language') }),
    card(
      row(t('set.uiLang'), select([['auto', t('lang.auto')], ['en', 'English'], ['vi', 'Tiếng Việt']], () => settings.lang, (v) => { settings.lang = v; saveSettings(); refreshLanguage(); }), t('set.uiLangD'), 'globe'),
      row(t('set.units'), select([['auto', t('lang.auto')], ['cm', t('units.cm')], ['in', t('units.in')]], () => settings.units, (v) => { settings.units = v; saveSettings(); drawRuler(); }), t('set.unitsD'), 'ruler')));

  /* ---- editing ---- */
  const preview = el('div', { class: 'font-preview', text: t('set.previewText') });
  const paintPreview = () => { preview.style.fontFamily = `'${settings.font}', var(--font)`; preview.style.fontSize = Math.min(24, Math.max(12, settings.fontSize * 1.4)) + 'px'; };
  paintPreview();
  const authorIn = el('input', { class: 'field', type: 'text', value: settings.author || '', placeholder: t('set.authorPh'), maxlength: 80 });
  authorIn.oninput = () => { settings.author = authorIn.value; saveSettings(); };
  const pageEditing = el('div', { class: 'set-page' },
    el('h3', { class: 'set-h', text: t('set.editing') }),
    card(
      row(t('set.font'), select(FONTS.map((f) => [f, f]), () => settings.font, (v) => { settings.font = v; saveSettings(); refreshTheme(); paintPreview(); bus.emit('settings-doc'); }), null, 'textcolor'),
      row(t('set.fontSize'), select(SIZES.map((s) => [String(s), s + ' pt']), () => String(settings.fontSize), (v) => { settings.fontSize = parseFloat(v); saveSettings(); document.documentElement.style.setProperty('--doc-size', v + 'pt'); paintPreview(); bus.emit('settings-doc'); }), null, 'fontgrow'),
      el('div', { class: 'set-row stack' }, preview)),
    card(
      row(t('set.spell'), toggle(() => settings.spell, (v) => { settings.spell = v; saveSettings(); editor.spellcheck = v; })),
      row(t('set.autocorrect'), toggle(() => settings.autocorrect, (v) => { settings.autocorrect = v; saveSettings(); }), t('set.autocorrectD')),
      row(t('set.autosave'), toggle(() => settings.autosave, (v) => { settings.autosave = v; saveSettings(); }), t('set.autosaveD'))),
    card(row(t('set.author'), authorIn, t('set.authorD'))));

  /* ---- about ---- */
  const resetAll = el('button', { class: 'btn tonal', type: 'button', text: t('set.resetAll'), onclick: async () => {
    const r = await askConfirm({ title: t('set.resetAll'), msg: t('set.resetAllD'), yes: t('set.resetAll'), cancel: true });
    if (r !== 'yes') return;
    const keep = { recent: settings.recent, migrated2: settings.migrated2 };
    Object.assign(settings, JSON.parse(JSON.stringify(DEFAULTS)), keep);
    saveSettings();
    refreshLanguage(); refreshTheme();
    editor.spellcheck = !!settings.spell;
    document.documentElement.style.setProperty('--doc-size', settings.fontSize + 'pt');
    bus.emit('start-changed', settings.start); bus.emit('settings-doc');
    drawRuler();
    close();
    setTimeout(() => { openSettings('about'); toast(t('set.resetDone')); }, 260);
  } });
  const pageAbout = el('div', { class: 'set-page' },
    el('h3', { class: 'set-h', text: t('set.about') }),
    card(el('div', { class: 'set-row stack center' }, aboutNode())),
    card(row(t('set.resetAll'), resetAll, t('set.resetAllD'), 'undo')));

  /* ---- navigation (rail on wide screens, chips on narrow ones) ---- */
  const PAGES = [
    ['appearance', 'accent', t('set.appearance'), pageAppearance],
    ['window', 'window', t('set.window'), pageWindow],
    ['language', 'globe', t('set.language'), pageLang],
    ['editing', 'edit', t('set.editing'), pageEditing],
    ['about', 'info', t('set.about'), pageAbout],
  ];
  const nav = el('nav', { class: 'set-nav', role: 'tablist', 'aria-orientation': 'vertical' });
  const pages = el('div', { class: 'set-pages' });
  const show = (id) => {
    for (const b of nav.children) { const on = b.dataset.id === id; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; }
    for (const [pid, , , node] of PAGES) node.hidden = pid !== id;
    pages.scrollTop = 0;
  };
  for (const [id, ic, label, node] of PAGES) {
    const b = el('button', { class: 'set-tab', type: 'button', role: 'tab', dataset: { id }, html: icon(ic) + `<span>${esc(label)}</span>` });
    b.onclick = () => show(id);
    nav.append(b);
    node.hidden = true;
    pages.append(node);
  }
  nav.addEventListener('keydown', (e) => {
    const k = e.key;
    if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(k)) return;
    e.preventDefault();
    const tabs = [...nav.children];
    let i = tabs.findIndex((b) => b.classList.contains('on'));
    i = k === 'Home' ? 0 : k === 'End' ? tabs.length - 1 : (i + (k === 'ArrowDown' || k === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    show(tabs[i].dataset.id); tabs[i].focus();
  });

  const head = el('div', { class: 'set-head' },
    el('h2', { html: icon('gear') + `<span>${esc(t('settings.title'))}</span>` }),
    el('button', { class: 'icon-btn', type: 'button', html: icon('close'), 'aria-label': t('btn.close'), onclick: () => close() }));
  const foot = el('div', { class: 'dlg-actions' },
    el('button', { class: 'btn text', type: 'button', text: t('set.shortcuts'), onclick: () => openShortcuts() }),
    el('span', { class: 'spacer' }),
    el('button', { class: 'btn filled', type: 'button', text: t('btn.done'), onclick: () => close() }));
  dlg.append(head, el('div', { class: 'set-main' }, nav, pages), foot);
  document.body.append(dlg);
  const close = () => { dlg.close(); setTimeout(() => dlg.remove(), 260); };
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  dlg.addEventListener('mousedown', (e) => {
    if (e.target !== dlg) return;
    const r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
  });
  show(PAGES.some((p) => p[0] === startPage) ? startPage : 'appearance');
  dlg.showModal();
  const cur = nav.querySelector('.on'); if (cur) cur.focus({ preventScroll: true });
}
void sizeZoomer; void paginate; void openPopover; void editor;
