import { useCallback, useEffect, useMemo, useState } from 'react'
import { Blocks, Filter, Puzzle, RefreshCw, Search, SquareTerminal } from 'lucide-react'
import { api, errMsg, iconFile, KNOWN, type SystemItem } from '../lib/api'
import { useApp } from '../lib/app'
import { useSettings } from '../lib/settings'
import type { Key } from '../lib/i18n'
import { Chip, EmptyState, IconButton, Loader, PageHeader, Segmented, Select, Switch, ToggleChip, Tooltip, useToast } from '../components/ui'
import { IconTile } from '../components/IconTile'

const SCOPE_LABEL: Record<string, Key> = {
  files: 'scFiles', folders: 'scFolders', background: 'scBackground', drives: 'scDrives', desktop: 'scDesktop', allobjects: 'scAllObjects',
}

export function itemName(i: SystemItem, lang: 'en' | 'vi') {
  const k = KNOWN[i.clsid.toLowerCase()] ?? KNOWN[i.name.toLowerCase()]
  return k ? k[lang] : i.display || i.name
}

export default function System() {
  const { t, lang } = useSettings()
  const toast = useToast()
  const { markPending, reload } = useApp()
  const [items, setItems] = useState<SystemItem[]>([])
  const [loading, setLoading] = useState(true)
  const [kind, setKind] = useState<'all' | 'verb' | 'handler'>('all')
  const [scope, setScope] = useState('all')
  const [q, setQ] = useState('')
  const [third, setThird] = useState(false)

  const scan = useCallback(async () => {
    setLoading(true)
    try { setItems(await api.scan()) } catch (e) { toast.error(t('errGeneric', { msg: errMsg(e) })) }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { scan() }, [scan])

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return items
      .filter((i) => (kind === 'all' || i.kind === kind) && (scope === 'all' || i.scopes.includes(scope)) && (!third || i.thirdParty))
      .filter((i) => !s || `${itemName(i, lang)} ${i.name} ${i.command} ${i.clsid}`.toLowerCase().includes(s))
      .sort((a, b) => itemName(a, lang).localeCompare(itemName(b, lang)))
  }, [items, kind, scope, q, lang, third])

  const toggle = async (item: SystemItem, visible: boolean) => {
    setItems((a) => a.map((x) => (x.kind === item.kind && (item.kind === 'handler' ? x.clsid === item.clsid : x.id === item.id) ? { ...x, hidden: !visible } : x)))
    try { await api.setHidden(item, !visible); markPending(); reload() }
    catch (e) {
      setItems((a) => a.map((x) => (x.id === item.id ? { ...x, hidden: visible } : x)))
      toast.error(t('errGeneric', { msg: errMsg(e) }))
    }
  }

  const scopeOpts = [{ value: 'all', label: t('sysScopeAll') }, ...Object.entries(SCOPE_LABEL).map(([v, k]) => ({ value: v, label: t(k) }))]

  return (
    <div>
      <PageHeader title={t('sysTitle')} sub={t('sysSub')} actions={
        <IconButton label={t('refresh')} variant="tonal" onClick={scan}><RefreshCw size={19} style={loading ? { animation: 'spin .8s linear infinite' } : undefined} /></IconButton>} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input className="field !h-12 !rounded-full !py-0 !pl-11" placeholder={t('sysSearch')} aria-label={t('sysSearch')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="w-48"><Select ariaLabel={t('sysScopeAll')} value={scope} onChange={setScope} options={scopeOpts} icon={<Filter size={17} />} className="!rounded-full" /></div>
        <ToggleChip on={third} onClick={() => setThird((v) => !v)}>{t('sysThirdOnly')}</ToggleChip>
        <Segmented value={kind} onChange={setKind} options={[{ value: 'all', label: t('sysAll') }, { value: 'verb', label: t('sysCommands') }, { value: 'handler', label: t('sysExtensions') }]} />
      </div>
      <p className="mb-3 px-1 text-[0.8rem] text-on-surface-variant">{t('sysNote')}</p>

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-20 text-primary" aria-label={t('sysLoading')}><Loader size={64} /></div>
      ) : shown.length === 0 ? (
        <EmptyState icon={<Blocks size={44} />} title={t('sysEmpty')} />
      ) : (
        <ul className="stagger glist" key={kind + scope + (q ? 'q' : '') + third}>
          {shown.map((i, n) => (
            <li key={i.id} style={{ '--i': Math.min(n, 10) } as React.CSSProperties} className="[contain-intrinsic-size:auto_84px] [content-visibility:auto]">
             <div className={`gi flex items-center gap-3.5 bg-surface-container-low p-3.5 ${i.hidden ? 'opacity-60' : ''}`}>
              <IconTile file={i.kind === 'verb' ? iconFile(i.icon, i.command) : ''} dim={i.hidden} className={`h-11 w-11 rounded-2xl ${i.kind === 'verb' ? 'bg-secondary-container text-on-secondary-container' : 'bg-tertiary-container text-on-tertiary-container'}`}
                fallback={i.kind === 'verb' ? <SquareTerminal size={21} /> : <Puzzle size={21} />} />
              <div className="min-w-0 flex-1">
                <h3 className={`truncate text-[0.97rem] font-medium ${i.hidden ? 'line-through decoration-on-surface-variant/50' : ''}`}>{itemName(i, lang)}</h3>
                <p className="truncate font-mono text-[0.72rem] text-on-surface-variant" title={i.command || i.clsid || i.name}>{i.command || i.clsid || i.name}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Chip tone={i.kind === 'verb' ? 'neutral' : 'tertiary'}>{i.kind === 'verb' ? t('kindVerb') : t('kindHandler')}</Chip>
                  {i.thirdParty && <Tooltip label={t('thirdPartyHint')}><span><Chip tone="warning">{t('thirdParty')}</Chip></span></Tooltip>}
                  {i.scopes.map((s) => SCOPE_LABEL[s] && <Chip key={s} tone="primary">{t(SCOPE_LABEL[s])}</Chip>)}
                </div>
              </div>
              <Switch checked={!i.hidden} onChange={(v) => toggle(i, v)} label={i.hidden ? t('sysHidden') : t('sysShown')} />
             </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
