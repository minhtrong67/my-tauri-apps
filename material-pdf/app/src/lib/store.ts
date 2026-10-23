import { create } from "zustand";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { DEFAULT_SEED, type ThemeMode } from "./theme";
import { detectLang, translate, type Key, type Lang } from "./i18n";

export type FontSize = "small" | "medium" | "large";
export type Tool = "none" | "highlight" | "pen" | "text" | "rect" | "eraser";
export type Fit = "width" | "page" | "custom";
export type SideTab = "thumbs" | "outline" | "search";

export interface Settings {
  themeMode: ThemeMode; seed: string; fontSize: FontSize; lang: Lang | "auto";
  startup: "remember" | "maximize"; defaultFit: "width" | "page" | "100"; nightPages: boolean; animations: boolean;
  layout: "continuous" | "single";
}
export const DEFAULT_SETTINGS: Settings = {
  themeMode: "system", seed: DEFAULT_SEED, fontSize: "medium", lang: "auto", startup: "remember",
  defaultFit: "width", nightPages: false, animations: true, layout: "continuous",
};

export type Annot =
  | { id: string; type: "highlight"; page: number; x: number; y: number; w: number; h: number; color: string }
  | { id: string; type: "rect"; page: number; x: number; y: number; w: number; h: number; color: string; width: number }
  | { id: string; type: "pen"; page: number; pts: [number, number][]; color: string; width: number }
  | { id: string; type: "text"; page: number; x: number; y: number; text: string; color: string; size: number };

export interface Doc {
  id: string; name: string; path: string | null; bytes: Uint8Array; pdf: PDFDocumentProxy; password?: string;
  numPages: number; sizes: { w: number; h: number }[]; page: number; scale: number; fit: Fit; dirty: boolean;
  annots: Annot[]; past: Annot[][]; future: Annot[][]; rev: number;
}
export interface RecentFile { path: string; name: string; time: number }
export interface SearchHit { page: number; idx: number; snippet: string }

const load = <T,>(k: string, d: T): T => { try { return { ...d, ...JSON.parse(localStorage.getItem(k) ?? "{}") }; } catch { return d; } };

interface State {
  settings: Settings; setSettings: (p: Partial<Settings>) => void; resetSettings: () => void;
  recent: RecentFile[]; addRecent: (f: RecentFile) => void; removeRecent: (p: string) => void; clearRecent: () => void;
  docs: Doc[]; activeId: string | null;
  addDoc: (d: Doc) => void; patchDoc: (id: string, p: Partial<Doc>) => void; removeDoc: (id: string) => void; setActive: (id: string) => void;
  sidebarOpen: boolean; sideTab: SideTab; setSidebar: (o: boolean, tab?: SideTab) => void;
  tool: Tool; color: string; strokeW: number; textSize: number; annotBar: boolean;
  setTool: (t: Tool) => void; patchTool: (p: Partial<Pick<State, "color" | "strokeW" | "textSize" | "annotBar">>) => void;
  search: { q: string; hits: SearchHit[]; cur: number; busy: boolean; jump: number };
  setSearch: (p: Partial<State["search"]>) => void;
  present: boolean; setPresent: (v: boolean) => void;
  dialog: { kind: string; props?: any } | null; openDialog: (kind: string, props?: any) => void; closeDialog: () => void;
  toast: { id: number; msg: string } | null; showToast: (msg: string) => void;
  dragging: boolean; setDragging: (v: boolean) => void;
}

let toastId = 0;
export const useStore = create<State>((set, get) => ({
  settings: load("mpdf.settings", DEFAULT_SETTINGS),
  setSettings: (p) => set((s) => { const settings = { ...s.settings, ...p }; localStorage.setItem("mpdf.settings", JSON.stringify(settings)); return { settings }; }),
  resetSettings: () => { localStorage.setItem("mpdf.settings", JSON.stringify(DEFAULT_SETTINGS)); set({ settings: DEFAULT_SETTINGS }); },
  recent: (() => { try { return JSON.parse(localStorage.getItem("mpdf.recent") ?? "[]"); } catch { return []; } })(),
  addRecent: (f) => set((s) => { const recent = [f, ...s.recent.filter((r) => r.path !== f.path)].slice(0, 12); localStorage.setItem("mpdf.recent", JSON.stringify(recent)); return { recent }; }),
  removeRecent: (p) => set((s) => { const recent = s.recent.filter((r) => r.path !== p); localStorage.setItem("mpdf.recent", JSON.stringify(recent)); return { recent }; }),
  clearRecent: () => { localStorage.removeItem("mpdf.recent"); set({ recent: [] }); },
  docs: [], activeId: null,
  addDoc: (d) => set((s) => ({ docs: [...s.docs, d], activeId: d.id, search: { q: "", hits: [], cur: -1, busy: false, jump: 0 } })),
  patchDoc: (id, p) => set((s) => ({ docs: s.docs.map((d) => (d.id === id ? { ...d, ...p } : d)) })),
  removeDoc: (id) => set((s) => {
    const i = s.docs.findIndex((d) => d.id === id); const docs = s.docs.filter((d) => d.id !== id);
    s.docs[i]?.pdf.destroy();
    return { docs, activeId: s.activeId === id ? (docs[Math.min(i, docs.length - 1)]?.id ?? null) : s.activeId };
  }),
  setActive: (id) => set({ activeId: id, search: { q: "", hits: [], cur: -1, busy: false, jump: 0 } }),
  sidebarOpen: true, sideTab: "thumbs",
  setSidebar: (o, tab) => set((s) => ({ sidebarOpen: o, sideTab: tab ?? s.sideTab })),
  tool: "none", color: "#FFEB3B", strokeW: 3, textSize: 16, annotBar: false,
  setTool: (tool) => set((s) => ({ tool, color: tool === "highlight" ? "#FFEB3B" : tool !== "none" && s.color === "#FFEB3B" ? "#F44336" : s.color })),
  patchTool: (p) => set(p),
  search: { q: "", hits: [], cur: -1, busy: false, jump: 0 },
  setSearch: (p) => set((s) => ({ search: { ...s.search, ...p } })),
  present: false, setPresent: (present) => set({ present }),
  dialog: null, openDialog: (kind, props) => set({ dialog: { kind, props } }), closeDialog: () => set({ dialog: null }),
  toast: null,
  showToast: (msg) => { const id = ++toastId; set({ toast: { id, msg } }); setTimeout(() => get().toast?.id === id && set({ toast: null }), 3600); },
  dragging: false, setDragging: (dragging) => set({ dragging }),
}));

export const useDoc = () => useStore((s) => s.docs.find((d) => d.id === s.activeId) ?? null);

export function useLang(): Lang {
  const l = useStore((s) => s.settings.lang);
  return l === "auto" ? detectLang() : l;
}
export function useT() {
  const lang = useLang();
  return (key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars);
}
export const tr = (key: Key, vars?: Record<string, string | number>) => {
  const l = useStore.getState().settings.lang;
  return translate(l === "auto" ? detectLang() : l, key, vars);
};
export const toast = (key: Key, vars?: Record<string, string | number>) => useStore.getState().showToast(tr(key, vars));
