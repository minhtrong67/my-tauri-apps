import { create } from "zustand";
import type { LucideIcon } from "lucide-react";

export type ToastKind = "info" | "success" | "warning" | "error";

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  duration: number;
  action?: { label: string; onClick: () => void };
}

export type Tone = "primary" | "tonal" | "danger" | "success" | "neutral" | "text";

export interface ConfirmAction {
  id: string;
  label: string;
  icon: LucideIcon;
  tone: Tone;
}

export interface ConfirmRequest {
  title: string;
  message: string;
  icon: LucideIcon;
  iconTone?: "primary" | "error" | "warning";
  actions: ConfirmAction[];
  resolve: (id: string) => void;
}

export type SettingsTab = "appearance" | "editor" | "window";

interface UiState {
  toasts: ToastItem[];
  confirm: ConfirmRequest | null;
  settingsOpen: boolean;
  settingsTab: SettingsTab;
  aboutOpen: boolean;
  gotoOpen: boolean;
  paletteOpen: boolean;
  zen: boolean;
  editRev: number;
  draftWarned: boolean;
  openSettings: (tab?: SettingsTab) => void;
  patch: (p: Partial<UiState>) => void;
}

export const useUi = create<UiState>((set) => ({
  toasts: [],
  confirm: null,
  settingsOpen: false,
  settingsTab: "appearance",
  aboutOpen: false,
  gotoOpen: false,
  paletteOpen: false,
  zen: false,
  editRev: 0,
  draftWarned: false,
  openSettings: (tab) => set((s) => ({ settingsOpen: true, settingsTab: tab ?? s.settingsTab })),
  patch: (p) => set(p),
}));

let toastSeq = 0;
const MAX_TOASTS = 4;

export function pushToast(kind: ToastKind, message: string, opts: { duration?: number; action?: ToastItem["action"] } = {}) {
  const item: ToastItem = {
    id: ++toastSeq,
    kind,
    message,
    duration: opts.duration ?? (kind === "error" ? 6000 : kind === "warning" ? 5000 : 3200),
    action: opts.action,
  };
  useUi.setState((s) => {
    // identical consecutive message: don't stack duplicates
    if (s.toasts.some((x) => x.kind === kind && x.message === message)) return s;
    return { toasts: [...s.toasts, item].slice(-MAX_TOASTS) };
  });
  return item.id;
}

export const dismissToast = (id: number) => useUi.setState((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));

export const toast = {
  info: (m: string, o?: { duration?: number; action?: ToastItem["action"] }) => pushToast("info", m, o),
  success: (m: string, o?: { duration?: number; action?: ToastItem["action"] }) => pushToast("success", m, o),
  warning: (m: string, o?: { duration?: number; action?: ToastItem["action"] }) => pushToast("warning", m, o),
  error: (m: string, o?: { duration?: number; action?: ToastItem["action"] }) => pushToast("error", m, o),
};

export function confirmDialog(req: Omit<ConfirmRequest, "resolve">): Promise<string> {
  return new Promise((resolve) => {
    useUi.setState({ confirm: { ...req, resolve } });
  });
}

export function resolveConfirm(id: string) {
  const c = useUi.getState().confirm;
  if (!c) return;
  useUi.setState({ confirm: null });
  c.resolve(id);
}

/* Cursor / document statistics for the status bar (kept apart so typing only re-renders the status bar). */
interface CursorState {
  ln: number;
  col: number;
  sel: number;
  chars: number;
  words: number;
}
export const useCursor = create<CursorState>(() => ({ ln: 1, col: 1, sel: 0, chars: 0, words: 0 }));

/* Find & replace state */
interface FindState {
  open: boolean;
  replaceMode: boolean;
  query: string;
  replace: string;
  matchCase: boolean;
  wholeWord: boolean;
  regex: boolean;
  total: number;
  current: number;
  invalid: boolean;
  focusTick: number;
  patch: (p: Partial<FindState>) => void;
}
export const useFind = create<FindState>((set) => ({
  open: false,
  replaceMode: false,
  query: "",
  replace: "",
  matchCase: false,
  wholeWord: false,
  regex: false,
  total: 0,
  current: 0,
  invalid: false,
  focusTick: 0,
  patch: (p) => set(p),
}));
