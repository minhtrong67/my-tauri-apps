import { create } from 'zustand';
import type { LucideIcon } from 'lucide-react';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: 'error' | 'primary';
  icon: LucideIcon; // icon of the confirm button
  headIcon?: LucideIcon;
}
export interface LocationDialog {
  mode: 'prompt' | 'denied';
  onAllow: () => void;
  onApprox: () => void;
  onDismiss?: () => void;
}
interface UI {
  navOpen: boolean;
  settings: boolean;
  about: boolean;
  shortcuts: boolean;
  location: LocationDialog | null;
  daySheet: number | null;
  aqiSheet: boolean;
  confirm: (ConfirmOptions & { resolve: (v: boolean) => void }) | null;
  locating: boolean;
  set: (p: Partial<Omit<UI, 'set'>>) => void;
}
export const useUI = create<UI>((set) => ({
  navOpen: false, settings: false, about: false, shortcuts: false, location: null, daySheet: null, aqiSheet: false, confirm: null, locating: false,
  set: (p) => set(p),
}));
export const ui = () => useUI.getState();
export const askConfirm = (o: ConfirmOptions) => new Promise<boolean>((resolve) => useUI.getState().set({ confirm: { ...o, resolve } }));

// ---- toasts ----------------------------------------------------------------
export type ToastType = 'info' | 'success' | 'warning' | 'error';
export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  duration: number;
  action?: { label: string; run: () => void };
}
interface ToastState {
  items: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: number) => void;
}
let seq = 1;
export const useToasts = create<ToastState>((set) => ({
  items: [],
  push: (t) => set((s) => ({ items: [...s.items.filter((x) => x.message !== t.message).slice(-2), { ...t, id: seq++ }] })),
  dismiss: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
}));
type Opts = { duration?: number; action?: ToastItem['action'] };
const make = (type: ToastType) => (message: string, o: Opts = {}) => useToasts.getState().push({ type, message, duration: o.duration ?? 4200, action: o.action });
export const toast = { info: make('info'), success: make('success'), warning: make('warning'), error: make('error') };
