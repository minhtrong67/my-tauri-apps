import { create } from "zustand";

export type Page = "downloads" | "settings" | "about";

export interface Toast {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
  tone?: "default" | "error";
}

export interface DialogSeed {
  url?: string;
  title?: string;
  referer?: string;
  userAgent?: string;
  cookie?: string;
  auto?: boolean;
}

interface UiState {
  page: Page;
  dialog: DialogSeed | null;
  toasts: Toast[];
  setPage: (p: Page) => void;
  openDialog: (seed?: DialogSeed) => void;
  closeDialog: () => void;
  toast: (message: string, opts?: { action?: Toast["action"]; tone?: Toast["tone"]; ms?: number }) => void;
  dismiss: (id: number) => void;
}

let toastId = 1;

export const useUi = create<UiState>((set, get) => ({
  page: "downloads",
  dialog: null,
  toasts: [],
  setPage: (page) => set({ page }),
  openDialog: (seed = {}) => set({ dialog: seed }),
  closeDialog: () => set({ dialog: null }),
  toast: (message, opts = {}) => {
    const id = toastId++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, message, action: opts.action, tone: opts.tone }] }));
    window.setTimeout(() => get().dismiss(id), opts.ms ?? (opts.action ? 8000 : 4000));
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
