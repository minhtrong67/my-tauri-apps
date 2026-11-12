import { create } from "zustand";
import { inTauri, invoke, IS_WINDOWS } from "./tauri";

/** Chất liệu cửa sổ của Windows 11: Mica, Acrylic, Mica Alt (Tabbed). */
export type Effect = "mica" | "acrylic" | "tabbed";
export const EFFECTS: Effect[] = ["mica", "acrylic", "tabbed"];
export const DEFAULT_EFFECT: Effect = "mica";

interface FxState { active: boolean; checked: boolean; error: string }
/** active=true: hệ thống đã áp dụng hiệu ứng; false: dùng nền đặc (Windows 10, lỗi hoặc chạy ngoài Tauri). */
export const useFx = create<FxState>(() => ({ active: false, checked: false, error: "" }));

let seq = 0;
export async function applyEffect(effect: Effect, dark: boolean, followSystem: boolean): Promise<boolean> {
  const me = ++seq;
  const root = document.documentElement;
  root.dataset.fxkind = effect;
  let ok = false, error = "";
  if (inTauri && IS_WINDOWS) {
    try { await invoke("set_window_effect", { effect, dark, followSystem }); ok = true; }
    catch (e) { error = String(e); }
  } else error = "@fx_unsupported";
  if (me !== seq) return ok; // đã có yêu cầu mới hơn
  root.dataset.fx = ok ? "on" : "off";
  useFx.setState({ active: ok, checked: true, error });
  return ok;
}
