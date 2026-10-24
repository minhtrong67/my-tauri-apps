import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { Hct, SchemeTonalSpot } from "@material/material-color-utilities";
import { dict, type Key } from "../lib/i18n";
import { load, save } from "../lib/storage";
import { toArgb } from "../lib/color";
import { THEME_TRANSITION, rolesOf, themeVars, type Roles } from "../lib/theme";
import { maximizeWindow, type WindowMode, type WindowSize } from "../lib/tauri";

export type ThemeMode = "light" | "dark" | "system";
export type FontSize = "small" | "medium" | "large";
export type Lang = "en" | "vi";
export type FontId = "system" | "roboto" | "inter" | "nunito" | "beVietnam";

export interface Settings {
  mode: ThemeMode;
  accent: string;
  fontSize: FontSize;
  lang: Lang;
  font: FontId;
  windowMode: WindowMode;
  windowSize: WindowSize | null;
  railExpanded: boolean;
}

export const FONTS: { id: FontId; label: string; stack: string }[] = [
  {
    id: "system",
    label: "System UI",
    stack: 'system-ui, -apple-system, "Segoe UI Variable Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  },
  { id: "roboto", label: "Roboto", stack: '"Roboto", system-ui, sans-serif' },
  { id: "inter", label: "Inter", stack: '"Inter", system-ui, sans-serif' },
  { id: "nunito", label: "Nunito", stack: '"Nunito", system-ui, sans-serif' },
  { id: "beVietnam", label: "Be Vietnam Pro", stack: '"Be Vietnam Pro", system-ui, sans-serif' },
];

/** Material Design theme colors (Material palette 500 shades + the M3 baseline purple). */
export const ACCENTS: { id: string; hex: string; en: string; vi: string }[] = [
  { id: "baseline", hex: "#6750A4", en: "Baseline", vi: "Mặc định" },
  { id: "red", hex: "#F44336", en: "Red", vi: "Đỏ" },
  { id: "pink", hex: "#E91E63", en: "Pink", vi: "Hồng" },
  { id: "purple", hex: "#9C27B0", en: "Purple", vi: "Tím" },
  { id: "deepPurple", hex: "#673AB7", en: "Deep Purple", vi: "Tím đậm" },
  { id: "indigo", hex: "#3F51B5", en: "Indigo", vi: "Chàm" },
  { id: "blue", hex: "#2196F3", en: "Blue", vi: "Xanh dương" },
  { id: "lightBlue", hex: "#03A9F4", en: "Light Blue", vi: "Xanh da trời" },
  { id: "cyan", hex: "#00BCD4", en: "Cyan", vi: "Lơ" },
  { id: "teal", hex: "#009688", en: "Teal", vi: "Xanh mòng két" },
  { id: "green", hex: "#4CAF50", en: "Green", vi: "Xanh lá" },
  { id: "lightGreen", hex: "#8BC34A", en: "Light Green", vi: "Xanh lá nhạt" },
  { id: "lime", hex: "#CDDC39", en: "Lime", vi: "Chanh" },
  { id: "yellow", hex: "#FFEB3B", en: "Yellow", vi: "Vàng" },
  { id: "amber", hex: "#FFC107", en: "Amber", vi: "Hổ phách" },
  { id: "orange", hex: "#FF9800", en: "Orange", vi: "Cam" },
  { id: "deepOrange", hex: "#FF5722", en: "Deep Orange", vi: "Cam đậm" },
  { id: "brown", hex: "#795548", en: "Brown", vi: "Nâu" },
  { id: "blueGrey", hex: "#607D8B", en: "Blue Grey", vi: "Xám xanh" },
];

const FONT_PX: Record<FontSize, string> = { small: "14px", medium: "16px", large: "18px" };
const STORAGE_KEY = "mtb.settings";

function defaults(): Settings {
  const vi = typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("vi");
  return {
    mode: "system",
    accent: "#6750A4",
    fontSize: "medium",
    lang: vi ? "vi" : "en",
    font: "system",
    windowMode: "remember",
    windowSize: null,
    railExpanded: false,
  };
}

type Vars = Record<string, string | number>;
export type TFn = (key: Key, vars?: Vars) => string;

interface Ctx {
  settings: Settings;
  dark: boolean;
  appRoles: Roles;
  set: (patch: Partial<Settings>) => void;
  t: TFn;
}

const SettingsContext = createContext<Ctx | null>(null);

function systemDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => ({ ...defaults(), ...load<Partial<Settings>>(STORAGE_KEY, {}) }));
  const [sysDark, setSysDark] = useState(systemDark);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = (e: MediaQueryListEvent) => setSysDark(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const dark = settings.mode === "system" ? sysDark : settings.mode === "dark";

  const appRoles = useMemo(
    () => rolesOf(new SchemeTonalSpot(Hct.fromInt(toArgb(settings.accent)), dark, 0)),
    [settings.accent, dark],
  );

  const set = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      save(STORAGE_KEY, next);
      return next;
    });
    if (patch.windowMode === "maximized") void maximizeWindow();
  }, []);

  // Apply theme variables. The transition is armed after the first paint so that the
  // initial load does not animate from the defaults.
  useLayoutEffect(() => {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(themeVars(appRoles))) root.style.setProperty(k, v);
    root.dataset.theme = dark ? "dark" : "light";
    root.style.colorScheme = dark ? "dark" : "light";
  }, [appRoles, dark]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      document.documentElement.style.transition = THEME_TRANSITION;
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = FONT_PX[settings.fontSize];
    root.style.setProperty("--app-font", (FONTS.find((f) => f.id === settings.font) ?? FONTS[0]).stack);
    root.lang = settings.lang;
  }, [settings.fontSize, settings.font, settings.lang]);

  const t = useCallback<TFn>(
    (key, vars) => {
      let s: string = dict[settings.lang][key] ?? dict.en[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
      return s;
    },
    [settings.lang],
  );

  const value = useMemo<Ctx>(() => ({ settings, dark, appRoles, set, t }), [settings, dark, appRoles, set, t]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
