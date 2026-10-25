import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_SEED, type FontId, type FontSize, type Mode } from "./theme";
import type { TrackInfo } from "./tauri";

export type Lang = "auto" | "en" | "vi";
export type Quality = "best" | "320" | "256" | "192" | "128";
export type NameTpl = "artist-title" | "title" | "title-artist" | "artist-album-title";
export type DupPolicy = "rename" | "skip" | "overwrite";

export interface Settings {
  seed: string; mode: Mode; lang: Lang; font: FontId; fontSize: FontSize;
  quality: Quality; outDir: string; crop: boolean;
  nameTpl: NameTpl; artistFolder: boolean; dup: DupPolicy; parallel: number; speed: string;
  cookies: string; proxy: string; notify: boolean; checkUpdates: boolean;
}
export const DEFAULTS: Settings = {
  seed: DEFAULT_SEED, mode: "auto", lang: "auto", font: "system", fontSize: "medium",
  quality: "best", outDir: "", crop: true,
  nameTpl: "artist-title", artistFolder: false, dup: "rename", parallel: 2, speed: "",
  cookies: "", proxy: "", notify: true, checkUpdates: true,
};

interface SettingsStore { s: Settings; set: (p: Partial<Settings>) => void; reset: () => void }
export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      s: DEFAULTS,
      set: (p) => set((st) => ({ s: { ...st.s, ...p } })),
      reset: () => set((st) => ({ s: { ...DEFAULTS, outDir: st.s.outDir } })),
    }),
    {
      name: "mp3dl.settings.v5",
      version: 1,
      merge: (saved, cur) => ({ ...cur, s: { ...DEFAULTS, ...((saved as { s?: Partial<Settings> })?.s ?? {}) } }),
    },
  ),
);

/* ───────── Toast ───────── */
export type ToastType = "info" | "success" | "warning" | "error";
export interface ToastItem { id: number; type: ToastType; text: string; action?: { label: string; fn: () => void }; duration: number }
let toastId = 0;
interface ToastStore { items: ToastItem[]; push: (type: ToastType, text: string, o?: { action?: ToastItem["action"]; duration?: number }) => void; dismiss: (id: number) => void }
export const useToasts = create<ToastStore>((set) => ({
  items: [],
  push: (type, text, o) => set((st) => ({ items: [...st.items.slice(-3), { id: ++toastId, type, text, action: o?.action, duration: o?.duration ?? (o?.action ? 8000 : 4500) }] })),
  dismiss: (id) => set((st) => ({ items: st.items.filter((t) => t.id !== id) })),
}));
export const toast = {
  info: (t: string, o?: Parameters<ToastStore["push"]>[2]) => useToasts.getState().push("info", t, o),
  success: (t: string, o?: Parameters<ToastStore["push"]>[2]) => useToasts.getState().push("success", t, o),
  warning: (t: string, o?: Parameters<ToastStore["push"]>[2]) => useToasts.getState().push("warning", t, o),
  error: (t: string, o?: Parameters<ToastStore["push"]>[2]) => useToasts.getState().push("error", t, o),
};

/* ───────── Lịch sử ───────── */
export interface HistoryEntry { id: string; url: string; file: string; title: string; artist: string; thumbnail: string; source: string; quality: Quality; at: number }
interface HistoryStore { items: HistoryEntry[]; add: (e: HistoryEntry) => void; remove: (id: string) => void; clear: () => void }
export const useHistory = create<HistoryStore>()(
  persist(
    (set) => ({
      items: [],
      add: (e) => set((st) => ({ items: [e, ...st.items.filter((x) => x.file !== e.file)].slice(0, 500) })),
      remove: (id) => set((st) => ({ items: st.items.filter((x) => x.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    { name: "mp3dl.history.v5" },
  ),
);

/* ───────── Công cụ ───────── */
export const useTools = create<{ tools: import("./tauri").ToolStatus | null; set: (t: import("./tauri").ToolStatus | null) => void }>((set) => ({ tools: null, set: (tools) => set({ tools }) }));

export type Stage = "queued" | "downloading" | "converting" | "tagging" | "done" | "error" | "cancelled";
export interface QueueItem {
  id: string; jobId: string | null; url: string; info: TrackInfo | null; edited: boolean; quality: Quality;
  stage: Stage; percent: number; speed: string; eta: string; message: string; file: string | null;
}
