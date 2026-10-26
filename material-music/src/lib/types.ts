export interface Track {
  id: string;
  path: string;
  title: string;
  artist: string;
  album: string;
  albumArtist: string;
  genre: string;
  year: number;
  trackNo: number;
  duration: number;
  bitrate: number;
  sampleRate: number;
  format: string;
  size: number;
  addedAt: number;
  folder: string;
  hasCover: boolean;
  /** Mốc sửa đổi (giây) của tệp, dùng để quét tăng dần */
  modified?: number;
  /** Đường dẫn ảnh bìa đã trích xuất; chuỗi rỗng = không có ảnh bìa */
  cover?: string;
  /** ReplayGain tags (dB / peak) */
  rgTrack?: number | null;
  rgAlbum?: number | null;
  rgTrackPeak?: number | null;
  rgAlbumPeak?: number | null;
  /** 1 = the file was read by a build that knows ReplayGain (older entries are re-read once) */
  rgv?: number;
}

export interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
  /** Có giá trị nếu playlist được tạo từ việc nhập một thư mục */
  folder?: string;
}

export interface Album {
  key: string;
  title: string;
  artist: string;
  year: number;
  tracks: Track[];
}

export interface Artist {
  name: string;
  tracks: Track[];
  albumCount: number;
}

export type ViewMode = 'list' | 'grid';
export type Lang = 'auto' | 'en' | 'vi';
export type RepeatMode = 'off' | 'all' | 'one';
export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  themeMode: ThemeMode;
  seedColor: string;
  dynamicColor: boolean;
  fontFamily: string;
  volume: number;
  muted: boolean;
  playbackRate: number;
  eqEnabled: boolean;
  eqGains: number[];
  eqPreset: string;
  preamp: number;
  closeToTray: boolean;
  alwaysOnTop: boolean;
  startMode: 'remember' | 'maximized';
  language: Lang;
  restoreSession: boolean;
  autoScanMusic: boolean;
  musicSeeded: boolean;
  replayGain: 'off' | 'track' | 'album';
  gapless: boolean;
  /** Crossfade length in seconds (0 = off) */
  crossfade: number;
  globalMediaKeys: boolean;
  watchFolders: boolean;
  /** Audio output device id ('' = system default) */
  audioDevice: string;
  /** Fade the music out over the last seconds of the sleep timer */
  sleepFade: boolean;
  /** Now Playing visualizer style */
  visualizer: 'bars' | 'wave' | 'circle';
  /** System-wide hotkeys (Ctrl+Alt+...) */
  globalHotkeys: boolean;
  /** In-app shortcuts the user changed: action id -> key combo */
  keymap: Record<string, string>;
  /** ListenBrainz scrobbling */
  scrobble: boolean;
  /** look lyrics up on LRCLIB by itself when a song has none saved */
  autoLyrics: boolean;
  scrobbleToken: string;
}

export const defaultSettings: Settings = {
  themeMode: 'system',
  seedColor: '#2196F3',
  dynamicColor: false,
  fontFamily: 'system',
  volume: 0.8,
  muted: false,
  playbackRate: 1,
  eqEnabled: false,
  eqGains: Array(10).fill(0),
  eqPreset: 'flat',
  preamp: 0,
  closeToTray: false,
  alwaysOnTop: false,
  startMode: 'remember',
  language: 'auto',
  restoreSession: true,
  autoScanMusic: true,
  musicSeeded: false,
  replayGain: 'track',
  gapless: true,
  crossfade: 0,
  globalMediaKeys: true,
  watchFolders: true,
  audioDevice: '',
  sleepFade: true,
  visualizer: 'bars',
  globalHotkeys: false,
  keymap: {},
  scrobble: false,
  autoLyrics: false,
  scrobbleToken: '',
};

export type SmartId = 'top' | 'new' | 'unplayed' | 'lossless';

/** A rule-based playlist made by the user; the songs are computed from the rules every time */
export interface SmartRules {
  /** matches when the genre contains this text */
  genre: string;
  yearFrom: number;
  yearTo: number;
  /** kbps; 0 = any */
  minBitrate: number;
  formats: string[];
  onlyLiked: boolean;
  /** added in the last N days; 0 = any */
  addedDays: number;
  /** minutes; 0 = any */
  maxMinutes: number;
  /** 'any' | 'played' | 'unplayed' */
  played: 'any' | 'played' | 'unplayed';
}

export interface SmartList {
  id: string;
  name: string;
  rules: SmartRules;
  createdAt: number;
}

/** One counted listen (the song was heard long enough) */
export interface Listen {
  id: string;
  at: number;
  /** seconds of the song (its duration) */
  sec: number;
}

export type View =
  | { name: 'home' }
  | { name: 'songs' }
  | { name: 'albums' }
  | { name: 'album'; key: string }
  | { name: 'artists' }
  | { name: 'artist'; artist: string }
  | { name: 'playlists' }
  | { name: 'playlist'; id: string }
  | { name: 'liked' }
  | { name: 'recent' }
  | { name: 'smart'; id: SmartId }
  | { name: 'smartlist'; id: string }
  | { name: 'stats' }
  | { name: 'duplicates' }
  | { name: 'settings' };

export interface MenuItem {
  label?: string;
  icon?: string;
  onClick?: () => void;
  danger?: boolean;
  divider?: boolean;
  disabled?: boolean;
}

export interface MenuState {
  x: number;
  y: number;
  items: MenuItem[];
}

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
  /** ms */
  dur: number;
  actionLabel?: string;
  action?: () => void;
}

export type Dialog =
  | { type: 'prompt'; title: string; label: string; initial?: string; confirmLabel?: string; onSubmit: (v: string) => void }
  | { type: 'confirm'; title: string; text: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void }
  | { type: 'info'; id: string }
  | { type: 'addToPlaylist'; ids: string[] }
  | { type: 'sleep' }
  | { type: 'audio' }
  | { type: 'shortcuts' }
  | { type: 'smartEditor'; id?: string }
  | { type: 'editTags'; id: string };
