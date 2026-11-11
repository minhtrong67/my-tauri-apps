// Stores for transient UI: toasts, modal dialogs and flyout menus.
import { useSyncExternalStore, type ReactNode } from 'react';
import type { Icon } from './icons';

function createStore<T>(init: T) {
  let state = init;
  const subs = new Set<() => void>();
  return {
    get: () => state,
    set: (v: T | ((s: T) => T)) => { state = typeof v === 'function' ? (v as (s: T) => T)(state) : v; subs.forEach(f => f()); },
    use: () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => state),
  };
}

/* -------------------------------- toasts -------------------------------- */

export type ToastKind = 'info' | 'success' | 'error' | 'warning';
export interface ToastItem { id: number; msg: string; kind: ToastKind; ms: number; leaving?: boolean }
export const toasts = createStore<ToastItem[]>([]);
let tid = 0;

export function dismissToast(id: number) {
  toasts.set(l => l.map(x => (x.id === id ? { ...x, leaving: true } : x)));
  setTimeout(() => toasts.set(l => l.filter(x => x.id !== id)), 260);
}

export function toast(msg: string, kind: ToastKind = 'info', ms = 3200) {
  const id = ++tid;
  toasts.set(l => [...l.filter(x => !x.leaving).slice(-3), { id, msg, kind, ms }]);
  setTimeout(() => dismissToast(id), ms);
}

/* -------------------------------- modals -------------------------------- */

export interface ModalOpts { size?: 'sm' | 'md' | 'lg' | 'xl'; dismissable?: boolean; className?: string; align?: 'center' | 'top' }
export interface ModalItem { id: number; render: (close: (v?: unknown) => void) => ReactNode; opts: ModalOpts; closing?: boolean; resolve: (v: unknown) => void }
export const modals = createStore<ModalItem[]>([]);
let mid = 0;

export function closeModal(id: number, value?: unknown) {
  const m = modals.get().find(x => x.id === id);
  if (!m || m.closing) return;
  modals.set(l => l.map(x => (x.id === id ? { ...x, closing: true } : x)));
  setTimeout(() => { modals.set(l => l.filter(x => x.id !== id)); m.resolve(value); }, 170);
}

export function openModal<T = unknown>(render: (close: (v?: T) => void) => ReactNode, opts: ModalOpts = {}): Promise<T | undefined> {
  return new Promise(resolve => {
    const id = ++mid;
    modals.set(l => [...l, { id, render: render as ModalItem['render'], opts, resolve: resolve as (v: unknown) => void }]);
  });
}
export const closeAllModals = () => modals.get().forEach(m => closeModal(m.id));
export const hasModal = () => modals.get().some(m => !m.closing);

/* --------------------------------- menus --------------------------------- */

export interface MenuItem {
  label?: string; icon?: Icon; kbd?: string; run?: () => void; disabled?: boolean; checked?: boolean; danger?: boolean;
  sep?: boolean; header?: string;
}
export interface MenuState { target: HTMLElement | { x: number; y: number }; items: MenuItem[]; align: 'left' | 'right'; minWidth?: number; token: number }
export const menu = createStore<MenuState | null>(null);
let mtok = 0;
export function showMenu(target: MenuState['target'], items: MenuItem[], opts: { align?: 'left' | 'right'; minWidth?: number } = {}) {
  const cur = menu.get();
  if (cur && target instanceof HTMLElement && cur.target === target) { menu.set(null); return; }
  menu.set({ target, items, align: opts.align || 'left', minWidth: opts.minWidth, token: ++mtok });
}
export const closeMenu = () => menu.set(null);
export const menuOpen = () => !!menu.get();
