import { create } from "zustand";
import { api } from "../lib/api";
import { DEFAULT_CORE, type CoreSettings } from "../lib/types";
import { DEFAULT_SEED, applyFontSize, applyTheme, applyThemeAnimated, type FontSize, type ThemeMode } from "../lib/theme";
import { resolveLang, type Lang, type LangPref } from "../lib/i18n";

interface UiPrefs {
  themeMode: ThemeMode;
  seed: string;
  fontSize: FontSize;
  language: LangPref;
}

const KEY = "mvd.ui";
const DEFAULT_UI: UiPrefs = { themeMode: "system", seed: DEFAULT_SEED, fontSize: "md", language: "system" };

function loadUi(): UiPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_UI, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_UI;
}

interface SettingsState {
  ui: UiPrefs;
  lang: Lang;
  core: CoreSettings;
  defaultDir: string;
  ready: boolean;
  load: () => Promise<void>;
  setUi: (patch: Partial<UiPrefs>, origin?: { x: number; y: number }) => void;
  setCore: (patch: Partial<CoreSettings>) => void;
}

export const useSettings = create<SettingsState>((set, get) => {
  const ui = loadUi();
  return {
    ui,
    lang: resolveLang(ui.language),
    core: DEFAULT_CORE,
    defaultDir: "",
    ready: false,
    load: async () => {
      const [core, defaultDir] = await Promise.all([api.getSettings(), api.defaultDownloadDir()]);
      set({ core: { ...DEFAULT_CORE, ...core }, defaultDir, ready: true });
    },
    setUi: (patch, origin) => {
      const next = { ...get().ui, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      set({ ui: next, lang: resolveLang(next.language) });
      if (patch.fontSize) applyFontSize(next.fontSize);
      if (patch.themeMode !== undefined || patch.seed !== undefined) {
        if (patch.themeMode !== undefined) applyThemeAnimated(next.themeMode, next.seed, origin);
        else applyTheme(next.themeMode, next.seed);
      }
    },
    setCore: (patch) => {
      const next = { ...get().core, ...patch };
      set({ core: next });
      void api.saveSettings(next);
    },
  };
});

export function initTheme() {
  const { ui } = useSettings.getState();
  applyFontSize(ui.fontSize);
  applyTheme(ui.themeMode, ui.seed);
  // Follow the OS while in "system" mode.
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const cur = useSettings.getState().ui;
    if (cur.themeMode === "system") applyTheme("system", cur.seed);
  });
}
