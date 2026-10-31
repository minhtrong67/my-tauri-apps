import { ArrowRight, Blocks, EyeOff, ListPlus, MonitorCog, Plus, RefreshCw, Sparkles, SquareMousePointer, TriangleAlert } from 'lucide-react'
import { api, isTauri } from '../lib/api'
import { useApp } from '../lib/app'
import { useSettings } from '../lib/settings'
import { MenuPreview } from '../components/MenuPreview'
import { Button, Chip, Switch } from '../components/ui'

export default function Overview() {
  const { t } = useSettings()
  const { state, os, go, setClassic, pendingRestart, askRestart } = useApp()
  const active = state.entries.filter((e) => e.enabled).length
  const hidden = state.hiddenVerbs.length + state.blockedClsids.length

  return (
    <div className="stagger space-y-4">
      <div className="grid gap-4 lg:grid-cols-5" style={{ '--i': 0 } as React.CSSProperties}>
        <section className="relative overflow-hidden rounded-[36px] bg-primary-container p-8 text-on-primary-container lg:col-span-3">
          <div className="blob pointer-events-none absolute -right-16 -top-20 h-64 w-64 bg-tertiary-container opacity-70" />
          <div className="blob pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 bg-secondary-container opacity-60" style={{ animationDelay: '-6s' }} />
          <div className="relative">
            <Chip tone="primary" className="!bg-on-primary-container/10 !text-on-primary-container" icon={<Sparkles size={13} />}>Windows 11</Chip>
            <h1 className="mt-4 max-w-md text-[2.35rem] font-semibold leading-[1.08] tracking-tight">{t('ovTitle')}</h1>
            <p className="mt-3 max-w-md text-[0.97rem] leading-relaxed opacity-85">{t('ovSub')}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button label={t('cmdAdd')} icon={<Plus size={19} />} onClick={() => go('commands')} size="lg" />
              <Button label={t('navLayout')} icon={<ArrowRight size={19} />} variant="tonal" onClick={() => go('layout')} size="lg" className="!bg-surface/70" />
            </div>
          </div>
        </section>
        <section className="card flex flex-col items-center justify-center gap-3 p-6 lg:col-span-2">
          <MenuPreview entries={state.entries} classic={state.classic} />
          <p className="text-center text-[0.76rem] text-on-surface-variant">{t('previewHint')}</p>
        </section>
      </div>

      <section className="card flex flex-wrap items-center gap-4 p-5" style={{ '--i': 1 } as React.CSSProperties}>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tertiary-container text-on-tertiary-container"><SquareMousePointer size={24} /></span>
        <div className="min-w-[220px] flex-1">
          <h2 className="text-[1.05rem] font-semibold">{t('classicTitle')}</h2>
          <p className="mt-0.5 text-[0.85rem] text-on-surface-variant">{t('classicDesc')}</p>
        </div>
        {pendingRestart && <Button label={t('restartExplorer')} icon={<RefreshCw size={18} />} variant="tonal" size="sm" onClick={askRestart} />}
        <Switch checked={state.classic} onChange={setClassic} label={t('classicTitle')} />
      </section>

      <div className="grid gap-4 sm:grid-cols-3" style={{ '--i': 2 } as React.CSSProperties}>
        <button onClick={() => go('commands')} className="sl press card flex items-center gap-4 p-5 text-left">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container"><ListPlus size={24} /></span>
          <span><span className="block text-[2rem] font-semibold leading-none">{active}</span><span className="text-[0.85rem] text-on-surface-variant">{t('statCommands')}</span></span>
        </button>
        <button onClick={() => go('system')} className="sl press card flex items-center gap-4 p-5 text-left">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-container text-on-secondary-container"><EyeOff size={24} /></span>
          <span><span className="block text-[2rem] font-semibold leading-none">{hidden}</span><span className="text-[0.85rem] text-on-surface-variant">{t('statHidden')}</span></span>
        </button>
        <div className="card flex items-center gap-4 p-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container-highest text-on-surface-variant"><MonitorCog size={24} /></span>
          <span className="min-w-0">
            <span className="block truncate text-[1rem] font-semibold">{os?.name || 'Windows'}{os?.displayVersion ? ` ${os.displayVersion}` : ''}</span>
            <span className="block truncate text-[0.82rem] text-on-surface-variant">{os ? t('ovBuild', { build: os.build, ubr: os.ubr }) : t('ovSystem')}</span>
          </span>
        </div>
      </div>

      {os && !os.isWin11 && (
        <div className="flex items-center gap-3 rounded-2xl bg-warning-container p-4 text-on-warning-container" style={{ '--i': 3 } as React.CSSProperties}>
          <TriangleAlert size={20} /><p className="text-[0.88rem]">{t('ovNotWin11')}</p>
        </div>
      )}

      <section className="card p-6" style={{ '--i': 4 } as React.CSSProperties}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary-container text-on-secondary-container"><Blocks size={22} /></span>
          <h2 className="text-[1.15rem] font-semibold">{t('winCustomTitle')}</h2>
          {!isTauri && <Chip tone="warning" className="ml-auto">{t('demoData')}</Chip>}
        </div>
        <p className="mt-3 max-w-3xl text-[0.9rem] leading-relaxed text-on-surface-variant">{t('winCustomDesc')}</p>
        <ol className="mt-4 grid gap-2 sm:grid-cols-3">
          {(['winStep1', 'winStep2', 'winStep3'] as const).map((k, i) => (
            <li key={k} className="flex gap-3 rounded-2xl bg-surface-container p-3.5 text-[0.84rem]">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[0.75rem] font-bold text-on-primary">{i + 1}</span>
              <span>{t(k)}</span>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button label={t('winOpenUpdates')} icon={<ArrowRight size={18} />} variant="tonal" onClick={() => api.openUri('ms-settings:windowsupdate-optionalupdates')} />
          <p className="text-[0.8rem] text-on-surface-variant">{t('winCustomNote')}</p>
        </div>
      </section>
    </div>
  )
}
