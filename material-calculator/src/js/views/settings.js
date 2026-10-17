// Settings view: appearance, language, window, calculator, data, about.
import pkg from '../../../package.json';
import { settings } from '../store.js';
import { t } from '../i18n.js';
import { SEEDS } from '../theme.js';
import { history, memory } from '../history.js';
import { icon } from '../icons.js';
import { h, $, $$, esc, toast } from '../ui.js';
import { isTauri } from '../tauri.js';

const seg = (key, items) => `<div class="segmented" role="radiogroup">${items.map(([v, label, ic]) =>
  `<button role="radio" data-set="${key}" data-value="${v}" data-ripple>${ic ? icon(ic) : ''}<span>${esc(label)}</span></button>`).join('')}</div>`;
const sw = (key, title, desc) => `
  <div class="row"><div class="row-text"><div class="row-title">${esc(title)}</div><div class="row-desc">${esc(desc)}</div></div>
  <button class="switch" role="switch" data-toggle="${key}" data-ripple aria-label="${esc(title)}"><span class="thumb"></span></button></div>`;
const radio = (key, value, title, desc) => `
  <button class="radio-row" role="radio" data-set="${key}" data-value="${value}" data-ripple>
    <span class="radio"></span><span class="row-text"><span class="row-title">${esc(title)}</span><span class="row-desc">${esc(desc)}</span></span>
  </button>`;
const card = (ic, title, body) => `<section class="card"><header class="card-head">${icon(ic)}<h2>${esc(title)}</h2></header>${body}</section>`;

export function createSettingsView() {
  const customActive = () => !SEEDS.some(([, hex]) => hex.toLowerCase() === settings.get('seed').toLowerCase());
  const el = h(`
    <section class="view view-settings" aria-label="${esc(t('set.title'))}">
      ${card('palette', t('set.appearance'), `
        <div class="row row-col"><div class="row-title">${esc(t('set.theme'))}</div>
          ${seg('theme', [['light', t('theme.light'), 'sun'], ['dark', t('theme.dark'), 'moon'], ['system', t('theme.system'), 'auto']])}</div>
        <div class="row row-col"><div class="row-title">${esc(t('set.color'))}</div>
          <div class="swatches" role="radiogroup">
            ${SEEDS.map(([id, hex]) => `<button class="swatch" role="radio" data-seed="${hex}" style="--sw:${hex}" title="${esc(t('color.' + id))}" aria-label="${esc(t('color.' + id))}" data-ripple>${icon('check')}</button>`).join('')}
            <label class="swatch swatch-custom" title="${esc(t('set.colorCustom'))}" data-ripple>
              <input type="color" aria-label="${esc(t('set.colorCustom'))}">${icon('plus')}${icon('check')}
            </label>
          </div></div>`)}
      ${card('language', t('set.language'), `<div class="row row-col">${seg('lang', [['system', t('lang.system')], ['en', t('lang.en')], ['vi', t('lang.vi')]])}</div>`)}
      ${card('window', t('set.window'), `
        <div class="row row-col"><div class="row-title">${esc(t('set.windowOpen'))}</div>
          <div class="radio-group" role="radiogroup">
            ${radio('windowMode', 'remember', t('win.remember'), t('win.rememberDesc'))}
            ${radio('windowMode', 'maximize', t('win.maximize'), t('win.maximizeDesc'))}
          </div><div class="hint">${esc(t('win.appliesNext'))}</div></div>
        ${sw('alwaysOnTop', t('set.onTop'), t('set.onTopDesc'))}`)}
      ${card('standard', t('set.calculator'), `
        <div class="row row-col"><div class="row-title">${esc(t('set.angleDefault'))}</div>
          ${seg('angle', [['deg', t('angle.deg')], ['rad', t('angle.rad')], ['grad', t('angle.grad')]])}</div>
        ${sw('grouping', t('set.grouping'), t('set.groupingDesc'))}
        <div class="row row-col"><div class="row-title">${esc(t('set.motion'))}</div>
          ${seg('motion', [['auto', t('motion.auto')], ['on', t('motion.on')], ['off', t('motion.off')]])}
          <div class="hint">${esc(t('set.motionDesc'))}</div></div>`)}
      ${card('history', t('set.data'), `
        <div class="row btn-row">
          <button class="tonal-btn" data-act="clear-history" data-ripple>${icon('trash')}<span>${esc(t('set.clearHistory'))}</span></button>
          <button class="tonal-btn" data-act="clear-memory" data-ripple>${icon('memory')}<span>${esc(t('set.clearMemory'))}</span></button>
        </div>`)}
      ${card('code', t('set.shortcuts'), `<ul class="shortcuts">${['entry', 'equals', 'clear', 'copy', 'modes', 'history'].map((k) => `<li>${esc(t('sc.' + k))}</li>`).join('')}</ul>`)}
      <section class="card about">
        <img class="about-logo" src="/icon.png" alt="" width="72" height="72">
        <div class="about-name">${esc(t('app.name'))}</div>
        <div class="about-ver">${esc(t('about.version', { v: pkg.version }))}</div>
        <p class="about-tag">${esc(t('about.tagline'))}</p>
        <p class="credit">${esc(t('about.madeBy'))} <span class="author-chip">${icon('code')}minhtrong67</span>
          ${esc(t('about.withHelp'))} <span class="ai-chip">${icon('sparkle')}Claude</span></p>
        <p class="about-license">${esc(t('about.license'))}</p>
      </section>
    </section>`);

  const color = $('.swatch-custom input', el);
  function render() {
    $$('[data-set]', el).forEach((b) => {
      const on = String(settings.get(b.dataset.set)) === b.dataset.value;
      b.classList.toggle('active', on); b.setAttribute('aria-checked', on);
    });
    $$('[data-toggle]', el).forEach((b) => { const on = !!settings.get(b.dataset.toggle); b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
    const seed = settings.get('seed').toLowerCase();
    $$('.swatch[data-seed]', el).forEach((b) => { const on = b.dataset.seed.toLowerCase() === seed; b.classList.toggle('active', on); b.setAttribute('aria-checked', on); });
    const cust = $('.swatch-custom', el);
    cust.classList.toggle('active', customActive());
    cust.style.setProperty('--sw', customActive() ? seed : 'transparent');
    if (customActive()) color.value = seed;
    $('[data-set="windowMode"]', el).closest('.row').querySelector('.hint').hidden = !isTauri;
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.set) {
      const v = b.dataset.value;
      settings.set(b.dataset.set, b.dataset.set === 'angle' || b.dataset.set === 'windowMode' || b.dataset.set === 'theme' || isNaN(+v) ? v : +v);
      render();
    } else if (b.dataset.toggle) { settings.set(b.dataset.toggle, !settings.get(b.dataset.toggle)); render(); }
    else if (b.dataset.seed) { settings.set('seed', b.dataset.seed); render(); }
    else if (b.dataset.act === 'clear-history') { history.clear(); toast(t('history.cleared')); }
    else if (b.dataset.act === 'clear-memory') { memory.clear(); toast(t('memory.cleared')); }
  });
  color.addEventListener('input', () => { settings.set('seed', color.value); render(); });

  return { el, mode: 'settings', refresh: render, onShow: render, onKey: () => false, copy: () => {}, };
}
