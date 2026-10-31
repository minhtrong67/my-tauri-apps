// Settings view (React + TypeScript). Rendered into a legacy view element so it plugs into the app shell.
import { createRoot } from 'react-dom/client';
import { useEffect, useReducer, type ReactNode } from 'react';
import pkg from '../../../../package.json';
import { settings } from '../store.js';
import { t } from '../i18n.js';
import { SEEDS } from '../theme.js';
import { history, memory } from '../history.js';
import { icon } from '../icons.js';
import { toast, confirmDialog } from '../ui.js';
import { isTauri } from '../tauri.js';
import { FONTS, FONT_LABEL } from '../appearance';

const Ic = ({ n }: { n: string }) => <span className="contents" dangerouslySetInnerHTML={{ __html: icon(n) }} />;
const useSettings = () => { const [, bump] = useReducer((x: number) => x + 1, 0); useEffect(() => settings.on('*', bump) as () => void, []); };
const get = (k: string) => settings.get(k) as string;

function Seg({ k, items }: { k: string; items: [string, string, string?][] }) {
  return (
    <div className="segmented" role="radiogroup">
      {items.map(([v, label, ic]) => (
        <button key={v} role="radio" aria-checked={get(k) === v} className={get(k) === v ? 'active' : ''} data-ripple onClick={() => settings.set(k, v)}>
          {ic && <Ic n={ic} />}<span>{label}</span>
        </button>
      ))}
    </div>
  );
}
const Card = ({ ic, title, children }: { ic: string; title: string; children: ReactNode }) => (
  <section className="card"><header className="card-head"><Ic n={ic} /><h2>{title}</h2></header>{children}</section>
);
const Sw = ({ k, title, desc }: { k: string; title: string; desc: string }) => (
  <div className="row"><div className="row-text"><div className="row-title">{title}</div><div className="row-desc">{desc}</div></div>
    <button className={'switch' + (settings.get(k) ? ' on' : '')} role="switch" aria-checked={!!settings.get(k)} aria-label={title} data-ripple onClick={() => settings.set(k, !settings.get(k))}><span className="thumb" /></button></div>
);
const Radio = ({ v, title, desc }: { v: string; title: string; desc: string }) => (
  <button className={'radio-row' + (get('windowMode') === v ? ' active' : '')} role="radio" aria-checked={get('windowMode') === v} data-ripple onClick={() => settings.set('windowMode', v)}>
    <span className="radio" /><span className="row-text"><span className="row-title">{title}</span><span className="row-desc">{desc}</span></span>
  </button>
);

function Settings() {
  useSettings();
  const seed = get('seed').toLowerCase();
  const custom = !SEEDS.some(([, hex]: string[]) => hex.toLowerCase() === seed);
  const ask = async (kind: 'hist' | 'mem') => {
    const h = kind === 'hist';
    if (await confirmDialog({ title: t(`dlg.${kind}.t`), message: t(`dlg.${kind}.m`), confirmLabel: t('common.confirmClear'), icon: 'trash', tone: 'danger' })) { (h ? history : memory).clear(); toast(t(h ? 'history.cleared' : 'memory.cleared')); }
  };
  const reset = async () => { if (await confirmDialog({ title: t('dlg.reset.t'), message: t('dlg.reset.m'), confirmLabel: t('common.reset'), icon: 'reset', tone: 'primary' })) { settings.reset(); toast(t('common.cleared'), 'info'); } };
  return (
    <>
      <Card ic="palette" title={t('set.appearance')}>
        <div className="row row-col"><div className="row-title">{t('set.theme')}</div>
          <Seg k="theme" items={[['light', t('theme.light'), 'sun'], ['dark', t('theme.dark'), 'moon'], ['system', t('theme.system'), 'auto']]} /></div>
        <div className="row row-col"><div className="row-title">{t('set.color')}</div>
          <div className="swatches" role="radiogroup">
            {SEEDS.map(([id, hex]: string[]) => (
              <button key={id} className={'swatch' + (seed === hex.toLowerCase() ? ' active' : '')} role="radio" aria-checked={seed === hex.toLowerCase()} style={{ ['--sw' as string]: hex }} title={t('color.' + id)} data-ripple onClick={() => settings.set('seed', hex)}><Ic n="check" /></button>
            ))}
            <label className={'swatch swatch-custom' + (custom ? ' active' : '')} style={{ ['--sw' as string]: custom ? seed : 'transparent' }} title={t('set.colorCustom')} data-ripple>
              <input type="color" aria-label={t('set.colorCustom')} value={seed} onChange={(e) => settings.set('seed', e.target.value)} /><Ic n="plus" /><Ic n="check" />
            </label>
          </div></div>
        <div className="row row-col"><div className="row-title">{t('set.font')}</div>
          <div className="font-grid" role="radiogroup">
            {FONTS.map(([id, key, stack]) => (
              <button key={id} role="radio" aria-checked={get('fontFamily') === id} className={'font-chip' + (get('fontFamily') === id ? ' active' : '')} style={{ fontFamily: stack }} data-ripple onClick={() => settings.set('fontFamily', id)}>
                <b>Aa</b><span>{key ? t(key) : FONT_LABEL[id]}</span>
              </button>
            ))}
          </div></div>
        <div className="row row-col"><div className="row-title">{t('set.fontSize')}</div>
          <Seg k="fontSize" items={[['sm', t('size.sm')], ['md', t('size.md')], ['lg', t('size.lg')]]} /></div>
      </Card>
      <Card ic="language" title={t('set.language')}>
        <div className="row row-col"><Seg k="lang" items={[['system', t('lang.system')], ['en', t('lang.en')], ['vi', t('lang.vi')]]} /></div>
      </Card>
      <Card ic="window" title={t('set.window')}>
        <div className="row row-col"><div className="row-title">{t('set.windowOpen')}</div>
          <div className="radio-group" role="radiogroup">
            <Radio v="remember" title={t('win.remember')} desc={t('win.rememberDesc')} />
            <Radio v="maximize" title={t('win.maximize')} desc={t('win.maximizeDesc')} />
          </div>{isTauri && <div className="hint">{t('win.appliesNext')}</div>}</div>
        <Sw k="alwaysOnTop" title={t('set.onTop')} desc={t('set.onTopDesc')} />
      </Card>
      <Card ic="standard" title={t('set.calculator')}>
        <div className="row row-col"><div className="row-title">{t('set.angleDefault')}</div>
          <Seg k="angle" items={[['deg', t('angle.deg')], ['rad', t('angle.rad')], ['grad', t('angle.grad')]]} /></div>
        <Sw k="grouping" title={t('set.grouping')} desc={t('set.groupingDesc')} />
        <div className="row row-col"><div className="row-title">{t('set.motion')}</div>
          <Seg k="motion" items={[['auto', t('motion.auto')], ['on', t('motion.on')], ['off', t('motion.off')]]} /><div className="hint">{t('set.motionDesc')}</div></div>
      </Card>
      <Card ic="history" title={t('set.data')}>
        <div className="row btn-row">
          <button className="btn btn-danger" data-ripple onClick={() => ask('hist')}><Ic n="trash" /><span>{t('set.clearHistory')}</span></button>
          <button className="btn btn-danger" data-ripple onClick={() => ask('mem')}><Ic n="memory" /><span>{t('set.clearMemory')}</span></button>
          <button className="btn btn-tonal" data-ripple onClick={reset}><Ic n="reset" /><span>{t('set.reset')}</span></button>
        </div>
      </Card>
      <Card ic="code" title={t('set.shortcuts')}>
        <ul className="shortcuts">{['entry', 'equals', 'clear', 'copy', 'modes', 'history'].map((k) => <li key={k}>{t('sc.' + k)}</li>)}</ul>
      </Card>
      <section className="card about">
        <img className="about-logo" src="/icon.png" alt="" width={72} height={72} />
        <div className="about-name">{t('app.name')}</div>
        <div className="about-ver">{t('about.version', { v: pkg.version })}</div>
        <p className="about-tag">{t('about.tagline')}</p>
        <p className="credit">{t('about.madeBy')} <span className="author-chip"><Ic n="code" />minhtrong67</span> {t('about.withHelp')} <span className="ai-chip"><Ic n="sparkle" />Claude</span></p>
        <p className="about-license">{t('about.license')}</p>
      </section>
    </>
  );
}

export function createSettingsView() {
  const el = document.createElement('section');
  el.className = 'view view-settings'; el.setAttribute('aria-label', t('set.title'));
  const root = createRoot(el);
  const draw = () => root.render(<Settings />);
  draw();
  return { el, mode: 'settings', refresh: draw, onShow: draw, onKey: () => false, copy: () => {} };
}
