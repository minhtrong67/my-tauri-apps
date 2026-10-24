import type { StoreApi } from 'zustand';
import type { TagEdit } from '../tauri';
import type { ToastKind, MenuItem, MenuState, Playlist, RepeatMode, Settings, Toast, ViewMode, Track, View, Dialog } from '../types';

export interface UiSlice {
  view: View;
  backStack: View[];
  query: string;
  showQueue: boolean;
  showNowPlaying: boolean;
  navCollapsed: boolean;
  miniMode: boolean;
  fullscreen: boolean;
  viewModes: Record<string, ViewMode>;
  dragOver: boolean;
  toast: Toast | null;
  dialog: Dialog | null;
  menu: MenuState | null;
  set: (p: Partial<State>) => void;
  nav: (v: View) => void;
  back: () => void;
  setQuery: (q: string) => void;
  showToast: (text: string, actionLabel?: string, action?: () => void, kind?: ToastKind) => void;
  openDialog: (d: Dialog | null) => void;
  openMenu: (x: number, y: number, items: MenuItem[]) => void;
  closeMenu: () => void;
  setViewMode: (key: string, mode: ViewMode) => void;
  toggleFullscreen: (on?: boolean) => Promise<void>;
}

export interface LibrarySlice {
  byId: Record<string, Track>;
  history: { id: string; at: number }[];
  plays: Record<string, number>;
  scanning: { done: number; total: number } | null;
  syncing: boolean;
  importFolder: () => Promise<void>;
  importFiles: () => Promise<void>;
  openPaths: (paths: string[], play: boolean) => Promise<void>;
  rescanPlaylist: (id: string) => Promise<void>;
  rescanAll: () => Promise<void>;
  removeMissing: () => Promise<void>;
  syncLibrary: (silent?: boolean, force?: boolean) => Promise<void>;
  removeTracks: (ids: string[]) => void;
  clearLibrary: () => void;
  setTrackCover: (id: string, file: string) => void;
  editTags: (id: string, edit: TagEdit) => Promise<boolean>;
}

export interface PlayerSlice {
  queue: string[];
  baseQueue: string[];
  index: number;
  isPlaying: boolean;
  position: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  sleepAt: number | null;
  sleepEndOfTrack: boolean;
  playTracks: (ids: string[], start?: number, forceShuffle?: boolean) => void;
  playIndex: (i: number) => void;
  togglePlay: () => void;
  next: (auto?: boolean) => void;
  prev: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  playNext: (ids: string[]) => void;
  addToQueue: (ids: string[]) => void;
  removeFromQueue: (i: number) => void;
  moveInQueue: (from: number, to: number) => void;
  clearQueue: () => void;
  setSleep: (minutes: number | 'track' | null) => void;
}

export interface PlaylistSlice {
  playlists: Playlist[];
  liked: Record<string, number>;
  toggleLike: (id: string) => void;
  createPlaylist: (name: string, ids?: string[]) => string;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (pid: string, ids: string[]) => void;
  removeFromPlaylist: (pid: string, index: number) => void;
  reorderPlaylist: (pid: string, from: number, to: number) => void;
  exportPlaylist: (pid: string) => Promise<void>;
  importPlaylistFile: () => Promise<void>;
}

export interface AppSlice {
  ready: boolean;
  settings: Settings;
  init: () => Promise<void>;
  saveSession: () => void;
  backup: () => Promise<void>;
  restore: () => Promise<void>;
  updateSettings: (p: Partial<Settings>) => void;
}

export type State = UiSlice & LibrarySlice & PlayerSlice & PlaylistSlice & AppSlice;
export type SetFn = StoreApi<State>['setState'];
export type GetFn = StoreApi<State>['getState'];
export type SubscribeFn = StoreApi<State>['subscribe'];
