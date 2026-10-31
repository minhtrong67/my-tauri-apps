import { ChevronRight, ClipboardPaste, Copy, ExternalLink, Info, Pencil, Scissors, Share2, Trash2, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Entry } from '../lib/api'
import { useSettings } from '../lib/settings'
import { cx } from './ui'

const FILE_SCOPES = ['files', 'ext', 'image', 'video', 'audio', 'text']

function Row({ icon, label, kbd, chevron, accent, dim }: { icon?: ReactNode; label: string; kbd?: string; chevron?: boolean; accent?: boolean; dim?: boolean }) {
  return (
    <div className={cx('flex h-9 items-center gap-3 rounded-lg px-3 text-[0.82rem]', accent ? 'bg-primary-container text-on-primary-container' : 'text-on-surface', dim && 'opacity-50')}>
      <span className="flex w-4 justify-center text-on-surface-variant">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {kbd && <span className="text-[0.72rem] text-on-surface-variant">{kbd}</span>}
      {chevron && <ChevronRight size={14} className="text-on-surface-variant" />}
    </div>
  )
}

export function MenuPreview({ entries, classic }: { entries: Entry[]; classic: boolean }) {
  const { t, lang } = useSettings()
  const vi = lang === 'vi'
  const mine = entries.filter((e) => e.enabled && e.scopes.some((s) => FILE_SCOPES.includes(s)))
  const top = mine.filter((e) => e.position === 'top')
  const rest = mine.filter((e) => e.position !== 'top')
  const groups = (list: Entry[]) => {
    const seen = new Set<string>()
    return list.filter((e) => { if (!e.submenu) return true; if (seen.has(e.submenu)) return false; seen.add(e.submenu); return true })
  }
  const custom = (e: Entry) => (
    <Row key={e.id} accent icon={<Zap size={14} />} label={e.submenu || e.label} chevron={!!e.submenu} kbd={e.shiftOnly ? '⇧' : undefined} />
  )
  return (
    <div key={String(classic)} className="anim-pop w-full max-w-[290px] rounded-2xl border border-outline-variant bg-surface-container-lowest p-1.5 shadow-e3" aria-label={t('previewTitle')}>
      {!classic && (
        <div className="mb-1 flex justify-between rounded-lg bg-surface-container px-3 py-2 text-on-surface-variant">
          {[Scissors, Copy, ClipboardPaste, Pencil, Share2, Trash2].map((I, i) => <I key={i} size={16} />)}
        </div>
      )}
      {classic && groups(top).map(custom)}
      <Row icon={<ExternalLink size={14} />} label={vi ? 'Mở' : 'Open'} kbd="Enter" />
      <Row label={vi ? 'Mở bằng…' : 'Open with…'} chevron />
      {classic && (
        <>
          <Row label={vi ? 'Gửi tới' : 'Send to'} chevron />
          <Row icon={<Scissors size={14} />} label={vi ? 'Cắt' : 'Cut'} />
          <Row icon={<Copy size={14} />} label={vi ? 'Sao chép' : 'Copy'} />
          <Row icon={<Trash2 size={14} />} label={vi ? 'Xoá' : 'Delete'} />
          <Row icon={<Pencil size={14} />} label={vi ? 'Đổi tên' : 'Rename'} />
          {groups(rest).map(custom)}
        </>
      )}
      <div className="my-1 h-px bg-outline-variant" />
      <Row icon={<Info size={14} />} label={vi ? 'Thuộc tính' : 'Properties'} kbd="Alt+Enter" />
      {!classic && (
        <Row label={vi ? 'Hiện thêm tuỳ chọn' : 'Show more options'} kbd="Shift+F10" chevron accent={mine.length > 0} />
      )}
    </div>
  )
}
