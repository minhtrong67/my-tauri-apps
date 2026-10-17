import { $, $$, esc, icon, hydrateIcons } from './util.js';
import { t, getPref, PALETTE_VI, getLang } from './i18n.js';
import * as theme from './theme.js';
import { PALETTE, PRESETS } from './theme.js';
import { closeDialog, wireDialog, thumb, translateDom } from './ui.js';
import { api } from './bridge.js';

const isLight = (hex) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (r * 299 + g * 587 + b * 114) / 1000 > 170; };

export function creditHTML() {
  return `<span class="credit"><span class="rowc"><span>${esc(t('made_by'))}</span><span class="chip-a">${icon('person')}minhtrong67</span></span><span class="rowc"><span>${esc(t('with_ai'))}</span><span class="chip-ai">${icon('sparkle')}Claude · Anthropic</span></span></span>`;
}

function seg(id, items, value) {
  return `<div class="seg" id="${id}"><span class="thumb"></span>${items.map(([v, ic, label]) => `<button data-v="${v}" class="${String(v) === String(value) ? 'on' : ''}">${ic ? icon(ic) : ''}<span class="lbl">${esc(label)}</span></button>`).join('')}</div>`;
}
const sw = (id, label, desc, on) => `<label class="row-sw"><span class="tx"><b>${esc(label)}</b><small>${esc(desc)}</small></span><span class="sw"><input type="checkbox" role="switch" id="${id}"${on ? ' checked' : ''}></span></label>`;

export async function openSettings(ctx) {
  const dlg = $('#sheet');
  wireDialog(dlg);
  const P = ctx.prefs, ts = theme.state;
  const winMode = await api.getWinMode().catch(() => 'remember');
  const names = getLang() === 'vi' ? PALETTE_VI : null;

  const section = (ic, title, inner) => `<section class="sx"><h4>${icon(ic)}<span>${esc(title)}</span></h4><div class="card">${inner}</div></section>`;
  const html = `
  <div class="sh-head"><h2>${icon('settings')}<span>${esc(t('settings'))}</span></h2><button class="ibtn" id="shAbout" data-tk="about">${icon('info')}</button><button class="ibtn" id="shClose" data-tk="close">${icon('close')}</button></div>
  <div class="sh-body">
    ${section('palette', t('s_appearance'), `
      <div class="grp-s"><h5>${esc(t('s_theme'))}</h5>${seg('segTheme', [['system', 'system', t('theme_system')], ['light', 'sun', t('theme_light')], ['dark', 'moon', t('theme_dark')]], ts.mode)}</div>
      <div class="grp-s"><h5>${esc(t('s_color'))}</h5>
        <div class="swatches" id="swatches">${PRESETS.map((p) => `<button class="swatch${ts.preset === p.id ? ' on' : ''}${isLight(p.seed) ? ' light-c' : ''}" style="--c:${p.seed}" data-preset="${p.id}" data-hex="${p.seed}" data-tip="${esc(t('preset_' + p.id))}">${icon('check')}</button>`).join('')}${PALETTE.map((c, i) => `<button class="swatch${!ts.preset && c.hex.toLowerCase() === ts.seed.toLowerCase() ? ' on' : ''}${isLight(c.hex) ? ' light-c' : ''}" style="--c:${c.hex}" data-hex="${c.hex}" data-tip="${esc(names ? names[i + 1] : c.name)}">${icon('check')}</button>`).join('')}</div>
        <div class="custom-c"><input type="color" id="cPick" value="${ts.seed}" aria-label="${esc(t('s_custom'))}"><label class="fb-field"><span class="ic">#</span><input id="cHex" maxlength="7" value="${ts.seed.toUpperCase()}" spellcheck="false" autocomplete="off"></label><small>${esc(t('s_custom'))}</small></div>
      </div>
      <div class="grp-s"><h5>${esc(t('s_contrast'))}</h5>${seg('segContrast', [[0, '', t('contrast_std')], [0.5, '', t('contrast_med')], [1, '', t('contrast_high')]], ts.contrast)}</div>`)}
    ${section('language', t('s_language'), `<div class="grp-s">${seg('segLang', [['auto', '', t('lang_auto')], ['en', '', 'English'], ['vi', '', 'Tiếng Việt']], getPref())}</div>`)}
    ${section('window', t('s_window'), `
      <label class="radio-row"><span class="tx"><b>${esc(t('win_remember'))}</b><small>${esc(t('win_remember_d'))}</small></span><span class="radio"><input type="radio" name="wm" value="remember"${winMode === 'remember' ? ' checked' : ''}></span></label>
      <label class="radio-row"><span class="tx"><b>${esc(t('win_max'))}</b><small>${esc(t('win_max_d'))}</small></span><span class="radio"><input type="radio" name="wm" value="maximized"${winMode === 'maximized' ? ' checked' : ''}></span></label>`)}
    ${section('tune', t('s_editor'), `
      ${sw('swWrap', t('opt_wrap'), t('opt_wrap_d'), P.wrap)}
      ${sw('swNums', t('opt_nums'), t('opt_nums_d'), P.lineNumbers)}
      ${sw('swSync', t('opt_sync'), t('opt_sync_d'), P.syncScroll)}
      ${sw('swAuto', t('opt_auto'), t('opt_auto_d'), P.autosave)}
      <div class="grp-s"><h5>${esc(t('opt_zoom'))}</h5><div class="slider-row"><input type="range" id="zRange" min="60" max="220" step="10" value="${P.zoom}"><output id="zOut">${P.zoom}%</output></div></div>`)}
  </div>
  <div class="sh-foot"><button class="btn outlined" id="shReset">${icon('restart')}${esc(t('reset'))}</button></div>`;

  dlg.className = 'dlg sheet';
  dlg.innerHTML = html;
  hydrateIcons(dlg); translateDom(dlg);
  $$('[data-tk]', dlg).forEach((e) => { e.dataset.tip = t(e.dataset.tk); });

  const pal = () => {};
  const origin = (e) => { const r = e.currentTarget.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const markSwatch = () => $$('.swatch', dlg).forEach((b) => b.classList.toggle('on', b.dataset.preset ? theme.state.preset === b.dataset.preset : !theme.state.preset && b.dataset.hex.toLowerCase() === theme.state.seed.toLowerCase()));
  const setSeed = (hex, o, preset = null) => { theme.set({ seed: hex, preset }, o); markSwatch(); $('#cPick', dlg).value = hex.toLowerCase(); $('#cHex', dlg).value = hex.toUpperCase(); pal(); ctx.themeChanged(); };

  const segClick = (id, fn) => {
    const s = $('#' + id, dlg);
    s.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-v]'); if (!b) return;
      $$('button', s).forEach((x) => x.classList.toggle('on', x === b)); thumb(s); fn(b.dataset.v, e);
    });
  };
  segClick('segTheme', (v, e) => { theme.set({ mode: v }, origin({ currentTarget: e.target.closest('button') })); api.setTheme(v); pal(); ctx.themeChanged(); });
  segClick('segContrast', (v, e) => { theme.set({ contrast: +v }, origin({ currentTarget: e.target.closest('button') })); pal(); });
  segClick('segLang', (v) => { ctx.set('lang', v); setTimeout(() => openSettings(ctx), 0); });

  $('#swatches', dlg).addEventListener('click', (e) => { const b = e.target.closest('.swatch'); if (b) setSeed(b.dataset.hex, origin({ currentTarget: b }), b.dataset.preset || null); });
  $('#cPick', dlg).addEventListener('input', (e) => { setSeed(e.target.value, null); });
  $('#cHex', dlg).addEventListener('input', (e) => {
    let v = e.target.value.trim(); if (v && v[0] !== '#') v = '#' + v;
    if (theme.isHex(v)) setSeed(v, null);
  });
  const bind = (id, key) => $('#' + id, dlg).addEventListener('change', (e) => ctx.set(key, e.target.checked));
  bind('swWrap', 'wrap'); bind('swNums', 'lineNumbers'); bind('swSync', 'syncScroll'); bind('swAuto', 'autosave');
  $('#zRange', dlg).addEventListener('input', (e) => { $('#zOut', dlg).textContent = e.target.value + '%'; ctx.set('zoom', +e.target.value); });
  $$('input[name=wm]', dlg).forEach((r) => r.addEventListener('change', () => api.setWinMode(r.value)));
  $('#shClose', dlg).onclick = () => closeDialog(dlg);
  $('#shReset', dlg).onclick = async () => { await ctx.reset(); closeDialog(dlg); };
  $('#shAbout', dlg).onclick = () => { closeDialog(dlg); setTimeout(ctx.about, 180); };

  if (!dlg.open) dlg.showModal();
  requestAnimationFrame(() => $$('.seg', dlg).forEach(thumb));
  ctx.onSettingsOpen && ctx.onSettingsOpen();
}
