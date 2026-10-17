// File (backstage) view: home, new from template, open, save as, print, info, settings, about.
import { $, el, esc, baseName, dirName } from './util.js';
import { icon } from './icons.js';
import { t, lang } from './i18n.js';
import { doc, bus, PAPERS } from './state.js';
import { settings, saveSettings } from './settings.js';
import { newDoc, openDoc, saveDoc, printDoc, exitApp, inTauri, docName } from './fileio.js';
import { templateList } from './templates.js';
import { countText } from './view.js';
import { openSettings, openAbout, openShortcuts } from './dialogs.js';
import { layout } from './paginate.js';

let open = false;
let panel = 'home';
const host = () => $('#backstage');

export const isBackstageOpen = () => open;

const NAV = [
  { id: 'home', ic: 'recent', l: 'bs.home' },
  { id: 'new', ic: 'new', l: 'file.new' },
  { id: 'open', ic: 'open', l: 'file.open' },
  { sep: true },
  { id: 'save', ic: 'save', l: 'file.save', act: true },
  { id: 'saveas', ic: 'saveas', l: 'file.saveAs' },
  { id: 'print', ic: 'print', l: 'file.print' },
  { id: 'info', ic: 'info', l: 'bs.info' },
  { sep: true },
  { id: 'settings', ic: 'gear', l: 'settings.title', act: true },
  { id: 'shortcuts', ic: 'keyboard', l: 'set.shortcuts', act: true },
  { id: 'about', ic: 'heart', l: 'bs.about', act: true },
  { sep: true },
  { id: 'exit', ic: 'close', l: 'file.exit', act: true },
];

export function openBackstage(p = 'home') {
  open = true;
  panel = p;
  const h = host();
  h.hidden = false;
  render();
  requestAnimationFrame(() => h.classList.add('show'));
}
export function closeBackstage() {
  if (!open) return;
  open = false;
  const h = host();
  h.classList.remove('show');
  setTimeout(() => { if (!open) h.hidden = true; }, 180);
  bus.emit('backstage-closed');
}

async function act(id) {
  if (id === 'save') { closeBackstage(); await saveDoc(false); return; }
  if (id === 'settings') { closeBackstage(); openSettings(); return; }
  if (id === 'shortcuts') { openShortcuts(); return; }
  if (id === 'about') { openAbout(); return; }
  if (id === 'exit') { closeBackstage(); exitApp(); return; }
}

function render() {
  const h = host();
  h.innerHTML = '';
  const nav = el('nav', { class: 'bs-nav' });
  const back = el('button', { class: 'bs-back', type: 'button', html: icon('left') + `<span>${esc(t('bs.back'))}</span>` });
  back.onclick = closeBackstage;
  nav.append(back);
  for (const n of NAV) {
    if (n.sep) { nav.append(el('i', { class: 'bs-sep' })); continue; }
    const b = el('button', { class: 'bs-item' + (!n.act && n.id === panel ? ' on' : ''), type: 'button', html: icon(n.ic) + `<span>${esc(t(n.l))}</span>` });
    b.onclick = () => { if (n.act) act(n.id); else { panel = n.id; render(); } };
    nav.append(b);
  }
  const body = el('section', { class: 'bs-body' });
  body.append(PANELS[panel] ? PANELS[panel]() : el('div'));
  h.append(nav, body);
}

/* ------------------------------ pieces ------------------------------ */
const recentList = () => {
  const list = settings.recent || [];
  const box = el('div', { class: 'bs-recent' });
  if (!inTauri) { box.append(el('p', { class: 'bs-empty', text: t('bs.recentWeb') })); return box; }
  if (!list.length) { box.append(el('p', { class: 'bs-empty', text: t('bs.noRecent') })); return box; }
  for (const r of list) {
    const b = el('button', { class: 'bs-doc', type: 'button', html: `<span class="bd-ic">${icon('new')}</span><span class="bd-t"><b>${esc(r.name)}</b><small>${esc(dirName(r.path))}</small></span><span class="bd-d">${esc(new Date(r.time).toLocaleDateString(lang()))}</span>` });
    b.onclick = () => { closeBackstage(); openDoc(r.path); };
    box.append(b);
  }
  return box;
};

const tplCards = (limit) => {
  const g = el('div', { class: 'tpl-grid' });
  const blank = el('button', { class: 'tpl', type: 'button', html: `<span class="tpl-sheet blank"><i>+</i></span><b>${esc(t('tpl.blank'))}</b>` });
  blank.onclick = async () => { if (await newDoc('')) closeBackstage(); };
  g.append(blank);
  const all = templateList(lang());
  for (const tp of limit ? all.slice(0, limit) : all) {
    const prev = document.createElement('div');
    prev.innerHTML = tp.html;
    const b = el('button', { class: 'tpl', type: 'button' });
    b.innerHTML = `<span class="tpl-sheet"><span class="tpl-in">${prev.innerHTML.replace(/<div data-toc[\s\S]*?<\/div>/, '')}</span></span><b>${esc(tp.name)}</b>`;
    b.onclick = async () => { if (await newDoc(tp.html)) closeBackstage(); };
    g.append(b);
  }
  return g;
};

const bigAction = (ic, title, desc, fn) => {
  const b = el('button', { class: 'bs-action', type: 'button', html: `<span class="ba-ic">${icon(ic)}</span><span class="ba-t"><b>${esc(title)}</b><small>${esc(desc)}</small></span>` });
  b.onclick = fn;
  return b;
};

const PANELS = {
  home() {
    const w = el('div', { class: 'bs-panel' });
    w.append(el('h1', { text: t('bs.welcome') }));
    w.append(el('h3', { class: 'bs-h', text: t('bs.startNew') }), tplCards(3));
    w.append(el('h3', { class: 'bs-h', text: t('bs.recent') }), recentList());
    return w;
  },
  new() {
    const w = el('div', { class: 'bs-panel' });
    w.append(el('h1', { text: t('file.new') }), tplCards());
    return w;
  },
  open() {
    const w = el('div', { class: 'bs-panel' });
    w.append(el('h1', { text: t('file.open') }),
      bigAction('open', t('bs.browse'), t('bs.browseD'), () => { closeBackstage(); openDoc(); }),
      el('h3', { class: 'bs-h', text: t('bs.recent') }), recentList());
    return w;
  },
  saveas() {
    const w = el('div', { class: 'bs-panel' });
    w.append(el('h1', { text: t('file.saveAs') }),
      bigAction('saveas', t('filter.docx'), t('bs.docxD'), () => { closeBackstage(); saveDoc(true, 'docx'); }),
      bigAction('window', t('filter.html'), t('bs.htmlD'), () => { closeBackstage(); saveDoc(true, 'html'); }),
      bigAction('new', t('filter.txt'), t('bs.txtD'), () => { closeBackstage(); saveDoc(true, 'txt'); }),
      bigAction('pdf', 'PDF', t('bs.pdfD'), () => { closeBackstage(); printDoc(); }));
    return w;
  },
  print() {
    const w = el('div', { class: 'bs-panel' });
    w.append(el('h1', { text: t('file.print') }),
      bigAction('print', t('bs.printNow'), t('bs.printD'), () => { closeBackstage(); printDoc(); }),
      el('p', { class: 'bs-note', text: t('toast.printHint') }));
    return w;
  },
  info() {
    const c = countText();
    const w = el('div', { class: 'bs-panel' });
    const dims = PAPERS[doc.page.size];
    const rows = [
      [t('info.name'), docName()],
      [t('info.location'), doc.path ? dirName(doc.path) : t('info.unsaved')],
      [t('info.file'), doc.path ? baseName(doc.path) : '—'],
      [t('info.author'), settings.author || '—'],
      [t('info.pages'), String(layout.count)],
      [t('wc.words'), c.words.toLocaleString(lang())],
      [t('wc.chars'), c.chars.toLocaleString(lang())],
      [t('info.paper'), `${doc.page.size}${dims ? '' : ''} · ${t('orient.' + doc.page.orientation)}`],
    ];
    w.append(el('h1', { text: t('bs.info') }), el('table', { class: 'kv info', html: rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('') }));
    return w;
  },
};

document.addEventListener('keydown', (e) => { if (open && e.key === 'Escape' && !document.querySelector('dialog[open]')) { e.preventDefault(); e.stopPropagation(); closeBackstage(); } }, true);
void saveSettings;
