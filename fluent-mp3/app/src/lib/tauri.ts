import { invoke as tInvoke } from "@tauri-apps/api/core";
import { listen as tListen, type UnlistenFn } from "@tauri-apps/api/event";

export const inTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
export const IS_WINDOWS = /Windows/i.test(navigator.userAgent);

export async function invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!inTauri) throw "@no_tauri";
  return tInvoke<T>(cmd, args);
}
export async function listen<T>(event: string, fn: (p: T) => void): Promise<UnlistenFn> {
  if (!inTauri) return () => {};
  return tListen<T>(event, (e) => fn(e.payload));
}

export interface TrackInfo { source: string; url: string; title: string; artist: string; album: string; year: string; thumbnail: string; duration: number }
export interface ToolStatus { ytdlp: string | null; ffmpeg: string | null; deno: string | null }
export interface SearchItem { id: string; url: string; title: string; channel: string; duration: number; thumbnail: string }
export interface PlaylistData { title: string; entries: SearchItem[] }
export interface UpdateInfo { current: string; latest: string; outdated: boolean }
export interface ProgressEvt { id: string; stage: string; percent: number; speed: string; eta: string; message: string; file: string | null }

export const baseName = (p?: string | null) => (p || "").split(/[\\/]/).pop() || "";
export const fmtTime = (s: number) => (s > 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "");
export const URL_RE = /https?:\/\/[^\s"'<>]+/g;
export const urlsIn = (text: string) => [...new Set((text.match(URL_RE) || []).map((u) => u.replace(/[.,;:!?)\]}]+$/, "")))];
export const sourceOf = (url: string) => {
  const u = url.toLowerCase();
  if (u.includes("spotify.com") || u.includes("spotify.link")) return "spotify";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  return "other";
};
