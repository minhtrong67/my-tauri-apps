import { useSyncExternalStore } from "react";

/** Tiny external store: no dependency, selectors must return stable values (primitives or stored references). */
export function createStore<T extends object>(init: T) {
  let state = init;
  const subs = new Set<() => void>();
  const get = () => state;
  const set = (p: Partial<T> | ((s: T) => Partial<T>)) => {
    const next = typeof p === "function" ? p(state) : p;
    state = { ...state, ...next };
    subs.forEach((f) => f());
  };
  const subscribe = (cb: () => void) => { subs.add(cb); return () => { subs.delete(cb); }; };
  function use<R>(sel: (s: T) => R): R {
    return useSyncExternalStore(subscribe, () => sel(state));
  }
  return { get, set, use, subscribe };
}
