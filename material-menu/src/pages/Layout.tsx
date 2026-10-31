import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { ChevronRight, Lock, Puzzle, RefreshCw, SquareTerminal, Zap } from 'lucide-react'
import { api, errMsg, type Entry, type SystemItem } from '../lib/api'
import { useApp } from '../lib/app'
import { useSettings } from '../lib/settings'
import type { Key } from '../lib/i18n'
import { Chip, cx, IconButton, PageHeader, Segmented, Switch, Tooltip, useToast } from '../components/ui'
import { itemName } from './System'

type Loc = 'desktop' | 'background' | 'folders' | 'files' | 'drives'
const LOCS: { id: Loc; label: Key; scopes: string[]; entryScopes: string[] }[] = [
  { id: 'desktop', label: 'scDesktop', scopes: ['desktop', 'background', 'allobjects'], entryScopes: ['desktop', 'background'] },
  { id: 'background', label: 'scBackground', scopes: ['background', 'allobjects'], entryScopes: ['background'] },
  { id: 'folders', label: 'scFolders', scopes: ['folders', 'allobjects'], entryScopes: ['folders'] },
  { id: 'files', label: 'scFiles', scopes: ['files', 'allobjects'], entryScopes: ['files', 'image', 'video', 'audio', 'text', 'ext'] },
  { id: 'drives', label: 'scDrives', scopes: ['drives', 'allobjects'], entryScopes: ['drives'] },
]

interface Fixed { en: string; vi: string; sub?: boolean; sep?: boolean }
const BUILTIN: Record<Loc, Fixed[]> = {
  desktop: [{ en: 'View', vi: 'Xem', sub: true }, { en: 'Sort by', vi: 'Sắp xếp theo', sub: true }, { en: 'Refresh', vi: 'Làm mới' }, { en: 'Paste', vi: 'Dán', sep: true }],
  background: [{ en: 'View', vi: 'Xem', sub: true }, { en: 'Sort by', vi: 'Sắp xếp theo', sub: true }, { en: 'Refresh', vi: 'Làm mới' }, { en: 'Paste', vi: 'Dán', sep: true }],
  folders: [{ en: 'Cut', vi: 'Cắt' }, { en: 'Copy', vi: 'Sao chép' }, { en: 'Rename', vi: 'Đổi tên' }, { en: 'Delete', vi: 'Xoá' }, { en: 'Properties', vi: 'Thuộc tính', sep: true }],
  files: [{ en: 'Open', vi: 'Mở' }, { en: 'Cut', vi: 'Cắt' }, { en: 'Copy', vi: 'Sao chép' }, { en: 'Rename', vi: 'Đổi tên' }, { en: 'Delete', vi: 'Xoá' }, { en: 'Properties', vi: 'Thuộc tính', sep: true }],
  drives: [{ en: 'Open', vi: 'Mở' }, { en: 'Properties', vi: 'Thuộc tính', sep: true }],
}

interface Row {
  key: string; label: string; kind: 'builtin' | 'verb' | 'handler' | 'custom'; hidden: boolean; sub?: boolean; sep?: boolean
  item?: SystemItem; entry?: Entry
}

function Glyph({ kind, hidden }: { kind: Row['kind']; hidden?: boolean }) {
  const c = { builtin: 'bg-surface-container-highest text-on-surface-variant', verb: 'bg-secondary-container text-on-secondary-container', handler: 'bg-tertiary-container text-on-tertiary-container', custom: 'bg-primary-container text-on-primary-container' }[kind]
  const I = kind === 'handler' ? Puzzle : kind === 'custom' ? Zap : kind === 'verb' ? SquareTerminal : Lock
  return <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-opacity', c, hidden && 'opacity-40')}><I size={kind === 'builtin' ? 14 : 16} /></span>
}

export default function Layout() {
  const { t, lang } = useSettings()
  const toast = useToast()
  const { state, saveEntries, markPending, reload } = useApp()
  const [loc, setLoc] = useState<Loc>('desktop')
  const [items, setItems] = useState<SystemItem[]>([])
  const [loading, setLoading] = useState(true)

  const scan = useCallback(async () => {
    setLoading(true)
    try { setItems(await api.scan()) } catch (e) { toast.error(t('errGeneric', { msg: errMsg(e) })) }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { scan() }, [scan])

  const rows = useMemo<Row[]>(() => {
    const L = LOCS.find((l) => l.id === loc)!
    const out: Row[] = BUILTIN[loc].map((b, i) => ({ key: 'b' + i, label: b[lang], kind: 'builtin', hidden: false, sub: b.sub, sep: b.sep }))
    const sys = items.filter((i) => i.scopes.some((s) => L.scopes.includes(s)))
    const dedupe = new Map<string, SystemItem>()
    for (const i of sys) { const k = i.kind === 'handler' ? i.clsid : itemName(i, lang).toLowerCase() + i.kind; if (!dedupe.has(k)) dedupe.set(k, i) }
    const sorted = [...dedupe.values()].sort((a, b) => (a.kind === b.kind ? itemName(a, lang).localeCompare(itemName(b, lang)) : a.kind === 'verb' ? -1 : 1))
    for (const i of sorted) out.push({ key: i.id, label: itemName(i, lang), kind: i.kind, hidden: i.hidden, item: i, sub: i.kind === 'handler' && /new|tortoise|send|share/i.test(i.name + i.display) })
    const mine = state.entries.filter((e) => e.scopes.some((s) => L.entryScopes.includes(s)))
    for (const e of [...mine.filter((e) => e.position === 'top'), ...mine.filter((e) => e.position !== 'top')])
      out.push({ key: 'e' + e.id, label: e.submenu || e.label, kind: 'custom', hidden: !e.enabled, entry: e, sub: !!e.submenu })
    return out
  }, [items, state.entries, loc, lang])

  const toggle = async (r: Row, on: boolean) => {
    if (r.entry) { await saveEntries(state.entries.map((x) => (x.id === r.entry!.id ? { ...x, enabled: on } : x))); return }
    const it = r.item!
    const match = (x: SystemItem) => (it.kind === 'handler' ? x.clsid === it.clsid : x.id === it.id)
    setItems((a) => a.map((x) => (match(x) ? { ...x, hidden: !on } : x)))
    try { await api.setHidden(it, !on); markPending(); reload() }
    catch (e) { setItems((a) => a.map((x) => (match(x) ? { ...x, hidden: on } : x))); toast.error(t('errGeneric', { msg: errMsg(e) })) }
  }

  const switchable = rows.filter((r) => r.kind !== 'builtin')
  const shown = switchable.filter((r) => !r.hidden).length
  const visible = rows.filter((r) => !r.hidden)

  return (
    <div>
      <PageHeader title={t('lyTitle')} sub={t('lySub')} actions={
        <IconButton label={t('refresh')} variant="tonal" onClick={scan}><RefreshCw size={19} style={loading ? { animation: 'spin .8s linear infinite' } : undefined} /></IconButton>} />

      <div className="mb-5 overflow-x-auto pb-1">
        <Segmented value={loc} onChange={setLoc} className="min-w-max" options={LOCS.map((l) => ({ value: l.id, label: t(l.label) }))} />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="card p-2.5">
          <div className="flex items-center justify-between px-3 pb-2 pt-1.5">
            <span className="text-[0.85rem] font-medium text-on-surface-variant">{t('lyCount', { n: shown, m: switchable.length })}</span>
            <Tooltip label={t('lyLocked')}><span className="inline-flex items-center gap-1.5 text-[0.78rem] text-on-surface-variant"><Lock size={13} />{t('lyLocked').split('.')[0]}</span></Tooltip>
          </div>
          {loading && items.length === 0 ? (
            <div className="space-y-1.5 p-1">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 animate-pulse rounded-2xl bg-surface-container" style={{ animationDelay: `${i * 70}ms` }} />)}</div>
          ) : (
            <ul key={loc} className="stagger">
              {rows.map((r, n) => (
                <li key={r.key} style={{ '--i': Math.min(n, 14) } as CSSProperties}>
                  <div className={cx('flex h-[52px] items-center gap-3 rounded-2xl px-3 transition-colors', r.kind !== 'builtin' && 'hover:bg-on-surface/[.05]')}>
                    <Glyph kind={r.kind} hidden={r.hidden} />
                    <span className={cx('min-w-0 flex-1 truncate text-[0.95rem] transition-all', r.hidden && 'text-on-surface-variant line-through decoration-on-surface-variant/40', r.kind === 'builtin' && 'text-on-surface-variant')}>{r.label}</span>
                    {r.sub && <ChevronRight size={16} className="text-on-surface-variant" />}
                    {r.kind === 'custom' && <Chip tone="primary">{t('lyYours')}</Chip>}
                    {r.kind === 'builtin' ? (
                      <Tooltip label={t('lyLocked')}><span className="flex h-8 w-[52px] items-center justify-center text-on-surface-variant/60"><Lock size={16} /></span></Tooltip>
                    ) : (
                      <Switch checked={!r.hidden} onChange={(v) => toggle(r, v)} label={r.label} />
                    )}
                  </div>
                  {r.sep && <div className="mx-3 my-1 h-px bg-outline-variant/60" />}
                </li>
              ))}
            </ul>
          )}
          <p className="px-3 pb-2 pt-3 text-[0.78rem] text-on-surface-variant">{t('lyNote')}</p>
        </section>

        <aside className="lg:sticky lg:top-0">
          <p className="mb-2 px-1 text-[0.82rem] font-medium text-on-surface-variant">{t('lyPreview')}</p>
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-1.5 shadow-e3">
            {visible.length === 0 && <p className="p-4 text-center text-[0.85rem] text-on-surface-variant">{t('lyEmpty')}</p>}
            {visible.map((r) => (
              <div key={r.key}>
                <div className={cx('anim-fade flex h-9 items-center gap-3 rounded-lg px-3 text-[0.85rem]', r.kind === 'builtin' ? 'text-on-surface-variant' : r.kind === 'custom' ? 'text-primary' : 'text-on-surface')}>
                  <span className={cx('h-4 w-4 shrink-0 rounded-[5px]', r.kind === 'builtin' ? 'bg-transparent' : r.kind === 'custom' ? 'bg-primary/70' : r.kind === 'handler' ? 'bg-tertiary/60' : 'bg-secondary/60')} />
                  <span className="flex-1 truncate">{r.label}</span>
                  {r.sub && <ChevronRight size={14} className="text-on-surface-variant" />}
                </div>
                {r.sep && <div className="mx-2 my-1 h-px bg-outline-variant" />}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
