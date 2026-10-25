import { useEffect, type ReactNode } from 'react';
import { AppWindow, Bell, Check, ClipboardCopy, ClipboardPaste, DatabaseBackup, Info, Keyboard, Languages, Monitor, Moon, Palette, Pipette, RotateCcw, Ruler, Settings, Sparkles, Sun, Type, type LucideIcon } from 'lucide-react';
import { LANGS, useT } from '../lib/i18n';
import { useStore } from '../lib/store';
import { ui, useUI } from '../lib/ui';
import { changeSetting, exportData, importData, resetSettingsFlow } from '../lib/actions';
import { PALETTES, PRESETS } from '../lib/theme';
import { FONTS, preloadAllFonts } from '../lib/fonts';
import type { FontId, FontSize, Settings as S } from '../lib/types';
import { Dialog, DialogHeader } from './ui/Dialog';
import { Btn } from './ui/Button';
import { OptionCard, Segmented, Switch } from './ui/Controls';
import { Select } from './ui/Select';
import { Credit } from './Credit';
import { cn } from './ui/cn';

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="rounded-[28px] bg-sc-low p-4">
      <h3 className="mb-1 flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-primary"><span className="grid size-7 place-items-center rounded-lg bg-primary-container text-on-primary-container"><Icon size={15} /></span>{title}</h3>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}
const Row = ({ label, desc, children, col }: { label: string; desc?: string; children: ReactNode; col?: boolean }) => (
  <div className={cn('flex min-h-14 gap-4 py-1.5', col ? 'flex-col justify-center' : 'items-center justify-between')}>
    <div className="flex flex-col"><span className="font-medium">{label}</span>{desc && <small className="text-on-surface-variant">{desc}</small>}</div>
    {children}
  </div>
);

export function SettingsDialog() {
  const open = useUI((s) => s.settings);
  const set = useUI((s) => s.set);
  const s = useStore((x) => x.settings);
  const t = useT();
  const close = () => set({ settings: false });
  const up = <K extends keyof S>(k: K) => (v: S[K]) => void changeSetting({ [k]: v } as Partial<S>);
  useEffect(() => { if (open) void preloadAllFonts(); }, [open]);
  const isCustom = !PRESETS.some((c) => c.toLowerCase() === s.seed.toLowerCase());

  return (
    <Dialog open={open} onClose={close} label={t('settings.title')} className="max-w-[640px]">
      <DialogHeader icon={Settings} title={t('settings.title')} onClose={close} />
      <div className="dlg-scroll flex flex-1 flex-col gap-3 overflow-y-auto px-5 pb-5">
        <Section icon={Palette} title={t('settings.appearance')}>
          <Row label={t('settings.theme')}>
            <Segmented<S['theme']> label={t('settings.theme')} value={s.theme} onChange={up('theme')} options={[
              { value: 'light', label: <span className="flex items-center gap-1.5"><Sun size={15} />{t('theme.light')}</span> },
              { value: 'dark', label: <span className="flex items-center gap-1.5"><Moon size={15} />{t('theme.dark')}</span> },
              { value: 'system', label: <span className="flex items-center gap-1.5"><Monitor size={15} />{t('theme.system')}</span> }]} />
          </Row>
          <Row label={t('settings.color')} col>
            <div className={cn('flex flex-wrap gap-2.5 transition-opacity', s.adaptive && 'pointer-events-none opacity-40')}>
              {PRESETS.map((c) => (
                <button key={c} aria-label={c} onClick={() => up('seed')(c)} style={{ background: c }}
                  className={cn('press-morph grid size-10 place-items-center text-white hover:scale-110', s.seed.toLowerCase() === c.toLowerCase() ? 'rounded-xl ring-[3px] ring-primary ring-offset-[3px] ring-offset-sc-low' : 'rounded-full')}>
                  <Check size={18} className={cn('transition-transform duration-200', s.seed.toLowerCase() === c.toLowerCase() ? 'scale-100' : 'scale-0')} />
                </button>
              ))}
              <label title={t('settings.colorCustom')} style={{ background: isCustom ? s.seed : 'conic-gradient(#f44336,#ff9800,#ffeb3b,#4caf50,#00bcd4,#2196f3,#9c27b0,#f44336)' }}
                className={cn('relative grid size-10 cursor-pointer place-items-center rounded-full text-white transition-all duration-200 hover:scale-110', isCustom && 'ring-[3px] ring-primary ring-offset-[3px] ring-offset-sc-low')}>
                {isCustom ? <Check size={18} /> : <Pipette size={16} className="drop-shadow" />}
                <input type="color" value={s.seed} onChange={(e) => up('seed')(e.target.value.toUpperCase())} className="absolute inset-0 size-full cursor-pointer opacity-0" aria-label={t('settings.colorCustom')} />
              </label>
            </div>
          </Row>
          <Row label={t('settings.palette')} desc={t('settings.paletteDesc')}>
            <Segmented<S['palette']> label={t('settings.palette')} value={s.palette} onChange={up('palette')} options={PALETTES.map((p) => ({ value: p, label: t('palette.' + p) }))} />
          </Row>
          <Row label={t('settings.adaptive')} desc={t('settings.adaptiveDesc')}><Switch label={t('settings.adaptive')} checked={s.adaptive} onChange={up('adaptive')} /></Row>
        </Section>

        <Section icon={Type} title={t('settings.typography')}>
          <Row label={t('settings.font')}>
            <Select<FontId> label={t('settings.font')} value={s.fontFamily} onChange={up('fontFamily')}
              options={FONTS.map((f) => ({ value: f.id, label: f.id === 'system' ? t('font.system') : f.label, style: { fontFamily: f.stack } }))} />
          </Row>
          <Row label={t('settings.fontSize')}>
            <Segmented<FontSize> label={t('settings.fontSize')} value={s.fontSize} onChange={up('fontSize')} options={[
              { value: 'sm', label: <span className="text-xs">{t('size.sm')}</span> }, { value: 'md', label: t('size.md') }, { value: 'lg', label: <span className="text-base">{t('size.lg')}</span> }]} />
          </Row>
        </Section>

        <Section icon={Languages} title={t('settings.language')}>
          <Row label={t('settings.language')}>
            <Segmented label={t('settings.language')} value={s.lang} onChange={up('lang')} options={LANGS.map((l) => ({ value: l.id, label: l.label }))} />
          </Row>
          <Row label={t('settings.timeFormat')}>
            <Select<S['timeFormat']> label={t('settings.timeFormat')} value={s.timeFormat} onChange={up('timeFormat')} className="min-w-40"
              options={[{ value: 'auto', label: t('time.auto') }, { value: '12', label: t('time.12') }, { value: '24', label: t('time.24') }]} />
          </Row>
        </Section>

        <Section icon={Ruler} title={t('settings.units')}>
          <Row label={t('settings.temp')}><Segmented label={t('settings.temp')} value={s.tempUnit} onChange={up('tempUnit')} options={[{ value: 'c', label: '°C' }, { value: 'f', label: '°F' }]} /></Row>
          <Row label={t('settings.wind')}><Segmented label={t('settings.wind')} value={s.windUnit} onChange={up('windUnit')} options={[{ value: 'kmh', label: 'km/h' }, { value: 'ms', label: 'm/s' }, { value: 'mph', label: 'mph' }]} /></Row>
        </Section>

        <Section icon={AppWindow} title={t('settings.window')}>
          <div role="radiogroup" className="flex flex-col gap-2 py-1.5">
            <OptionCard on={s.windowMode === 'remember'} title={t('window.remember')} desc={t('window.rememberDesc')} onClick={() => up('windowMode')('remember')} />
            <OptionCard on={s.windowMode === 'maximized'} title={t('window.maximized')} desc={t('window.maximizedDesc')} onClick={() => up('windowMode')('maximized')} />
          </div>
          <Row label={t('settings.onTop')} desc={t('settings.onTopDesc')}><Switch label={t('settings.onTop')} checked={s.alwaysOnTop} onChange={up('alwaysOnTop')} /></Row>
        </Section>

        <Section icon={Sparkles} title={t('settings.general')}>
          <Row label={t('settings.effects')} desc={t('settings.effectsDesc')}><Switch label={t('settings.effects')} checked={s.effects} onChange={up('effects')} /></Row>
          <Row label={t('settings.autoRefresh')} desc={t('settings.autoRefreshDesc')}><Switch label={t('settings.autoRefresh')} checked={s.autoRefresh} onChange={up('autoRefresh')} /></Row>
          <Row label={t('settings.refreshEvery')}>
            <Select<`${S['refreshMins']}`> label={t('settings.refreshEvery')} value={`${s.refreshMins}`} className={cn('min-w-40', !s.autoRefresh && 'pointer-events-none opacity-50')}
              onChange={(v) => up('refreshMins')(+v as S['refreshMins'])} options={(['5', '15', '30', '60'] as const).map((v) => ({ value: v, label: t('refresh.' + v) }))} />
          </Row>
          <Row label={t('settings.alerts')} desc={t('settings.alertsDesc')}><span className="flex items-center gap-2"><Bell size={16} className="text-on-surface-variant" /><Switch label={t('settings.alerts')} checked={s.alerts} onChange={up('alerts')} /></span></Row>
          <Row label={t('settings.reset')} desc={t('settings.resetDesc')}><Btn variant="error" icon={RotateCcw} onClick={() => void resetSettingsFlow()}>{t('action.reset')}</Btn></Row>
        </Section>

        <Section icon={DatabaseBackup} title={t('settings.backup')}>
          <Row label={t('settings.backup')} desc={t('settings.backupDesc')}>
            <span className="flex shrink-0 gap-2">
              <Btn variant="tonal" icon={ClipboardCopy} onClick={() => void exportData()}>{t('action.export')}</Btn>
              <Btn variant="filled" icon={ClipboardPaste} onClick={() => void importData()}>{t('action.import')}</Btn>
            </span>
          </Row>
        </Section>

        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1">
          <Credit />
          <span className="flex">
            <Btn variant="text" icon={Keyboard} onClick={() => ui().set({ shortcuts: true })}>{t('settings.shortcuts')}</Btn>
            <Btn variant="text" icon={Info} onClick={() => ui().set({ about: true })}>{t('action.about')}</Btn>
          </span>
        </div>
      </div>
    </Dialog>
  );
}
