import { create } from "zustand";
import { DEFAULT_SEED, LEGACY_SEEDS, isHex } from "../lib/theme";
import { FONTS, type FontId } from "../lib/fonts";
import { readJson, writeJson, clamp } from "../lib/utils";

export type ThemeMode = "light" | "dark" | "system";
export type TextSize = "small" | "medium" | "large";
export type Lang = "en" | "vi";
export type WindowMode = "remember" | "maximized";
export type TabLayout = "horizontal" | "vertical";
/** Windows 11 backdrop material behind the window */
export type WindowEffect = "mica" | "acrylic" | "micaAlt";

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
  lineNumbers: boolean;
  windowEffect: WindowEffect;
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

export const SETTINGS_VERSION = 4;
export const SETTINGS_KEY = "fluent-note.settings";

// 16 px is the Fluent body size (14 px text = 0.875rem), so Tailwind's rem scale lands exactly on Fluent's type ramp.
export const TEXT_SIZE_PX: Record<TextSize, number> = { small: 14, medium: 16, large: 18 };

const detectLang = (): Lang => ((navigator.language || "en").toLowerCase().startsWith("vi") ? "vi" : "en");

export const defaults = (): Settings => ({
  v: SETTINGS_VERSION,
  theme: "system",
  seed: DEFAULT_SEED,
  lang: detectLang(),
  font: "system",
  textSize: "medium",
  wrap: true,
  lineNumbers: false,
  windowEffect: "mica",
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
  // v4: the app moved from Material 3 to Fluent 2; accent colours saved by older versions map to their Fluent equivalent
  const stale = typeof s.v !== "number" || s.v < SETTINGS_VERSION;
  const legacy = typeof s.seed === "string" ? LEGACY_SEEDS[s.seed.toLowerCase()] : undefined;
  const seed = isHex(s.seed) ? (stale && legacy ? legacy : s.seed) : d.seed;
  const ws = s.winState as Partial<WinState> | null | undefined;
  return {
    v: SETTINGS_VERSION,
    theme: pick(s.theme, ["light", "dark", "system"] as const, d.theme),
    seed,
    lang: pick(s.lang, ["en", "vi"] as const, d.lang),
    font: pick(s.font, FONTS.map((f) => f.id), d.font),
    textSize: pick(s.textSize, ["small", "medium", "large"] as const, d.textSize),
    wrap: bool(s.wrap, d.wrap),
    lineNumbers: bool(s.lineNumbers, d.lineNumbers),
    windowEffect: pick(s.windowEffect, ["mica", "acrylic", "micaAlt"] as const, d.windowEffect),
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
