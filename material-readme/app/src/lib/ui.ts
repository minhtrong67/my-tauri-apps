import { create } from 'zustand';
import type { LucideIcon } from 'lucide-react';

/* ---------------------------------------------------------------- toasts */
export type ToastKind = 'info' | 'success' | 'warning' | 'error';
export interface ToastItem { id: number; kind: ToastKind; msg: string; action?: { label: string; run: () => void }; ms: number }
export const useToasts = create<{ items: ToastItem[] }>(() => ({ items: [] }));
let toastId = 0;
function push(kind: ToastKind, msg: string, o: { action?: ToastItem['action']; ms?: number } = {}) {
  const id = ++toastId, ms = o.ms ?? (o.action ? 8000 : kind === 'error' ? 6000 : 3200);
  useToasts.setState((s) => ({ items: [...s.items.filter((x) => x.msg !== msg), { id, kind, msg, action: o.action, ms }].slice(-3) }));
  return id;
}
export const toast = {
  info: (m: string, o?: { action?: ToastItem['action']; ms?: number }) => push('info', m, o),
  success: (m: string, o?: { action?: ToastItem['action']; ms?: number }) => push('success', m, o),
  warning: (m: string, o?: { action?: ToastItem['action']; ms?: number }) => push('warning', m, o),
  error: (m: string, o?: { action?: ToastItem['action']; ms?: number }) => push('error', m, o),
  dismiss: (id: number) => useToasts.setState((s) => ({ items: s.items.filter((x) => x.id !== id) })),
};

/* ------------------------------------------------------------------ menus */
export interface MenuItem {
  label?: string; icon?: LucideIcon; shortcut?: string; sub?: string; run?: () => void; disabled?: boolean; sep?: boolean; header?: string; checked?: boolean;
}
export interface MenuState { anchor: HTMLElement | { x: number; y: number }; items: MenuItem[]; alignRight?: boolean }
export const useMenu = create<{ menu: MenuState | null }>(() => ({ menu: null }));
export const openMenu = (anchor: MenuState['anchor'], items: MenuItem[], opts: { alignRight?: boolean } = {}) => useMenu.setState({ menu: { anchor, items, ...opts } });
export const closeMenu = () => useMenu.setState({ menu: null });

/* ---------------------------------------------------------------- confirm */
export type Tone = 'filled' | 'tonal' | 'outlined' | 'text' | 'error' | 'success' | 'warning';
export interface ConfirmAction { id: string; label: string; icon?: LucideIcon; tone?: Tone }
export interface ConfirmState { title: string; body: string; icon?: LucideIcon; kind?: 'info' | 'warning' | 'error' | 'primary'; actions: ConfirmAction[]; resolve: (id: string) => void }
export const useConfirm = create<{ c: ConfirmState | null }>(() => ({ c: null }));
export function confirmDialog(o: Omit<ConfirmState, 'resolve'>): Promise<string> {
  return new Promise((resolve) => useConfirm.setState({ c: { ...o, resolve } }));
}

/* --------------------------------------------------------------- overlays */
export type Overlay = 'settings' | 'shortcuts' | 'templates' | 'badge' | 'palette' | null;
export const useOverlay = create<{ open: Overlay }>(() => ({ open: null }));
export const showOverlay = (o: Overlay) => useOverlay.setState({ open: o });
