// Mọi lời gọi Tauri đi qua đây
import { invoke } from "@tauri-apps/api/core";
import { Effect, getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";

export { invoke };
export const appWindow = () => {
  try {
    return getCurrentWindow();
  } catch {
    return null;
  }
};
export const logicalSize = (w, h) => new LogicalSize(w, h);

// Hiệu ứng nền trong suốt của Windows (Mica, Mica Alt, Acrylic)
const isWin = /Windows/i.test(navigator.userAgent);
let win11;
const isWin11 = async () => {
  if (win11 !== undefined) return win11;
  try {
    const v = await navigator.userAgentData.getHighEntropyValues(["platformVersion"]);
    win11 = parseInt(v.platformVersion, 10) >= 13;
  } catch {
    win11 = true;
  }
  return win11;
};

// Trả về hiệu ứng thực sự được áp dụng ("none" nếu hệ thống không hỗ trợ)
export async function applyEffect(want) {
  const w = appWindow();
  if (!w || !isWin) return "none";
  try {
    if (want === "none" || ((want === "mica" || want === "tabbed") && !(await isWin11()))) {
      await w.clearEffects();
      return "none";
    }
    const e = { mica: Effect.Mica, tabbed: Effect.Tabbed, acrylic: Effect.Acrylic }[want];
    await w.setEffects({ effects: [e] });
    return want;
  } catch {
    return "none";
  }
}
