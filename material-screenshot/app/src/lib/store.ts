import { useSyncExternalStore } from 'react'

/** Tiny persistent store (localStorage) with a React hook. */
export function createStore<T extends object>(key: string, defaults: T) {
  let state: T = { ...defaults }
  try {
    const raw = localStorage.getItem(key)
    if (raw) state = { ...defaults, ...JSON.parse(raw) }
  } catch { /* ignore corrupt data */ }
  const subs = new Set<() => void>()
  let timer: ReturnType<typeof setTimeout> | undefined
  const persist = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      try { localStorage.setItem(key, JSON.stringify(state)) } catch { /* storage full */ }
    }, 200)
  }
  const get = () => state
  const set = (patch: Partial<T> | ((s: T) => Partial<T>)) => {
    state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }
    subs.forEach((f) => f())
    persist()
  }
  const reset = () => set({ ...defaults })
  const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f) } }
  const use = () => useSyncExternalStore(subscribe, get, get)
  return { get, set, reset, use, subscribe }
}
