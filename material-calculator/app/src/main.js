import './styles/tokens.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/calc.css';
import './styles/views.css';
import './styles/expressive.css';
import './fonts';
import { initAppearance } from './js/appearance';
import { initEnhancers } from './js/enhance';

import { settings } from './js/store.js';
import { initTheme } from './js/theme.js';
import { i18n, setLang, t } from './js/i18n.js';
import { icon } from './js/icons.js';
import { h, $, $$, animate, applyMotion, initRipple, copyText, esc } from './js/ui.js';
import { startWindow, setAlwaysOnTop, syncNativeTheme, isTauri } from './js/tauri.js';
import { createPanel } from './js/panel.js';
import { createCalculatorView, calc } from './js/views/calculator.js';
import { createProgrammerView, prog } from './js/views/programmer.js';
import { createConverterView } from './js/views/converter.js';
import { createDateView } from './js/views/date.js';
import { createSettingsView } from './js/views/settings.tsx';

const NAV = ['standard', 'scientific', 'programmer', 'converter', 'date'];
const FACTORIES = {
  standard: () => createCalculatorView('standard'),
  scientific: () => createCalculatorView('scientific'),
  programmer: createProgrammerView,
  converter: createConverterView,
  date: createDateView,
  settings: createSettingsView,
};
const PANEL_MODES = new Set(['standard', 'scientific', 'programmer', 'converter']);
const dockedMq = window.matchMedia('(min-width: 1100px)');

const root = $('#app');
let views = {}, cur = null, panel = null, stage, titleEl, prevMode = 'standard', overlayOpen = false;

const app = {
  mode: settings.get('mode'),
  setMode, closePanel, togglePanel,
  currentValue() { return cur?.mode === 'programmer' ? Number(prog.cur()) : calc.currentValue(); },
  insertNumber(n) { cur?.insertNumber?.(n); },
  openHistory(entry) { setMode(entry.mode); views[entry.mode]?.loadHistory?.(entry); closeOverlay(); },
  useResult(entry) {
    const target = entry.mode === 'programmer' ? 'programmer' : (cur.mode === 'standard' || cur.mode === 'scientific' ? cur.mode : entry.mode);
    setMode(target);
    views[target].insertResult?.(entry);
  },
};

const navBtn = (m, cls) => `<button class="nav-item ${cls}" data-nav="${m}" data-ripple aria-label="${esc(t('nav.' + m))}">
  <span class="nav-ind">${icon(m)}</span><span class="nav-label">${esc(t('nav.' + m))}</span></button>`;

function buildShell() {
  root.innerHTML = '';
  const shell = h(`
    <div class="shell">
      <nav class="rail" aria-label="Calculators">
        <div class="rail-items">${NAV.map((m) => navBtn(m, '')).join('')}</div>
        <div class="rail-end">${navBtn('settings', 'nav-settings')}</div>
      </nav>
      <div class="main">
        <header class="appbar">
          <h1 class="appbar-title"></h1>
          <div class="appbar-actions">
            <button class="icon-btn" data-act="theme" data-ripple></button>
            <button class="icon-btn" data-act="pin" data-ripple ${isTauri ? '' : 'hidden'}>${icon('pin')}</button>
            <button class="icon-btn" data-act="panel" data-ripple>${icon('history')}</button>
            <button class="icon-btn appbar-settings" data-nav="settings" data-ripple>${icon('settings')}</button>
          </div>
        </header>
        <div class="stage"></div>
      </div>
      <div class="panel-wrap"></div>
      <div class="scrim" data-act="scrim"></div>
      <nav class="bottom-nav" aria-label="Calculators">${NAV.map((m) => navBtn(m, '')).join('')}</nav>
    </div>`);
  root.appendChild(shell);
  stage = $('.stage', shell); titleEl = $('.appbar-title', shell);
  panel = createPanel(app);
  $('.panel-wrap', shell).appendChild(panel.el);
  new ResizeObserver(() => { cancelAnimationFrame(app._r); app._r = requestAnimationFrame(() => cur?.refresh?.()); }).observe(stage);
  syncChrome();
}

function ensureView(mode) {
  if (!views[mode]) { views[mode] = FACTORIES[mode](); views[mode].el.hidden = true; stage.appendChild(views[mode].el); }
  return views[mode];
}

function setMode(mode, instant = false) {
  if (mode === cur?.mode) return;
  const next = ensureView(mode);
  if (cur) { cur.el.hidden = true; if (cur.mode !== 'settings') prevMode = cur.mode; }
  cur = next; app.mode = mode;
  if (mode !== 'settings') settings.set('mode', mode);
  next.el.hidden = false;
  next.onShow?.();
  if (!instant) animate(next.el, [{ opacity: 0, transform: 'translateY(14px) scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: 300 });
  syncChrome();
  panel.render();
  document.activeElement?.blur?.();
}

function hasPanel() { return PANEL_MODES.has(app.mode); }
function syncChrome() {
  const m = app.mode;
  $$('[data-nav]', root).forEach((b) => { const on = b.dataset.nav === m; b.classList.toggle('active', on); b.setAttribute('aria-current', on ? 'page' : 'false'); });
  titleEl.textContent = t(m === 'settings' ? 'set.title' : 'nav.' + m);
  const docked = dockedMq.matches;
  const shell = $('.shell', root);
  shell.classList.toggle('has-panel', hasPanel());
  shell.classList.toggle('panel-docked', hasPanel() && docked && settings.get('panelOpen'));
  shell.classList.toggle('panel-overlay', hasPanel() && !docked && overlayOpen);
  const panelBtn = $('[data-act="panel"]', root);
  panelBtn.hidden = !hasPanel();
  panelBtn.setAttribute('aria-label', t('panel.toggle')); panelBtn.title = t('panel.toggle');
  panelBtn.setAttribute('aria-pressed', String(docked ? settings.get('panelOpen') : overlayOpen));
  const th = settings.get('theme');
  const themeBtn = $('[data-act="theme"]', root);
  themeBtn.innerHTML = icon(th === 'light' ? 'sun' : th === 'dark' ? 'moon' : 'auto');
  themeBtn.setAttribute('aria-label', t('theme.toggle')); themeBtn.title = t('theme.toggle');
  const pin = $('[data-act="pin"]', root);
  pin.classList.toggle('on', settings.get('alwaysOnTop'));
  pin.setAttribute('aria-label', t('set.onTop')); pin.title = t('set.onTop');
}

function togglePanel() {
  if (!hasPanel()) return;
  if (dockedMq.matches) settings.set('panelOpen', !settings.get('panelOpen'));
  else overlayOpen = !overlayOpen;
  syncChrome();
  requestAnimationFrame(() => cur?.refresh?.());
}
function closeOverlay() { if (overlayOpen) { overlayOpen = false; syncChrome(); } }
function closePanel() { if (dockedMq.matches) settings.set('panelOpen', false); else overlayOpen = false; syncChrome(); }
dockedMq.addEventListener('change', () => { overlayOpen = false; syncChrome(); cur?.refresh?.(); });

function rebuild() {
  const mode = app.mode;
  Object.values(views).forEach((v) => v.destroy?.());
  panel?.destroy();
  views = {}; cur = null;
  buildShell();
  setMode(mode, true);
}

// ---- global events --------------------------------------------------------
root.addEventListener('click', (e) => {
  const nav = e.target.closest('[data-nav]');
  if (nav) {
    const m = nav.dataset.nav;
    setMode(m === 'settings' && app.mode === 'settings' ? prevMode : m);
    return;
  }
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'theme') settings.set('theme', { light: 'dark', dark: 'system', system: 'light' }[settings.get('theme')]);
  else if (act === 'pin') settings.set('alwaysOnTop', !settings.get('alwaysOnTop'));
  else if (act === 'panel') togglePanel();
  else if (act === 'scrim') closeOverlay();
});
// keep keys from stealing focus so Enter / Space stay available for the keyboard handler
root.addEventListener('mousedown', (e) => { if (e.target.closest('.key, .mem-btn, .bit, .hist-item, .conv-row')) e.preventDefault(); });

const isField = (el) => el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
window.addEventListener('keydown', (e) => {
  if (e.defaultPrevented) return;
  if ((e.ctrlKey || e.metaKey) && !e.altKey) {
    const k = e.key.toLowerCase();
    if (k >= '1' && k <= '5') { e.preventDefault(); setMode(NAV[+k - 1]); return; }
    if (k === 'h') { e.preventDefault(); togglePanel(); return; }
    if (k === ',') { e.preventDefault(); setMode(app.mode === 'settings' ? prevMode : 'settings'); return; }
    if (k === 'c' && !isField(e.target) && !String(getSelection())) { e.preventDefault(); cur?.copy?.(); return; }
    return;
  }
  if (e.key === 'Escape' && overlayOpen) { closeOverlay(); return; }
  if (isField(e.target)) return;
  if (cur?.onKey?.(e)) e.preventDefault();
});
window.addEventListener('paste', (e) => {
  if (isField(e.target)) return;
  const text = e.clipboardData?.getData('text');
  if (text) { e.preventDefault(); cur?.onPaste?.(text); }
});
window.addEventListener('contextmenu', (e) => { if (!isField(e.target) && !import.meta.env.DEV) e.preventDefault(); });

settings.on('lang', () => setLang());
i18n.on('change', () => { if (root.firstChild) rebuild(); });
settings.on('theme', () => { syncChrome(); syncNativeTheme(); });
settings.on('alwaysOnTop', (v) => { syncChrome(); setAlwaysOnTop(v); });
settings.on('panelOpen', () => requestAnimationFrame(() => cur?.refresh?.()));

// ---- boot -----------------------------------------------------------------
applyMotion();
initTheme();
initAppearance();
initEnhancers();
initRipple();
setLang();      // emits "change" but the shell does not exist yet
buildShell();
setMode(settings.get('mode') === 'settings' ? 'standard' : settings.get('mode'), true);
startWindow();
