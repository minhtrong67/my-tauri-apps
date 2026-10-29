import { ClipboardPaste, FolderOpen, Image as ImageIcon, MonitorUp, Sparkles, Clock } from 'lucide-react'
import { useT } from '../lib/i18n'
import { Button } from './ui/Button'

interface Props { onOpen: () => void; onPaste: () => void; onCapture: () => void; onSample: () => void; recent: string[]; onRecent: (p: string) => void; canCapture: boolean }

export function EmptyState({ onOpen, onPaste, onCapture, onSample, recent, onRecent, canCapture }: Props) {
  const t = useT()
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 px-6 py-8 text-center">
      <div className="relative anim-pop">
        <div className="blob absolute -inset-5 bg-primary-container/70" />
        <div className="blob absolute -inset-1 bg-tertiary-container" style={{ animationDelay: '-3s' }} />
        <div className="blob anim-float relative flex h-32 w-32 items-center justify-center bg-primary text-on-primary elev-3" style={{ animationDelay: '-1.5s' }}>
          <ImageIcon size={52} strokeWidth={1.8} />
          <Sparkles size={26} className="absolute -right-3 -top-3 text-tertiary" fill="currentColor" />
        </div>
      </div>
      <div className="stagger flex max-w-xl flex-col items-center gap-3">
        <h1 className="text-[2.1rem] font-bold leading-[1.1] tracking-tight text-on-surface" style={{ ['--i' as string]: 1 }}>{t('emptyT')}</h1>
        <p className="text-[0.95rem] leading-relaxed text-on-surface-variant" style={{ ['--i' as string]: 2 }}>{t('emptyH')}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2.5" style={{ ['--i' as string]: 3 }}>
          <Button variant="filled" size="lg" icon={FolderOpen} onClick={onOpen}>{t('open')}</Button>
          <Button variant="tonal" size="lg" icon={ClipboardPaste} onClick={onPaste}>{t('paste')}</Button>
          {canCapture && <Button variant="tertiary" size="lg" icon={MonitorUp} onClick={onCapture}>{t('capture')}</Button>}
        </div>
        <button type="button" onClick={onSample} className="sl morph mt-1 px-4 py-2 text-[0.85rem] font-medium text-primary" style={{ ['--i' as string]: 4 }}>{t('sample')}</button>
        <p className="text-[0.8rem] text-on-surface-variant" style={{ ['--i' as string]: 5 }}><kbd>Ctrl</kbd> + <kbd>V</kbd> · {t('tipDrop')}</p>
      </div>
      {recent.length > 0 && (
        <div className="anim-up w-full max-w-xl rounded-3xl bg-surface-container p-3 text-left" style={{ animationDelay: '.3s' }}>
          <div className="mb-1 flex items-center gap-2 px-2 text-[0.75rem] font-semibold uppercase tracking-wider text-on-surface-variant"><Clock size={14} />{t('recent')}</div>
          {recent.slice(0, 4).map((p) => (
            <button key={p} type="button" onClick={() => onRecent(p)} className="sl morph sq flex w-full items-center gap-3 px-3 py-2 text-left" style={{ borderRadius: 16 }}>
              <ImageIcon size={16} className="text-primary" /><span className="min-w-0 flex-1 truncate text-[0.85rem]">{p.split(/[\\/]/).pop()}</span>
              <span className="hidden max-w-[40%] truncate text-[0.72rem] text-on-surface-variant sm:block">{p.replace(/[\\/][^\\/]*$/, '')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
