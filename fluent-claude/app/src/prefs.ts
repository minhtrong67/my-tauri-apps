import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Lang, LangPref, resolveLang } from "./i18n";
import type { AccentId } from "./accents";

export type ThemePref = "system" | "light" | "dark";
export type FontPref = "sm" | "md" | "lg";
export type FontFamilyId = "system" | "roboto" | "inter" | "vietnam" | "noto" | "opensans";
export type ViewMode = "grid" | "list";
/** Chất liệu cửa sổ: Mica, Acrylic, Mica Alt ("tabbed" trong API của Windows) */
export type EffectId = "mica" | "acrylic" | "tabbed";
/** Hiệu ứng thực sự đang bật (có thể khác lựa chọn nếu Windows không hỗ trợ) */
export type AppliedFx = EffectId | "none";
export interface Prefs {
  theme: ThemePref;
  font: FontPref;
  lang: LangPref;
  view: ViewMode;
  accent: AccentId;
  ff: FontFamilyId;
  navOpen: boolean;
  filtersOpen: boolean;
  effect: EffectId;
  transparency: boolean;
  motion: boolean;
}

const KEY = "fluent-claude.prefs";
const DEFAULTS: Prefs = { theme: "system", font: "md", lang: "system", view: "grid", accent: "blue", ff: "system", navOpen: true, filtersOpen: false, effect: "mica", transparency: true, motion: true };

export function loadPrefs(): Prefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

export interface EffectResult {
  applied: AppliedFx;
  requested: EffectId;
  error?: string | null;
}

export function usePrefs() {
  const [prefs, setPrefsState] = useState<Prefs>(loadPrefs);
  const [sysDark, setSysDark] = useState(() => darkQuery().matches);
  const [sysLang, setSysLang] = useState(0); // chỉ để buộc render lại khi hệ thống đổi ngôn ngữ
  const [fx, setFx] = useState<EffectResult>({ applied: prefs.transparency ? prefs.effect : "none", requested: prefs.effect });

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

  // Áp dụng lên <html> ngay lập tức (CSS dùng data-*)
  useEffect(() => {
    const r = document.documentElement;
    r.dataset.theme = theme;
    r.dataset.font = prefs.font;
    r.dataset.accent = prefs.accent;
    r.dataset.ff = prefs.ff;
    r.dataset.fx = fx.applied;
    if (prefs.motion) delete r.dataset.motion;
    else r.dataset.motion = "off";
    r.lang = lang;
    document.title = "Fluent Claude";
  }, [theme, prefs.font, prefs.accent, prefs.ff, prefs.motion, fx.applied, lang]);

  // Báo backend áp chất liệu cửa sổ (Mica / Acrylic / Mica Alt). Nếu Windows không hỗ trợ, backend trả về hiệu ứng thực tế.
  useEffect(() => {
    let alive = true;
    invoke<EffectResult>("set_window_effect", { effect: prefs.effect, dark: theme === "dark", enabled: prefs.transparency })
      .then((r) => alive && setFx(r))
      .catch(() => alive && setFx({ applied: "none", requested: prefs.effect })); // chạy ngoài Tauri (trình duyệt) -> nền đặc
    return () => {
      alive = false;
    };
  }, [prefs.effect, prefs.transparency, theme]);

  // Đồng bộ chế độ sáng/tối của khung Windows (menu, hộp thoại hệ thống, nền Mica) với lựa chọn của người dùng
  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    import("@tauri-apps/api/window")
      .then((m) => m.getCurrentWindow().setTheme(prefs.theme === "system" ? null : prefs.theme))
      .catch(() => {});
  }, [prefs.theme]);

  return { prefs, setPrefs, lang, theme, fx };
}
