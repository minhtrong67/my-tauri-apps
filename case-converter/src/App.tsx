import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardPaste, Eraser, FileUp, FolderOpen, History as HistoryIcon, Info, Copy, Moon, Settings as SettingsIcon, Undo2 } from 'lucide-react';
import {
  CASES, TOOLS, ConvertError, defaultParams, type CaseDef, type Item, type Opts, type Params, type ToolDef,
} from '@/lib/engine';
import type { Key } from '@/lib/i18n';
import { SettingsProvider, useSettings } from '@/lib/settings';
import { useHistory, type HistoryEntry } from '@/lib/history';
import {
  FileOpenError, appReady, listenFileDrop, pickTextFile, readClipboard, readTextFile, saveTextFile, writeClipboard,
} from '@/lib/tauri';
import { loadJSON, saveJSON, MOD } from '@/lib/utils';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { ConfirmProvider, useConfirm } from '@/components/ui/Confirm';
import { TooltipLayer } from '@/components/ui/Tooltip';
import { ScrollTop } from '@/components/ui/controls';
import { TitleBar } from '@/components/features/TitleBar';
import { Nav, type Tab } from '@/components/features/Nav';
import { AllList, CasePicker, ResultCard, SourceCard, ToolParams, ToolPicker } from '@/components/features/Workspace';
import { SettingsDialog } from '@/components/features/SettingsDialog';
import { AboutDialog } from '@/components/features/AboutDialog';
import { HistorySheet } from '@/components/features/HistorySheet';
import { CommandPalette, type PaletteAction } from '@/components/features/CommandPalette';
import { Trash2 } from 'lucide-react';

interface Session { tab: Tab; caseId: string; toolId: string; input: string; pickerOpen: boolean }
const SESSION_KEY = 'cc.session.v1';

function compute(item: Item, input: string, opts: Opts): { out: string; err: Key | null } {
  try {
    return { out: item.f(input, opts), err: null };
  } catch (e) {
    return { out: '', err: e instanceof ConvertError ? e.key : 'badInput' };
  }
}

export function App() {
  return (
    <SettingsProvider>
      <ToastProvider>
        <ConfirmProvider>
          <Shell />
          <TooltipLayer />
        </ConfirmProvider>
      </ToastProvider>
    </SettingsProvider>
  );
}

function Shell() {
  const { s, update, lang, dark, t } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();
  const history = useHistory();

  const [session, setSession] = useState<Session>(() => {
    const v = loadJSON<Session>(SESSION_KEY, { tab: 'convert', caseId: 'upper', toolId: 'dedupe', input: '', pickerOpen: false });
    return {
      tab: (['convert', 'all', 'tools'] as const).includes(v.tab) ? v.tab : 'convert',
      caseId: CASES.some((c) => c.id === v.caseId) ? v.caseId : 'upper',
      toolId: TOOLS.some((x) => x.id === v.toolId) ? v.toolId : 'dedupe',
      input: typeof v.input === 'string' ? v.input : '',
      pickerOpen: v.pickerOpen === true,
    };
  });
  const { tab, caseId, toolId, input, pickerOpen } = session;
  const patch = useCallback((p: Partial<Session>) => setSession((v) => ({ ...v, ...p })), []);
  const setInput = useCallback((input: string) => patch({ input }), [patch]);
  const [toolParams, setToolParams] = useState<Record<string, Params>>({});

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  // Persist the working session (debounced so typing stays smooth).
  useEffect(() => {
    const id = setTimeout(() => saveJSON(SESSION_KEY, session), 350);
    return () => clearTimeout(id);
  }, [session]);

  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => void appReady()));
    return () => cancelAnimationFrame(id);
  }, []);

  /* ---- derived conversion ---- */
  const deferred = useDeferredValue(input);
  const pending = deferred !== input;
  const caseItem = (CASES.find((c) => c.id === caseId) ?? CASES[0]) as CaseDef;
  const toolItem = (TOOLS.find((x) => x.id === toolId) ?? TOOLS[0]) as ToolDef;
  const item: Item = tab === 'tools' ? toolItem : caseItem;
  const params = useMemo<Params>(() => ({ ...defaultParams(toolItem), ...(toolParams[toolItem.id] ?? {}) }), [toolItem, toolParams]);
  const opts = useMemo<Opts>(
    () => ({ smart: s.smartTitle, keepAcronyms: s.keepAcronyms, lang, p: tab === 'tools' ? params : {} }),
    [s.smartTitle, s.keepAcronyms, lang, tab, params],
  );
  const result = useMemo(() => (tab === 'all' ? { out: '', err: null } : compute(item, deferred, opts)), [tab, item, deferred, opts]);
  const rows = useMemo(() => {
    if (tab !== 'all' || !deferred) return [];
    const preview = deferred.length > 4000 ? deferred.slice(0, 4000) : deferred;
    return CASES.map((c) => ({ item: c, text: compute(c, preview, opts).out }));
  }, [tab, deferred, opts]);

  /* ---- actions ---- */
  const copyText = useCallback(async (text: string, itemId: string, source: string) => {
    try {
      await writeClipboard(text);
      toast({ type: 'success', message: t('copiedToast') });
      if (s.keepHistory) history.add(itemId, source, text);
    } catch {
      toast({ type: 'error', message: t('copyFail') });
    }
  }, [toast, t, s.keepHistory, history]);

  const fileError = useCallback((e: unknown) => {
    const kind = e instanceof FileOpenError ? e.kind : 'other';
    if (kind === 'too_large') toast({ type: 'warning', message: t('tooLarge') });
    else if (kind === 'binary') toast({ type: 'warning', message: t('binaryFile') });
    else toast({ type: 'error', message: t('readFail') });
  }, [toast, t]);

  const openFile = useCallback(async () => {
    try {
      const text = await pickTextFile();
      if (text != null) { setInput(text); toast({ type: 'success', message: t('fileOpened') }); }
    } catch (e) { fileError(e); }
  }, [setInput, toast, t, fileError]);

  const pasteText = useCallback(async () => {
    try {
      setInput(await readClipboard());
      toast({ type: 'success', message: t('pasted') });
    } catch { toast({ type: 'warning', message: t('pasteFail') }); }
  }, [setInput, toast, t]);

  const clearText = useCallback(() => {
    if (!input) return;
    const prev = input;
    setInput('');
    toast({ type: 'info', message: t('cleared'), action: { label: t('undo'), icon: Undo2, onClick: () => setInput(prev) } });
  }, [input, setInput, toast, t]);

  const copyResult = useCallback(() => {
    const r = compute(item, input, opts);
    if (r.out) void copyText(r.out, item.id, input);
  }, [item, input, opts, copyText]);

  const swapResult = useCallback(() => {
    const r = compute(item, input, opts);
    if (!r.out) return;
    const prev = input;
    setInput(r.out);
    toast({ type: 'success', message: t('swapped'), action: { label: t('undo'), icon: Undo2, onClick: () => setInput(prev) } });
  }, [item, input, opts, setInput, toast, t]);

  const saveResult = useCallback(async () => {
    const r = compute(item, input, opts);
    if (!r.out) return;
    try {
      if (await saveTextFile('case-converter-result.txt', r.out)) {
        toast({ type: 'success', message: t('saved') });
        if (s.keepHistory) history.add(item.id, input, r.out);
      }
    } catch { toast({ type: 'error', message: t('saveFail') }); }
  }, [item, input, opts, toast, t, s.keepHistory, history]);

  const pickCase = useCallback(async (id: string) => {
    patch({ caseId: id, tab: tab === 'all' ? 'convert' : tab });
    if (s.autoCopy && input) {
      const c = CASES.find((x) => x.id === id);
      const r = c ? compute(c, input, { ...opts, p: {} }) : null;
      if (r?.out) {
        try { await writeClipboard(r.out); toast({ type: 'success', message: t('autoCopied') }); } catch { /* ignore */ }
      }
    }
  }, [patch, tab, s.autoCopy, input, opts, toast, t]);

  const toggleFavorite = useCallback(() => {
    const on = s.favorites.includes(caseId);
    update({ favorites: on ? s.favorites.filter((f) => f !== caseId) : [...s.favorites, caseId] });
    toast({ type: 'info', message: on ? t('favRemoved') : t('favAdded') });
  }, [s.favorites, caseId, update, toast, t]);

  const useHistoryEntry = useCallback((e: HistoryEntry) => {
    setInput(e.output);
    setHistoryOpen(false);
    toast({ type: 'success', message: t('restored') });
  }, [setInput, toast, t]);

  const clearHistory = useCallback(async () => {
    const ok = await confirm({ title: t('histClearTitle'), message: t('histClearMsg'), confirmLabel: t('histClear'), confirmIcon: Trash2 });
    if (ok) { history.clear(); toast({ type: 'success', message: t('histCleared') }); }
  }, [confirm, t, history, toast]);

  /* ---- file drop ---- */
  useEffect(() => {
    let off: (() => void) | undefined;
    let dead = false;
    void listenFileDrop(async (path) => {
      try { setInput(await readTextFile(path)); toast({ type: 'success', message: t('fileOpened') }); } catch (e) { fileError(e); }
    }, setDragOver).then((fn) => { if (dead) fn(); else off = fn; });
    return () => { dead = true; off?.(); };
  }, [setInput, toast, t, fileError]);

  /* ---- keyboard shortcuts ---- */
  const anyOpen = settingsOpen || aboutOpen || historyOpen || paletteOpen;
  const latest = useRef({ openFile, saveResult, copyResult, clearText, anyOpen });
  latest.current = { openFile, saveResult, copyResult, clearText, anyOpen };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      const h = latest.current;
      if (mod && k === 'k') { e.preventDefault(); setPaletteOpen((o) => !o); return; }
      if (h.anyOpen) return;
      if (mod && k === ',') { e.preventDefault(); setSettingsOpen(true); }
      else if (mod && k === 'h') { e.preventDefault(); setHistoryOpen(true); }
      else if (mod && k === 'o') { e.preventDefault(); void h.openFile(); }
      else if (mod && !e.shiftKey && k === 's') { e.preventDefault(); void h.saveResult(); }
      else if (mod && e.shiftKey && k === 'c') { e.preventDefault(); h.copyResult(); }
      else if (mod && e.shiftKey && k === 'x') { e.preventDefault(); h.clearText(); }
      else if (e.altKey && ['1', '2', '3'].includes(k)) { e.preventDefault(); patch({ tab: (['convert', 'all', 'tools'] as const)[Number(k) - 1] }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [patch]);

  /* ---- command palette ---- */
  const paletteActions = useMemo<PaletteAction[]>(() => [
    { id: 'copy', label: t('actCopy'), icon: Copy, kbd: `${MOD}+Shift+C`, run: copyResult },
    { id: 'open', label: t('actOpen'), icon: FolderOpen, kbd: `${MOD}+O`, run: () => void openFile() },
    { id: 'paste', label: t('actPaste'), icon: ClipboardPaste, run: () => void pasteText() },
    { id: 'clear', label: t('actClear'), icon: Eraser, kbd: `${MOD}+Shift+X`, run: clearText },
    { id: 'theme', label: t('actTheme'), icon: Moon, run: () => update({ theme: dark ? 'light' : 'dark' }) },
    { id: 'history', label: t('actHistory'), icon: HistoryIcon, kbd: `${MOD}+H`, run: () => setHistoryOpen(true) },
    { id: 'settings', label: t('actSettings'), icon: SettingsIcon, kbd: `${MOD}+,`, run: () => setSettingsOpen(true) },
    { id: 'about', label: t('actAbout'), icon: Info, run: () => setAboutOpen(true) },
  ], [t, copyResult, openFile, pasteText, clearText, update, dark]);
  const pickFromPalette = useCallback((id: string, kind: 'case' | 'tool') => {
    if (kind === 'case') patch({ caseId: id, tab: 'convert' });
    else patch({ toolId: id, tab: 'tools' });
  }, [patch]);

  const onScroll = () => setShowTop((scroller.current?.scrollTop ?? 0) > 240);
  const changeTab = (next: Tab) => { patch({ tab: next }); scroller.current?.scrollTo({ top: 0, behavior: 'smooth' }); };
  const isCase = tab !== 'tools';

  return (
    <div className="flex h-full flex-col bg-surface text-on-surface">
      <TitleBar onPalette={() => setPaletteOpen(true)} onHistory={() => setHistoryOpen(true)} onSettings={() => setSettingsOpen(true)} onAbout={() => setAboutOpen(true)} />
      <div className="flex min-h-0 flex-1 flex-col-reverse md:flex-row">
        <Nav tab={tab} onTab={changeTab} t={t} />
        <main className="relative min-h-0 min-w-0 flex-1 md:mb-3 md:mr-3">
          <div ref={scroller} onScroll={onScroll} className="h-full overflow-y-auto bg-surface-container-lowest max-md:rounded-b-xl md:rounded-xl">
            <div key={tab} className="anim-pop mx-auto flex min-h-full max-w-6xl flex-col gap-3 p-3 sm:p-4">
              {tab === 'convert' && (
                <CasePicker
                  t={t} lang={lang} value={caseId} favorites={s.favorites} smart={s.smartTitle} keepAcronyms={s.keepAcronyms}
                  open={pickerOpen} onToggle={() => patch({ pickerOpen: !pickerOpen })}
                  onPick={pickCase} onSmart={(v) => update({ smartTitle: v })} onKeepAcronyms={(v) => update({ keepAcronyms: v })}
                />
              )}
              {tab === 'tools' && (
                <>
                  <ToolPicker t={t} lang={lang} value={toolId} open={pickerOpen} onToggle={() => patch({ pickerOpen: !pickerOpen })} onPick={(id) => patch({ toolId: id })} />
                  <ToolParams
                    lang={lang} tool={toolItem} params={params}
                    onParam={(id, v) => setToolParams((p) => ({ ...p, [toolId]: { ...(p[toolId] ?? {}), [id]: v } }))}
                  />
                </>
              )}
              <div className="grid flex-1 gap-3 lg:grid-cols-2 lg:[grid-auto-rows:minmax(22rem,1fr)]">
                <SourceCard className={tab === 'all' ? 'lg:sticky lg:top-0 lg:h-[min(34rem,calc(100dvh-9rem))] lg:self-start' : undefined} t={t} value={input} onChange={setInput} onOpen={openFile} onPaste={pasteText} onClear={clearText} onSample={() => setInput(t('sampleText'))} />
                {tab === 'all' ? (
                  <AllList t={t} lang={lang} rows={rows} empty={!input} onCopy={(c) => void copyText(compute(c, input, opts).out, c.id, input)} />
                ) : (
                  <ResultCard
                    t={t} lang={lang} item={item} output={result.out} errorKey={result.err} pending={pending}
                    isFavorite={isCase ? s.favorites.includes(caseId) : undefined} onFavorite={isCase ? toggleFavorite : undefined}
                    onCopy={copyResult} onSwap={swapResult} onSave={saveResult}
                  />
                )}
              </div>
            </div>
          </div>
          <ScrollTop visible={showTop} label={t('scrollTop')} onClick={() => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })} />
        </main>
      </div>

      {dragOver && (
        <div className="pointer-events-none fixed inset-3 z-40 grid place-items-center rounded-xl border-2 border-dashed border-primary bg-primary/10 backdrop-blur-sm">
          <div className="anim-pop flex flex-col items-center gap-3 text-primary">
            <FileUp className="size-14 [animation:float_1.6s_ease-in-out_infinite]" aria-hidden />
            <p className="text-lg font-medium">{t('dropHere')}</p>
          </div>
        </div>
      )}

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <HistorySheet
        open={historyOpen} onClose={() => setHistoryOpen(false)} entries={history.entries}
        onCopy={(e) => void copyText(e.output, e.itemId, e.input)} onUse={useHistoryEntry} onRemove={history.remove} onClear={clearHistory}
      />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} actions={paletteActions} onPickItem={pickFromPalette} />
    </div>
  );
}
