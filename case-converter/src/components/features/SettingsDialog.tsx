import { useEffect, useState, type ReactNode } from 'react';
import {
  AppWindow, ALargeSmall, Check, ClipboardCheck, Globe, History, Languages, Maximize, Monitor, Moon, Palette, Pipette, RotateCcw, Settings, SlidersHorizontal, Sparkles, Sun, Type as TypeIcon,
  type LucideIcon,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Segmented, Switch } from '@/components/ui/controls';
import { useConfirm } from '@/components/ui/Confirm';
import { useToast } from '@/components/ui/Toast';
import { FONTS, useSettings, type FontSize, type LangPref, type ThemeMode } from '@/lib/settings';
import { PRESETS } from '@/lib/theme';
import { getWindowMode, setWindowMode, type WindowMode } from '@/lib/tauri';
import type { Key } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Page = 'appearance' | 'language' | 'window' | 'behavior';

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-on-surface-variant">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function ToggleRow({ icon: Icon, title, hint, checked, onChange }: { icon: LucideIcon; title: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-4 rounded-lg bg-surface-container px-4 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-tertiary-container text-on-tertiary-container"><Icon className="size-5" aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-on-surface-variant">{hint}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

export function AuthorStrip({ compact = false }: { compact?: boolean }) {
  const { t } = useSettings();
  return (
    <div className={cn('sheen relative flex items-center gap-3 rounded-lg bg-gradient-to-r from-primary-container via-tertiary-container to-secondary-container text-on-primary-container', compact ? 'px-3 py-2.5' : 'px-4 py-3.5')}>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-on-primary" aria-hidden><Sparkles className="size-5" /></span>
      <p className="min-w-0 text-sm leading-snug">
        <span className="opacity-80">{t('madeBy')} </span>
        <strong className="selectable font-semibold">minhtrong67</strong>
        <span className="opacity-80"> {t('withAi')} </span>
        <strong className="font-semibold">Claude</strong>
        <span className="opacity-80"> · Anthropic</span>
      </p>
    </div>
  );
}

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, update, reset, t } = useSettings();
  const confirm = useConfirm();
  const toast = useToast();
  const [page, setPage] = useState<Page>('appearance');
  const [winMode, setWinMode] = useState<WindowMode>('remember');

  useEffect(() => {
    if (open) void getWindowMode().then(setWinMode);
  }, [open]);

  const pages: { id: Page; icon: LucideIcon; label: string }[] = [
    { id: 'appearance', icon: Palette, label: t('secAppearance') },
    { id: 'language', icon: Languages, label: t('secLanguage') },
    { id: 'window', icon: AppWindow, label: t('secWindow') },
    { id: 'behavior', icon: SlidersHorizontal, label: t('secBehavior') },
  ];

  const onReset = async () => {
    const ok = await confirm({ title: t('resetTitle'), message: t('resetMsg'), confirmLabel: t('resetDefaults'), confirmIcon: RotateCcw, icon: RotateCcw });
    if (!ok) return;
    reset();
    toast({ type: 'success', message: t('resetDone') });
  };
  const pickWindow = (m: WindowMode) => { setWinMode(m); void setWindowMode(m); };
  const isPreset = PRESETS.some((p) => p.seed.toUpperCase() === s.seed.toUpperCase());
  const currentName = isPreset ? t(`c_${PRESETS.find((p) => p.seed.toUpperCase() === s.seed.toUpperCase())!.id}` as Key) : t('custom');

  return (
    <Modal
      open={open} onClose={onClose} title={t('settingsTitle')} icon={Settings} size="lg" flush
      footer={
        <>
          <Button variant="danger" icon={RotateCcw} onClick={onReset}>{t('resetDefaults')}</Button>
          <Button variant="filled" icon={Check} onClick={onClose}>{t('done')}</Button>
        </>
      }
    >
      <div className="grid min-h-[min(30rem,60dvh)] md:grid-cols-[12.5rem_1fr]">
        <nav aria-label={t('settingsTitle')} className="sticky top-0 z-10 flex gap-1 overflow-x-auto bg-surface-container-high px-4 pb-3 pt-1 md:flex-col md:self-start md:overflow-visible md:pb-0 md:pl-5 md:pr-2">
          {pages.map(({ id, icon: Icon, label }) => (
            <button
              key={id} type="button" aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)}
              className={cn(
                'rip state flex h-12 shrink-0 items-center gap-3 px-4 text-sm font-medium outline-none transition-[border-radius,background-color,color] duration-500 ease-spring',
                page === id ? 'rounded-full bg-secondary-container text-on-secondary-container' : 'rounded-md text-on-surface-variant',
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              {label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 px-5 pb-5 pt-1 md:pr-6">
          <div key={page} className="anim-pop space-y-6">
            {page === 'appearance' && (
              <>
                <Section title={t('sTheme')} hint={t('sThemeHint')}>
                  <Segmented<ThemeMode>
                    label={t('sTheme')} value={s.theme} onChange={(v) => update({ theme: v })}
                    options={[{ value: 'system', label: t('system'), icon: Monitor }, { value: 'light', label: t('light'), icon: Sun }, { value: 'dark', label: t('dark'), icon: Moon }]}
                  />
                </Section>

                <Section title={t('sColor')} hint={`${t('sColorHint')} · ${currentName}`}>
                  <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label={t('sColor')}>
                    {PRESETS.map((p) => {
                      const on = s.seed.toUpperCase() === p.seed.toUpperCase();
                      const name = t(`c_${p.id}` as Key);
                      return (
                        <button
                          key={p.id} type="button" role="radio" aria-checked={on} aria-label={name} data-tip={name}
                          onClick={() => update({ seed: p.seed })} style={{ backgroundColor: p.seed }}
                          className={cn(
                            'rip grid size-10 place-items-center text-white outline-none transition-[border-radius,transform,box-shadow] duration-500 ease-bounce',
                            on ? 'scale-110 rounded-md shadow-[0_0_0_3px_var(--md-surface-container-high),0_0_0_5px_var(--md-primary)]' : 'rounded-full hover:rounded-md active:scale-90',
                          )}
                        >
                          <Check className={cn('size-5 drop-shadow transition-[opacity,transform] duration-300', on ? 'scale-100 opacity-100' : 'scale-50 opacity-0')} strokeWidth={3} aria-hidden />
                        </button>
                      );
                    })}
                    <label
                      data-tip={t('custom')}
                      className={cn(
                        'rip relative grid size-10 cursor-pointer place-items-center text-white transition-[border-radius,transform,box-shadow] duration-500 ease-bounce focus-within:outline-3 focus-within:outline-primary/70',
                        !isPreset ? 'scale-110 rounded-md shadow-[0_0_0_3px_var(--md-surface-container-high),0_0_0_5px_var(--md-primary)]' : 'rounded-full hover:rounded-md',
                      )}
                      style={{ background: isPreset ? 'conic-gradient(#f44336, #ff9800, #ffeb3b, #4caf50, #03a9f4, #673ab7, #e91e63, #f44336)' : s.seed }}
                    >
                      <Pipette className="size-5 drop-shadow" aria-hidden />
                      <input
                        type="color" value={s.seed.toLowerCase()} aria-label={t('custom')}
                        onChange={(e) => update({ seed: e.target.value.toUpperCase() })}
                        className="absolute inset-0 size-full cursor-pointer opacity-0"
                      />
                    </label>
                  </div>
                </Section>

                <Section title={t('sFontSize')} hint={t('sFontSizeHint')}>
                  <Segmented<FontSize>
                    label={t('sFontSize')} value={s.fontSize} onChange={(v) => update({ fontSize: v })}
                    options={[{ value: 'sm', label: t('fsSm'), icon: ALargeSmall }, { value: 'md', label: t('fsMd'), icon: TypeIcon }, { value: 'lg', label: t('fsLg'), icon: Maximize }]}
                  />
                </Section>

                <Section title={t('sFont')} hint={t('sFontHint')}>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t('sFont')}>
                    {FONTS.map((f) => {
                      const on = s.font === f.id;
                      return (
                        <button
                          key={f.id} type="button" role="radio" aria-checked={on} onClick={() => update({ font: f.id })}
                          className={cn(
                            'rip state flex flex-col items-start gap-0.5 px-4 py-3 text-left outline-none transition-[border-radius,background-color,border-color] duration-500 ease-spring',
                            on ? 'rounded-md border border-transparent bg-primary-container text-on-primary-container' : 'rounded-xl border border-outline-variant',
                          )}
                        >
                          <span className="flex w-full items-center justify-between">
                            <span style={{ fontFamily: f.stack }} className="text-2xl font-medium leading-none">Aa</span>
                            {on && <Check className="size-4" strokeWidth={3} aria-hidden />}
                          </span>
                          <span className="text-xs font-medium">{f.name ?? t('fSystem')}</span>
                          <span style={{ fontFamily: f.stack }} className="w-full truncate text-[0.6875rem] opacity-75">{t('fontPreview')}</span>
                        </button>
                      );
                    })}
                  </div>
                </Section>
              </>
            )}

            {page === 'language' && (
              <Section title={t('sLang')} hint={t('langAutoHint')}>
                <Segmented<LangPref>
                  label={t('sLang')} value={s.lang} onChange={(v) => update({ lang: v })}
                  options={[{ value: 'auto', label: t('langAuto'), icon: Globe }, { value: 'en', label: 'English', icon: Languages }, { value: 'vi', label: 'Tiếng Việt', icon: Languages }]}
                />
              </Section>
            )}

            {page === 'window' && (
              <Section title={t('sWindow')}>
                <div className="grid gap-2" role="radiogroup" aria-label={t('sWindow')}>
                  {([
                    { id: 'remember', icon: AppWindow, title: t('wRemember'), hint: t('wRememberHint') },
                    { id: 'maximized', icon: Maximize, title: t('wMaximized'), hint: t('wMaximizedHint') },
                  ] as const).map(({ id, icon: Icon, title, hint }) => {
                    const on = winMode === id;
                    return (
                      <button
                        key={id} type="button" role="radio" aria-checked={on} onClick={() => pickWindow(id)}
                        className={cn(
                          'rip state flex items-center gap-4 px-4 py-3.5 text-left outline-none transition-[border-radius,background-color,border-color] duration-500 ease-spring',
                          on ? 'rounded-md border border-transparent bg-primary-container text-on-primary-container' : 'rounded-xl border border-outline-variant',
                        )}
                      >
                        <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', on ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface-variant')}><Icon className="size-5" aria-hidden /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{title}</span>
                          <span className="block text-xs opacity-80">{hint}</span>
                        </span>
                        <Check className={cn('size-5 shrink-0 transition-[opacity,transform] duration-300', on ? 'scale-100 opacity-100' : 'scale-50 opacity-0')} strokeWidth={3} aria-hidden />
                      </button>
                    );
                  })}
                </div>
              </Section>
            )}

            {page === 'behavior' && (
              <div className="space-y-2">
                <ToggleRow icon={ClipboardCheck} title={t('sAutoCopy')} hint={t('sAutoCopyHint')} checked={s.autoCopy} onChange={(v) => update({ autoCopy: v })} />
                <ToggleRow icon={History} title={t('sHistory')} hint={t('sHistoryHint')} checked={s.keepHistory} onChange={(v) => update({ keepHistory: v })} />
              </div>
            )}
          </div>
          {/* Author credit is the last item of the scrollable settings content */}
          <div className="mt-6"><AuthorStrip /></div>
        </div>
      </div>
    </Modal>
  );
}
