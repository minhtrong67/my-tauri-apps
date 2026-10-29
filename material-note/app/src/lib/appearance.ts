import { useSettings, TEXT_SIZE_PX, type Settings } from "../store/settings";
import { applyScheme, resolveDark } from "./theme";
import { fontById } from "./fonts";
import { win } from "./tauri";

let lastScheme = "";
let fadeTimer = 0;

/** Writes the colour scheme, font, text size and zoom to CSS variables. Runs synchronously on every change. */
export function applyAppearance(s: Settings) {
  const root = document.documentElement;
  const dark = resolveDark(s.theme);
  const key = `${s.seed}|${dark}`;
  if (key !== lastScheme) {
    const colourOnly = lastScheme.endsWith(`|${dark}`) && lastScheme !== "";
    // a palette change (same mode) fades smoothly; a light/dark flip is handled by the view transition
    if (colourOnly) {
      root.classList.add("theme-fade");
      clearTimeout(fadeTimer);
      fadeTimer = window.setTimeout(() => root.classList.remove("theme-fade"), 360);
    }
    applyScheme(s.seed, dark);
    lastScheme = key;
    void win()?.setTheme(dark ? "dark" : "light").catch(() => {});
  }
  const base = TEXT_SIZE_PX[s.textSize];
  root.style.setProperty("--app-font", fontById(s.font).stack);
  root.style.setProperty("--root-size", base + "px");
  root.style.setProperty("--editor-size", ((base * 1.0667 * s.zoom) / 100).toFixed(2) + "px");
  if (root.lang !== s.lang) root.lang = s.lang;
}

export function initAppearance() {
  applyAppearance(useSettings.getState());
  useSettings.subscribe((s) => applyAppearance(s));
  // follow the OS when the mode is "system"
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (useSettings.getState().theme === "system") applyAppearance(useSettings.getState());
  });
}
