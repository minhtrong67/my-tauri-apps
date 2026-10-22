import { PALETTE, settings, update, resetSettings, type Settings } from '../settings';
import { applyTheme } from '../theme';
import { setLang, t } from '../i18n';
import { bus } from '../bus';
import { icon } from '../icons';
import { currentView } from '../nav';
import { captureWindow, isTauri } from '../tauri';
import { esc, toast } from '../ui';

let el: HTMLElement;
const SHORTCUTS: [Parameters<typeof t>[0], string][] = [
  ['sc.k.new', 'Ctrl+N'], ['sc.k.open', 'Ctrl+O'], ['sc.k.save', 'Ctrl+S'], ['sc.k.saveAs', 'Ctrl+Shift+S'], ['sc.k.close', 'Ctrl+W'],
  ['sc.k.next', 'Ctrl+Tab'], ['sc.k.format', 'Alt+Shift+F'], ['sc.k.minify', 'Alt+Shift+M'], ['sc.k.find', 'Ctrl+F'],
  ['sc.k.palette', 'Ctrl+1 … 5'], ['sc.k.settings', 'Ctrl+,'],
];

export function mountSettings(host: HTMLElement) {
  el = host;
  el.addEventListener('click', onClick);
  el.addEventListener('change', onChange);
  bus.on('view', () => { if (currentView() === 'settings') render(); });
  bus.on('lang', () => { if (currentView() === 'settings') render(); });
  bus.on('settings', () => { if (currentView() === 'settings') render(); });
}

const seg = (name: string, cur: unknown, items: [unknown, string, string?][]) => `<div class="seg" role="radiogroup" data-seg="${name}">${items.map(([v, l, ic]) =>
  `<button role="radio" data-v="${String(v)}" aria-pressed="${cur === v}" aria-checked="${cur === v}">${ic ? icon(ic as Parameters<typeof icon>[0]) : ''}<span>${esc(l)}</span></button>`).join('')}</div>`;
const sw = (id: string, on: boolean) => `<span class="switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><i></i></span>`;
const row = (title: string, desc: string, ctl: string) => `<div class="set-row"><div class="set-text"><strong>${esc(title)}</strong>${desc ? `<span>${esc(desc)}</span>` : ''}</div><div class="set-ctl">${ctl}</div></div>`;

function render() {
  const scroll = el.scrollTop;
  const custom = !PALETTE.some((p) => p.hex.toLowerCase() === settings.color.toLowerCase());
  const winDisabled = !isTauri;
  el.innerHTML = `
  <div class="page">
    <h1 class="page-title">${esc(t('set.title'))}</h1>

    <section class="card">
      <h2 class="card-title">${icon('palette')}${esc(t('set.appearance'))}</h2>
      ${row(t('set.theme'), '', seg('theme', settings.theme, [['light', t('set.light'), 'sun'], ['dark', t('set.dark'), 'moon'], ['system', t('set.system'), 'monitor']]))}
      <div class="set-row col"><div class="set-text"><strong>${esc(t('set.color'))}</strong></div>
        <div class="swatches" role="radiogroup">${PALETTE.map((p) => `<button class="swatch" role="radio" aria-checked="${p.hex.toLowerCase() === settings.color.toLowerCase()}" style="--c:${p.hex}" data-color="${p.hex}" title="${p.name}" aria-label="${p.name}">${icon('check')}</button>`).join('')}
          <label class="swatch custom" aria-checked="${custom}" role="radio" title="${esc(t('set.custom'))}" style="--c:${custom ? settings.color : 'transparent'}">${custom ? icon('check') : icon('plus')}<input type="color" id="set-color" value="${custom ? settings.color : '#6750a4'}"></label>
        </div></div>
      ${row(t('set.fontSize'), '', seg('fontSize', settings.fontSize, [['small', t('set.small')], ['medium', t('set.medium')], ['large', t('set.large')]]))}
      ${row(t('set.language'), '', seg('lang', settings.lang, [['auto', t('set.auto')], ['en', 'English'], ['vi', 'Tiếng Việt']]))}
      ${row(t('set.motion'), t('set.motionDesc'), sw('set-motion', settings.motion))}
    </section>

    <section class="card${winDisabled ? ' dim' : ''}">
      <h2 class="card-title">${icon('window')}${esc(t('set.window'))}</h2>
      <div class="set-text pad"><strong>${esc(t('set.windowOpen'))}</strong>${winDisabled ? `<span>${esc(t('set.desktopOnly'))}</span>` : ''}</div>
      <div class="radio-cards" role="radiogroup">
        <button class="radio-card" role="radio" data-win="remember" aria-checked="${settings.windowMode === 'remember'}" ${winDisabled ? 'disabled' : ''}>
          ${icon('window')}<strong>${esc(t('set.remember'))}</strong><span>${esc(t('set.rememberDesc'))}</span></button>
        <button class="radio-card" role="radio" data-win="maximized" aria-checked="${settings.windowMode === 'maximized'}" ${winDisabled ? 'disabled' : ''}>
          ${icon('expand')}<strong>${esc(t('set.maximized'))}</strong><span>${esc(t('set.maximizedDesc'))}</span></button>
      </div>
    </section>

    <section class="card">
      <h2 class="card-title">${icon('code')}${esc(t('set.editor'))}</h2>
      ${row(t('set.indent'), '', seg('indent', settings.indent, [[2, t('set.spaces', { n: 2 })], [4, t('set.spaces', { n: 4 })], ['tab', t('set.tab')]]))}
      ${row(t('set.wrap'), t('set.wrapDesc'), sw('set-wrap', settings.wrap))}
      ${row(t('set.restore'), t('set.restoreDesc'), sw('set-restore', settings.restore))}
    </section>

    <section class="card">
      <h2 class="card-title">${icon('keyboard')}${esc(t('set.shortcuts'))}</h2>
      <div class="keys">${SHORTCUTS.map(([k, v]) => `<div><span>${esc(t(k))}</span><span>${v.split('+').map((x) => `<kbd>${esc(x.trim())}</kbd>`).join('')}</span></div>`).join('')}</div>
    </section>

    <section class="card about">
      <div class="about-head"><img src="/icon.png" alt=""><div><h2>${esc(t('appName'))}</h2><span class="muted">${esc(t('set.version', { v: __APP_VERSION__ }))}</span></div>
        <button class="btn outlined" id="set-reset">${icon('reset')}${esc(t('set.reset'))}</button></div>
      <p>${esc(t('set.aboutDesc'))}</p>
      <div class="credits">
        <div>${icon('license')}<span>${esc(t('set.license'))}</span></div>
        <div>${icon('heart')}<span>${esc(t('set.author'))}: <strong>minhtrong67</strong> · ${esc(t('set.madeWith'))} <strong>Claude</strong></span></div>
      </div>
    </section>
  </div>`;
  el.scrollTop = scroll;
}

function origin(e: Event) {
  const r = (e.target as HTMLElement).getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function onClick(e: Event) {
  const tg = e.target as HTMLElement;
  const segBtn = tg.closest<HTMLElement>('[data-seg] button');
  if (segBtn) {
    const name = (segBtn.parentElement as HTMLElement).dataset.seg as keyof Settings;
    let v: unknown = segBtn.dataset.v;
    if (name === 'indent' && v !== 'tab') v = Number(v);
    update({ [name]: v } as Partial<Settings>);
    if (name === 'theme' || name === 'fontSize') applyTheme(name === 'theme' ? origin(e) : undefined);
    if (name === 'lang') setLang(v as Settings['lang']);
    return;
  }
  const sw = tg.closest<HTMLElement>('.swatch[data-color]');
  if (sw) { update({ color: sw.dataset.color! }); applyTheme(origin(e)); return; }
  const win = tg.closest<HTMLElement>('[data-win]');
  if (win) {
    update({ windowMode: win.dataset.win as Settings['windowMode'] });
    if (settings.windowMode === 'remember') captureWindow();
    return;
  }
  if (tg.closest('#set-reset')) { resetSettings(); applyTheme(); setLang(settings.lang); toast(t('set.resetDone'), 'success'); }
}

function onChange(e: Event) {
  const i = e.target as HTMLInputElement;
  if (i.id === 'set-color') { update({ color: i.value }); applyTheme(); }
  else if (i.id === 'set-motion') { update({ motion: i.checked }); applyTheme(); }
  else if (i.id === 'set-wrap') update({ wrap: i.checked });
  else if (i.id === 'set-restore') update({ restore: i.checked });
}
