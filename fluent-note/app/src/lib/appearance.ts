import { useSettings, TEXT_SIZE_PX, type Settings } from "../store/settings";
import { applyScheme, resolveDark, setMica } from "./theme";
import { fontById } from "./fonts";
import { isTauri, setWindowEffect, systemAccent, win } from "./tauri";
import { useUi } from "../store/ui";

let lastScheme = "";
let lastTitleBar = "";
let lastEffect = "";
let effectReady = false;

/** Applies the chosen backdrop material (Mica / Acrylic / Mica Alt) to the window and tells the page whether it worked. */
export async function syncWindowEffect() {
  if (!isTauri) return;
  const s = useSettings.getState();
  const dark = resolveDark(s.theme);
  const key = `${s.windowEffect}|${dark}`;
  if (key === lastEffect) return;
  lastEffect = key;
  setMica(await setWindowEffect(s.windowEffect, dark));
}

/** Called once the first effect has been applied at start-up; later setting changes are then applied live. */
export async function enableWindowEffect() {
  await syncWindowEffect();
  effectReady = true;
}
let fadeTimer = 0;

/** Writes the colour scheme, font, text size and zoom to CSS variables. Runs synchronously on every change. */
export function applyAppearance(s: Settings) {
  const root = document.documentElement;
  const dark = resolveDark(s.theme);
  const seed = s.systemAccent && useUi.getState().systemAccent ? (useUi.getState().systemAccent as string) : s.seed;
  const key = `${seed}|${dark}`;
  if (key !== lastScheme) {
    const colourOnly = lastScheme.endsWith(`|${dark}`) && lastScheme !== "";
    // a palette change (same mode) fades smoothly; a light/dark flip is handled by the view transition
    if (colourOnly) {
      root.classList.add("theme-fade");
      clearTimeout(fadeTimer);
      fadeTimer = window.setTimeout(() => root.classList.remove("theme-fade"), 360);
    }
    applyScheme(seed, dark);
    lastScheme = key;
    void win()?.setTheme(dark ? "dark" : "light").catch(() => {});
  }
  const base = TEXT_SIZE_PX[s.textSize];
  root.style.setProperty("--app-font", fontById(s.font).stack);
  root.style.setProperty("--root-size", base + "px");
  root.style.setProperty("--editor-size", ((base * s.zoom) / 100).toFixed(2) + "px");
  if (root.lang !== s.lang) root.lang = s.lang;
  if (s.titleBar !== lastTitleBar) {
    lastTitleBar = s.titleBar;
    void win()?.setDecorations(s.titleBar === "native").catch(() => {});
  }
  if (effectReady) void syncWindowEffect();
}

/** Reads the Windows accent colour; re-applies the theme when it changed (e.g. the user picked a new colour in Windows). */
export async function refreshSystemAccent() {
  const c = await systemAccent();
  if (c !== useUi.getState().systemAccent) {
    useUi.setState({ systemAccent: c });
    applyAppearance(useSettings.getState());
  }
}

export function initAppearance() {
  applyAppearance(useSettings.getState());
  if (isTauri) {
    void refreshSystemAccent();
    window.addEventListener("focus", () => void refreshSystemAccent());
  }
  useSettings.subscribe((s) => applyAppearance(s));
  // follow the OS when the mode is "system"
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (useSettings.getState().theme === "system") applyAppearance(useSettings.getState());
  });
}
