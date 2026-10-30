import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_SEED } from "./constants";

export type ThemeMode = "light" | "dark" | "system";
export type FontScale = "small" | "medium" | "large";
export type Lang = "system" | "en" | "vi";
export type WindowMode = "remember" | "maximized";
export type BgType = "gradient" | "solid" | "transparent";
export type Chrome = "mac" | "windows" | "none";
export type WmPos = "left" | "center" | "right";
export type ExportFormat = "png" | "jpeg" | "svg";

export interface Design {
  code: string;
  language: string; // "auto" or a highlight.js id
  fileName: string;
  themeId: string;
  bgType: BgType;
  g1: string;
  g2: string;
  angle: number;
  solid: string;
  ratio: string;
  fit: boolean;
  fontId: string;
  fontSize: number;
  padding: number;
  radius: number;
  lineNumbers: boolean;
  highlight: string;
  chrome: Chrome;
  showTitle: boolean;
  shadow: boolean;
  watermarkOn: boolean;
  watermarkText: string;
  watermarkPos: WmPos;
  watermarkOpacity: number;
  focus: boolean;
  ligatures: boolean;
  scale: number;
  format: ExportFormat;
}

export type StyleDesign = Omit<Design, "code" | "fileName" | "language">;
export interface UserPreset { id: string; name: string; design: StyleDesign }

export interface Settings {
  themeMode: ThemeMode;
  seed: string;
  fontScale: FontScale;
  lang: Lang;
  windowMode: WindowMode;
  winSize: { w: number; h: number } | null;
  askBeforeSave: boolean;
  saveDir: string | null;
  uiFont: string;
  formatOnPaste: boolean;
  showLeft: boolean;
  showRight: boolean;
}

export const SAMPLE = `// Debounce a function call
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay = 300
) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const onResize = debounce(() => {
  console.log("Window resized:", window.innerWidth);
}, 200);

window.addEventListener("resize", onResize);`;

export const defaultDesign: Design = {
  code: SAMPLE,
  language: "auto",
  fileName: "debounce.ts",
  themeId: "tokyo-night",
  bgType: "gradient",
  g1: "#4776e6",
  g2: "#8e54e9",
  angle: 135,
  solid: "#6750a4",
  ratio: "auto",
  fit: true,
  fontId: "jetbrains-mono",
  fontSize: 15,
  padding: 56,
  radius: 14,
  lineNumbers: true,
  highlight: "",
  chrome: "mac",
  showTitle: true,
  shadow: true,
  watermarkOn: false,
  watermarkText: "@minhtrong67",
  watermarkPos: "right",
  watermarkOpacity: 0.6,
  focus: false,
  ligatures: true,
  scale: 2,
  format: "png",
};

const defaultSettings: Settings = {
  themeMode: "system",
  seed: DEFAULT_SEED,
  fontScale: "medium",
  lang: "system",
  windowMode: "remember",
  winSize: null,
  askBeforeSave: true,
  saveDir: null,
  uiFont: "system",
  formatOnPaste: true,
  showLeft: true,
  showRight: true,
};

interface AppState extends Settings {
  design: Design;
  presets: UserPreset[];
  set: (p: Partial<Settings>) => void;
  setDesign: (p: Partial<Design>) => void;
  resetDesign: () => void;
  resetSettings: () => void;
  savePreset: (name: string) => void;
  deletePreset: (id: string) => void;
}

// Debounced storage: typing code must not hit localStorage on every keystroke.
let timer: number | undefined;
let pending: [string, string] | null = null;
const flush = () => { if (pending) { try { localStorage.setItem(...pending); } catch { /* quota */ } pending = null; } };
export const flushPersist = flush;
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);
}
const storage = createJSONStorage(() => ({
  getItem: (n: string) => localStorage.getItem(n),
  setItem: (n: string, v: string) => { pending = [n, v]; window.clearTimeout(timer); timer = window.setTimeout(flush, 350); },
  removeItem: (n: string) => localStorage.removeItem(n),
}));

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      design: defaultDesign,
      presets: [],
      set: (p) => set(p),
      setDesign: (p) => set((s) => ({ design: { ...s.design, ...p } })),
      resetDesign: () => set((s) => ({ design: { ...defaultDesign, code: s.design.code, fileName: s.design.fileName } })),
      resetSettings: () => set((s) => ({ ...defaultSettings, winSize: s.winSize })),
      savePreset: (name) => set((s) => {
        const { code: _c, fileName: _f, language: _l, ...style } = s.design;
        return { presets: [...s.presets, { id: Math.random().toString(36).slice(2, 9), name, design: style }].slice(-12) };
      }),
      deletePreset: (id) => set((s) => ({ presets: s.presets.filter((p) => p.id !== id) })),
    }),
    {
      name: "code-image",
      version: 2,
      storage,
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        if (version < 2 && (!p.seed || p.seed.toLowerCase() === "#2196f3")) p.seed = DEFAULT_SEED;
        return p as AppState;
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        return { ...current, ...p, design: { ...current.design, ...(p.design ?? {}) } };
      },
    }
  )
);
