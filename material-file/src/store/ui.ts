import { create } from 'zustand';
import type { LucideIcon } from 'lucide-react';

/* ----------------------------------------------------------------- toasts */
export type ToastKind = 'info' | 'success' | 'warning' | 'error';
export interface ToastItem { id: number; kind: ToastKind; msg: string; leaving?: boolean }

/* ------------------------------------------------------------------- menu */
export interface MenuItem {
  label?: string; icon?: LucideIcon; kbd?: string; check?: boolean; disabled?: boolean; danger?: boolean;
  sep?: boolean; items?: MenuItem[]; run?: () => void; swatch?: string;
}

/* ----------------------------------------------------------------- dialogs */
export type Tone = 'primary' | 'tonal' | 'text' | 'danger' | 'success';
export interface DialogButton { id: string; label: string; icon?: LucideIcon; tone: Tone }
export interface DialogSpec {
  kind: 'confirm' | 'prompt';
  title: string; message?: string; icon?: LucideIcon; tone?: 'info' | 'warning' | 'danger';
  buttons: DialogButton[];
  input?: { label: string; value: string };
  resolve: (v: { id: string; value?: string }) => void;
}

export type ModalName = 'settings' | 'about' | 'props' | 'dupes' | 'usage' | 'search' | 'palette' | 'lightbox' | 'update' | 'rename';
interface OpState { title: string; name: string; done: number; total: number; visible: boolean }

interface UI {
  toasts: ToastItem[];
  menu: { x: number; y: number; items: MenuItem[] } | null;
  dialog: DialogSpec | null;
  modals: Partial<Record<ModalName, unknown>>;
  op: OpState | null;
  loading: number;
  dragging: { paths: string[]; x: number; y: number; copy: boolean } | null;
  extDrop: { active: boolean };
  settingsPanel: string;
}
export const useUI = create<UI>(() => ({
  toasts: [], menu: null, dialog: null, modals: {}, op: null, loading: 0, dragging: null, extDrop: { active: false }, settingsPanel: 'appearance'
}));
const set = useUI.setState;
const get = useUI.getState;

let toastSeq = 1;
export function toast(msg: string, kind: ToastKind = 'info', ms = 3600) {
  const id = toastSeq++;
  set((s) => ({ toasts: [...s.toasts.slice(-3), { id, kind, msg }] }));
  const hide = () => set((s) => ({ toasts: s.toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t)) }));
  window.setTimeout(hide, ms);
  window.setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), ms + 260);
}
export const dismissToast = (id: number) => {
  set((s) => ({ toasts: s.toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t)) }));
  window.setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 240);
};

export const showMenu = (items: MenuItem[], x: number, y: number) => set({ menu: { items, x, y } });
export const closeMenu = () => { if (get().menu) set({ menu: null }); };

export const openModal = (name: ModalName, payload: unknown = true) => set((s) => ({ modals: { ...s.modals, [name]: payload } }));
export const closeModal = (name: ModalName) => set((s) => { const m = { ...s.modals }; delete m[name]; return { modals: m }; });
export const isModalOpen = () => Object.keys(get().modals).length > 0 || !!get().dialog;

export function dialog(spec: Omit<DialogSpec, 'resolve'>): Promise<{ id: string; value?: string }> {
  return new Promise((resolve) => set({ dialog: { ...spec, resolve } }));
}
export const closeDialog = (r: { id: string; value?: string }) => {
  const d = get().dialog;
  if (!d) return;
  set({ dialog: null });
  d.resolve(r);
};

export function setLoading(on: boolean) { set((s) => ({ loading: Math.max(0, s.loading + (on ? 1 : -1)) })); }
export const setOp = (op: OpState | null) => set({ op });
export const patchOp = (p: Partial<OpState>) => set((s) => (s.op ? { op: { ...s.op, ...p } } : s));
