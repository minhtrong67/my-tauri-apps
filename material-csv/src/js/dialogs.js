// Settings, shortcuts, command palette and column statistics dialogs.
import { app, cur, APP_VERSION, saveSettings, DEFAULTS, visCols } from './state.js';
import { CMD, label, keyOf, isEnabled, run } from './commands.js';
import { profileColumn } from './ops.js';
import { $, $$, esc, fmtNum, openDialog, closeDialog, makeDialog, toast } from './ui.js';
import { icon, hydrateIcons } from './icons.js';
import { t } from './i18n.js';
import { SEEDS, previewColor, resetWindowSize } from './theme.js';

/* ------------------------------ settings ------------------------------ */

const PAGES = [['appearance', 'palette'], ['general', 'globe'], ['files', 'file'], ['window', 'max'], ['about', 'info']];
let page = 'appearance';

const row = (ic, title, desc, ctl) =>
  `<div class="srow"><div class="si">${icon(ic)}</div><div class="st"><b>${esc(title)}</b>${desc ? `<span>${esc(desc)}</span>` : ''}</div><div class="sc">${ctl}</div></div>`;
const toggle = (key, on) => `<label class="sw"><input type="checkbox" data-set="${key}"${on ? ' checked' : ''}><span class="track"></span></label>`;
const segmented = (key, val, opts) => `<div class="seg" data-seg="${key}">${opts.map(([v, l, ic]) => `<button data-v="${v}" class="${val === v ? 'on' : ''}">${ic ? icon(ic) : ''}<span>${esc(l)}</span></button>`).join('')}</div>`;
const select = (key, val, opts) => `<select class="in" data-set="${key}">${opts.map(([v, l]) => `<option value="${v}"${val === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;

function pageHtml(p) {
  const s = app.settings;
  if (p === 'appearance') {
    const cur = s.accent.toLowerCase(), isSeed = SEEDS.some(([c]) => c.toLowerCase() === cur);
    const sw = SEEDS.map(([c, n]) => `<button class="swatch${c.toLowerCase() === cur ? ' on' : ''}" data-accent="${c}" style="--c:${previewColor(c)}" title="${n}">${icon('check')}</button>`).join('');
    return `<h3>${esc(t('set.appearance'))}</h3>` +
      row('sun', t('set.theme'), t('set.themeDesc'), segmented('theme', s.theme, [['system', t('theme.system'), 'monitor'], ['light', t('theme.light'), 'sun'], ['dark', t('theme.dark'), 'moon']])) +
      `<div class="srow col"><div class="si">${icon('palette')}</div><div class="st"><b>${esc(t('set.accent'))}</b><span>${esc(t('set.accentDesc'))}</span></div>` +
      `<div class="swatches">${sw}<label class="swatch custom${isSeed ? '' : ' on'}" title="${esc(t('set.custom'))}" style="--c:${previewColor(s.accent)}"><input type="color" id="customAccent" value="${s.accent}">${icon('plus')}</label>` +
      `<button class="btn" data-do="resetAccent">${esc(t('set.reset'))}</button></div></div>` +
      row('tune', t('set.contrast'), t('set.contrastDesc'), segmented('contrast', s.contrast, [['standard', t('contrast.standard')], ['medium', t('contrast.medium')], ['high', t('contrast.high')]])) +
      row('rows', t('set.density'), t('set.densityDesc'), segmented('density', s.density, [['compact', t('density.compact')], ['normal', t('density.normal')], ['comfy', t('density.comfy')]])) +
      row('sparkle', t('set.anim'), t('set.animDesc'), toggle('anim', s.anim)) +
      row('table', t('set.zebra'), t('set.zebraDesc'), toggle('zebra', s.zebra)) +
      row('cols', t('set.lines'), t('set.linesDesc'), toggle('gridLines', s.gridLines));
  }
  if (p === 'general') {
    return `<h3>${esc(t('set.general'))}</h3>` +
      row('globe', t('set.language'), t('set.languageDesc'), select('lang', s.lang, [['system', t('lang.system')], ['en', 'English'], ['vi', 'Tiếng Việt']])) +
      row('panel', t('set.details'), t('set.detailsDesc'), toggle('details', s.details)) +
      row('keyboard', t('app.shortcuts'), t('set.shortcutsDesc'), `<button class="btn" data-do="shortcuts">${esc(t('set.open'))}</button>`);
  }
  if (p === 'files') {
    return `<h3>${esc(t('set.files'))}</h3>` +
      row('file', t('set.quoteAll'), t('set.quoteAllDesc'), toggle('quoteAll', s.quoteAll)) +
      row('new', t('set.newBom'), t('set.newBomDesc'), toggle('newBom', s.newBom)) +
      row('list', t('set.newEol'), t('set.newEolDesc'), segmented('newEol', s.newEol, [['crlf', 'CRLF'], ['lf', 'LF']])) +
      row('folder', t('set.recent'), t('set.recentDesc', { n: s.recent.length }), `<button class="btn" data-do="clearRecent"${s.recent.length ? '' : ' disabled'}>${esc(t('set.clear'))}</button>`);
  }
  if (p === 'window') {
    const opt = (v, ic, ttl, desc) => `<button class="radio${s.windowMode === v ? ' on' : ''}" data-win="${v}"><span class="dot"></span><span class="si">${icon(ic)}</span><span class="st"><b>${esc(ttl)}</b><span>${esc(desc)}</span></span></button>`;
    return `<h3>${esc(t('set.window'))}</h3><p class="muted pad0">${esc(t('set.windowDesc'))}</p><div class="radios">` +
      opt('remember', 'restore', t('win.remember'), t('win.rememberDesc')) + opt('maximized', 'max', t('win.maximized'), t('win.maximizedDesc')) + '</div>' +
      row('restore', t('set.resetSize'), t('set.resetSizeDesc'), `<button class="btn" data-do="resetWindow">${esc(t('set.reset'))}</button>`);
  }
  return `<div class="about"><img src="assets/logo.svg" alt="" class="alogo"><h2>Material CSV</h2><p class="muted">${esc(t('about.version'))} ${esc(APP_VERSION)}</p>` +
    `<p class="adesc">${esc(t('about.desc'))}</p>` +
    `<div class="people"><div class="person author">${icon('sparkle')}<div><small>${esc(t('about.author'))}</small><b>minhtrong67</b></div></div>` +
    `<div class="person ai">${icon('heart')}<div><small>${esc(t('about.ai'))}</small><b>Claude <em>Anthropic</em></b></div></div></div>` +
    `<p class="muted small">${esc(t('about.license'))} · Tauri 2 · Material Design 3</p></div>`;
}

function renderSettings() {
  const dlg = $('#settings');
  dlg.innerHTML = `<div class="sx"><nav>${PAGES.map(([id, ic]) => `<button data-page="${id}" class="${id === page ? 'on' : ''}">${icon(ic)}<span>${esc(t('set.p.' + id))}</span></button>`).join('')}</nav>` +
    `<div class="spage${page === 'about' ? ' ab' : ''}">${pageHtml(page)}</div><button class="btn ic xbtn" data-do="close" title="${esc(t('close'))}">${icon('x')}</button></div>`;
}

export function initSettings() {
  const dlg = $('#settings');
  dlg.addEventListener('cancel', e => { e.preventDefault(); closeDialog(dlg); });
  dlg.addEventListener('mousedown', e => { if (e.target === dlg) closeDialog(dlg); });
  const apply = key => { saveSettings(); app.hooks.settingsChanged?.(key); };
  dlg.addEventListener('click', async e => {
    const nav = e.target.closest('[data-page]');
    if (nav) { page = nav.dataset.page; renderSettings(); return; }
    const sw = e.target.closest('.swatch[data-accent]');
    if (sw) { app.settings.accent = sw.dataset.accent; apply('accent'); renderSettings(); return; }
    const wm = e.target.closest('[data-win]');
    if (wm) { app.settings.windowMode = wm.dataset.win; apply('windowMode'); renderSettings(); return; }
    const seg = e.target.closest('[data-seg] button');
    if (seg) { const k = seg.parentElement.dataset.seg; app.settings[k] = seg.dataset.v; apply(k); renderSettings(); return; }
    const act = e.target.closest('[data-do]')?.dataset.do;
    if (!act) return;
    if (act === 'close') closeDialog(dlg);
    else if (act === 'resetAccent') { app.settings.accent = DEFAULTS.accent; apply('accent'); renderSettings(); }
    else if (act === 'clearRecent') { app.settings.recent = []; apply('recent'); renderSettings(); }
    else if (act === 'resetWindow') { await resetWindowSize(); toast(t('set.resetDone'), 'ok'); }
    else if (act === 'shortcuts') { closeDialog(dlg); setTimeout(openShortcuts, 150); }
  });
  dlg.addEventListener('change', e => {
    const k = e.target.dataset?.set;
    if (k) { app.settings[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; apply(k); if (k === 'lang') renderSettings(); return; }
    if (e.target.id === 'customAccent') { app.settings.accent = e.target.value; apply('accent'); renderSettings(); }
  });
  dlg.addEventListener('input', e => {
    if (e.target.id === 'customAccent') { app.settings.accent = e.target.value; app.hooks.settingsChanged?.('accent'); }
  });
}

export function openSettings(p) {
  if (p) page = p;
  renderSettings();
  openDialog($('#settings'));
}

/* ------------------------------ shortcuts ------------------------------ */

const GROUPS = [
  ['sc.file', ['file.new', 'file.open', 'file.save', 'file.saveAs', 'file.close', 'tab.next', 'tab.prev']],
  ['sc.edit', ['edit.undo', 'edit.redo', 'edit.cut', 'edit.copy', 'edit.paste', 'edit.clear', 'edit.edit', 'edit.fillDown', 'edit.fillRight', 'edit.selectAll']],
  ['sc.structure', ['rows.insertBelow', 'rows.delete', 'rows.duplicate', 'rows.moveUp', 'rows.moveDown', 'cols.moveLeft', 'cols.moveRight', 'cols.rename']],
  ['sc.data', ['data.find', 'data.replace', 'data.goto', 'data.filterRow']],
  ['sc.app', ['app.palette', 'app.settings', 'app.fullscreen', 'app.shortcuts', 'view.zoomIn', 'view.zoomOut', 'view.zoomReset', 'view.details']],
];
const NAV = [['Arrows', 'sc.move'], ['Shift + Arrows', 'sc.extend'], ['Ctrl + Arrows', 'sc.jump'], ['Enter / Tab', 'sc.confirm'], ['Esc', 'sc.cancel'], ['Alt + Enter', 'sc.newline'], ['Ctrl + Space / Shift + Space', 'sc.selcol']];

export function openShortcuts() {
  const kbd = k => {
    const parts = k.endsWith('++') ? [...k.slice(0, -2).split('+'), '+'] : k.split('+');
    return parts.map(x => `<kbd>${esc(x)}</kbd>`).join('<i>+</i>');
  };
  const html = `<h2>${esc(t('app.shortcuts'))}</h2><div class="scgrid">` +
    GROUPS.map(([g, ids]) => `<section><h4>${esc(t(g))}</h4>${ids.map(id => `<div class="scr"><span>${esc(label(id))}</span><span class="keys">${kbd(keyOf(id))}</span></div>`).join('')}</section>`).join('') +
    `<section><h4>${esc(t('sc.nav'))}</h4>${NAV.map(([k, l]) => `<div class="scr"><span>${esc(t(l))}</span><span class="keys">${k.split(' + ').map(x => `<kbd>${esc(x)}</kbd>`).join('<i>+</i>')}</span></div>`).join('')}</section></div>` +
    `<div class="dfoot"><button class="btn pri" data-id="ok">${esc(t('close'))}</button></div>`;
  const dlg = makeDialog(html, 'wide');
  dlg.addEventListener('click', e => { if (e.target.closest('[data-id]')) closeDialog(dlg); });
  openDialog(dlg);
}

/* ------------------------------ command palette ------------------------------ */

export function openPalette() {
  const dlg = $('#palette');
  const all = Object.keys(CMD).filter(id => !['tab.next', 'tab.prev', 'app.palette'].includes(id)).map(id => ({ id, text: label(id) }));
  let items = all, idx = 0;
  const draw = () => {
    $('#plist').innerHTML = items.length ? items.map((x, i) => `<button class="pi${i === idx ? ' on' : ''}${isEnabled(x.id) ? '' : ' dis'}" data-i="${i}">${icon(CMD[x.id].icon || 'command')}<span>${esc(x.text)}</span><kbd>${esc(keyOf(x.id))}</kbd></button>`).join('') : `<p class="muted pad">${esc(t('palette.none'))}</p>`;
    $('#plist .on')?.scrollIntoView({ block: 'nearest' });
  };
  dlg.innerHTML = `<div class="pbox">${icon('command')}<input id="pq" placeholder="${esc(t('palette.ph'))}" autocomplete="off" spellcheck="false"></div><div id="plist"></div>`;
  const go = i => { const x = items[i]; if (!x || !isEnabled(x.id)) return; closeDialog(dlg); setTimeout(() => run(x.id), 140); };
  const q = $('#pq');
  q.addEventListener('input', () => { const v = q.value.trim().toLowerCase(); items = all.filter(x => x.text.toLowerCase().includes(v) || x.id.toLowerCase().includes(v)); idx = 0; draw(); });
  q.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); idx = Math.min(items.length - 1, idx + 1); draw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(0, idx - 1); draw(); }
    else if (e.key === 'Enter') { e.preventDefault(); go(idx); }
  });
  $('#plist').addEventListener('click', e => { const b = e.target.closest('.pi'); if (b) go(+b.dataset.i); });
  dlg.onmousedown = e => { if (e.target === dlg) closeDialog(dlg); };
  dlg.oncancel = e => { e.preventDefault(); closeDialog(dlg); };
  draw();
  openDialog(dlg);
  q.focus();
}

/* ------------------------------ column statistics ------------------------------ */

export function openStats() {
  const d = cur();
  if (!d || d.sel.ar < 0) return;
  const c = visCols(d)[d.sel.fc], p = profileColumn(d, c);
  const stat = (l, v) => `<div class="stat"><small>${esc(l)}</small><b>${esc(v)}</b></div>`;
  const maxTop = p.top[0]?.[1] || 1;
  const html = `<h2>${esc(t('stats.title'))}: <span class="hl-name">${esc(p.name)}</span></h2><div class="stats">` +
    stat(t('stats.rows'), fmtNum(p.n)) + stat(t('stats.filled'), fmtNum(p.filled)) + stat(t('stats.empty'), fmtNum(p.empty)) + stat(t('stats.unique'), fmtNum(p.unique)) +
    (p.nums ? stat(t('min'), fmtNum(p.min)) + stat(t('max'), fmtNum(p.max)) + stat(t('avg'), fmtNum(p.avg)) + stat(t('sum'), fmtNum(p.sum)) : stat(t('stats.minLen'), fmtNum(p.minLen)) + stat(t('stats.maxLen'), fmtNum(p.maxLen))) +
    `</div><h4>${esc(t('stats.top'))}</h4><div class="tops">` +
    (p.top.map(([v, n]) => `<div class="top"><span class="tv" title="${esc(v)}">${esc(v)}</span><span class="bar"><i style="width:${Math.max(3, (n / maxTop) * 100)}%"></i></span><span class="tn">${fmtNum(n)}</span></div>`).join('') || `<p class="muted">${esc(t('details.empty'))}</p>`) +
    `</div><div class="dfoot"><button class="btn pri" data-id="ok">${esc(t('close'))}</button></div>`;
  const dlg = makeDialog(html, 'mid');
  dlg.addEventListener('click', e => { if (e.target.closest('[data-id]')) closeDialog(dlg); });
  openDialog(dlg);
}

export { hydrateIcons };
