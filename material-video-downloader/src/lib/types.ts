export type Status = "queued" | "downloading" | "paused" | "merging" | "completed" | "failed";
export type Kind = "direct" | "hls" | "ytdlp";

export interface Download {
  id: string;
  url: string;
  kind: Kind;
  title: string;
  thumbnail: string | null;
  site: string;
  filename: string;
  dir: string;
  path: string | null;
  status: Status;
  progress: number;
  downloaded: number;
  total: number;
  speed: number;
  eta: number | null;
  error: string | null;
  quality: string;
  selector: string;
  audioOnly: boolean;
  audioFormat: string;
  duration: number | null;
  createdAt: number;
  completedAt: number | null;
}

export interface QualityOption {
  id: string;
  label: string;
  detail: string;
  selector: string;
  audioOnly: boolean;
  audioFormat: string;
  height: number;
  size: number | null;
}

export interface MediaInfo {
  kind: Kind;
  url: string;
  title: string;
  thumbnail: string | null;
  site: string;
  duration: number | null;
  uploader: string | null;
  filename: string;
  size: number | null;
  options: QualityOption[];
  referer: string | null;
  userAgent: string | null;
  cookie: string | null;
}

export interface AddRequest {
  url: string;
  kind: Kind;
  title: string;
  thumbnail: string | null;
  site: string;
  filename: string;
  size: number | null;
  duration: number | null;
  quality: string;
  selector: string;
  audioOnly: boolean;
  audioFormat: string;
  referer: string | null;
  userAgent: string | null;
  cookie: string | null;
  dir: string | null;
  start: boolean;
}

export interface CoreSettings {
  downloadDir: string;
  maxConcurrent: number;
  connections: number;
  speedLimitKb: number;
  askQuality: boolean;
  autoStart: boolean;
  clipboardWatch: boolean;
  notifications: boolean;
  extensionServer: boolean;
  cookiesBrowser: string;
  windowMode: "remember" | "maximized";
  ytdlpPath: string;
  ffmpegPath: string;
}

export interface EngineTool {
  found: boolean;
  path: string | null;
  version: string | null;
  managed: boolean;
}

export interface EngineStatus {
  ytdlp: EngineTool;
  ffmpeg: EngineTool;
  canInstallFfmpeg: boolean;
}

export interface EngineProgress {
  name: string;
  downloaded: number;
  total: number;
  done: boolean;
}

export interface ExtensionAdd {
  url: string;
  title?: string;
  referer?: string;
  userAgent?: string;
  cookie?: string;
  pageUrl?: string;
}

export const DEFAULT_CORE: CoreSettings = {
  downloadDir: "",
  maxConcurrent: 3,
  connections: 8,
  speedLimitKb: 0,
  askQuality: true,
  autoStart: true,
  clipboardWatch: true,
  notifications: true,
  extensionServer: true,
  cookiesBrowser: "none",
  windowMode: "remember",
  ytdlpPath: "",
  ffmpegPath: "",
};

export interface EngineSetup {
  stage: string;
  state: "working" | "done" | "error";
  message: string | null;
}
