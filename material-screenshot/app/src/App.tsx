import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Trash2, RotateCcw } from 'lucide-react'
import { Editor } from './lib/editor'
import { makeSample } from './lib/render'
import { settingsStore, detectLang } from './lib/settings'
import { applyTheme } from './lib/theme'
import { FONTS, fontStack, loadFont } from './lib/fonts'
import { dict, type K } from './lib/dict'
import { LangCtx, type Lang, type TFn } from './lib/i18n'
import { addRecent, presetStore, type UserPreset } from './lib/presetStore'
import { SOCIALS } from './lib/presets'
import { captureScreen, invoke, isTauri, onFileDrop, pickFolder, pickImages, readImageFile, registerHotkey, saveBlob, setNativeTheme } from './lib/tauri'
import { cn } from './lib/cn'
import { useMedia } from './hooks/useMedia'
import { ToastHost, toast } from './components/ui/Toast'
import { StatusBar, TitleBar, Toolbar } from './components/Chrome'
import { Stage, type Zoom } from './components/Stage'
import { EmptyState } from './components/EmptyState'
import { Panel, type Tab } from './components/Panel'
import { SettingsDialog } from './components/SettingsDialog'
import { AboutDialog, BatchDialog, ConfirmDialog, PresetIODialog, SavePresetDialog, ShortcutsDialog } from './components/Dialogs'
import { ImageDown } from 'lucide-react'

const FS = { sm: '13.5px', md: '15px', lg: '17px' } as const
const IMG_RE = /\.(png|jpe?g|webp|gif|bmp)$/i

export function App() {
  const ed = useMemo(() => new Editor(), [])
  const version = useSyncExternalStore(ed.subscribe, ed.getVersion)
  const s = settingsStore.use()
  const store = presetStore.use()

  const lang: Lang = s.lang === 'auto' ? detectLang() : s.lang
  const t: TFn = useCallback((k: K, v) => {
    let str: string = dict[lang][k] ?? dict.en[k] ?? k
    if (v) for (const [a, b] of Object.entries(v)) str = str.replace(`{${a}}`, String(b))
    return str
  }, [lang])
  const ctx = useMemo(() => ({ lang, t }), [lang, t])

  const [tab, setTab] = useState<Tab>('looks')
  const [panelOpen, setPanelOpen] = useState(false)
  const [zoom, setZoom] = useState<Zoom>('fit')
  const [scale, setScale] = useState(1)
  const [compare, setCompare] = useState(false)
  const [dlg, setDlg] = useState<null | 'settings' | 'about' | 'keys' | 'savePreset' | 'presetIO' | 'batch' | 'reset'>(null)
  const [delPreset, setDelPreset] = useState<UserPreset | null>(null)
  const [socials, setSocials] = useState<string[]>(['og', 'x'])
  const [batchFiles, setBatchFiles] = useState<(string | File)[]>([])
  const [dropping, setDropping] = useState(false)
  const [downloads, setDownloads] = useState('')
  const narrow = useMedia('(max-width: 940px)')
  const compact = useMedia('(max-width: 1180px)')
  const tauri = isTauri()

  /* ---------- appearance ---------- */
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const f = () => applyTheme(s, mq.matches)
    f(); mq.addEventListener('change', f)
    setNativeTheme(s.theme)
    return () => mq.removeEventListener('change', f)
  }, [s.theme, s.seed, s.variant, s.contrast]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { document.documentElement.style.setProperty('--fs', FS[s.fontSize]) }, [s.fontSize])
  useEffect(() => { document.documentElement.toggleAttribute('data-reduce', s.reduceMotion); document.documentElement.lang = lang }, [s.reduceMotion, lang])
  useEffect(() => {
    document.documentElement.style.setProperty('--app-font', fontStack(s.font))
    loadFont(s.font).then(() => { ed.setFont(fontStack(s.font)); document.fonts?.ready.then(() => ed.paint()) })
  }, [s.font, ed])

  /* ---------- window / backend ---------- */
  useEffect(() => { if (tauri) invoke('set_window_mode', { mode: s.winMode }).catch(() => {}) }, [s.winMode, tauri])
  useEffect(() => {
    if (!tauri) return
    invoke<string>('get_download_dir').then(setDownloads).catch(() => {})
    const id = requestAnimationFrame(() => requestAnimationFrame(() => invoke('app_ready').catch(() => {})))
    return () => cancelAnimationFrame(id)
  }, [tauri])

  /* ---------- actions ---------- */
  const load = useCallback(async (job: () => Promise<void>) => {
    ed.busy = true; ed.bump()
    try { await job() } catch { toast.error(t('readFail')) } finally { ed.busy = false; ed.bump() }
  }, [ed, t])
  const loadPath = useCallback((path: string) => load(async () => { await ed.fromBlob(await readImageFile(path), path.split(/[\\/]/).pop() ?? 'image'); addRecent(path); setZoom('fit') }), [ed, load])
  const loadFiles = useCallback((files: (string | File)[]) => {
    const ok = files.filter((f) => (typeof f === 'string' ? IMG_RE.test(f) : f.type.startsWith('image/')))
    if (!ok.length) { if (files.length) toast.warning(t('notImage')); return }
    if (ok.length > 1) { setBatchFiles(ok); setDlg('batch'); return }
    const f = ok[0]
    if (typeof f === 'string') loadPath(f); else load(async () => { await ed.fromBlob(f, f.name); setZoom('fit') })
  }, [ed, load, loadPath, t])

  const doOpen = useCallback(async () => {
    if (!tauri) { fileInput.current?.click(); return }
    try { const p = await pickImages(true); if (p.length) loadFiles(p) } catch { toast.error(t('readFail')) }
  }, [tauri, loadFiles, t])
  const fileInput = useRef<HTMLInputElement>(null)

  const doPaste = useCallback(async () => {
    try {
      for (const it of await navigator.clipboard.read()) {
        const ty = it.types.find((x) => x.startsWith('image/'))
        if (ty) { load(async () => { await ed.fromBlob(await it.getType(ty), 'pasted'); setZoom('fit') }); return }
      }
      toast.info(t('noClipImage'))
    } catch { toast.warning(t('pasteFail')) }
  }, [ed, load, t])

  const doCapture = useCallback(async (region: boolean) => {
    if (!tauri) { toast.info(t('captureDesktop')); return }
    ed.busy = true; ed.bump()
    try {
      const bm = await captureScreen(settingsStore.get().captureDelay)
      ed.setSource(bm, 'screenshot'); setZoom('fit')
      if (region) ed.enterCrop()
      toast.success(t('captured'))
    } catch { toast.error(t('captureFail')) } finally { ed.busy = false; ed.bump() }
  }, [ed, tauri, t])

  const doCopy = useCallback(async () => {
    if (!ed.has) return toast.info(t('noImage'))
    try { const b = await ed.exportBlob({}, undefined, 'png'); await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); toast.success(t('copied')) } catch { toast.error(t('copyFail')) }
  }, [ed, t])

  const doSave = useCallback(async (fmt?: 'png' | 'jpeg' | 'webp', ask?: boolean) => {
    if (!ed.has) return toast.info(t('noImage'))
    const f = fmt ?? ed.P.fmt, st = settingsStore.get()
    try {
      if (ed.limited()) toast.warning(t('limited'))
      const blob = await ed.exportBlob({ fmt: f })
      const r = await saveBlob(blob, `${ed.name}-beautified.${f === 'jpeg' ? 'jpg' : f}`, st.saveDir, ask ?? st.askSave)
      if (r) toast.success(`${t('savedTo')} ${r}`)
    } catch { toast.error(t('saveFail')) }
  }, [ed, t])

  const doPack = useCallback(async () => {
    const st = settingsStore.get(); let n = 0
    ed.busy = true; ed.bump()
    try {
      for (const id of socials) {
        const so = SOCIALS.find((x) => x.id === id)!
        const blob = await ed.exportBlob({ ratio: 'custom', cw: so.w, ch: so.h }, so.w)
        if (await saveBlob(blob, `${ed.name}-${so.id}.${ed.ext}`, st.saveDir, false)) n++
      }
      toast.success(t('packDone', { n }))
    } catch { toast.error(t('saveFail')) } finally { ed.busy = false; ed.bump() }
  }, [ed, socials, t])

  const doSample = useCallback(() => { ed.setSource(makeSample(fontStack(settingsStore.get().font)), 'sample'); setZoom('fit') }, [ed])

  const pickToBlob = (accept: string, cb: (f: File) => void) => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = accept
    i.onchange = () => { const f = i.files?.[0]; if (f) cb(f) }
    i.click()
  }

  /* ---------- global events ---------- */
  const live = useRef({ doOpen, doPaste, doCapture, doCopy, doSave, loadFiles })
  live.current = { doOpen, doPaste, doCapture, doCopy, doSave, loadFiles }

  useEffect(() => {
    if (!tauri) return
    invoke<string | null>('get_launch_file').then((p) => { if (p) loadPath(p) }).catch(() => {})
  }, [tauri]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!tauri || !s.hotkey) return
    let off: (() => void) | undefined, dead = false
    registerHotkey('CommandOrControl+Alt+S', () => live.current.doCapture(false)).then((u) => { if (dead) u(); else off = u }).catch(() => toast.warning(t('hotkeyFail')))
    return () => { dead = true; off?.() }
  }, [tauri, s.hotkey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let un: (() => void) | undefined, dead = false
    onFileDrop((paths) => live.current.loadFiles(paths), setDropping).then((u) => { if (dead) u(); else un = u })
    const over = (e: DragEvent) => { if (tauri) return; e.preventDefault(); setDropping(true) }
    const leave = (e: DragEvent) => { if (!tauri && !e.relatedTarget) setDropping(false) }
    const drop = (e: DragEvent) => { if (tauri) return; e.preventDefault(); setDropping(false); live.current.loadFiles([...(e.dataTransfer?.files ?? [])]) }
    window.addEventListener('dragover', over); window.addEventListener('dragleave', leave); window.addEventListener('drop', drop)
    return () => { dead = true; un?.(); window.removeEventListener('dragover', over); window.removeEventListener('dragleave', leave); window.removeEventListener('drop', drop) }
  }, [tauri])

  useEffect(() => {
    const paste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,textarea')) return
      const f = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'))?.getAsFile()
      if (f) { e.preventDefault(); load(async () => { await ed.fromBlob(f, 'pasted'); setZoom('fit') }) }
    }
    document.addEventListener('paste', paste)
    return () => document.removeEventListener('paste', paste)
  }, [ed, load])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement, typing = !!el?.closest('input,textarea,[contenteditable]'), mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase()
      const modal = !!document.querySelector('[role=dialog]')
      if (mod && k === '/') { e.preventDefault(); setDlg('keys'); return }
      if (modal || typing) return
      const L = live.current
      if (mod && k === 'o') { e.preventDefault(); L.doOpen() }
      else if (mod && e.altKey && k === 's') { e.preventDefault(); L.doCapture(false) }
      else if (mod && k === 's') { e.preventDefault(); L.doSave() }
      else if (mod && k === 'c' && !window.getSelection()?.toString()) { e.preventDefault(); L.doCopy() }
      else if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? ed.redo() : ed.undo() }
      else if (mod && k === 'y') { e.preventDefault(); ed.redo() }
      else if (mod && k === 'v') { /* handled by the paste event */ }
      else if (!mod && !e.altKey && ed.has) {
        const map: Record<string, () => void> = {
          v: () => ed.setTool('select'), r: () => ed.setTool('rect'), o: () => ed.setTool('ellipse'), a: () => ed.setTool('arrow'), l: () => ed.setTool('line'),
          t: () => ed.setTool('text'), n: () => ed.setTool('step'), h: () => ed.setTool('hl'), b: () => ed.setTool('blur'), s: () => ed.setTool('spot'),
          c: () => (ed.cropMode ? ed.exitCrop() : ed.enterCrop()), x: () => setCompare(true), '0': () => setZoom('fit'), '1': () => setZoom(1),
          '+': () => setZoom((z) => Math.min(8, +((z === 'fit' ? scaleRef.current : z) * 1.25).toFixed(3))), '=': () => setZoom((z) => Math.min(8, +((z === 'fit' ? scaleRef.current : z) * 1.25).toFixed(3))),
          '-': () => setZoom((z) => Math.max(0.1, +((z === 'fit' ? scaleRef.current : z) / 1.25).toFixed(3))),
          delete: () => ed.deleteSelected(), backspace: () => ed.deleteSelected(),
          escape: () => { if (ed.cropMode) ed.exitCrop(); else if (ed.selId != null) { ed.selId = null; ed.bump() } else if (ed.tool !== 'select') ed.setTool('select') },
          enter: () => { if (ed.cropMode) ed.applyCrop() },
        }
        const f = map[k]
        if (f) { if (k.length === 1 && 'vroalthnbs'.includes(k) && k !== 'c') setTab('annotate'); f() }
      }
    }
    const up = (e: KeyboardEvent) => { if (e.key.toLowerCase() === 'x') setCompare(false) }
    window.addEventListener('keydown', key); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('keyup', up) }
  }, [ed])

  const scaleRef = useRef(1)
  const onScale = useCallback((sc: number) => { scaleRef.current = sc; setScale((p) => (Math.abs(p - sc) < 0.0005 ? p : sc)) }, [])
  const dir = s.saveDir || downloads

  const pickDir = useCallback(async () => {
    if (!tauri) { toast.info(t('desktopOnly')); return }
    try { const d = await pickFolder(); if (d) { settingsStore.set({ saveDir: d }); toast.success(t('folderChanged')) } } catch { toast.error(t('saveFail')) }
  }, [tauri, t])

  const panel = (
    <Panel ed={ed} version={version} tab={tab} onTab={setTab} font={fontStack(s.font)} presets={store.list} socials={socials} onSocials={setSocials}
      onPickBg={() => pickToBlob('image/*', (f) => ed.setBgImage(f))} onPickLogo={() => pickToBlob('image/*', (f) => ed.setLogo(f))}
      onSavePreset={() => setDlg('savePreset')} onPresetIO={() => setDlg('presetIO')} onDeletePreset={setDelPreset}
      saveDir={dir} onPickDir={pickDir} onExportPack={doPack} onBatch={() => { setBatchFiles([]); setDlg('batch') }} onResetStyle={() => { ed.resetStyle(); toast.info(t('styleReset')) }} />
  )

  return (
    <LangCtx.Provider value={ctx}>
      <div className="flex h-full flex-col bg-surface text-on-surface">
        <TitleBar file={ed.has ? ed.name : ''} />
        <Toolbar ed={ed} compact={compact} narrow={narrow} canCapture={tauri} onOpen={doOpen} onPaste={doPaste} onCapture={doCapture} onCopy={doCopy} onSave={doSave}
          onSettings={() => setDlg('settings')} onAbout={() => setDlg('about')} onPanel={() => setPanelOpen(true)} onCompare={setCompare} />
        <div className="flex min-h-0 flex-1 gap-2.5 px-2.5">
          <div className="min-w-0 flex-1">
            <Stage ed={ed} version={version} zoom={zoom} onZoom={setZoom} onScale={onScale} showOriginal={compare} showTools={ed.has && (tab === 'annotate' || ed.tool !== 'select')}
              empty={<EmptyState canCapture={tauri} onOpen={doOpen} onPaste={doPaste} onCapture={() => doCapture(false)} onSample={doSample} recent={store.recent} onRecent={loadPath} />} />
          </div>
          {!narrow && <aside className="w-[372px] shrink-0 overflow-hidden rounded-[28px] bg-surface-container">{panel}</aside>}
        </div>
        <StatusBar ed={ed} zoom={zoom} scale={scale} onZoom={setZoom} version={version} />
      </div>

      {narrow && (
        <div className={cn('fixed inset-0 z-[90]', panelOpen ? 'pointer-events-auto' : 'pointer-events-none')}>
          <div className={cn('scrim absolute inset-0 transition-opacity duration-300', panelOpen ? 'opacity-100' : 'opacity-0')} onClick={() => setPanelOpen(false)} />
          <aside className={cn('absolute inset-y-2 right-2 w-[min(400px,calc(100%-1rem))] overflow-hidden rounded-[28px] bg-surface-container elev-5 transition-transform duration-500 ease-[var(--ease-out-expo)]', panelOpen ? 'translate-x-0' : 'translate-x-[110%]')}>{panel}</aside>
        </div>
      )}

      <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(e) => { loadFiles([...(e.target.files ?? [])]); e.target.value = '' }} />

      {dropping && (
        <div className="anim-fade pointer-events-none fixed inset-0 z-[150] flex items-center justify-center bg-primary/15 backdrop-blur-sm">
          <div className="m-6 flex h-[calc(100%-3rem)] w-[calc(100%-3rem)] items-center justify-center rounded-[40px] border-4 border-dashed border-primary">
            <div className="flex flex-col items-center gap-3 rounded-[32px] bg-primary-container px-10 py-8 text-on-primary-container elev-3" style={{ animation: 'drop-pulse 1.2s ease-in-out infinite' }}>
              <ImageDown size={56} /><span className="text-[1.25rem] font-bold">{t('dropHere')}</span>
            </div>
          </div>
        </div>
      )}

      <SettingsDialog open={dlg === 'settings'} onClose={() => setDlg(null)} s={s} downloads={downloads} onReset={() => setDlg('reset')} onShortcuts={() => setDlg('keys')} />
      <AboutDialog open={dlg === 'about'} onClose={() => setDlg(null)} />
      <ShortcutsDialog open={dlg === 'keys'} onClose={() => setDlg(null)} />
      <SavePresetDialog open={dlg === 'savePreset'} onClose={() => setDlg(null)} ed={ed} />
      <PresetIODialog open={dlg === 'presetIO'} onClose={() => setDlg(null)} presets={store.list} />
      <BatchDialog open={dlg === 'batch'} onClose={() => setDlg(null)} ed={ed} dir={dir} initial={batchFiles} />
      <ConfirmDialog open={dlg === 'reset'} danger icon={RotateCcw} title={t('resetAll')} message={t('resetAllMsg')} confirmLabel={t('resetAll')} onClose={() => setDlg('settings')}
        onConfirm={() => { settingsStore.reset(); toast.success(t('settingsReset')); setDlg('settings') }} />
      <ConfirmDialog open={!!delPreset} danger icon={Trash2} title={t('deleteStyle')} message={t('deleteStyleMsg', { name: delPreset?.name ?? '' })} confirmLabel={t('delete')} onClose={() => setDelPreset(null)}
        onConfirm={() => { presetStore.set((x) => ({ list: x.list.filter((p) => p.id !== delPreset?.id) })); setDelPreset(null); toast.success(t('styleDeleted')) }} />
      <ToastHost closeLabel={t('close')} />
    </LangCtx.Provider>
  )
}

export const FONT_IDS = FONTS.map((f) => f.id)
