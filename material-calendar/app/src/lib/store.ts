import { useSyncExternalStore } from 'react';
import { sod, uid, type Ev } from './core';

export type Toast = { id: number; type: 'info' | 'success' | 'warning' | 'error'; msg: string; act?: { label: string; fn: () => void } };
export const DEF = { lang: 'auto', theme: 'system', seed: '#b3261e', font: 'system', size: 'md', windowMode: 'remember', winSize: null as null | { w: number; h: number }, weekStart: 1, timeFmt: '24', lunar: true, notify: true, view: 'month' };
const rd = <T,>(k: string, f: T): T => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? f; } catch { return f; } };
let st = { s: { ...DEF, ...rd('cal.settings', {}) }, events: rd<Ev[]>('cal.events', []), toasts: [] as Toast[], cursor: sod(new Date()) };
const subs = new Set<() => void>();
const emit = (n: Partial<typeof st>) => { st = { ...st, ...n }; subs.forEach((f) => f()); };
export const useStore = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => st);
export const get = () => st;
export const setS = (p: Partial<typeof DEF>) => { const s = { ...st.s, ...p }; localStorage.setItem('cal.settings', JSON.stringify(s)); emit({ s }); };
export const setCursor = (cursor: Date) => emit({ cursor });
const saveEv = (events: Ev[]) => { localStorage.setItem('cal.events', JSON.stringify(events)); emit({ events }); };
export const upsert = (e: Ev) => saveEv(st.events.some((x) => x.id === e.id) ? st.events.map((x) => (x.id === e.id ? e : x)) : [...st.events, e]);
export const dup = (e: Ev) => saveEv([...st.events, { ...e, id: uid() }]);
export const remove = (id: string) => {
  const i = st.events.findIndex((e) => e.id === id), e = st.events[i]; if (!e) return;
  saveEv(st.events.filter((x) => x.id !== id));
  toast('info', 'deleted', { label: 'undo', fn: () => { const a = [...st.events]; a.splice(i, 0, e); saveEv(a); } });
};
let tid = 0;
export const toast = (type: Toast['type'], msg: string, act?: Toast['act']) => {
  const id = ++tid; emit({ toasts: [...st.toasts, { id, type, msg, act }] });
  setTimeout(() => dismiss(id), 4500);
};
export const dismiss = (id: number) => emit({ toasts: st.toasts.filter((x) => x.id !== id) });
export const addMany = (list: Ev[]) => saveEv([...st.events, ...list]);
