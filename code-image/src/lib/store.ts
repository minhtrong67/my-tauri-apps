import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  scale: number;
  format: ExportFormat;
}

export interface Settings {
  themeMode: ThemeMode;
  seed: string;
  fontScale: FontScale;
  lang: Lang;
  windowMode: WindowMode;
  winSize: { w: number; h: number } | null;
  askBeforeSave: boolean;
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
  scale: 2,
  format: "png",
};

const defaultSettings: Settings = {
  themeMode: "system",
  seed: "#2196F3",
  fontScale: "medium",
  lang: "system",
  windowMode: "remember",
  winSize: null,
  askBeforeSave: true,
};

interface AppState extends Settings {
  design: Design;
  set: (p: Partial<Settings>) => void;
  setDesign: (p: Partial<Design>) => void;
  resetDesign: () => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      design: defaultDesign,
      set: (p) => set(p),
      setDesign: (p) => set((s) => ({ design: { ...s.design, ...p } })),
      resetDesign: () => set((s) => ({ design: { ...defaultDesign, code: s.design.code, fileName: s.design.fileName } })),
    }),
    {
      name: "code-image",
      version: 1,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        return { ...current, ...p, design: { ...current.design, ...(p.design ?? {}) } };
      },
    }
  )
);
