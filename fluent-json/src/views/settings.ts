import { MATERIALS, PALETTE, settings, update, resetSettings, type Material, type Settings } from '../settings';
import { applyTheme, hasNativeMaterial, syncMaterial, systemAccentHex } from '../theme';
import { setLang, t } from '../i18n';
import { bus } from '../bus';
import { icon } from '../icons';
import { currentView } from '../nav';
import { captureWindow, isTauri } from '../tauri';
import { esc, h, toast } from '../ui';

let el: HTMLElement;
const FONTS: [Settings['font'], string, string][] = [
  ['system', 'System', 'var(--font)'], ['segoe-ui', 'Segoe UI', "'Segoe UI', sans-serif"], ['inter', 'Inter', "'Inter Variable', sans-serif"],
  ['roboto', 'Roboto', "'Roboto', sans-serif"], ['be-vietnam-pro', 'Be Vietnam Pro', "'Be Vietnam Pro', sans-serif"], ['arial', 'Arial', 'Arial, Helvetica, sans-serif'],
];
const MAT_LABEL: Record<Material, [Parameters<typeof t>[0], Parameters<typeof t>[0]]> = { mica: ['set.mica', 'set.micaD'], 'mica-alt': ['set.micaAlt', 'set.micaAltD'], acrylic: ['set.acrylic', 'set.acrylicD'] };
const CODE_FONTS: [Settings['codeFont'], string, string][] = [
  ['default', '', 'var(--mono-default)'], ['jetbrains-mono', 'JetBrains Mono', "'JetBrains Mono Variable', monospace"], ['fira-code', 'Fira Code', "'Fira Code Variable', monospace"],
  ['cascadia-code', 'Cascadia Code', "'Cascadia Code Variable', monospace"], ['source-code-pro', 'Source Code Pro', "'Source Code Pro Variable', monospace"],
  ['roboto-mono', 'Roboto Mono', "'Roboto Mono Variable', monospace"], ['ibm-plex-mono', 'IBM Plex Mono', "'IBM Plex Mono', monospace"], ['consolas', 'Consolas', "Consolas, 'Courier New', monospace"],
];
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
  bus.on('settings', (keys: string[]) => { if (currentView() !== 'settings') return; if (keys.length > 6) render(); else sync(); });
}

const seg = (name: string, cur: unknown, items: [unknown, string, string?][]) => `<div class="seg" role="radiogroup" data-seg="${name}">${items.map(([v, l, ic]) =>
  `<button role="radio" data-v="${String(v)}" aria-pressed="${cur === v}" aria-checked="${cur === v}">${ic ? icon(ic as Parameters<typeof icon>[0]) : ''}<span>${esc(l)}</span></button>`).join('')}</div>`;
const sw = (id: string, on: boolean) => `<span class="switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><i></i></span>`;
const row = (ic: Parameters<typeof icon>[0] | '', title: string, desc: string, ctl: string, cls = '') => `<div class="set-row${cls ? ' ' + cls : ''}"><div class="set-head">${ic ? icon(ic) : ''}<div class="set-text"><strong>${esc(title)}</strong>${desc ? `<span>${esc(desc)}</span>` : ''}</div></div><div class="set-ctl">${ctl}</div></div>`;
const colRow = (ic: Parameters<typeof icon>[0], title: string, desc: string, body: string, cls = '') => `<div class="set-row col${cls ? ' ' + cls : ''}"><div class="set-head">${icon(ic)}<div class="set-text"><strong>${esc(title)}</strong>${desc ? `<span>${esc(desc)}</span>` : ''}</div></div>${body}</div>`;
const section = (title: string, body: string) => `<section class="set-section"><h2>${esc(title)}</h2>${body}</section>`;

function render() {
  const scroll = el.scrollTop;
  const custom = !settings.systemAccent && !PALETTE.some((p) => p.hex.toLowerCase() === settings.color.toLowerCase());
  const winDisabled = !isTauri;
  const sysHex = systemAccentHex();
  el.innerHTML = `
  <div class="page">
    <h1 class="page-title">${esc(t('set.title'))}</h1>

    ${section(t('set.appearance'), `
      ${row('palette', t('set.theme'), t('set.themeDesc'), seg('theme', settings.theme, [['light', t('set.light'), 'sun'], ['dark', t('set.dark'), 'moon'], ['system', t('set.system'), 'monitor']]))}
      ${colRow('blend', t('set.material'), winDisabled ? t('set.materialOnly') : t('set.materialDesc'), `<div class="radio-cards" role="radiogroup">${MATERIALS.map((m) => `
        <button class="radio-card" role="radio" data-material="${m}" aria-checked="${settings.material === m}" ${winDisabled ? 'disabled' : ''}>
          <span class="mat-prev" data-m="${m}"><i></i></span><strong>${esc(t(MAT_LABEL[m][0]))}</strong><span>${esc(t(MAT_LABEL[m][1]))}</span></button>`).join('')}</div>`, winDisabled ? 'dim' : '')}
      ${colRow('palette', t('set.color'), '', `<div class="swatches" role="radiogroup">
          ${sysHex ? `<button class="swatch system" role="radio" aria-checked="${settings.systemAccent}" style="--c:${sysHex}" data-system="1" title="${esc(t('set.accentSystem'))}" aria-label="${esc(t('set.accentSystem'))}">${icon('check')}</button>` : ''}
          ${PALETTE.map((p) => `<button class="swatch" role="radio" aria-checked="${!(sysHex && settings.systemAccent) && p.hex.toLowerCase() === settings.color.toLowerCase()}" style="--c:${p.hex}" data-color="${p.hex}" title="${p.name}" aria-label="${p.name}">${icon('check')}</button>`).join('')}
          <label class="swatch custom" aria-checked="${custom}" role="radio" title="${esc(t('set.custom'))}" style="--c:${custom ? settings.color : 'transparent'}">${custom ? icon('check') : icon('plus')}<input type="color" id="set-color" value="${custom ? settings.color : '#0078d4'}"></label>
        </div>`)}
      ${colRow('type', t('set.font'), '', `<div class="fonts" role="radiogroup">${FONTS.map(([id, name, fam]) => `<button class="font-card" role="radio" data-font="${id}" aria-checked="${settings.font === id}" style="font-family:${fam}"><span class="aa">Aa</span><span class="fn">${esc(id === 'system' ? t('set.fontSystem') : name)}</span></button>`).join('')}</div>`)}
      ${row('text', t('set.fontSize'), '', seg('fontSize', settings.fontSize, [['small', t('set.small')], ['medium', t('set.medium')], ['large', t('set.large')]]))}
      ${row('language', t('set.language'), '', seg('lang', settings.lang, [['auto', t('set.auto')], ['en', 'English'], ['vi', 'Tiếng Việt']]))}
      ${row('sparkles', t('set.motion'), t('set.motionDesc'), `<span class="on-off" id="set-motion-l">${esc(settings.motion ? t('set.on') : t('set.off'))}</span>${sw('set-motion', settings.motion)}`)}
    `)}

    ${section(t('set.window'), colRow('window', t('set.windowOpen'), winDisabled ? t('set.desktopOnly') : '', `<div class="radio-cards" role="radiogroup">
        <button class="radio-card" role="radio" data-win="remember" aria-checked="${settings.windowMode === 'remember'}" ${winDisabled ? 'disabled' : ''}>
          ${icon('window')}<strong>${esc(t('set.remember'))}</strong><span>${esc(t('set.rememberDesc'))}</span></button>
        <button class="radio-card" role="radio" data-win="maximized" aria-checked="${settings.windowMode === 'maximized'}" ${winDisabled ? 'disabled' : ''}>
          ${icon('expand')}<strong>${esc(t('set.maximized'))}</strong><span>${esc(t('set.maximizedDesc'))}</span></button>
      </div>`, winDisabled ? 'dim' : ''))}

    ${section(t('set.editor'), `
      ${colRow('code', t('set.codeFont'), t('set.codeFontDesc'), `<div class="fonts code-fonts" role="radiogroup">${CODE_FONTS.map(([id, name, fam]) => `<button class="font-card" role="radio" data-code="${id}" aria-checked="${settings.codeFont === id}" style="font-family:${fam}"><span class="aa">{ }</span><span class="fn">${esc(id === 'default' ? t('set.codeDefault') : name)}</span></button>`).join('')}</div>`)}
      ${row('braces', t('set.indent'), '', seg('indent', settings.indent, [[2, t('set.spaces', { n: 2 })], [4, t('set.spaces', { n: 4 })], ['tab', t('set.tab')]]))}
      ${row('wrap', t('set.wrap'), t('set.wrapDesc'), sw('set-wrap', settings.wrap))}
      ${row('history', t('set.restore'), t('set.restoreDesc'), sw('set-restore', settings.restore))}
    `)}

    ${section(t('set.shortcuts'), `<div class="set-row col"><div class="keys">${SHORTCUTS.map(([k, v]) => `<div><span>${esc(t(k))}</span><span>${v.split('+').map((x) => `<kbd>${esc(x.trim())}</kbd>`).join('')}</span></div>`).join('')}</div></div>`)}

    ${section(t('set.about'), `<div class="set-row col about">
      <div class="about-head"><img src="/icon.png" alt=""><div><h2>${esc(t('appName'))}</h2><span class="muted">${esc(t('set.version', { v: __APP_VERSION__ }))}</span></div>
        <button class="btn" id="set-reset">${icon('reset')}${esc(t('set.reset'))}</button></div>
      <p>${esc(t('set.aboutDesc'))}</p>
      <div class="credits">
        <div>${icon('license')}<span>${esc(t('set.license'))}</span></div>
        <div>${icon('heart')}<span>${esc(t('set.author'))}: <strong>minhtrong67</strong> · ${esc(t('set.madeWith'))} <strong>Claude</strong></span></div>
      </div></div>`)}
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
  const cf = tg.closest<HTMLElement>('.font-card[data-code]');
  if (cf) { update({ codeFont: cf.dataset.code as Settings['codeFont'] }); applyTheme(); return; }
  const fc = tg.closest<HTMLElement>('.font-card[data-font]'); // not '[data-font]': <html data-font> would match every click
  if (fc) { update({ font: fc.dataset.font as Settings['font'] }); applyTheme(); return; }
  const sysSw = tg.closest<HTMLElement>('.swatch[data-system]');
  if (sysSw) { update({ systemAccent: true }); applyTheme(origin(e)); return; }
  const sw = tg.closest<HTMLElement>('.swatch[data-color]');
  if (sw) { update({ color: sw.dataset.color!, systemAccent: false }); applyTheme(origin(e)); return; }
  const mat = tg.closest<HTMLElement>('.radio-card[data-material]');
  if (mat && !mat.hasAttribute('disabled')) { void chooseMaterial(mat.dataset.material as Material); return; }
  const win = tg.closest<HTMLElement>('.radio-card[data-win]');
  if (win) {
    update({ windowMode: win.dataset.win as Settings['windowMode'] });
    if (settings.windowMode === 'remember') captureWindow();
    return;
  }
  if (tg.closest('#set-reset')) { resetSettings(); applyTheme(); setLang(settings.lang); toast(t('set.resetDone'), 'success'); }
}

/** Switch the window material and report if Windows can't show it. */
export async function chooseMaterial(m: Material, silent = false) {
  update({ material: m });
  applyTheme();
  const ok = await syncMaterial(true);
  if (silent) return;
  if (ok || hasNativeMaterial()) toast(t('toast.materialOn', { name: t(MAT_LABEL[m][0]) }), 'success');
  else toast(t('toast.materialFail'), 'warning');
}

function onChange(e: Event) {
  const i = e.target as HTMLInputElement;
  if (i.id === 'set-color') { update({ color: i.value, systemAccent: false }); applyTheme(); }
  else if (i.id === 'set-motion') { update({ motion: i.checked }); applyTheme(); }
  else if (i.id === 'set-wrap') update({ wrap: i.checked });
  else if (i.id === 'set-restore') update({ restore: i.checked });
}

/** Reflect the current settings on the existing controls — no re-render, so nothing flashes or jumps. */
function sync() {
  const on = (b: Element, v: boolean) => { b.setAttribute('aria-checked', String(v)); if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', String(v)); };
  el.querySelectorAll<HTMLElement>('[data-seg]').forEach((g) => {
    const cur = String(settings[g.dataset.seg as keyof Settings]);
    g.querySelectorAll<HTMLElement>('button').forEach((b) => on(b, b.dataset.v === cur));
  });
  el.querySelectorAll<HTMLElement>('.swatch[data-color]').forEach((b) => on(b, !(systemAccentHex() && settings.systemAccent) && b.dataset.color!.toLowerCase() === settings.color.toLowerCase()));
  el.querySelectorAll<HTMLElement>('.swatch[data-system]').forEach((b) => on(b, settings.systemAccent));
  el.querySelectorAll<HTMLElement>('.radio-card[data-material]').forEach((b) => on(b, b.dataset.material === settings.material));
  const ml = el.querySelector('#set-motion-l'); if (ml) ml.textContent = settings.motion ? t('set.on') : t('set.off');
  el.querySelectorAll<HTMLElement>('.font-card[data-font]').forEach((b) => on(b, b.dataset.font === settings.font));
  el.querySelectorAll<HTMLElement>('.font-card[data-code]').forEach((b) => on(b, b.dataset.code === settings.codeFont));
  el.querySelectorAll<HTMLElement>('.radio-card[data-win]').forEach((b) => on(b, b.dataset.win === settings.windowMode));
  const sw: [string, boolean][] = [['set-motion', settings.motion], ['set-wrap', settings.wrap], ['set-restore', settings.restore]];
  for (const [id, v] of sw) { const i = el.querySelector<HTMLInputElement>('#' + id); if (i && i.checked !== v) i.checked = v; }
  const custom = !settings.systemAccent && !PALETTE.some((p) => p.hex.toLowerCase() === settings.color.toLowerCase());
  const lab = el.querySelector<HTMLElement>('.swatch.custom');
  if (lab) {
    on(lab, custom);
    lab.style.setProperty('--c', custom ? settings.color : 'transparent');
    const want = custom ? 'check' : 'plus';
    if (lab.dataset.ic !== want) { lab.dataset.ic = want; lab.querySelector('svg')?.replaceWith(h(icon(want))); }
    const inp = lab.querySelector<HTMLInputElement>('input');
    if (inp && custom && inp.value.toLowerCase() !== settings.color.toLowerCase()) inp.value = settings.color;
  }
}
