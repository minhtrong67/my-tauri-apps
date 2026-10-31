import { useCallback, useEffect, useState } from 'react'
import { Download, FileJson, FolderOpen, RotateCcw, Trash2, Upload, X, ShieldAlert, HardDriveDownload } from 'lucide-react'
import { open } from '@tauri-apps/plugin-dialog'
import { api, errMsg, isTauri, type AppState, type BackupFile, type Entry } from '../lib/api'
import { useApp } from '../lib/app'
import { useSettings } from '../lib/settings'
import { Button, ConfirmDialog, EmptyState, IconButton, PageHeader, useToast } from '../components/ui'

const pad = (n: number) => String(n).padStart(2, '0')
const stamp = (d = new Date()) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
const fmtSize = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`)

function parse(text: string): AppState | null {
  try {
    const j = JSON.parse(text)
    if (!j || typeof j !== 'object' || !Array.isArray(j.entries)) return null
    const entries: Entry[] = j.entries.filter((e: any) => e && typeof e.label === 'string' && typeof e.command === 'string').map((e: any) => ({
      id: String(e.id || Math.random().toString(36).slice(2, 10)), label: e.label, command: e.command, icon: e.icon ?? '',
      scopes: Array.isArray(e.scopes) ? e.scopes : [], extensions: Array.isArray(e.extensions) ? e.extensions : [], submenu: e.submenu ?? '',
      position: ['top', 'bottom'].includes(e.position) ? e.position : 'default', shiftOnly: !!e.shiftOnly, separatorBefore: !!e.separatorBefore,
      separatorAfter: !!e.separatorAfter, enabled: e.enabled !== false,
    }))
    return {
      entries, classic: !!j.classic,
      hiddenVerbs: Array.isArray(j.hiddenVerbs) ? j.hiddenVerbs.filter((h: any) => h && typeof h.base === 'string' && typeof h.name === 'string') : [],
      blockedClsids: Array.isArray(j.blockedClsids) ? j.blockedClsids.filter((c: any) => typeof c === 'string') : [],
    }
  } catch { return null }
}

export default function Backup() {
  const { t, saveDir } = useSettings()
  const toast = useToast()
  const { state, applyState, markPending } = useApp()
  const [files, setFiles] = useState<BackupFile[]>([])
  const [pending, setPending] = useState<AppState | null>(null)
  const [delFile, setDelFile] = useState<BackupFile | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => { if (saveDir) api.listBackups(saveDir).then(setFiles).catch(() => setFiles([])) }, [saveDir])
  useEffect(refresh, [refresh])

  const fail = (e: unknown) => toast.error(t('errGeneric', { msg: errMsg(e) }))

  const exportNow = async () => {
    try {
      const body = JSON.stringify({ app: 'material-menu', version: 1, createdAt: new Date().toISOString(), ...state }, null, 2)
      await api.writeBackup(saveDir, `material-menu-${stamp()}.json`, body)
      toast.success(t('bkExported'), { label: t('openFolder'), onClick: () => api.openPath(saveDir) })
      refresh()
    } catch (e) { fail(e) }
  }
  const load = async (path: string) => {
    try {
      const s = parse(await api.readText(path))
      if (!s) toast.error(t('bkInvalid')); else setPending(s)
    } catch (e) { fail(e) }
  }
  const importFile = async () => {
    if (!isTauri) return
    try {
      const r = await open({ multiple: false, filters: [{ name: 'JSON', extensions: ['json'] }] })
      if (typeof r === 'string') load(r)
    } catch (e) { fail(e) }
  }
  const doRestore = async () => {
    if (!pending) return
    setBusy(true)
    try { applyState(await api.restore(pending)); markPending(); toast.success(t('bkRestored')); setPending(null) } catch (e) { fail(e) }
    setBusy(false)
  }
  const doReset = async () => {
    setBusy(true)
    try { applyState(await api.resetAll()); markPending(); toast.success(t('resetDone')); setResetOpen(false) } catch (e) { fail(e) }
    setBusy(false)
  }

  return (
    <div>
      <PageHeader title={t('bkTitle')} sub={t('bkSub')} />
      <div className="stagger grid gap-4 md:grid-cols-2">
        <section className="card flex flex-col gap-4 p-6" style={{ '--i': 0 } as React.CSSProperties}>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container"><Download size={24} /></span>
          <div><h2 className="text-[1.1rem] font-semibold">{t('bkExport')}</h2><p className="mt-1 text-[0.86rem] text-on-surface-variant">{t('bkExportDesc')}</p></div>
          <p className="truncate rounded-xl bg-surface-container px-3 py-2 font-mono text-[0.75rem] text-on-surface-variant" title={saveDir}>{saveDir}</p>
          <div className="mt-auto flex flex-wrap gap-2">
            <Button label={t('bkExport')} icon={<HardDriveDownload size={18} />} onClick={exportNow} />
            <Button label={t('openFolder')} icon={<FolderOpen size={18} />} variant="tonal" onClick={() => api.openPath(saveDir)} />
          </div>
        </section>
        <section className="card flex flex-col gap-4 p-6" style={{ '--i': 1 } as React.CSSProperties}>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tertiary-container text-on-tertiary-container"><Upload size={24} /></span>
          <div><h2 className="text-[1.1rem] font-semibold">{t('bkImport')}</h2><p className="mt-1 text-[0.86rem] text-on-surface-variant">{t('bkImportDesc')}</p></div>
          <div className="mt-auto"><Button label={t('bkImport')} icon={<Upload size={18} />} variant="tonal" onClick={importFile} disabled={!isTauri} /></div>
        </section>
      </div>

      <h2 className="mb-3 mt-8 px-1 text-[1.05rem] font-semibold">{t('bkList')}</h2>
      {files.length === 0 ? (
        <div className="card"><EmptyState icon={<FileJson size={40} />} title={t('bkNone')} /></div>
      ) : (
        <ul className="stagger space-y-2">
          {files.map((f, n) => (
            <li key={f.path} style={{ '--i': Math.min(n, 8) } as React.CSSProperties} className="card flex items-center gap-3 p-3.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary-container text-on-secondary-container"><FileJson size={21} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.93rem] font-medium">{f.name}</p>
                <p className="text-[0.76rem] text-on-surface-variant">{new Date(f.modified * 1000).toLocaleString()} · {fmtSize(f.size)}</p>
              </div>
              <IconButton label={t('restore')} variant="tonal" onClick={() => load(f.path)}><RotateCcw size={18} /></IconButton>
              <IconButton label={t('delete')} variant="error" onClick={() => setDelFile(f)}><Trash2 size={18} /></IconButton>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-8 flex flex-wrap items-center gap-4 rounded-3xl border border-error/30 bg-error-container/40 p-5">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-error-container text-on-error-container"><ShieldAlert size={24} /></span>
        <div className="min-w-[220px] flex-1"><h2 className="text-[1.05rem] font-semibold">{t('resetTitle')}</h2><p className="mt-0.5 text-[0.85rem] text-on-surface-variant">{t('resetDesc')}</p></div>
        <Button label={t('resetAction')} icon={<RotateCcw size={18} />} variant="error" onClick={() => setResetOpen(true)} />
      </section>

      <ConfirmDialog open={!!pending} onClose={() => setPending(null)} onConfirm={doRestore} loading={busy} title={t('bkRestoreTitle')}
        confirmLabel={t('restore')} confirmIcon={<RotateCcw size={18} />}
        body={pending && t('bkRestoreBody', { cmds: pending.entries.length, hidden: pending.hiddenVerbs.length + pending.blockedClsids.length, classic: pending.classic ? t('on') : t('off') })} />
      <ConfirmDialog open={!!delFile} onClose={() => setDelFile(null)} danger title={t('bkDelTitle')} confirmLabel={t('delete')} confirmIcon={<Trash2 size={18} />}
        body={t('bkDelBody', { name: delFile?.name ?? '' })}
        onConfirm={async () => { if (delFile) { try { await api.deleteBackup(delFile.path); refresh() } catch (e) { fail(e) } } setDelFile(null) }} />
      <ConfirmDialog open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={doReset} loading={busy} danger title={t('resetConfirmTitle')}
        confirmLabel={t('resetAction')} confirmIcon={<X size={18} />} body={t('resetConfirmBody')} />
    </div>
  )
}
