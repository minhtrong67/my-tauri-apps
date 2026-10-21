import { useCallback, useEffect, useMemo, useState } from "react";
import { Lang, LangPref, resolveLang } from "./i18n";
import type { AccentId } from "./accents";

export type ThemePref = "system" | "light" | "dark";
export type FontPref = "sm" | "md" | "lg";
export type ViewMode = "grid" | "list";
export interface Prefs {
  theme: ThemePref;
  font: FontPref;
  lang: LangPref;
  view: ViewMode;
  accent: AccentId;
  filtersOpen: boolean;
}

const KEY = "claude-tracker.prefs";
const DEFAULTS: Prefs = { theme: "system", font: "md", lang: "system", view: "grid", accent: "terracotta", filtersOpen: true };

export function loadPrefs(): Prefs {
  try {
    const p = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
    if ((p.font as string) === "xl") p.font = "lg"; // cỡ "rất lớn" đã bỏ
    return p;
  } catch {
    return DEFAULTS;
  }
}

const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

export function usePrefs() {
  const [prefs, setPrefsState] = useState<Prefs>(loadPrefs);
  const [sysDark, setSysDark] = useState(() => darkQuery().matches);
  const [sysLang, setSysLang] = useState(0); // chỉ để buộc render lại khi hệ thống đổi ngôn ngữ

  useEffect(() => {
    const mq = darkQuery();
    const on = () => setSysDark(mq.matches);
    mq.addEventListener("change", on);
    const onLang = () => setSysLang((n) => n + 1);
    window.addEventListener("languagechange", onLang);
    return () => {
      mq.removeEventListener("change", on);
      window.removeEventListener("languagechange", onLang);
    };
  }, []);

  const setPrefs = useCallback((p: Partial<Prefs>) => {
    setPrefsState((old) => {
      const next = { ...old, ...p };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const theme: "light" | "dark" = prefs.theme === "system" ? (sysDark ? "dark" : "light") : prefs.theme;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lang: Lang = useMemo(() => resolveLang(prefs.lang), [prefs.lang, sysLang]);

  // Áp dụng lên <html> ngay lập tức (CSS dùng data-theme / data-font)
  useEffect(() => {
    const r = document.documentElement;
    r.dataset.theme = theme;
    r.dataset.font = prefs.font;
    r.dataset.accent = prefs.accent;
    r.lang = lang;
    document.title = "Claude Tracker";
  }, [theme, prefs.font, prefs.accent, lang]);

  // Đồng bộ thanh tiêu đề gốc của Windows với lựa chọn của người dùng
  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    import("@tauri-apps/api/window")
      .then((m) => m.getCurrentWindow().setTheme(prefs.theme === "system" ? null : prefs.theme))
      .catch(() => {});
  }, [prefs.theme]);

  return { prefs, setPrefs, lang, theme };
}
