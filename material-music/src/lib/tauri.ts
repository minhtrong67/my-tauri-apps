import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { tr } from './i18n';
import type { Track } from './types';

export const AUDIO_EXTS = ['mp3', 'flac', 'wav', 'ogg', 'oga', 'opus', 'm4a', 'aac'];

export const assetUrl = (path: string) => convertFileSrc(path);

export interface KnownFile { path: string; size: number; modified: number }
export interface ScanResult { tracks: Track[]; found: { id: string; path: string }[] }

/** Nếu truyền `known`, các tệp không đổi (cùng dung lượng + mốc sửa) sẽ được bỏ qua. Không truyền = đọc lại toàn bộ và ghi đè. */
export const scanPaths = (paths: string[], known?: KnownFile[]) =>
  invoke<ScanResult>('scan_paths', { paths, known: known ?? null });
export const getMusicDir = () => invoke<string | null>('get_music_dir');
export const findRemoved = (paths: string[]) => invoke<string[]>('find_removed', { paths });
export const getCover = (path: string, wantData = false) =>
  invoke<{ file: string; dataUrl: string | null } | null>('get_cover', { path, wantData });
export const readLyrics = (path: string) => invoke<string | null>('read_lyrics', { path });
/** `recovered` = the main file was damaged: an older copy was used (data may be a little older) */
export interface LoadedState { data: string | null; recovered: boolean }
export const loadState = (name: 'library' | 'user') => invoke<LoadedState>('load_state', { name });
export const getBackupDir = () => invoke<string | null>('get_backup_dir');
export const openFolder = (path: string) => invoke<void>('open_folder', { path });
export const saveState = (name: 'library' | 'user', data: string) => invoke<void>('save_state', { name, data });
export const getCoverDir = () => invoke<string | null>('get_cover_dir');
export const isDir = (path: string) => invoke<boolean>('is_dir', { path });
export const writeTextFile = (path: string, content: string) => invoke<void>('write_text_file', { path, content });
export const readTextFile = (path: string) => invoke<string>('read_text_file', { path });
export const reveal = (path: string) => invoke<void>('reveal_in_explorer', { path });
export const launchArgs = () => invoke<string[]>('get_launch_args');
export const setCloseToTray = (enabled: boolean) => invoke<void>('set_close_to_tray', { enabled });

export async function pickFolder(): Promise<string | null> {
  const r = await open({ directory: true, multiple: false });
  return typeof r === 'string' ? r : null;
}

export async function pickFiles(): Promise<string[]> {
  const r = await open({ multiple: true, filters: [{ name: tr('audioFiles'), extensions: AUDIO_EXTS }] });
  if (!r) return [];
  return Array.isArray(r) ? (r as string[]) : [r as string];
}

export async function pickOne(extensions: string[], name: string): Promise<string | null> {
  const r = await open({ multiple: false, filters: [{ name, extensions }] });
  return typeof r === 'string' ? r : null;
}

export async function pickSavePath(defaultPath: string, extensions: string[], name: string): Promise<string | null> {
  const r = await save({ defaultPath, filters: [{ name, extensions }] });
  return r ?? null;
}

/** Stop/resume remembering the window size (off while in the mini player) */
export const setWindowTracking = (enabled: boolean) => invoke<void>('set_window_tracking', { enabled }).catch(() => undefined);
export const setStartMode = (mode: 'remember' | 'maximized') => invoke<void>('set_start_mode', { mode }).catch(() => undefined);
/** Tell the backend the first frame is painted so it can reveal the (initially hidden) window */
export const appReady = () => invoke<void>('app_ready').catch(() => undefined);
export const setTrayLabels = (labels: string[]) => invoke<void>('set_tray_labels', { labels }).catch(() => undefined);

/** Allow the asset protocol to serve these folders / files (it serves nothing by default) */
export const allowPaths = (paths: string[]) => invoke<void>('allow_paths', { paths }).catch(() => undefined);
export const setMediaKeys = (enabled: boolean) => invoke<void>('set_media_keys', { enabled }).catch(() => undefined);
export const setGlobalHotkeys = (enabled: boolean) => invoke<boolean>('set_global_hotkeys', { enabled }).catch(() => false);
export const watchFolders = (paths: string[], enabled: boolean) => invoke<void>('watch_folders', { paths, enabled }).catch(() => undefined);

export interface TagEdit { title: string; artist: string; album: string; albumArtist: string; genre: string; year: number; trackNo: number }
export const writeTags = (path: string, edit: TagEdit) => invoke<Track>('write_tags', { path, edit });

export interface ListenMeta { title: string; artist: string; album: string; duration: number; listened_at?: number }
export const scrobbleNowPlaying = (token: string, meta: ListenMeta) => invoke<void>('scrobble_now_playing', { token, meta });
export const scrobbleListen = (token: string, meta: ListenMeta) => invoke<void>('scrobble_listen', { token, meta });
export const scrobbleValidate = (token: string) => invoke<string>('scrobble_validate', { token });

export interface OnlineLyrics { synced: string; plain: string }
export const fetchLyricsOnline = (title: string, artist: string, album: string, duration: number) =>
  invoke<OnlineLyrics | null>('fetch_lyrics_online', { title, artist, album, duration });

