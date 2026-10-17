// Declarative ribbon definition (tabs → groups → controls). The engine lives in ribbon.js.
import { el, esc, round, pxToPt, ptToPx, pxToCm, cmToPx } from './util.js';
import { icon } from './icons.js';
import { t } from './i18n.js';
import { doc, bus, PAPERS, MARGIN_PRESETS } from './state.js';
import { settings, saveSettings, units } from './settings.js';
import { closePopup, toast } from './popup.js';
import { editor, selectedBlocks, restoreSel } from './editor.js';
import * as C from './cmds.js';
import * as D from './dialogs.js';
import * as TB from './tables.js';
import * as IM from './images.js';
import * as V from './view.js';
import { openFind } from './find.js';
import { refreshTheme } from './appearance.js';
import { newDoc, openDoc, saveDoc, printDoc } from './fileio.js';
import { setPaper } from './dialogs.js';

const focusDoc = () => restoreSel();
const inTbl = (s) => s.inTable;

/* ------------------------------ helpers ------------------------------ */
const B = (o) => ({ k: 'btn', ...o });
const D_ = (o) => ({ k: 'drop', ...o });
const gl = (cls, txt) => `<span class="gl ${cls}">${txt}</span>`;

/** Insert-table grid picker. */
function tablePicker() {
  const box = el('div', { class: 'tbl-pick' });
  const info = el('div', { class: 'tp-info', text: t('tbl.pick') });
  const grid = el('div', { class: 'tp-grid' });
  const N = 8;
  const cells = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const b = el('i', { class: 'tp-c', dataset: { r: r + 1, c: c + 1 } });
    cells.push(b);
    grid.append(b);
  }
  const paint = (r, c) => {
    for (const b of cells) b.classList.toggle('on', +b.dataset.r <= r && +b.dataset.c <= c);
    info.textContent = r ? `${c} × ${r}` : t('tbl.pick');
  };
  grid.addEventListener('pointermove', (e) => { const b = e.target.closest('.tp-c'); if (b) paint(+b.dataset.r, +b.dataset.c); });
  grid.addEventListener('pointerleave', () => paint(0, 0));
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('.tp-c');
    if (!b) return;
    closePopup();
    TB.insertTable(+b.dataset.r, +b.dataset.c, { style: 'grid', header: true });
  });
  const more = el('button', { class: 'menu-item', type: 'button', html: `<span class="mi-ic">${icon('table')}</span><span class="mi-l">${esc(t('tbl.insertDlg'))}</span>` });
  more.addEventListener('mousedown', (e) => e.preventDefault());
  more.addEventListener('click', () => { closePopup(); D.openInsertTable(); });
  box.append(info, grid, el('div', { class: 'menu-sep' }), more);
  return box;
}

/** Small labelled numeric input used in the Layout tab (indent / spacing). */
function numField(labelKey, ic, get, set, { unit, step = 0.1, min = 0, max = 100 }) {
  const w = el('label', { class: 'numf' });
  const inp = el('input', { type: 'number', step, min, max, class: 'numf-in', 'aria-label': t(labelKey) });
  w.append(el('span', { class: 'numf-l', html: icon(ic) + `<span>${esc(t(labelKey))}</span>` }), el('span', { class: 'numf-w' }, inp, el('i', { text: unit() })));
  const upd = () => {
    if (document.activeElement === inp) return;
    const b = selectedBlocks()[0];
    if (!b) return;
    inp.value = get(getComputedStyle(b));
    w.querySelector('i').textContent = unit();
  };
  inp.addEventListener('change', () => { const v = parseFloat(String(inp.value).replace(',', '.')); if (Number.isFinite(v)) set(v); });
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); inp.dispatchEvent(new Event('change')); focusDoc(); } });
  bus.on('selection', upd);
  bus.on('meta', upd);
  setTimeout(upd, 0);
  return w;
}
const uName = () => (units() === 'cm' ? 'cm' : 'in');
const toU = (px) => (units() === 'cm' ? round(pxToCm(px), 2) : round(px / 96, 2));
const fromU = (v) => (units() === 'cm' ? cmToPx(v) : v * 96);

/* ------------------------------ list libraries ------------------------------ */
const bulletMenu = () => [
  { label: t('list.disc'), icon: 'bullets', run: () => C.toggleList('ul', 'disc') },
  { label: t('list.circle'), icon: 'bullets', run: () => C.toggleList('ul', 'circle') },
  { label: t('list.square'), icon: 'bullets', run: () => C.toggleList('ul', 'square') },
];
const numberMenu = () => [
  { label: '1. 2. 3.', run: () => C.toggleList('ol', 'decimal') },
  { label: 'a. b. c.', run: () => C.toggleList('ol', 'lower-alpha') },
  { label: 'A. B. C.', run: () => C.toggleList('ol', 'upper-alpha') },
  { label: 'i. ii. iii.', run: () => C.toggleList('ol', 'lower-roman') },
  { label: 'I. II. III.', run: () => C.toggleList('ol', 'upper-roman') },
];

const lineMenu = () => [
  ...['1', '1.15', '1.5', '2', '2.5', '3'].map((v) => ({ label: v === '1' ? t('lh.single') : v, run: () => C.setLineSpacing(v) })),
  { sep: true },
  { label: t('para.spaceBefore'), run: () => C.toggleSpace('before') },
  { label: t('para.spaceAfter'), run: () => C.toggleSpace('after') },
  { sep: true },
  { label: t('para.options'), icon: 'edit', run: () => D.openParagraph() },
];

const bordersMenu = () => [
  { label: t('bd.bottom'), run: () => C.paraBorder('bottom') },
  { label: t('bd.top'), run: () => C.paraBorder('top') },
  { label: t('bd.left'), run: () => C.paraBorder('left') },
  { label: t('bd.right'), run: () => C.paraBorder('right') },
  { label: t('bd.box'), run: () => C.paraBorder('all') },
  { sep: true },
  { label: t('bd.none'), run: () => C.paraBorder('none') },
];

const caseMenu = () => [
  { label: t('case.sentence'), run: () => C.changeCase('sentence') },
  { label: t('case.lower'), run: () => C.changeCase('lower') },
  { label: t('case.upper'), run: () => C.changeCase('upper') },
  { label: t('case.title'), run: () => C.changeCase('title') },
  { label: t('case.toggle'), run: () => C.changeCase('toggle') },
];

const cellTarget = () => {
  const cs = TB.selectedCells();
  return cs.length ? cs : [];
};
const oneCell = () => cellTarget()[0] || null;
const withTable = (fn) => { const tb = TB.currentTable(); if (tb) fn(tb); };

/* ------------------------------ speech ------------------------------ */
let speaking = false;
export function toggleSpeak() {
  const synth = window.speechSynthesis;
  if (!synth) { toast(t('toast.noSpeech')); return; }
  if (speaking) { synth.cancel(); speaking = false; bus.emit('selection'); return; }
  const sel = String(getSelection());
  const text = (sel && sel.trim()) || editor.innerText;
  if (!text.trim()) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = document.documentElement.lang === 'vi' ? 'vi-VN' : 'en-US';
  u.onend = u.onerror = () => { speaking = false; bus.emit('selection'); };
  speaking = true;
  synth.cancel();
  synth.speak(u);
  bus.emit('selection');
}
export const isSpeaking = () => speaking;

/* ------------------------------ definition ------------------------------ */
export function ribbonDef({ openBackstage, toggleFullscreen, cycleTheme }) {
  const home = {
    id: 'home', l: 'tab.home',
    groups: [
      {
        l: 'g.clipboard', cls: 'g-clip',
        items: [
          { k: 'split', size: 'lg', ic: 'paste', l: 'rb.paste', tip: 'tip.paste', kbd: 'Ctrl+V', run: async () => { if (!(await C.pasteFromClipboard(false))) toast(t('toast.pasteHint')); },
            menu: () => [
              { label: t('rb.paste'), icon: 'paste', kbd: 'Ctrl+V', run: async () => { if (!(await C.pasteFromClipboard(false))) toast(t('toast.pasteHint')); } },
              { label: t('rb.pasteText'), icon: 'pastetext', kbd: 'Ctrl+Shift+V', run: async () => { if (!(await C.pasteFromClipboard(true))) toast(t('toast.pasteHint')); } },
            ] },
          { k: 'stack', rows: [
            [B({ ic: 'cut', l: 'rb.cut', tip: 'tip.cut', kbd: 'Ctrl+X', showLabel: true, run: () => C.copySel(true), enabled: (s) => s.hasSel && !s.collapsed })],
            [B({ ic: 'copy', l: 'rb.copy', tip: 'tip.copy', kbd: 'Ctrl+C', showLabel: true, run: () => C.copySel(false), enabled: (s) => s.hasSel && !s.collapsed })],
            [B({ ic: 'painter', l: 'rb.painter', tip: 'tip.painter', showLabel: true, run: () => (C.painterActive() ? C.cancelPainter() : C.startPainter()), active: (s) => s.painter })],
          ] },
        ],
      },
      {
        l: 'g.font', cls: 'g-font', launcher: () => D.openFontDialog && D.openFontDialog(),
        items: [
          { k: 'stack', rows: [
            [
              { k: 'combo', w: 156, tip: 'tip.fontFamily', cls: 'font', get: (s) => s.font, set: (v) => C.setFont(v), options: () => C.FONTS, preview: C.fontStack, back: focusDoc },
              { k: 'combo', w: 54, tip: 'tip.fontSize', cls: 'size', get: (s) => s.size, set: (v) => C.setSize(v), options: () => C.SIZES.map(String), back: focusDoc },
              B({ ic: 'fontgrow', tip: 'tip.grow', kbd: 'Ctrl+Shift+>', run: () => C.stepSize(1) }),
              B({ ic: 'fontshrink', tip: 'tip.shrink', kbd: 'Ctrl+Shift+<', run: () => C.stepSize(-1) }),
              D_({ ic: 'case', tip: 'tip.case', menu: caseMenu }),
              B({ ic: 'clearfmt', tip: 'tip.clear', run: () => C.clearFormatting() }),
            ],
            [
              B({ glyph: gl('b', 'B'), tip: 'tip.bold', kbd: 'Ctrl+B', run: () => C.toggle('bold'), active: (s) => s.bold }),
              B({ glyph: gl('i', 'I'), tip: 'tip.italic', kbd: 'Ctrl+I', run: () => C.toggle('italic'), active: (s) => s.italic }),
              B({ glyph: gl('u', 'U'), tip: 'tip.underline', kbd: 'Ctrl+U', run: () => C.toggle('underline'), active: (s) => s.underline }),
              B({ glyph: gl('s', 'S'), tip: 'tip.strike', kbd: 'Ctrl+Shift+X', run: () => C.toggle('strikeThrough'), active: (s) => s.strike }),
              B({ glyph: gl('sub', 'x<sub>2</sub>'), tip: 'tip.sub', kbd: 'Ctrl+=', run: () => C.toggle('subscript'), active: (s) => s.sub }),
              B({ glyph: gl('sup', 'x<sup>2</sup>'), tip: 'tip.sup', kbd: 'Ctrl+Shift+=', run: () => C.toggle('superscript'), active: (s) => s.sup }),
              { k: 'sep' },
              { k: 'color', ic: 'highlight', tip: 'tip.highlight', hl: true, initial: '#ffff00', noneLabel: 'color.noHl', run: (c) => C.setHighlight(c) },
              { k: 'color', ic: 'textcolor', tip: 'tip.color', initial: '#c00000', noneLabel: 'color.auto', run: (c) => C.setColor(c) },
            ],
          ] },
        ],
      },
      {
        l: 'g.paragraph', cls: 'g-para', launcher: () => D.openParagraph(),
        items: [
          { k: 'stack', rows: [
            [
              { k: 'split', ic: 'bullets', tip: 'tip.ul', kbd: 'Ctrl+Shift+L', size: 'sm', run: () => C.toggleList('ul'), active: (s) => s.list === 'ul', menu: bulletMenu },
              { k: 'split', ic: 'numbering', tip: 'tip.ol', size: 'sm', run: () => C.toggleList('ol'), active: (s) => s.list === 'ol', menu: numberMenu },
              B({ ic: 'outdent', tip: 'tip.outdent', kbd: 'Shift+Tab', run: () => C.indent(-1) }),
              B({ ic: 'indent', tip: 'tip.indent', kbd: 'Tab', run: () => C.indent(1) }),
              { k: 'sep' },
              B({ ic: 'sort', tip: 'tip.sort', run: () => C.sortLines(), enabled: (s) => s.hasSel && !s.collapsed }),
              B({ ic: 'marks', tip: 'tip.marks', kbd: 'Ctrl+Shift+8', run: () => V.toggleMarks(), active: () => settings.marks }),
            ],
            [
              B({ ic: 'alignl', tip: 'tip.alignLeft', kbd: 'Ctrl+L', run: () => C.align('left'), active: (s) => s.align === 'left' }),
              B({ ic: 'alignc', tip: 'tip.alignCenter', kbd: 'Ctrl+E', run: () => C.align('center'), active: (s) => s.align === 'center' }),
              B({ ic: 'alignr', tip: 'tip.alignRight', kbd: 'Ctrl+R', run: () => C.align('right'), active: (s) => s.align === 'right' }),
              B({ ic: 'alignj', tip: 'tip.alignJustify', kbd: 'Ctrl+J', run: () => C.align('justify'), active: (s) => s.align === 'justify' }),
              { k: 'sep' },
              D_({ ic: 'linesp', tip: 'tip.lineSpacing', menu: lineMenu }),
              { k: 'color', ic: 'shading', tip: 'tip.shading', noneLabel: 'color.noFill', run: (c) => C.shadeParagraph(c), keepBar: false },
              D_({ ic: 'borders', tip: 'tip.borders', menu: bordersMenu }),
            ],
          ] },
        ],
      },
      {
        l: 'g.styles', cls: 'g-styles',
        items: [{
          k: 'gallery',
          items: () => C.STYLE_LIST.map((s) => ({ id: s.id, label: t(s.label), sample: t('style.sample') })),
          get: (s) => s.style,
          run: (id) => { C.applyStyle(id); },
          clear: () => C.clearFormatting(),
        }],
      },
      {
        l: 'g.editing', cls: 'g-edit',
        items: [{ k: 'stack', rows: [
          [B({ ic: 'find', l: 'rb.find', tip: 'tip.find', kbd: 'Ctrl+F', showLabel: true, run: () => openFind() })],
          [B({ ic: 'replace', l: 'rb.replace', tip: 'tip.replace', kbd: 'Ctrl+H', showLabel: true, run: () => openFind({ replace: true }) })],
          [D_({ ic: 'selectall', l: 'rb.select', tip: 'tip.select', showLabel: true, menu: () => [
            { label: t('sc.selectAll'), icon: 'selectall', kbd: 'Ctrl+A', run: () => C.selectAll() },
            { label: t('rb.goto'), icon: 'right', kbd: 'Ctrl+G', run: () => D.openGoto() },
          ] })],
        ] }],
      },
    ],
  };

  const insert = {
    id: 'insert', l: 'tab.insert',
    groups: [
      { l: 'g.pages', items: [B({ size: 'lg', ic: 'pagebreak', l: 'rb.pageBreak', tip: 'tip.pageBreak', kbd: 'Ctrl+Enter', run: () => C.insertPageBreak() })] },
      { l: 'g.tables', items: [D_({ size: 'lg', ic: 'table', l: 'rb.table', tip: 'tip.table', popover: tablePicker, pcls: 'tbl-pop' })] },
      { l: 'g.illustrations', items: [
        B({ size: 'lg', ic: 'image', l: 'rb.picture', tip: 'tip.image', run: () => document.getElementById('file-image').click() }),
      ] },
      { l: 'g.links', items: [B({ size: 'lg', ic: 'link', l: 'rb.link', tip: 'tip.link', kbd: 'Ctrl+K', run: () => D.openLinkDialog(), active: (s) => s.inLink })] },
      { l: 'g.hf', items: [
        D_({ size: 'lg', ic: 'header', l: 'rb.header', tip: 'tip.header', menu: () => [
          { label: t('hf.editHeader'), icon: 'edit', run: () => D.openHeaderFooter('header') },
          { label: t('hf.removeHeader'), icon: 'trash', run: () => D.removeHeaderFooter('header'), disabled: !doc.header.text },
        ] }),
        D_({ size: 'lg', ic: 'footer', l: 'rb.footer', tip: 'tip.footer', menu: () => [
          { label: t('hf.editFooter'), icon: 'edit', run: () => D.openHeaderFooter('footer') },
          { label: t('hf.removeFooter'), icon: 'trash', run: () => D.removeHeaderFooter('footer'), disabled: !doc.footer.text },
        ] }),
        D_({ size: 'lg', ic: 'pagenum', l: 'rb.pageNum', tip: 'tip.pageNum', menu: () => [
          { heading: t('pn.top') },
          { label: t('tip.alignLeft'), icon: 'alignl', run: () => C.setPageNumber('header', 'left') },
          { label: t('tip.alignCenter'), icon: 'alignc', run: () => C.setPageNumber('header', 'center') },
          { label: t('tip.alignRight'), icon: 'alignr', run: () => C.setPageNumber('header', 'right') },
          { heading: t('pn.bottom') },
          { label: t('tip.alignLeft'), icon: 'alignl', run: () => C.setPageNumber('footer', 'left') },
          { label: t('tip.alignCenter'), icon: 'alignc', run: () => C.setPageNumber('footer', 'center') },
          { label: t('tip.alignRight'), icon: 'alignr', run: () => C.setPageNumber('footer', 'right') },
          { sep: true },
          { label: t('pn.remove'), icon: 'trash', run: () => C.removePageNumbers() },
        ] }),
      ] },
      { l: 'g.text', items: [D_({ size: 'lg', ic: 'date', l: 'rb.date', tip: 'tip.date', menu: () => D.dateMenuItems() })] },
      { l: 'g.symbols', items: [
        B({ size: 'lg', ic: 'hr', l: 'rb.hr', tip: 'tip.hr', run: () => C.insertHr() }),
        D_({ size: 'lg', ic: 'symbol', l: 'rb.symbol', tip: 'tip.symbol', popover: () => D.openSymbols(), pcls: 'sym-pop' }),
      ] },
    ],
  };

  const design = {
    id: 'design', l: 'tab.design',
    groups: [
      { l: 'g.docfmt', items: [
        D_({ size: 'lg', ic: 'edit', l: 'rb.fonts', tip: 'tip.defaultFont', menu: () => ['Calibri', 'Arial', 'Times New Roman', 'Cambria', 'Georgia', 'Segoe UI', 'Verdana', 'Consolas'].map((f) => ({ label: f, checked: settings.font === f, run: () => { settings.font = f; saveSettings(); refreshTheme(); bus.emit('settings-doc'); } })) }),
        D_({ size: 'lg', ic: 'accent', l: 'rb.theme', tip: 'tip.theme', menu: () => [
          { label: t('theme.light'), icon: 'sun', checked: settings.theme === 'light', run: () => cycleTheme('light') },
          { label: t('theme.dark'), icon: 'moon', checked: settings.theme === 'dark', run: () => cycleTheme('dark') },
          { label: t('theme.system'), icon: 'auto', checked: settings.theme === 'system', run: () => cycleTheme('system') },
          { sep: true },
          { label: t('settings.title'), icon: 'gear', run: () => D.openSettings() },
        ] }),
      ] },
      { l: 'g.pagebg', items: [
        { k: 'color', size: 'sm', ic: 'pagecolor', tip: 'tip.pageColor', noneLabel: 'color.noFill', run: (c) => D.setPageColor(c), keepBar: false, initial: null },
        B({ size: 'lg', ic: 'moon', l: 'rb.darkPage', tip: 'tip.darkPage', active: () => settings.darkPage, run: () => { settings.darkPage = !settings.darkPage; saveSettings(); refreshTheme(); bus.emit('selection'); } }),
      ] },
    ],
  };

  const layout = {
    id: 'layout', l: 'tab.layout',
    groups: [
      { l: 'g.pagesetup', launcher: () => D.openPageSetup(), items: [
        D_({ size: 'lg', ic: 'margins', l: 'rb.margins', tip: 'tip.margins', menu: () => [
          ...['normal', 'narrow', 'moderate', 'wide'].map((k) => {
            const m = MARGIN_PRESETS[k];
            const same = ['top', 'bottom', 'left', 'right'].every((x) => Math.abs(doc.page.margins[x] - m[x]) < 1);
            return { label: t('mg.' + k), html: `<b>${esc(t('mg.' + k))}</b><small class="mi-sub">${esc(t('mg.desc', { tb: round(units() === 'cm' ? pxToCm(m.top) : m.top / 96, 2) + uName(), lr: round(units() === 'cm' ? pxToCm(m.left) : m.left / 96, 2) + uName() }))}</small>`, checked: same, run: () => D.setMargins(k) };
          }),
          { sep: true },
          { label: t('mg.custom'), icon: 'edit', run: () => D.openPageSetup() },
        ] }),
        D_({ size: 'lg', ic: 'orient', l: 'rb.orientation', tip: 'tip.orientation', menu: () => [
          { label: t('orient.portrait'), checked: doc.page.orientation === 'portrait', run: () => D.setOrientation('portrait') },
          { label: t('orient.landscape'), checked: doc.page.orientation === 'landscape', run: () => D.setOrientation('landscape') },
        ] }),
        D_({ size: 'lg', ic: 'psize', l: 'rb.size', tip: 'tip.size', menu: () => Object.entries(PAPERS).map(([k, v]) => ({
          label: k, html: `<b>${esc(k)}</b><small class="mi-sub">${round(pxToCm(v.tw / 15), 1)} × ${round(pxToCm(v.th / 15), 1)} cm</small>`, checked: doc.page.size === k, run: () => setPaper(k),
        })) }),
        D_({ size: 'lg', ic: 'pagebreak', l: 'rb.breaks', tip: 'tip.breaks', menu: () => [
          { label: t('rb.pageBreak'), icon: 'pagebreak', kbd: 'Ctrl+Enter', run: () => C.insertPageBreak() },
        ] }),
      ] },
      { l: 'g.para', launcher: () => D.openParagraph(), items: [{ k: 'stack', rows: [
        [{ k: 'node', node: () => numField('para.leftInd', 'indent', (cs) => toU(parseFloat(cs.marginLeft) || 0), (v) => C.setParagraph({ left: fromU(v) }), { unit: uName, step: 0.1 }) },
         { k: 'node', node: () => numField('para.before', 'linesp', (cs) => round(pxToPt(parseFloat(cs.marginTop) || 0), 1), (v) => C.setParagraph({ before: ptToPx(v) }), { unit: () => 'pt', step: 1 }) }],
        [{ k: 'node', node: () => numField('para.rightInd', 'outdent', (cs) => toU(parseFloat(cs.marginRight) || 0), (v) => C.setParagraph({ right: fromU(v) }), { unit: uName, step: 0.1 }) },
         { k: 'node', node: () => numField('para.after', 'linesp', (cs) => round(pxToPt(parseFloat(cs.marginBottom) || 0), 1), (v) => C.setParagraph({ after: ptToPx(v) }), { unit: () => 'pt', step: 1 }) }],
      ] }] },
    ],
  };

  const references = {
    id: 'references', l: 'tab.references',
    groups: [
      { l: 'g.toc', items: [
        D_({ size: 'lg', ic: 'toc', l: 'rb.toc', tip: 'tip.toc', menu: () => [
          { label: t('toc.insert'), icon: 'toc', run: () => C.insertToc() },
          { label: t('toc.update'), icon: 'recent', run: () => C.updateToc(), disabled: !editor.querySelector('[data-toc]') },
          { label: t('toc.remove'), icon: 'trash', run: () => C.removeToc(), disabled: !editor.querySelector('[data-toc]') },
        ] }),
        B({ size: 'lg', ic: 'recent', l: 'rb.updateToc', tip: 'tip.updateToc', run: () => { if (!editor.querySelector('[data-toc]')) { toast(t('toc.none')); return; } C.updateToc(); }, enabled: () => true }),
      ] },
      { l: 'g.captions', items: [
        B({ size: 'lg', ic: 'quote', l: 'rb.caption', tip: 'tip.caption', run: () => C.applyStyle('caption') }),
        B({ size: 'lg', ic: 'navpane', l: 'rb.headings', tip: 'tip.nav', run: () => V.toggleSide(true) }),
      ] },
    ],
  };

  const review = {
    id: 'review', l: 'tab.review',
    groups: [
      { l: 'g.proofing', items: [
        B({ size: 'lg', ic: 'spell', l: 'rb.spelling', tip: 'tip.spelling', active: () => settings.spell, run: () => { settings.spell = !settings.spell; saveSettings(); editor.spellcheck = settings.spell; bus.emit('selection'); toast(t(settings.spell ? 'toast.spellOn' : 'toast.spellOff')); } }),
        B({ size: 'lg', ic: 'wordcount', l: 'rb.wordCount', tip: 'tip.wordCount', run: () => D.openWordCount() }),
      ] },
      { l: 'g.speech', items: [
        B({ size: 'lg', ic: 'speak', l: 'rb.readAloud', tip: 'tip.readAloud', active: () => isSpeaking(), run: () => toggleSpeak() }),
      ] },
      { l: 'g.language', items: [
        D_({ size: 'lg', ic: 'globe', l: 'rb.language', tip: 'tip.uiLanguage', menu: () => [
          { label: 'English', checked: document.documentElement.lang === 'en', run: () => bus.emit('set-lang', 'en') },
          { label: 'Tiếng Việt', checked: document.documentElement.lang === 'vi', run: () => bus.emit('set-lang', 'vi') },
        ] }),
      ] },
    ],
  };

  const view = {
    id: 'view', l: 'tab.view',
    groups: [
      { l: 'g.views', items: [
        B({ size: 'lg', ic: 'readview', l: 'view.read', tip: 'view.read', active: (s) => s.view === 'read', run: () => V.setView('read') }),
        B({ size: 'lg', ic: 'printview', l: 'view.print', tip: 'view.print', active: (s) => s.view === 'print', run: () => V.setView('print') }),
        B({ size: 'lg', ic: 'webview', l: 'view.web', tip: 'view.web', active: (s) => s.view === 'web', run: () => V.setView('web') }),
      ] },
      { l: 'g.show', items: [{ k: 'stack', rows: [
        [B({ ic: 'ruler', l: 'rb.ruler', tip: 'tip.ruler', showLabel: true, active: () => settings.ruler, run: () => { V.showRuler(!settings.ruler); bus.emit('selection'); } })],
        [B({ ic: 'navpane', l: 'rb.navPane', tip: 'tip.nav', showLabel: true, active: () => settings.nav, run: () => V.toggleSide() })],
        [B({ ic: 'marks', l: 'rb.marks', tip: 'tip.marks', showLabel: true, active: () => settings.marks, run: () => V.toggleMarks() })],
      ] }] },
      { l: 'g.zoom', items: [
        B({ size: 'lg', ic: 'zoom', l: 'rb.zoom100', tip: 'tip.zoom100', kbd: 'Ctrl+0', run: () => V.setZoom(100) }),
        B({ size: 'lg', ic: 'fitpage', l: 'rb.onePage', tip: 'tip.fitPage', run: () => V.fitPage() }),
        B({ size: 'lg', ic: 'fitwidth', l: 'rb.pageWidth', tip: 'tip.fitWidth', run: () => V.fitWidth() }),
      ] },
      { l: 'g.window', items: [
        B({ size: 'lg', ic: 'fullscreen', l: 'rb.fullscreen', tip: 'sc.fullscreen', kbd: 'F11', run: () => toggleFullscreen() }),
        B({ size: 'lg', ic: 'gear', l: 'rb.settings', tip: 'tip.settings', kbd: 'Ctrl+,', run: () => D.openSettings() }),
      ] },
    ],
  };

  const tableTab = {
    id: 'table', l: 'tab.table', ctx: true,
    groups: [
      { l: 'g.tstyles', items: [
        D_({ size: 'lg', ic: 'tblstyle', l: 'rb.tableStyles', tip: 'tip.tableStyles', menu: () => {
          const tb = TB.currentTable();
          const cur = (tb && tb.getAttribute('data-ts')) || 'grid';
          return TB.TABLE_STYLES.map((s) => ({ label: t(s.label), checked: cur === s.id, run: () => withTable((x) => TB.setTableStyle(x, s.id)) }));
        } }),
        { k: 'stack', rows: [
          [B({ l: 'tbl.headerRow', tip: 'tbl.headerRow', ic: 'check', showLabel: true, active: () => !!(TB.currentTable() || {}).hasAttribute?.('data-hdr'), run: () => withTable((x) => TB.setTableFlag(x, 'data-hdr', !x.hasAttribute('data-hdr'))) })],
          [B({ l: 'tbl.banded', tip: 'tbl.banded', ic: 'check', showLabel: true, active: () => !!(TB.currentTable() || {}).hasAttribute?.('data-band'), run: () => withTable((x) => TB.setTableFlag(x, 'data-band', !x.hasAttribute('data-band'))) })],
          [B({ l: 'tbl.firstCol', tip: 'tbl.firstCol', ic: 'check', showLabel: true, active: () => !!(TB.currentTable() || {}).hasAttribute?.('data-fc'), run: () => withTable((x) => TB.setTableFlag(x, 'data-fc', !x.hasAttribute('data-fc'))) })],
        ] },
      ] },
      { l: 'g.tshade', items: [{ k: 'stack', rows: [
        [{ k: 'color', ic: 'shading', tip: 'tip.cellShading', noneLabel: 'color.noFill', run: (c) => TB.shadeCells(cellTarget(), c), keepBar: false }],
        [D_({ ic: 'borders', tip: 'tip.cellBorders', menu: () => [
          { label: t('bd.all'), run: () => TB.cellBorders(cellTarget(), 'all') },
          { label: t('bd.bottom'), run: () => TB.cellBorders(cellTarget(), 'bottom') },
          { label: t('bd.top'), run: () => TB.cellBorders(cellTarget(), 'top') },
          { label: t('bd.left'), run: () => TB.cellBorders(cellTarget(), 'left') },
          { label: t('bd.right'), run: () => TB.cellBorders(cellTarget(), 'right') },
          { sep: true },
          { label: t('bd.none'), run: () => TB.cellBorders(cellTarget(), 'none') },
          { label: t('bd.reset'), run: () => TB.cellBorders(cellTarget(), 'reset') },
        ] })],
      ] }] },
      { l: 'g.rowcol', items: [
        { k: 'stack', rows: [
          [B({ ic: 'rowabove', l: 'tbl.rowAbove', tip: 'tbl.rowAbove', showLabel: true, run: () => oneCell() && TB.addRow(oneCell(), false) })],
          [B({ ic: 'rowbelow', l: 'tbl.rowBelow', tip: 'tbl.rowBelow', showLabel: true, run: () => oneCell() && TB.addRow(oneCell(), true) })],
        ] },
        { k: 'stack', rows: [
          [B({ ic: 'colleft', l: 'tbl.colLeft', tip: 'tbl.colLeft', showLabel: true, run: () => oneCell() && TB.addCol(oneCell(), false) })],
          [B({ ic: 'colright', l: 'tbl.colRight', tip: 'tbl.colRight', showLabel: true, run: () => oneCell() && TB.addCol(oneCell(), true) })],
        ] },
        D_({ size: 'lg', ic: 'trash', l: 'tbl.delete', tip: 'tbl.delete', menu: () => [
          { label: t('tbl.delRow'), icon: 'delrow', run: () => oneCell() && TB.deleteRow(oneCell()) },
          { label: t('tbl.delCol'), icon: 'delcol', run: () => oneCell() && TB.deleteCol(oneCell()) },
          { sep: true },
          { label: t('tbl.delTable'), icon: 'trash', danger: true, run: () => oneCell() && TB.deleteTable(oneCell()) },
        ] }),
      ] },
      { l: 'g.merge', items: [
        B({ size: 'lg', ic: 'merge', l: 'tbl.merge', tip: 'tbl.merge', run: () => TB.mergeCells() }),
        B({ size: 'lg', ic: 'split', l: 'tbl.split', tip: 'tbl.split', run: () => oneCell() && D.openSplitCells(oneCell()) }),
      ] },
      { l: 'g.cellsize', items: [
        B({ size: 'lg', ic: 'distribute', l: 'tbl.distribute', tip: 'tbl.distribute', run: () => withTable((x) => TB.distributeColumns(x)) }),
        D_({ size: 'lg', ic: 'fitwidth', l: 'tbl.autofit', tip: 'tbl.autofit', menu: () => [
          { label: t('tbl.fitWindow'), run: () => withTable((x) => TB.fitTable(x, 'window')) },
          { label: t('tbl.fitContent'), run: () => withTable((x) => TB.fitTable(x, 'content')) },
          { sep: true },
          ...[100, 75, 50].map((p) => ({ label: p + '%', run: () => withTable((x) => TB.sizeTable(x, p)) })),
        ] }),
        D_({ size: 'lg', ic: 'linesp', l: 'tbl.rowHeight', tip: 'tbl.rowHeight', menu: () => [
          { label: t('tbl.rhAuto'), run: () => TB.setRowHeight(cellTarget(), 0) },
          ...[24, 32, 48, 64].map((h) => ({ label: round(pxToCm(h), 1) + ' cm', run: () => TB.setRowHeight(cellTarget(), h) })),
        ] }),
      ] },
      { l: 'g.align', items: [{ k: 'stack', rows: [
        [B({ ic: 'vtop', tip: 'tbl.vtop', run: () => TB.cellValign(cellTarget(), 'top') }), B({ ic: 'vmid', tip: 'tbl.vmid', run: () => TB.cellValign(cellTarget(), 'middle') }), B({ ic: 'vbot', tip: 'tbl.vbot', run: () => TB.cellValign(cellTarget(), 'bottom') })],
        [B({ ic: 'alignl', tip: 'tip.alignLeft', run: () => TB.cellAlign(cellTarget(), 'left') }), B({ ic: 'alignc', tip: 'tip.alignCenter', run: () => TB.cellAlign(cellTarget(), 'center') }), B({ ic: 'alignr', tip: 'tip.alignRight', run: () => TB.cellAlign(cellTarget(), 'right') })],
      ] },
        D_({ size: 'lg', ic: 'table', l: 'tbl.alignTable', tip: 'tbl.alignTable', menu: () => [
          { label: t('tip.alignLeft'), icon: 'alignl', run: () => withTable((x) => TB.alignTable(x, 'left')) },
          { label: t('tip.alignCenter'), icon: 'alignc', run: () => withTable((x) => TB.alignTable(x, 'center')) },
          { label: t('tip.alignRight'), icon: 'alignr', run: () => withTable((x) => TB.alignTable(x, 'right')) },
        ] }),
      ] },
    ],
  };

  const pictureTab = {
    id: 'picture', l: 'tab.picture', ctx: true,
    groups: [
      { l: 'g.size', launcher: () => D.openImageDialog(), items: [
        B({ size: 'lg', ic: 'edit', l: 'img.size', tip: 'img.title', run: () => D.openImageDialog() }),
        { k: 'stack', rows: [
          [B({ ic: 'plus', l: 'img.bigger', tip: 'img.bigger', showLabel: true, run: () => IM.scaleImage(1.1) })],
          [B({ ic: 'minus', l: 'img.smaller', tip: 'img.smaller', showLabel: true, run: () => IM.scaleImage(1 / 1.1) })],
          [B({ ic: 'recent', l: 'img.reset', tip: 'img.reset', showLabel: true, run: () => IM.resetImageSize() })],
        ] },
      ] },
      { l: 'g.arrange', items: [
        D_({ size: 'lg', ic: 'wrapinline', l: 'img.wrap', tip: 'img.wrap', menu: () => {
          const img = IM.selectedImage();
          const cur = (img && img.getAttribute('data-wrap')) || 'inline';
          return [
            { label: t('wrap.inline'), icon: 'wrapinline', checked: cur === 'inline', run: () => IM.setWrap('inline') },
            { label: t('wrap.left'), icon: 'wrapleft', checked: cur === 'left', run: () => IM.setWrap('left') },
            { label: t('wrap.right'), icon: 'wrapright', checked: cur === 'right', run: () => IM.setWrap('right') },
            { label: t('wrap.center'), icon: 'wrapcenter', checked: cur === 'center', run: () => IM.setWrap('center') },
          ];
        } }),
      ] },
      { l: 'g.rotate', items: [{ k: 'stack', rows: [
        [B({ ic: 'rotl', tip: 'img.rotL', run: () => IM.rotateImage(-90) }), B({ ic: 'rotr', tip: 'img.rotR', run: () => IM.rotateImage(90) })],
        [B({ ic: 'fliph', tip: 'img.flipH', run: () => IM.flipImage('h') }), B({ ic: 'flipv', tip: 'img.flipV', run: () => IM.flipImage('v') })],
      ] }] },
      { l: 'g.alt', items: [
        B({ size: 'lg', ic: 'alt', l: 'img.altText', tip: 'img.alt', run: () => D.openImageDialog() }),
        B({ size: 'lg', ic: 'trash', l: 'img.remove', tip: 'img.remove', run: () => IM.removeImage() }),
      ] },
    ],
  };

  return [
    { id: 'file', l: 'tab.file', file: true, open: openBackstage },
    home, insert, design, layout, references, review, view, tableTab, pictureTab,
  ];
}

void newDoc; void openDoc; void saveDoc; void printDoc;
