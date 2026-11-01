import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Settings, X, Palette, Monitor, Sun, Moon, Type, Languages, AppWindow, FolderCog, PencilLine, Check, FolderOpen, Trash2, RotateCcw, Sparkles, Bot, User,
  Keyboard, LayoutTemplate, FileText, FileCode, ClipboardList, ScrollText, BadgeCheck, Command, Search, Maximize, Minimize2, Folder,
} from 'lucide-react';
import { useSettings } from '../lib/settings';
import { useOverlay, showOverlay, confirmDialog, toast } from '../lib/ui';
import { changeSettings } from '../lib/appearance';
import { useT, PALETTE_EN, PALETTE_VI, resolveLang, type Key } from '../lib/i18n';
import { PALETTE } from '../lib/theme';
import { FONTS, type SizeKey, type FontKey } from '../lib/fonts';
import { isHex, isLightColor } from '../lib/utils';
import { api } from '../lib/tauri';
import * as C from '../lib/controller';
import { useApp } from '../lib/controller';
import { COMMANDS, KEY_ROWS } from '../lib/commands';
import { BADGE_PRESETS, badgeMd, badgeUrl, type TemplateId } from '../lib/templates';
import { cx } from '../lib/shapes';
import { Btn, IconBtn, Modal, Seg, Select, Switch } from './base';

const origin = (e: React.MouseEvent) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
declare const __APP_VERSION__: string;

function Section({ icon: I, title, children }: { icon: typeof Palette; title: string; children: React.ReactNode }) {
  return <section className="sx"><h4><I aria-hidden="true" />{title}</h4>{children}</section>;
}

export function SettingsSheet() {
  const t = useT();
  const open = useOverlay((s) => s.open === 'settings');
  const S = useSettings();
  const winMode = useApp((s) => s.winMode);
  const lang = resolveLang(S.lang), names = lang === 'vi' ? PALETTE_VI : PALETTE_EN;
  const [hex, setHex] = useState(S.seed);
  useEffect(() => { setHex(S.seed); }, [S.seed]);
  const isPreset = PALETTE.some((p) => p.hex.toLowerCase() === S.seed.toLowerCase());
  const close = () => showOverlay(null);
  const slider = ((S.zoom - 60) / 160) * 100;

  const pickDir = async () => { const p = await api.pickDir(S.saveDir); if (p) S.set({ saveDir: p }); };
  const reset = async () => {
    const r = await confirmDialog({ title: t('reset_q_title'), body: t('reset_q'), icon: RotateCcw, kind: 'warning', actions: [
      { id: 'cancel', label: t('cancel'), icon: X, tone: 'tonal' }, { id: 'ok', label: t('reset'), icon: RotateCcw, tone: 'error' }] });
    if (r === 'ok') { C.resetEverything(); toast.success(t('reset_done'), { ms: 2200 }); }
  };

  return (
    <Modal open={open} onClose={close} className="sheet" label={t('settings')}>
      <div className="sh">
        <header className="sh-head">
          <h2><Settings aria-hidden="true" />{t('settings')}</h2>
          <IconBtn icon={X} tip={t('close')} sc="Esc" onClick={close} />
        </header>
        <div className="sh-body">
          <Section icon={Palette} title={t('s_appearance')}>
            <div className="card">
              <div className="grp-s"><h5>{t('s_theme')}</h5>
                <Seg fill value={S.mode} onChange={(v, e) => changeSettings({ mode: v }, origin(e))} label={t('s_theme')} items={[
                  { value: 'system', label: t('theme_system'), icon: Monitor }, { value: 'light', label: t('theme_light'), icon: Sun }, { value: 'dark', label: t('theme_dark'), icon: Moon }]} /></div>
              <div className="grp-s"><h5>{t('s_color')}</h5>
                <div className="swatches" role="radiogroup" aria-label={t('s_color')}>
                  {PALETTE.map((p) => (
                    <button key={p.id} type="button" role="radio" aria-checked={p.hex.toLowerCase() === S.seed.toLowerCase()} aria-label={names[p.id]} data-tip={names[p.id]}
                      className={cx('swatch', p.hex.toLowerCase() === S.seed.toLowerCase() && 'on', isLightColor(p.hex) && 'light-c')} style={{ ['--c' as string]: p.hex }}
                      onClick={(e) => changeSettings({ seed: p.hex }, origin(e))}><Check aria-hidden="true" /></button>
                  ))}
                </div>
                <div className="custom-c">
                  <input type="color" aria-label={t('pick_color')} data-tip={t('pick_color')} value={isHex(S.seed) ? S.seed.toLowerCase() : '#d81b60'} onChange={(e) => changeSettings({ seed: e.target.value.toUpperCase() })} />
                  <label className="fb-field"><span aria-hidden="true">#</span>
                    <input value={hex.replace('#', '')} maxLength={6} aria-label={t('s_custom')} onChange={(e) => { const v = '#' + e.target.value.replace(/[^0-9a-f]/gi, '').slice(0, 6); setHex(v); if (isHex(v)) changeSettings({ seed: v.toUpperCase() }); }} /></label>
                  <small className="hint">{isPreset ? '' : t('s_custom')}</small>
                </div>
              </div>
              <div className="grp-s"><h5>{t('s_contrast')}</h5>
                <Seg fill compact value={S.contrast} onChange={(v) => changeSettings({ contrast: v })} label={t('s_contrast')} items={[
                  { value: 0, label: t('contrast_std') }, { value: 0.5, label: t('contrast_med') }, { value: 1, label: t('contrast_high') }]} /></div>
            </div>
          </Section>

          <Section icon={Type} title={t('s_type')}>
            <div className="card">
              <div className="grp-s"><h5>{t('s_font')}</h5>
                <Select<FontKey> label={t('s_font')} value={S.font} onChange={(v) => S.set({ font: v })} options={FONTS.map((f) => ({ value: f.key, label: f.label, style: { fontFamily: f.stack } }))} /></div>
              <div className="grp-s"><h5>{t('s_size')}</h5>
                <Seg<SizeKey> fill value={S.size} onChange={(v) => S.set({ size: v })} label={t('s_size')} items={[
                  { value: 'sm', label: t('size_sm') }, { value: 'md', label: t('size_md') }, { value: 'lg', label: t('size_lg') }]} /></div>
              <div className="grp-s"><h5>{t('opt_zoom')}</h5>
                <div className="slider-row"><input type="range" min={60} max={220} step={10} value={S.zoom} aria-label={t('opt_zoom')} style={{ ['--p' as string]: slider + '%' }} onChange={(e) => C.setZoom(+e.target.value)} /><output>{S.zoom}%</output></div></div>
            </div>
          </Section>

          <Section icon={Languages} title={t('s_language')}>
            <div className="card"><Seg fill value={S.lang} onChange={(v) => S.set({ lang: v })} label={t('s_language')} items={[
              { value: 'auto', label: t('lang_auto') }, { value: 'en', label: 'English' }, { value: 'vi', label: 'Tiếng Việt' }]} /></div>
          </Section>

          <Section icon={AppWindow} title={t('s_window')}>
            <div className="card rows">
              {([['remember', 'win_remember', Minimize2], ['maximized', 'win_max', Maximize]] as const).map(([v, k]) => (
                <div key={v} role="radio" aria-checked={winMode === v} tabIndex={0} className={cx('radio-row', winMode === v && 'on')} onClick={() => C.setWindowMode(v)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); C.setWindowMode(v); } }}>
                  <span className="radio" /><span className="tx"><b>{t(k)}</b><small>{t((k + '_d') as Key)}</small></span>
                </div>
              ))}
            </div>
          </Section>

          <Section icon={FolderCog} title={t('s_files')}>
            <div className="card">
              <div className="grp-s"><h5>{t('save_dir')}</h5>
                <div className="path-field">
                  <div className={cx('pf', S.saveDir && 'set')} data-tip={S.saveDir || undefined}><Folder aria-hidden="true" /><span>{S.saveDir || t('save_dir_none')}</span></div>
                  <Btn tone="tonal" icon={FolderOpen} size="sm" onClick={pickDir}>{t('browse')}</Btn>
                  {S.saveDir && <IconBtn icon={Trash2} size="sm" tip={t('clear')} onClick={() => S.set({ saveDir: '' })} />}
                </div>
                <small className="hint" style={{ margin: '.5rem 0 0 .25rem' }}>{t('save_dir_d')}</small></div>
            </div>
            <div className="card rows" style={{ marginTop: '.5rem' }}>
              <Switch checked={S.autosave} onChange={(v) => S.set({ autosave: v })} title={t('opt_auto')} desc={t('opt_auto_d')} />
              <Switch checked={S.restore} onChange={(v) => S.set({ restore: v })} title={t('opt_restore')} desc={t('opt_restore_d')} />
            </div>
          </Section>

          <Section icon={PencilLine} title={t('s_editor')}>
            <div className="card rows">
              <Switch checked={S.wrap} onChange={(v) => { S.set({ wrap: v }); C.applyEditorOptions(); }} title={t('opt_wrap')} desc={t('opt_wrap_d')} />
              <Switch checked={S.lineNumbers} onChange={(v) => { S.set({ lineNumbers: v }); C.applyEditorOptions(); }} title={t('opt_nums')} desc={t('opt_nums_d')} />
              <Switch checked={S.syncScroll} onChange={(v) => S.set({ syncScroll: v })} title={t('opt_sync')} desc={t('opt_sync_d')} />
            </div>
          </Section>

          <Btn tone="outlined" icon={RotateCcw} onClick={reset} style={{ alignSelf: 'center' }}>{t('reset')}</Btn>

          <div className="credit-card">
            <span className="ver">{t('version')} {__APP_VERSION__}</span>
            <div className="rowc"><span>{t('made_by')}</span><span className="chip-a"><User aria-hidden="true" />minhtrong67</span></div>
            <div className="rowc"><span>{t('with_ai')}</span><span className="chip-ai"><Sparkles aria-hidden="true" />Claude</span></div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function ShortcutsDialog() {
  const t = useT();
  const open = useOverlay((s) => s.open === 'shortcuts');
  return (
    <Modal open={open} onClose={() => showOverlay(null)} label={t('shortcuts')}>
      <div className="dlg-in wide">
        <div className="dlg-head"><span className="dlg-icon"><Keyboard aria-hidden="true" /></span><h2>{t('shortcuts')}</h2><IconBtn icon={X} tip={t('close')} sc="Esc" onClick={() => showOverlay(null)} /></div>
        <div className="dlg-body"><div className="kbd-grid">
          {KEY_ROWS.map((r) => <div className="r" key={r.label + r.keys}><span>{t(r.label)}</span><span>{r.keys.split('+').map((k, i) => <kbd key={i} style={{ marginLeft: i ? 4 : 0 }}>{k}</kbd>)}</span></div>)}
        </div></div>
      </div>
    </Modal>
  );
}

const TPL: { id: TemplateId; icon: typeof FileText; k: Key; d: Key }[] = [
  { id: 'blank', icon: FileText, k: 'tpl_blank', d: 'tpl_blank_d' }, { id: 'readme', icon: ScrollText, k: 'tpl_readme', d: 'tpl_readme_d' },
  { id: 'api', icon: FileCode, k: 'tpl_api', d: 'tpl_api_d' }, { id: 'changelog', icon: ClipboardList, k: 'tpl_changelog', d: 'tpl_changelog_d' },
  { id: 'notes', icon: PencilLine, k: 'tpl_notes', d: 'tpl_notes_d' },
];
export function TemplatesDialog() {
  const t = useT();
  const open = useOverlay((s) => s.open === 'templates');
  return (
    <Modal open={open} onClose={() => showOverlay(null)} label={t('tpl_title')}>
      <div className="dlg-in wide">
        <div className="dlg-head"><span className="dlg-icon"><LayoutTemplate aria-hidden="true" /></span><h2>{t('tpl_title')}</h2><IconBtn icon={X} tip={t('close')} sc="Esc" onClick={() => showOverlay(null)} /></div>
        <div className="dlg-body"><div className="tpl-grid">
          {TPL.map((x) => <button key={x.id} type="button" className="tpl" onClick={() => { showOverlay(null); setTimeout(() => C.newFromTemplate(x.id), 60); }}><span className="ti"><x.icon aria-hidden="true" /></span><b>{t(x.k)}</b><small>{t(x.d)}</small></button>)}
        </div></div>
      </div>
    </Modal>
  );
}

export function BadgeDialog() {
  const t = useT();
  const open = useOverlay((s) => s.open === 'badge');
  const [b, setB] = useState({ label: 'license', message: 'MIT', color: '#2E7D32' });
  return (
    <Modal open={open} onClose={() => showOverlay(null)} label={t('badge_title')}>
      <div className="dlg-in">
        <div className="dlg-head"><span className="dlg-icon"><BadgeCheck aria-hidden="true" /></span><h2>{t('badge_title')}</h2><IconBtn icon={X} tip={t('close')} onClick={() => showOverlay(null)} /></div>
        <div className="dlg-body" style={{ display: 'grid', gap: '.875rem', paddingTop: '.25rem' }}>
          <div className="chips" aria-label={t('badge_presets')}>{BADGE_PRESETS.map((p) => <button key={p.label} type="button" className="chip-btn" onClick={() => setB({ label: p.label, message: p.message, color: '#' + p.color })}>{p.label}: {p.message}</button>)}</div>
          <div className="field"><label htmlFor="bl">{t('badge_label')}</label><input id="bl" value={b.label} onChange={(e) => setB({ ...b, label: e.target.value })} /></div>
          <div className="field"><label htmlFor="bm">{t('badge_message')}</label><input id="bm" value={b.message} onChange={(e) => setB({ ...b, message: e.target.value })} /></div>
          <div className="custom-c" style={{ margin: 0 }}><input type="color" aria-label={t('badge_color')} value={b.color.toLowerCase()} onChange={(e) => setB({ ...b, color: e.target.value })} /><small className="hint">{t('badge_color')}: {b.color.toUpperCase()}</small></div>
          <div className="badge-prev" aria-label={t('badge_preview')}>{b.label && b.message ? <img alt="" src={badgeUrl(b.label, b.message, b.color)} /> : null}</div>
          <small className="hint">{t('badge_offline')}</small>
        </div>
        <div className="dlg-act">
          <Btn tone="tonal" icon={X} onClick={() => showOverlay(null)}>{t('cancel')}</Btn>
          <Btn tone="filled" icon={BadgeCheck} disabled={!b.label || !b.message} onClick={() => { C.insertText(badgeMd(b.label, b.message, b.color)); showOverlay(null); }}>{t('insert')}</Btn>
        </div>
      </div>
    </Modal>
  );
}

export function CommandPalette() {
  const t = useT();
  const open = useOverlay((s) => s.open === 'palette');
  const hasDoc = useApp((s) => s.activeId !== null);
  const [q, setQ] = useState(''), [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null), list = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) { setQ(''); setI(0); requestAnimationFrame(() => input.current?.focus()); } }, [open]);
  const label = (c: (typeof COMMANDS)[number]) => t(c.label) + (/^h[1-3]$/.test(c.id) ? ' ' + c.id[1] : '');
  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    return COMMANDS.filter((c) => !(c.needsDoc || c.needsEditor) || hasDoc).filter((c) => !s || label(c).toLowerCase().includes(s) || c.id.includes(s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, hasDoc, t]);
  useEffect(() => { setI(0); }, [q]);
  useEffect(() => { list.current?.children[i]?.scrollIntoView({ block: 'nearest' }); }, [i]);
  const run = (n: number) => { const c = items[n]; if (!c) return; showOverlay(null); setTimeout(c.run, 80); };
  return (
    <Modal open={open} onClose={() => showOverlay(null)} label={t('commands')} align="top">
      <div className="pal" role="combobox" aria-expanded="true" aria-haspopup="listbox">
        <label className="fb-field"><Search aria-hidden="true" /><input ref={input} value={q} placeholder={t('pal_ph')} aria-label={t('pal_ph')} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(items.length - 1, x + 1)); } else if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(0, x - 1)); } else if (e.key === 'Enter') { e.preventDefault(); run(i); } }} /></label>
        <div className="pal-list" ref={list} role="listbox">
          {items.length ? items.map((c, n) => (
            <button key={c.id} type="button" role="option" aria-selected={n === i} className={cx('item', n === i && 'on')} onMouseMove={() => setI(n)} onClick={() => run(n)}>
              <c.icon aria-hidden="true" /><span className="tx"><b>{label(c)}</b></span>{c.shortcut && <span className="sc">{c.shortcut}</span>}
            </button>)) : <div className="pal-none">{t('pal_none')}</div>}
        </div>
      </div>
    </Modal>
  );
}
export { Bot, Command };
