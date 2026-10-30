import { create } from "zustand";

export type ToastVariant = "info" | "success" | "warning" | "error";
export interface ToastAction { label: string; run: () => void }
export interface ToastItem { id: number; variant: ToastVariant; message: string; action?: ToastAction; ms: number }

interface ToastState { items: ToastItem[]; push: (t: Omit<ToastItem, "id" | "ms"> & { ms?: number }) => void; dismiss: (id: number) => void }
let seq = 0;

export const useToasts = create<ToastState>()((set, get) => ({
  items: [],
  push: (t) => {
    const id = ++seq;
    const ms = t.ms ?? (t.variant === "error" ? 6000 : t.action ? 5500 : 3600);
    set((s) => ({ items: [...s.items.filter((x) => x.message !== t.message), { ...t, id, ms }].slice(-4) }));
    window.setTimeout(() => get().dismiss(id), ms);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
}));

type Opts = { action?: ToastAction; ms?: number };
const make = (variant: ToastVariant) => (message: string, o?: Opts) => useToasts.getState().push({ variant, message, ...o });
export const toast = { info: make("info"), success: make("success"), warning: make("warning"), error: make("error") };
