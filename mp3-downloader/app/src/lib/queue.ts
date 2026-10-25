import { create } from "zustand";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { baseName, invoke, inTauri, sourceOf, type ProgressEvt, type TrackInfo } from "./tauri";
import { toast, useHistory, useSettings, useTools, type QueueItem, type Quality, type Stage } from "./stores";
import { currentT } from "./i18n";

export const ACTIVE: Stage[] = ["downloading", "converting", "tagging"];
export const FINISHED: Stage[] = ["done", "error", "cancelled"];
const jobMap = new Map<string, string>(); // jobId (mỗi lần chạy) → item.id

interface QState {
  items: QueueItem[];
  add: (url: string, info: TrackInfo | null, quality: Quality, edited?: boolean) => void;
  cancel: (id: string) => void;
  retry: (id: string) => void;
  remove: (id: string) => void;
  clearFinished: () => void;
  stopAll: () => void;
  pump: () => void;
  onEvent: (p: ProgressEvt) => void;
}

export const useQueue = create<QState>((set, get) => {
  const patch = (id: string, p: Partial<QueueItem>) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...p } : i)) }));
  const find = (id: string) => get().items.find((i) => i.id === id);

  return {
    items: [],
    add: (url, info, quality, edited = false) => {
      const item: QueueItem = { id: crypto.randomUUID(), jobId: null, url, info, edited, quality, stage: "queued", percent: 0, speed: "", eta: "", message: "", file: null };
      set((s) => ({ items: [item, ...s.items] }));
      get().pump();
    },
    cancel: (id) => {
      const it = find(id);
      if (!it) return;
      const wasQueued = it.stage === "queued";
      patch(id, { stage: "cancelled", message: "" });
      if (!wasQueued && it.jobId) { invoke("cancel_download", { id: it.jobId }).catch(() => {}); get().pump(); }
    },
    retry: (id) => { patch(id, { stage: "queued", percent: 0, message: "" }); get().pump(); },
    remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
    clearFinished: () => set((s) => ({ items: s.items.filter((i) => !FINISHED.includes(i.stage)) })),
    stopAll: () => { for (const i of get().items) if (i.stage === "queued" || ACTIVE.includes(i.stage)) get().cancel(i.id); },
    pump: () => {
      const { s } = useSettings.getState();
      const items = get().items;
      let running = items.filter((i) => ACTIVE.includes(i.stage)).length;
      const waiting = items.filter((i) => i.stage === "queued").reverse(); // cũ nhất trước
      for (const item of waiting) {
        if (running >= s.parallel) break;
        running++;
        const jobId = crypto.randomUUID();
        jobMap.set(jobId, item.id);
        patch(item.id, { stage: "downloading", percent: 0, speed: "", eta: "", message: "@m_downloading", jobId });
        invoke("start_download", {
          req: {
            id: jobId, url: item.url, out_dir: s.outDir, quality: item.quality, crop_thumb: s.crop, info: item.info, edited: item.edited,
            name_tpl: s.nameTpl, artist_folder: s.artistFolder, dup: s.dup, speed_limit: s.speed, cookies_browser: s.cookies, proxy: s.proxy,
          },
        }).catch((e) => { patch(item.id, { stage: "error", message: String(e) }); get().pump(); });
      }
    },
    onEvent: (p) => {
      const terminal = FINISHED.includes(p.stage as Stage);
      const itemId = jobMap.get(p.id);
      if (terminal) jobMap.delete(p.id);
      const item = itemId ? find(itemId) : undefined;
      if (!item || item.jobId !== p.id || item.stage === "cancelled") return;
      patch(item.id, { stage: p.stage as Stage, percent: p.percent, speed: p.speed, eta: p.eta, message: p.message, file: p.file ?? item.file });
      if (p.stage === "done" && p.file) onDone(item, p.file, p.message);
      if (terminal) get().pump();
    },
  };
});

function onDone(item: QueueItem, file: string, warn: string) {
  const { t, tr } = currentT();
  const name = baseName(file).replace(/\.mp3$/i, "");
  useHistory.getState().add({
    id: item.id, url: item.url, file, title: item.info?.title || name, artist: item.info?.artist || "",
    thumbnail: item.info?.thumbnail || "", source: item.info?.source || sourceOf(item.url), quality: item.quality, at: Date.now(),
  });
  const w = tr(warn);
  toast[w ? "warning" : "success"](t("toast.done", { name }) + (w ? ` · ${w}` : ""), {
    action: { label: t("toast.show"), fn: () => invoke("reveal_file", { path: file }).catch((e) => toast.error(tr(e))) },
  });
  if (useSettings.getState().s.notify && inTauri) {
    (async () => {
      try {
        let ok = await isPermissionGranted();
        if (!ok) ok = (await requestPermission()) === "granted";
        if (ok) sendNotification({ title: t("notif.title"), body: name });
      } catch { /* bỏ qua */ }
    })();
  }
}

/** Kiểm tra công cụ cần thiết trước khi tải. Trả về true nếu đủ. */
export function toolsReady(): boolean {
  const tools = useTools.getState().tools;
  const { t } = currentT();
  if (tools && tools.ytdlp == null) { toast.warning(t("toast.needYtdlp")); return false; }
  if (tools && tools.ffmpeg == null) { toast.warning(t("toast.needFfmpeg")); return false; }
  return true;
}
