import { getCurrentWindow, Effect, EffectState } from "@tauri-apps/api/window";
import type { Lang } from "./i18n";

export type EffectId = "mica" | "micaAlt" | "acrylic" | "blur" | "liquid" | "frosted" | "none";
export interface Settings {
  theme: "system" | "light" | "dark";
  accent: string;
  lang: Lang;
  effect: EffectId;
  startup: "remember" | "maximized";
}

export const defaultSettings: Settings = {
  theme: "system",
  accent: "#0067C0",
  lang: navigator.language.toLowerCase().startsWith("vi") ? "vi" : "en",
  effect: "mica",
  startup: "remember",
};

export const inTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export function loadSettings(): Settings {
  try {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem("ffi.settings") || "{}") };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(s: Settings) {
  localStorage.setItem("ffi.settings", JSON.stringify(s));
}

type EffectsArg = Parameters<ReturnType<typeof getCurrentWindow>["setEffects"]>[0];

export async function applyEffect(effect: EffectId, dark: boolean): Promise<string | null> {
  if (!inTauri) return null;
  const w = getCurrentWindow();
  try {
    // always reset first: DWM backdrops do not stack, and switching directly can leave the old one active
    await w.clearEffects();
    if (effect === "none") return null;
    await new Promise((r) => setTimeout(r, 60));
    type RGBA = [number, number, number, number];
    const pick = (light: RGBA, night: RGBA): RGBA => (dark ? night : light);
    const map: Record<Exclude<EffectId, "none">, EffectsArg> = {
      mica: { effects: [Effect.Mica], state: EffectState.Active },
      micaAlt: { effects: [Effect.Tabbed], state: EffectState.Active },
      acrylic: { effects: [Effect.Acrylic], state: EffectState.Active, color: pick([243, 243, 243, 150], [32, 32, 32, 150]) },
      // Windows 10 blur-behind: light tint so the real blur shows through
      blur: { effects: [Effect.Blur], state: EffectState.Active, color: pick([250, 250, 250, 90], [24, 24, 24, 110]) },
      // glass looks: native acrylic for the see-through part, CSS adds the glass surface on top
      liquid: { effects: [Effect.Acrylic], state: EffectState.Active, color: pick([255, 255, 255, 40], [20, 22, 32, 55]) },
      frosted: { effects: [Effect.Acrylic], state: EffectState.Active, color: pick([245, 245, 247, 175], [30, 30, 34, 175]) },
    };
    await w.setEffects(map[effect]);
    return null;
  } catch (e) {
    console.warn("window effect failed", e);
    return String(e);
  }
}

export async function applyNativeTheme(theme: Settings["theme"]) {
  if (!inTauri) return;
  try {
    await getCurrentWindow().setTheme(theme === "system" ? null : theme);
  } catch (e) {
    console.warn(e);
  }
}

export async function applyStartup(mode: Settings["startup"]) {
  if (!inTauri || mode !== "maximized") return;
  try {
    await getCurrentWindow().maximize();
  } catch (e) {
    console.warn(e);
  }
}

let shown = false;
/** Show the (initially hidden) window after the first paint, so it never flashes at a wrong position. */
export async function showWindow() {
  if (!inTauri || shown) return;
  shown = true;
  try {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const w = getCurrentWindow();
    await w.show();
    await w.setFocus();
  } catch (e) {
    shown = false;
    console.warn(e);
  }
}
