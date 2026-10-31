import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, errMsg, type AppState, type Entry, type OsInfo } from './api'
import { useSettings } from './settings'
import { useToast } from '../components/ui'

export type Page = 'overview' | 'layout' | 'commands' | 'system' | 'backup' | 'settings'

interface Ctx {
  state: AppState; os: OsInfo | null; loading: boolean
  pendingRestart: boolean; markPending: () => void; clearPending: () => void
  reload: () => Promise<void>; applyState: (s: AppState) => void
  setClassic: (on: boolean) => Promise<void>
  saveEntries: (list: Entry[]) => Promise<boolean>
  page: Page; go: (p: Page) => void
  askRestart: () => void
}
const empty: AppState = { entries: [], hiddenVerbs: [], blockedClsids: [], classic: false }
const AppCtx = createContext<Ctx>(null as unknown as Ctx)
export const useApp = () => useContext(AppCtx)

export function AppProvider({ children, askRestart }: { children: ReactNode; askRestart: () => void }) {
  const { t } = useSettings()
  const toast = useToast()
  const [state, setState] = useState<AppState>(empty)
  const [os, setOs] = useState<OsInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingRestart, setPending] = useState(false)
  const [page, setPage] = useState<Page>('overview')

  const reload = useCallback(async () => {
    try { setState(await api.getState()) } catch (e) { toast.error(t('errGeneric', { msg: errMsg(e) })) }
  }, [t, toast])

  useEffect(() => {
    Promise.all([api.getState(), api.osInfo()])
      .then(([s, o]) => { setState(s); setOs(o) })
      .catch((e) => toast.error(t('errGeneric', { msg: errMsg(e) })))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const markPending = useCallback(() => setPending(true), [])
  const clearPending = useCallback(() => setPending(false), [])
  const applyState = useCallback((s: AppState) => setState(s), [])

  const setClassic = useCallback(async (on: boolean) => {
    const prev = state.classic
    setState((s) => ({ ...s, classic: on }))
    try { await api.setClassic(on); setPending(true) }
    catch (e) { setState((s) => ({ ...s, classic: prev })); toast.error(t('errGeneric', { msg: errMsg(e) })) }
  }, [state.classic, t, toast])

  const saveEntries = useCallback(async (list: Entry[]) => {
    try { setState(await api.saveEntries(list)); return true }
    catch (e) { toast.error(t('errGeneric', { msg: errMsg(e) })); return false }
  }, [t, toast])

  const value = useMemo<Ctx>(() => ({
    state, os, loading, pendingRestart, markPending, clearPending, reload, applyState, setClassic, saveEntries,
    page, go: setPage, askRestart,
  }), [state, os, loading, pendingRestart, markPending, clearPending, reload, applyState, setClassic, saveEntries, page, askRestart])
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
