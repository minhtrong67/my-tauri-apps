// Settings dialog: appearance (theme, accent, window material), general, files, window and about. Built from custom controls only.
import { useState } from 'react';
import {
  Settings as Cog, Palette, Globe, FileText, AppWindow, Info, X, Sun, Moon, Monitor, SunMoon, Rows3, Sparkles, Table2, Columns3, PanelRight, Keyboard,
  Type, ALargeSmall, Check, Plus, RotateCcw, Heart, Quote, FilePlus2, CornerDownLeft, FolderClock, Maximize, ShieldCheck, Code2, LifeBuoy, ExternalLink, TriangleAlert as Warning,
  type Icon,
} from '../lib/icons';
import { app, useApp, APP_VERSION, type FontId, type SizeId, type MaterialId } from '../lib/store';
import { t } from '../lib/i18n';
import { applySetting, openShortcuts, resetSettings } from '../lib/actions';
import { SEEDS, DEFAULT_ACCENT, FONTS, swatchColor, onColor, matState, resetWindowSize } from '../lib/theme';
import { Segmented, Select, Switch, ScrollTopFab, useScrolled, tip, cx } from './ui';
import { Logo } from './Logo';
import { confirmDialog } from './Dialogs';

const MATS: [MaterialId, string][] = [['mica', 'mica'], ['acrylic', 'acrylic'], ['mica-alt', 'alt']];
const PAGES = [['appearance', Palette], ['general', Globe], ['files', FileText], ['window', AppWindow], ['about', Info]] as const;
type PageId = typeof PAGES[number][0];

function Row({ icon: I, title, desc, children, col }: { icon: Icon; title: string; desc?: string; children?: React.ReactNode; col?: boolean }) {
  return (
    <div className={cx('srow', col && '!flex-wrap')}>
      <span className="si"><I size={20} /></span>
      <div className="st"><b>{title}</b>{desc && <span>{desc}</span>}</div>
      {children && <div className={cx('flex flex-none items-center gap-2', col && 'w-full pl-9')}>{children}</div>}
    </div>
  );
}

function Appearance() {
  const s = app.settings;
  const isSeed = SEEDS.some(([c]) => c.toLowerCase() === s.accent.toLowerCase());
  return (
    <>
      <div className="shead !mt-0">{t('set.sectionLook')}</div>
      <Row icon={SunMoon} title={t('set.theme')} desc={t('set.themeDesc')}>
        <Segmented value={s.theme} onChange={v => applySetting('theme', v)} options={[{ v: 'system', label: t('theme.system'), icon: Monitor }, { v: 'light', label: t('theme.light'), icon: Sun }, { v: 'dark', label: t('theme.dark'), icon: Moon }]} />
      </Row>
      <Row icon={Palette} title={t('set.accent')} desc={t('set.accentDesc')} col>
        <div className="flex flex-wrap items-center gap-2.5">
          {SEEDS.map(([c, n]) => (
            <button key={c} className={cx('swatch', c.toLowerCase() === s.accent.toLowerCase() && 'on')} style={{ ['--c' as string]: swatchColor(c), ['--on' as string]: onColor(swatchColor(c)) }} onClick={() => applySetting('accent', c)} {...tip(n)}><Check size={16} /></button>
          ))}
          <label className={cx('swatch', !isSeed && 'on')} style={{ ['--c' as string]: isSeed ? 'conic-gradient(#f44336,#ff9800,#ffeb3b,#4caf50,#00bcd4,#3f51b5,#e91e63,#f44336)' : s.accent, ['--on' as string]: onColor(s.accent), background: isSeed ? 'conic-gradient(#f44336,#ff9800,#ffeb3b,#4caf50,#00bcd4,#3f51b5,#e91e63,#f44336)' : s.accent }} {...tip(t('set.custom'))}>
            {isSeed ? <Plus size={16} style={{ opacity: 1, transform: 'none', color: '#fff', filter: 'drop-shadow(0 1px 2px rgb(0 0 0 / .5))' }} /> : <Check size={16} />}
            <input type="color" className="absolute inset-0 size-full cursor-default opacity-0" value={s.accent} onChange={e => applySetting('accent', e.target.value)} />
          </label>
          <button className="btn btn-text sm" onClick={() => applySetting('accent', DEFAULT_ACCENT)}><RotateCcw size={14} />{t('set.reset')}</button>
        </div>
      </Row>

      <div className="shead">{t('set.sectionMaterial')}</div>
      <p className="mx-0.5 mb-2 mt-0 text-xs text-fg2">{t('set.materialDesc')}</p>
      <div className="flex flex-col gap-1" role="radiogroup" aria-label={t('set.material')}>
        {MATS.map(([id, cls]) => (
          <button key={id} className={cx('radio', s.material === id && 'on')} role="radio" aria-checked={s.material === id} onClick={() => applySetting('material', id)}>
            <span className="dot" /><span className={cx('matprev', cls)} />
            <span className="flex min-w-0 flex-1 flex-col"><b className="font-semibold">{t('mat.' + id)}{id === 'mica' && <span className="chip ml-2">{t('set.default')}</span>}</b><span className="text-xs text-fg2">{t('mat.' + id + 'Desc')}</span></span>
          </button>
        ))}
      </div>
      {!matState.ok && <p className="mx-0.5 mb-0 mt-2 flex items-center gap-2 text-xs text-warn"><Warning size={16} />{t('set.materialUnsupported')}</p>}

      <div className="shead">{t('set.sectionText')}</div>
      <Row icon={Type} title={t('set.font')} desc={t('set.fontDesc')}>
        <Select width="13rem" value={s.font} onChange={v => applySetting('font', v as FontId)} label={t('set.font')}
          options={(Object.keys(FONTS) as FontId[]).map(k => ({ value: k, label: t(FONTS[k].label), style: { fontFamily: FONTS[k].stack } }))} />
      </Row>
      <Row icon={ALargeSmall} title={t('set.fontSize')} desc={t('set.fontSizeDesc')}>
        <Segmented<SizeId> value={s.fontSize} onChange={v => applySetting('fontSize', v)} options={[{ v: 'small', label: t('size.small') }, { v: 'medium', label: t('size.medium') }, { v: 'large', label: t('size.large') }]} />
      </Row>

      <div className="shead">{t('set.sectionGrid')}</div>
      <Row icon={Rows3} title={t('set.density')} desc={t('set.densityDesc')}>
        <Segmented value={s.density} onChange={v => applySetting('density', v)} options={[{ v: 'compact', label: t('density.compact') }, { v: 'normal', label: t('density.normal') }, { v: 'comfy', label: t('density.comfy') }]} />
      </Row>
      <Row icon={Table2} title={t('set.zebra')} desc={t('set.zebraDesc')}><Switch checked={s.zebra} onChange={v => applySetting('zebra', v)} label={t('set.zebra')} /></Row>
      <Row icon={Columns3} title={t('set.lines')} desc={t('set.linesDesc')}><Switch checked={s.gridLines} onChange={v => applySetting('gridLines', v)} label={t('set.lines')} /></Row>
      <Row icon={Sparkles} title={t('set.anim')} desc={t('set.animDesc')}><Switch checked={s.anim} onChange={v => applySetting('anim', v)} label={t('set.anim')} /></Row>
    </>
  );
}

function General() {
  const s = app.settings;
  return (
    <>
      <Row icon={Globe} title={t('set.language')} desc={t('set.languageDesc')}>
        <Select width="12rem" value={s.lang} onChange={v => applySetting('lang', v as 'system' | 'en' | 'vi')} label={t('set.language')}
          options={[{ value: 'system', label: t('lang.system'), icon: Monitor }, { value: 'en', label: 'English' }, { value: 'vi', label: 'Tiếng Việt' }]} />
      </Row>
      <Row icon={PanelRight} title={t('set.details')} desc={t('set.detailsDesc')}><Switch checked={s.details} onChange={v => applySetting('details', v)} label={t('set.details')} /></Row>
      <Row icon={LifeBuoy} title={t('set.autosave')} desc={t('set.autosaveDesc')}><Switch checked={s.autosave} onChange={v => applySetting('autosave', v)} label={t('set.autosave')} /></Row>
      <Row icon={Keyboard} title={t('app.shortcuts')} desc={t('set.shortcutsDesc')}><button className="btn" onClick={() => openShortcuts()}><Keyboard size={18} />{t('set.open')}</button></Row>
      <Row icon={RotateCcw} title={t('set.resetAll')} desc={t('set.resetAllDesc')}>
        <button className="btn btn-danger-tonal" onClick={async () => {
          const r = await confirmDialog({ title: t('set.resetAll'), body: t('set.resetAllDesc'), tone: 'warning', buttons: [{ id: 'ok', label: t('set.reset'), icon: 'restore', variant: 'danger' }, { id: 'cancel', label: t('cancel'), icon: 'x', variant: 'tonal' }] });
          if (r === 'ok') { resetSettings(); }
        }}><RotateCcw size={18} />{t('set.reset')}</button>
      </Row>
    </>
  );
}

function Files() {
  const s = app.settings;
  return (
    <>
      <Row icon={Quote} title={t('set.quoteAll')} desc={t('set.quoteAllDesc')}><Switch checked={s.quoteAll} onChange={v => applySetting('quoteAll', v)} label={t('set.quoteAll')} /></Row>
      <Row icon={FilePlus2} title={t('set.newBom')} desc={t('set.newBomDesc')}><Switch checked={s.newBom} onChange={v => applySetting('newBom', v)} label={t('set.newBom')} /></Row>
      <Row icon={CornerDownLeft} title={t('set.newEol')} desc={t('set.newEolDesc')}>
        <Segmented value={s.newEol} onChange={v => applySetting('newEol', v)} options={[{ v: 'crlf', label: 'CRLF' }, { v: 'lf', label: 'LF' }]} />
      </Row>
      <Row icon={FolderClock} title={t('set.recent')} desc={t('set.recentDesc', { n: s.recent.length })}>
        <button className="btn" disabled={!s.recent.length} onClick={() => applySetting('recent', [])}><X size={18} />{t('set.clear')}</button>
      </Row>
    </>
  );
}

function Window() {
  const s = app.settings;
  const opt = (v: 'remember' | 'maximized', I: Icon, ttl: string, desc: string) => (
    <button className={cx('radio', s.windowMode === v && 'on')} role="radio" aria-checked={s.windowMode === v} onClick={() => applySetting('windowMode', v)}>
      <span className="dot" /><I size={20} className="flex-none" />
      <span className="flex min-w-0 flex-1 flex-col"><b className="font-normal">{ttl}</b><span className="text-xs text-fg2">{desc}</span></span>
    </button>
  );
  return (
    <>
      <p className="mx-0.5 mb-3 mt-0 text-sm text-fg2">{t('set.windowDesc')}</p>
      <div className="flex flex-col gap-1" role="radiogroup">
        {opt('remember', AppWindow, t('win.remember'), t('win.rememberDesc'))}
        {opt('maximized', Maximize, t('win.maximized'), t('win.maximizedDesc'))}
      </div>
      <div className="mt-3"><Row icon={RotateCcw} title={t('set.resetSize')} desc={t('set.resetSizeDesc')}>
        <button className="btn" onClick={async () => { await resetWindowSize(); }}><RotateCcw size={18} />{t('set.reset')}</button>
      </Row></div>
    </>
  );
}

function About() {
  return (
    <div className="flex flex-col items-center px-2 py-4 text-center">
      <Logo size={96} className="drop-shadow-[0_10px_18px_rgb(0_0_0/.18)]" />
      <h2 className="mb-0 mt-4 font-[family-name:var(--font-display)] text-[1.75rem] font-semibold leading-9">Fluent CSV</h2>
      <p className="m-0 mt-1 text-sm text-fg2">{t('about.version')} {APP_VERSION}</p>
      <p className="mx-auto mb-6 mt-3 max-w-md text-sm leading-5 text-fg2">{t('about.desc')}</p>
      <div className="grid w-full max-w-xl gap-2 text-left sm:grid-cols-2">
        <div className="srow !items-start !gap-3 !p-4"><Code2 size={24} className="flex-none text-accent-text" /><div className="flex flex-col"><small className="text-xs text-fg2">{t('about.author')}</small><b className="text-lg font-semibold">minhtrong67</b></div></div>
        <div className="srow !items-start !gap-3 !p-4"><Heart size={24} className="flex-none text-accent-text" /><div className="flex flex-col"><small className="text-xs text-fg2">{t('about.ai')}</small><b className="text-lg font-semibold">Claude <em className="ml-1 text-xs font-normal not-italic text-fg2">Anthropic</em></b></div></div>
      </div>
      <p className="mb-0 mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-fg2">
        <span className="inline-flex items-center gap-1"><ShieldCheck size={14} />{t('about.license')}</span><span>Tauri 2 · React · Fluent Design</span>
        <a className="inline-flex items-center gap-1 text-accent-text no-underline hover:underline" href="https://github.com/minhtrong67/my-tauri-apps" target="_blank" rel="noreferrer"><ExternalLink size={13} />GitHub</a>
      </p>
    </div>
  );
}

export function SettingsDialog({ initialPage, onClose }: { initialPage?: string; onClose: () => void }) {
  useApp();
  const [page, setPage] = useState<PageId>((initialPage as PageId) || 'appearance');
  const [scrolled, onScroll] = useScrolled(240);
  return (
    <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
      <nav className="flex flex-none gap-1 overflow-x-auto bg-[var(--f-dialog-foot)] p-2 sm:w-56 sm:flex-col sm:overflow-visible sm:p-3" aria-label={t('c.app.settings')}>
        <div className="mb-2 hidden items-center gap-2 px-2 py-2 sm:flex"><Cog size={20} /><b className="font-[family-name:var(--font-display)] text-base font-semibold">{t('c.app.settings')}</b></div>
        {PAGES.map(([id, I]) => (
          <button key={id} className={cx('mi relative !h-10 flex-none !gap-3 !px-3', page === id && 'bg-[var(--f-sel)]')} onClick={() => setPage(id)} aria-current={page === id}>
            {page === id && <i className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-sm bg-accent" />}
            <I size={18} /><span>{t('set.p.' + id)}</span>
          </button>
        ))}
      </nav>
      <div className="relative min-h-0 min-w-0 flex-1">
        <div data-scroll-main className="h-full overflow-y-auto p-4 sm:px-8 sm:py-6" onScroll={onScroll}>
          <div className="mb-4 flex items-center justify-between"><h3 className="m-0 font-[family-name:var(--font-display)] text-[1.75rem] font-semibold leading-9">{t('set.p.' + page)}</h3>
            <button className="ibtn" onClick={() => onClose()} {...tip(t('close'), 'Esc')}><X size={18} /></button></div>
          <div key={page} className="[animation:rise_.25s_var(--ease)_both]">
            {page === 'appearance' && <Appearance />}{page === 'general' && <General />}{page === 'files' && <Files />}{page === 'window' && <Window />}{page === 'about' && <About />}
          </div>
        </div>
        <ScrollTopFab show={scrolled} />
      </div>
    </div>
  );
}
