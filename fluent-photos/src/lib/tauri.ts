import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import type { Entry, ExifInfo, Opened } from "./types";

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const api = {
  library: () => invoke<Opened>("library"),
  openTarget: (path: string) => invoke<Opened>("open_target", { path }),
  startupPath: () => invoke<string | null>("startup_path"),
  statPaths: (paths: string[]) => invoke<Entry[]>("stat_paths", { paths }),
  thumb: (path: string, size: number) => invoke<string>("thumb", { path, size }),
  exif: (path: string) => invoke<ExifInfo>("exif_info", { path }),
  rotate: (path: string, deg: number) => invoke<void>("rotate_file", { path, deg }),
  remove: (path: string) => invoke<void>("delete_file", { path }),
  restore: (path: string) => invoke<void>("restore_file", { path }),
  transfer: (paths: string[], dest: string, mv: boolean) => invoke<number>("transfer_files", { paths, dest, mv }),
  rename: (path: string, newName: string) => invoke<string>("rename_file", { path, newName }),
  duplicates: (paths: string[]) => invoke<string[][]>("find_duplicates", { paths }),
  wallpaper: (path: string) => invoke<void>("set_wallpaper", { path }),
  watch: (dirs: string[], recursive: boolean) => invoke<void>("watch_dirs", { dirs, recursive }),
  unwatch: () => invoke<void>("unwatch"),
  getWindowMode: () => invoke<string>("get_window_mode"),
  setWindowMode: (mode: string) => invoke<void>("set_window_mode", { mode }),
  showWindow: () => invoke<void>("show_window"),
  pickSavePath: (name: string, dir?: string) => invoke<string | null>("pick_save_path", { name, dir }),
  /** Sends the encoded picture as a raw binary body (no base64). */
  writeImage: (path: string, bytes: ArrayBuffer | Uint8Array, exifFrom?: string) =>
    invoke<void>("write_image", bytes, {
      headers: { "x-path": encodeURIComponent(path), "x-keep-exif": exifFrom ? "1" : "0", "x-exif-src": encodeURIComponent(exifFrom ?? path) },
    }),
};

export const src = (path: string, v?: number) => convertFileSrc(path) + (v ? `?v=${v}` : "");
export const onEvent = <T,>(name: string, cb: (p: T) => void) => listen<T>(name, (e) => cb(e.payload));
export const pickFolder = async (): Promise<string | null> => (await openDialog({ directory: true, multiple: false })) as string | null;
export const pickImages = async (): Promise<string[]> => {
  const r = await openDialog({
    multiple: true,
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "jfif", "gif", "webp", "bmp", "ico", "avif", "svg"] }],
  });
  return r ? (Array.isArray(r) ? r : [r]) : [];
};
export const reveal = (path: string) => revealItemInDir(path);
