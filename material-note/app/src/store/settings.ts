import { create } from "zustand";
import { DEFAULT_SEED, isHex } from "../lib/theme";
import { FONTS, type FontId } from "../lib/fonts";
import { readJson, writeJson, clamp } from "../lib/utils";

export type ThemeMode = "light" | "dark" | "system";
export type TextSize = "small" | "medium" | "large";
export type Lang = "en" | "vi";
export type WindowMode = "remember" | "maximized";
export type TabLayout = "horizontal" | "vertical";

export interface WinState {
  w: number;
  h: number;
  maximized: boolean;
}

export interface Settings {
  /** settings schema version (used for one-time migrations) */
  v: number;
  theme: ThemeMode;
  seed: string;
  lang: Lang;
  font: FontId;
  textSize: TextSize;
  wrap: boolean;
  statusBar: boolean;
  spellcheck: boolean;
  restore: boolean;
  autosave: boolean;
  tabLayout: TabLayout;
  windowMode: WindowMode;
  winState: WinState | null;
  zoom: number;
  /** default folder offered by the "Save" dialog (null = the system default / last used folder) */
  saveDir: string | null;
}

export const SETTINGS_VERSION = 3;
export const SETTINGS_KEY = "material-note.settings";

export const TEXT_SIZE_PX: Record<TextSize, number> = { small: 13.5, medium: 15, large: 17 };

const detectLang = (): Lang => ((navigator.language || "en").toLowerCase().startsWith("vi") ? "vi" : "en");

export const defaults = (): Settings => ({
  v: SETTINGS_VERSION,
  theme: "system",
  seed: DEFAULT_SEED,
  lang: detectLang(),
  font: "system",
  textSize: "medium",
  wrap: true,
  statusBar: true,
  spellcheck: false,
  restore: true,
  autosave: false,
  tabLayout: "horizontal",
  windowMode: "remember",
  winState: null,
  zoom: 100,
  saveDir: null,
});

// Validates every field, so settings saved by older versions (or edited by hand) never break the app.
function load(): Settings {
  const d = defaults();
  const s = readJson<Record<string, unknown>>(SETTINGS_KEY) ?? {};
  const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
    typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  const bool = (v: unknown, fb: boolean) => (typeof v === "boolean" ? v : fb);
  // v3: the default colour changed to Material blue; people still on an old default colour get the new one
  const oldDefault = typeof s.seed === "string" && ["#6b4eff", "#6750a4"].includes(s.seed.toLowerCase());
  const ws = s.winState as Partial<WinState> | null | undefined;
  return {
    v: SETTINGS_VERSION,
    theme: pick(s.theme, ["light", "dark", "system"] as const, d.theme),
    seed: isHex(s.seed) && !((s.v as number) < SETTINGS_VERSION || s.v === undefined ? oldDefault : false) ? s.seed : d.seed,
    lang: pick(s.lang, ["en", "vi"] as const, d.lang),
    font: pick(s.font, FONTS.map((f) => f.id), d.font),
    textSize: pick(s.textSize, ["small", "medium", "large"] as const, d.textSize),
    wrap: bool(s.wrap, d.wrap),
    statusBar: bool(s.statusBar, d.statusBar),
    spellcheck: bool(s.spellcheck, d.spellcheck),
    restore: bool(s.restore, d.restore),
    autosave: bool(s.autosave, d.autosave),
    tabLayout: pick(s.tabLayout, ["horizontal", "vertical"] as const, d.tabLayout),
    windowMode: pick(s.windowMode, ["remember", "maximized"] as const, d.windowMode),
    winState:
      ws && typeof ws.w === "number" && typeof ws.h === "number"
        ? { w: ws.w, h: ws.h, maximized: !!ws.maximized }
        : null,
    zoom: typeof s.zoom === "number" ? clamp(Math.round(s.zoom), 25, 500) : d.zoom,
    saveDir: typeof s.saveDir === "string" && s.saveDir.trim() ? s.saveDir : null,
  };
}

interface Store extends Settings {
  set: (p: Partial<Settings>) => void;
  reset: () => void;
}

export const useSettings = create<Store>((set, get) => ({
  ...load(),
  set: (p) => set(p),
  reset: () => set({ ...defaults(), winState: get().winState }),
}));

let timer = 0;
useSettings.subscribe((state) => {
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    const { set: _s, reset: _r, ...data } = state;
    void _s;
    void _r;
    writeJson(SETTINGS_KEY, data);
  }, 120);
});

export const getSettings = () => useSettings.getState();
