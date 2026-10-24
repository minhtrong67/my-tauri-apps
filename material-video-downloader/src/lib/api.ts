import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  DEFAULT_CORE,
  type AddRequest,
  type CoreSettings,
  type Download,
  type EngineProgress,
  type EngineStatus,
  type ExtensionAdd,
  type MediaInfo,
} from "./types";
import { mock } from "./mock";

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

type Handler<T> = (payload: T) => void;

async function on<T>(event: string, handler: Handler<T>): Promise<UnlistenFn> {
  if (!isTauri) return mock.on(event, handler as Handler<unknown>);
  return listen<T>(event, (e) => handler(e.payload));
}

export const api = {
  getSettings: (): Promise<CoreSettings> =>
    isTauri ? invoke<CoreSettings>("get_settings") : Promise.resolve({ ...DEFAULT_CORE, ...mock.settings }),
  saveSettings: (settings: CoreSettings): Promise<void> => {
    if (!isTauri) {
      mock.settings = settings;
      return Promise.resolve();
    }
    return invoke("save_settings", { settings });
  },
  defaultDownloadDir: (): Promise<string> =>
    isTauri ? invoke<string>("default_download_dir") : Promise.resolve("C:\\Users\\you\\Downloads\\Material Video Downloader"),
  analyze: (
    url: string,
    opts: { title?: string; referer?: string; userAgent?: string; cookie?: string } = {},
  ): Promise<MediaInfo> =>
    isTauri
      ? invoke<MediaInfo>("analyze_url", {
          url,
          title: opts.title ?? null,
          referer: opts.referer ?? null,
          userAgent: opts.userAgent ?? null,
          cookie: opts.cookie ?? null,
        })
      : mock.analyze(url),
  add: (req: AddRequest): Promise<Download> => (isTauri ? invoke<Download>("add_download", { req }) : mock.add(req)),
  list: (): Promise<Download[]> => (isTauri ? invoke<Download[]>("list_downloads") : mock.list()),
  pause: (id: string): Promise<void> => (isTauri ? invoke("pause_download", { id }) : mock.pause(id)),
  resume: (id: string): Promise<void> => (isTauri ? invoke("resume_download", { id }) : mock.resume(id)),
  remove: (id: string, deleteFile = false): Promise<void> =>
    isTauri ? invoke("remove_download", { id, deleteFile }) : mock.remove(id),
  pauseAll: (): Promise<void> => (isTauri ? invoke("pause_all") : mock.pauseAll()),
  resumeAll: (): Promise<void> => (isTauri ? invoke("resume_all") : mock.resumeAll()),
  clearFinished: (): Promise<void> => (isTauri ? invoke("clear_finished") : mock.clearFinished()),
  openDownload: (id: string): Promise<void> => (isTauri ? invoke("open_download", { id }) : Promise.resolve()),
  revealDownload: (id: string): Promise<void> => (isTauri ? invoke("reveal_download", { id }) : Promise.resolve()),
  openFolder: (path?: string): Promise<void> =>
    isTauri ? invoke("open_folder", { path: path ?? null }) : Promise.resolve(),
  engineStatus: (): Promise<EngineStatus> =>
    isTauri ? invoke<EngineStatus>("engine_status") : Promise.resolve(mock.engine),
  installYtdlp: (): Promise<EngineStatus> =>
    isTauri ? invoke<EngineStatus>("install_ytdlp") : mock.installEngine("yt-dlp"),
  installFfmpeg: (): Promise<EngineStatus> =>
    isTauri ? invoke<EngineStatus>("install_ffmpeg") : mock.installEngine("ffmpeg"),
  serverInfo: (): Promise<{ port: number; running: boolean }> =>
    isTauri ? invoke("server_info") : Promise.resolve({ port: 38517, running: true }),

  pickFolder: async (): Promise<string | null> => {
    if (!isTauri) return null;
    const result = await openDialog({ directory: true, multiple: false });
    return typeof result === "string" ? result : null;
  },
  readClipboard: async (): Promise<string> => {
    try {
      return isTauri ? ((await readText()) ?? "") : await navigator.clipboard.readText();
    } catch {
      return "";
    }
  },
  writeClipboard: async (text: string): Promise<void> => {
    try {
      if (isTauri) await writeText(text);
      else await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  },
  openExternal: async (url: string): Promise<void> => {
    if (isTauri) await openUrl(url);
    else window.open(url, "_blank", "noopener");
  },

  onUpdate: (h: Handler<Download>) => on<Download>("download-update", h),
  onRemoved: (h: Handler<string>) => on<string>("download-removed", h),
  onExtensionAdd: (h: Handler<ExtensionAdd>) => on<ExtensionAdd>("extension-add", h),
  onEngineProgress: (h: Handler<EngineProgress>) => on<EngineProgress>("engine-progress", h),
};
