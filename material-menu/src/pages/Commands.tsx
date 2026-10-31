import { useMemo, useState, type ReactNode } from 'react'
import {
  AudioLines, ChevronDown, ChevronUp, Copy, FileText, FileType, Film, Folder, FolderOpen, HardDrive, Image as ImageIcon, LayoutList, Monitor,
  Pencil, Plus, Save, Search, Trash2, Wand2, X, Zap, File as FileIcon, SquareTerminal, Layers, ArrowBigUp, Info,
} from 'lucide-react'
import { open } from '@tauri-apps/plugin-dialog'
import { errMsg, isTauri, uid, type Entry, type ScopeKey } from '../lib/api'
import { useApp } from '../lib/app'
import { useSettings } from '../lib/settings'
import type { Key } from '../lib/i18n'
import { Button, Chip, Dialog, EmptyState, Field, IconButton, PageHeader, Segmented, Sheet, Switch, ToggleChip, useToast, ConfirmDialog } from '../components/ui'

export const SCOPES: { key: ScopeKey; label: Key; icon: ReactNode }[] = [
  { key: 'files', label: 'scFiles', icon: <FileIcon size={15} /> },
  { key: 'folders', label: 'scFolders', icon: <Folder size={15} /> },
  { key: 'background', label: 'scBackground', icon: <FolderOpen size={15} /> },
  { key: 'drives', label: 'scDrives', icon: <HardDrive size={15} /> },
  { key: 'desktop', label: 'scDesktop', icon: <Monitor size={15} /> },
  { key: 'image', label: 'scImage', icon: <ImageIcon size={15} /> },
  { key: 'video', label: 'scVideo', icon: <Film size={15} /> },
  { key: 'audio', label: 'scAudio', icon: <AudioLines size={15} /> },
  { key: 'text', label: 'scText', icon: <FileText size={15} /> },
  { key: 'ext', label: 'scExt', icon: <FileType size={15} /> },
]

const blank = (): Entry => ({
  id: uid(), label: '', command: '', icon: '', scopes: ['files', 'folders'], extensions: [], submenu: '',
  position: 'default', shiftOnly: false, separatorBefore: false, separatorAfter: false, enabled: true,
})

const PRESETS: { label: Key; command: string; icon: string; scopes: ScopeKey[] }[] = [
  { label: 'pTerminal', command: 'wt.exe -d "%V"', icon: '', scopes: ['folders', 'background'] },
  { label: 'pPowershell', command: 'powershell.exe -NoExit -Command "Set-Location -LiteralPath \'%V\'"', icon: 'powershell.exe', scopes: ['folders', 'background'] },
  { label: 'pCmd', command: 'cmd.exe /s /k pushd "%V"', icon: 'cmd.exe', scopes: ['folders', 'background'] },
  { label: 'pVscode', command: '"%LOCALAPPDATA%\\Programs\\Microsoft VS Code\\Code.exe" "%1"', icon: '%LOCALAPPDATA%\\Programs\\Microsoft VS Code\\Code.exe', scopes: ['files', 'folders'] },
  { label: 'pNotepad', command: 'notepad.exe "%1"', icon: 'notepad.exe', scopes: ['files'] },
  { label: 'pCopyPath', command: 'cmd.exe /c echo|set /p="%1"|clip', icon: '', scopes: ['files', 'folders'] },
]

function exeOf(cmd: string) {
  const c = cmd.trim()
  if (c.startsWith('"')) return c.slice(1, c.indexOf('"', 1) > 0 ? c.indexOf('"', 1) : undefined)
  return c.split(/\s+/)[0] ?? ''
}

export default function Commands() {
  const { t } = useSettings()
  const toast = useToast()
  const { state, saveEntries, setClassic, os } = useApp()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Entry | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [presets, setPresets] = useState(false)
  const [del, setDel] = useState<Entry | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [extText, setExtText] = useState('')

  const list = state.entries
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? list.filter((e) => (e.label + e.command + e.submenu).toLowerCase().includes(s)) : list
  }, [list, q])

  const openEditor = (e: Entry, fresh: boolean) => {
    setEditing({ ...e }); setIsNew(fresh); setErrors({}); setExtText(e.extensions.join(', ')); setSheetOpen(true)
  }
  const patch = (p: Partial<Entry>) => setEditing((e) => (e ? { ...e, ...p } : e))
  const toggleScope = (k: ScopeKey) => editing && patch({ scopes: editing.scopes.includes(k) ? editing.scopes.filter((s) => s !== k) : [...editing.scopes, k] })

  const submit = async () => {
    if (!editing) return
    const exts = extText.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean)
    const er: Record<string, string> = {}
    if (!editing.label.trim()) er.label = t('errLabel')
    if (!editing.command.trim()) er.command = t('errCommand')
    if (!editing.scopes.length) er.scope = t('errScope')
    if (editing.scopes.includes('ext') && !exts.length) er.ext = t('errExt')
    setErrors(er)
    if (Object.keys(er).length) return
    const e: Entry = { ...editing, label: editing.label.trim(), command: editing.command.trim(), submenu: editing.submenu.trim(), extensions: editing.scopes.includes('ext') ? exts : [] }
    const next = isNew ? [...list, e] : list.map((x) => (x.id === e.id ? e : x))
    if (await saveEntries(next)) { setSheetOpen(false); toast.success(t('savedToast')) }
  }

  const move = (i: number, d: -1 | 1) => {
    const next = [...list]; const j = i + d
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    saveEntries(next)
  }
  const pickFile = async (target: 'command' | 'icon') => {
    if (!isTauri) return
    try {
      const r = await open({ multiple: false, filters: target === 'icon' ? [{ name: 'Icon / exe', extensions: ['ico', 'exe', 'dll'] }] : [{ name: 'Program', extensions: ['exe', 'bat', 'cmd', 'ps1'] }] })
      if (typeof r === 'string') patch(target === 'command' ? { command: `"${r}" "%1"`, icon: editing?.icon || r } : { icon: r })
    } catch (e) { toast.error(t('errGeneric', { msg: errMsg(e) })) }
  }

  return (
    <div>
      <PageHeader title={t('cmdTitle')} sub={t('cmdSub')} actions={<>
        <Button label={t('cmdPresets')} icon={<Wand2 size={18} />} variant="tonal" onClick={() => setPresets(true)} />
        <Button label={t('cmdAdd')} icon={<Plus size={19} />} onClick={() => openEditor(blank(), true)} />
      </>} />

      {!state.classic && (
        <div className="anim-pop mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-secondary-container p-4 text-on-secondary-container">
          <Info size={20} className="shrink-0" />
          <p className="min-w-[220px] flex-1 text-[0.86rem]">{t('cmdBanner')}</p>
          {os?.isWin11 !== false && <Button label={t('cmdBannerAction')} icon={<Layers size={17} />} size="sm" onClick={() => setClassic(true)} />}
        </div>
      )}

      {list.length > 0 && (
        <div className="relative mb-4">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input className="field !rounded-full !pl-11" placeholder={t('cmdSearch')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('cmdSearch')} />
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState icon={<SquareTerminal size={44} />} title={t('cmdEmpty')} sub={t('cmdEmptySub')}
          action={<div className="flex gap-2"><Button label={t('cmdPresets')} icon={<Wand2 size={18} />} variant="tonal" onClick={() => setPresets(true)} /><Button label={t('cmdAdd')} icon={<Plus size={19} />} onClick={() => openEditor(blank(), true)} /></div>} />
      ) : (
        <ul className="stagger space-y-2.5">
          {shown.map((e, n) => {
            const i = list.indexOf(e)
            return (
              <li key={e.id} style={{ '--i': Math.min(n, 10) } as React.CSSProperties}
                className={`card flex flex-wrap items-center gap-3 p-4 transition-opacity ${e.enabled ? '' : 'opacity-60'}`}>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container"><Zap size={22} /></span>
                <div className="min-w-0 flex-1 basis-56">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-[1rem] font-semibold">{e.label}</h3>
                    {e.submenu && <Chip tone="tertiary" icon={<Layers size={11} />}>{e.submenu}</Chip>}
                    {e.shiftOnly && <Chip icon={<ArrowBigUp size={11} />}>Shift</Chip>}
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[0.76rem] text-on-surface-variant" title={e.command}>{e.command}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {e.scopes.map((s) => <Chip key={s} tone="primary">{t(SCOPES.find((x) => x.key === s)!.label)}{s === 'ext' && e.extensions.length ? `: ${e.extensions.join(' ')}` : ''}</Chip>)}
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <IconButton label={t('moveUp')} size="sm" disabled={i === 0} onClick={() => move(i, -1)}><ChevronUp size={18} /></IconButton>
                  <IconButton label={t('moveDown')} size="sm" disabled={i === list.length - 1} onClick={() => move(i, 1)}><ChevronDown size={18} /></IconButton>
                  <IconButton label={t('duplicate')} size="sm" onClick={() => openEditor({ ...e, id: uid(), label: e.label + ' (copy)' }, true)}><Copy size={17} /></IconButton>
                  <IconButton label={t('edit')} size="sm" onClick={() => openEditor(e, false)}><Pencil size={17} /></IconButton>
                  <IconButton label={t('delete')} size="sm" variant="error" onClick={() => setDel(e)}><Trash2 size={17} /></IconButton>
                </div>
                <Switch checked={e.enabled} label={t('optEnabled')} onChange={(v) => saveEntries(list.map((x) => (x.id === e.id ? { ...x, enabled: v } : x)))} />
              </li>
            )
          })}
        </ul>
      )}

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={isNew ? t('editorNew') : t('editorEdit')} subtitle={editing?.label || undefined} icon={<LayoutList size={22} />}
        footer={<>
          {!isNew && editing && <Button label={t('delete')} icon={<Trash2 size={18} />} variant="errorTonal" className="mr-auto" onClick={() => { setSheetOpen(false); setDel(editing) }} />}
          <Button label={t('cancel')} icon={<X size={18} />} variant="tonal" onClick={() => setSheetOpen(false)} />
          <Button label={t('save')} icon={<Save size={18} />} onClick={submit} />
        </>}>
        {editing && (
          <div className="space-y-5 pb-2">
            <Field label={t('fldLabel')} error={errors.label}>
              <input className="field" value={editing.label} placeholder={t('fldLabelPh')} onChange={(e) => patch({ label: e.target.value })} autoFocus />
            </Field>
            <Field label={t('fldCommand')} hint={t('fldCommandHint')} error={errors.command}>
              <div className="flex gap-2">
                <input className="field font-mono !text-[0.85rem]" value={editing.command} placeholder={t('fldCommandPh')} onChange={(e) => patch({ command: e.target.value })} spellCheck={false} />
                {isTauri && <IconButton label={t('browse')} variant="tonal" className="!h-[50px] !w-[50px] !rounded-2xl" onClick={() => pickFile('command')}><FolderOpen size={20} /></IconButton>}
              </div>
              <div className="mt-2 flex gap-1.5">
                {['%1', '%V'].map((tok) => <button key={tok} type="button" onClick={() => patch({ command: editing.command + (editing.command.endsWith(' ') || !editing.command ? '' : ' ') + `"${tok}"` })} className="sl rounded-lg bg-surface-container-highest px-2.5 py-1 font-mono text-[0.75rem]">{tok}</button>)}
              </div>
            </Field>
            <Field label={t('fldIcon')} hint={t('fldIconHint')}>
              <div className="flex gap-2">
                <input className="field font-mono !text-[0.85rem]" value={editing.icon} onChange={(e) => patch({ icon: e.target.value })} spellCheck={false} />
                <IconButton label={t('iconAuto')} variant="tonal" className="!h-[50px] !w-[50px] !rounded-2xl" onClick={() => patch({ icon: exeOf(editing.command) })}><Wand2 size={20} /></IconButton>
                {isTauri && <IconButton label={t('browse')} variant="tonal" className="!h-[50px] !w-[50px] !rounded-2xl" onClick={() => pickFile('icon')}><FolderOpen size={20} /></IconButton>}
              </div>
            </Field>
            <div>
              <span className="mb-2 block px-1 text-[0.82rem] font-medium text-on-surface-variant">{t('fldScope')}</span>
              <div className="flex flex-wrap gap-2">
                {SCOPES.map((s) => <ToggleChip key={s.key} on={editing.scopes.includes(s.key)} icon={s.icon} onClick={() => toggleScope(s.key)}>{t(s.label)}</ToggleChip>)}
              </div>
              {errors.scope && <span className="mt-1.5 block px-1 text-[0.78rem] text-error">{errors.scope}</span>}
            </div>
            {editing.scopes.includes('ext') && (
              <Field label={t('fldExt')} hint={t('fldExtHint')} error={errors.ext}>
                <input className="field font-mono" value={extText} placeholder=".txt, .md" onChange={(e) => setExtText(e.target.value)} />
              </Field>
            )}
            <Field label={t('fldSubmenu')} hint={t('fldSubmenuHint')}>
              <input className="field" value={editing.submenu} onChange={(e) => patch({ submenu: e.target.value })} />
            </Field>
            <div>
              <span className="mb-2 block px-1 text-[0.82rem] font-medium text-on-surface-variant">{t('fldPosition')}</span>
              <Segmented value={editing.position} onChange={(v) => patch({ position: v })} className="w-full"
                options={[{ value: 'default', label: t('posDefault') }, { value: 'top', label: t('posTop') }, { value: 'bottom', label: t('posBottom') }]} />
            </div>
            <div className="divide-y divide-outline-variant/50 rounded-2xl bg-surface-container">
              {([['optShift', 'shiftOnly'], ['optSepBefore', 'separatorBefore'], ['optSepAfter', 'separatorAfter'], ['optEnabled', 'enabled']] as const).map(([k, f]) => (
                <div key={f} className="flex items-center justify-between gap-4 px-4 py-3">
                  <span className="text-[0.92rem]">{t(k)}</span>
                  <Switch checked={editing[f]} onChange={(v) => patch({ [f]: v } as Partial<Entry>)} label={t(k)} />
                </div>
              ))}
            </div>
          </div>
        )}
      </Sheet>

      <Dialog open={presets} onClose={() => setPresets(false)} title={t('presetsTitle')} icon={<Wand2 size={24} />} wide
        actions={<Button label={t('close')} icon={<X size={18} />} variant="tonal" onClick={() => setPresets(false)} />}>
        <div className="grid gap-2 sm:grid-cols-2">
          {PRESETS.map((p) => (
            <button key={p.label} onClick={() => { setPresets(false); openEditor({ ...blank(), label: t(p.label), command: p.command, icon: p.icon, scopes: p.scopes }, true) }}
              className="sl press flex items-center gap-3 rounded-2xl bg-surface-container p-3.5 text-left text-on-surface">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-on-primary-container"><Zap size={19} /></span>
              <span className="min-w-0"><span className="block truncate text-[0.92rem] font-medium">{t(p.label)}</span><span className="block truncate font-mono text-[0.7rem] text-on-surface-variant">{p.command}</span></span>
            </button>
          ))}
        </div>
      </Dialog>

      <ConfirmDialog open={!!del} onClose={() => setDel(null)} danger title={t('delTitle')} confirmLabel={t('delete')} confirmIcon={<Trash2 size={18} />}
        body={t('delBody', { name: del?.label ?? '' })} onConfirm={async () => { if (del) await saveEntries(list.filter((x) => x.id !== del.id)); setDel(null) }} />
    </div>
  )
}
