import { create } from "zustand";
import { invoke, type ToolStatus, type UpdateInfo } from "./tauri";
import { toast, useSettings, useTools } from "./stores";
import { currentT } from "./i18n";

export type ToolId = "ytdlp" | "ffmpeg" | "deno";
export const TOOL_LABEL: Record<ToolId, string> = { ytdlp: "yt-dlp", ffmpeg: "ffmpeg", deno: "Deno" };
const CMD: Record<ToolId, string> = { ytdlp: "install_ytdlp", ffmpeg: "install_ffmpeg", deno: "install_deno" };

export const useToolState = create<{ progress: Partial<Record<ToolId, number>>; installing: boolean; checking: boolean; outdated: UpdateInfo | null; setP: (t: ToolId, p?: number) => void; set: (p: Partial<{ installing: boolean; checking: boolean; outdated: UpdateInfo | null }>) => void }>((set) => ({
  progress: {}, installing: false, checking: false, outdated: null,
  setP: (t, p) => set((s) => ({ progress: { ...s.progress, [t]: p } })),
  set: (p) => set(p),
}));

export async function refreshTools() {
  try { useTools.getState().set(await invoke<ToolStatus>("check_tools")); } catch { /* chạy ngoài Tauri */ }
}

export async function installTools(list: ToolId[]) {
  const st = useToolState.getState();
  if (st.installing) return;
  st.set({ installing: true });
  const { t, tr } = currentT();
  for (const id of list) {
    try {
      st.setP(id, 0);
      await invoke(CMD[id]);
      toast.success(t("toast.installed", { tool: TOOL_LABEL[id] }));
      if (id === "ytdlp") st.set({ outdated: null });
    } catch (e) { toast.error(tr(e)); break; }
    finally { st.setP(id, undefined); }
  }
  st.set({ installing: false });
  refreshTools();
}

/** Kiểm tra yt-dlp có bản mới hơn không. manual=true: báo cả khi đã mới nhất / lỗi mạng. */
export async function checkYtdlpUpdate(manual = false) {
  const { t, tr } = currentT();
  const st = useToolState.getState();
  st.set({ checking: true });
  try {
    const info = await invoke<UpdateInfo>("check_ytdlp_update");
    if (info.outdated) {
      st.set({ outdated: info });
      toast.warning(t("toast.ytdlpOld", { cur: info.current, latest: info.latest }), { action: { label: t("b.updateNow"), fn: () => installTools(["ytdlp"]) }, duration: 12000 });
    } else {
      st.set({ outdated: null });
      if (manual) toast.success(t("toast.upToDate", { v: info.current }));
    }
  } catch (e) { if (manual) toast.error(tr(e) || t("toast.checkFailed")); }
  finally { st.set({ checking: false }); }
}

export const autoCheck = () => useSettings.getState().s.checkUpdates;
