// In-browser stand-in for the Rust backend. It lets `npm run dev:web` (and the
// screenshots) work with realistic, simulated downloads. Inside Tauri it is unused.
import type { AddRequest, CoreSettings, Download, EngineStatus, MediaInfo, QualityOption } from "./types";

type Handler = (payload: unknown) => void;

const listeners = new Map<string, Set<Handler>>();
const emit = (event: string, payload: unknown) => listeners.get(event)?.forEach((h) => h(payload));

let seq = 0;
const uid = () => `mock-${Date.now().toString(36)}-${seq++}`;
const MB = 1024 * 1024;

function seed(): Download[] {
  const now = Date.now();
  const base = {
    thumbnail: null,
    dir: "C:\\Users\\you\\Downloads\\Material Video Downloader",
    selector: "",
    audioOnly: false,
    audioFormat: "",
    speed: 0,
    eta: null,
    error: null,
    completedAt: null,
  };
  return [
    {
      ...base, id: "d1", url: "https://media.example.com/watch/alpine-timelapse", kind: "ytdlp", title: "Alpine sunrise timelapse in 4K",
      site: "example.com", filename: "Alpine sunrise timelapse in 4K.mp4", path: null, status: "downloading", progress: 62.4,
      downloaded: 412 * MB, total: 660 * MB, speed: 9.8 * MB, eta: 25, quality: "1080p", duration: 214, createdAt: now - 60_000,
    },
    {
      ...base, id: "d2", url: "https://cdn.example.org/streams/keynote/master.m3u8", kind: "hls", title: "Developer keynote 2026",
      site: "cdn.example.org", filename: "Developer keynote 2026.mp4", path: null, status: "downloading", progress: 28.1,
      downloaded: 188 * MB, total: 670 * MB, speed: 5.2 * MB, eta: 93, quality: "720p", duration: 3180, createdAt: now - 120_000,
    },
    {
      ...base, id: "d3", url: "https://files.example.net/media/ocean-documentary.mp4", kind: "direct", title: "ocean-documentary",
      site: "files.example.net", filename: "ocean-documentary.mp4", path: null, status: "paused", progress: 44,
      downloaded: 528 * MB, total: 1200 * MB, quality: "original", duration: null, createdAt: now - 400_000,
    },
    {
      ...base, id: "d4", url: "https://media.example.com/watch/street-food", kind: "ytdlp", title: "Street food tour: night market",
      site: "example.com", filename: "Street food tour night market.mp4", path: "C:\\x.mp4", status: "completed", progress: 100,
      downloaded: 312 * MB, total: 312 * MB, quality: "1080p", duration: 782, createdAt: now - 3_600_000, completedAt: now - 3_500_000,
    },
    {
      ...base, id: "d5", url: "https://media.example.com/watch/lofi-mix", kind: "ytdlp", title: "Lo-fi study mix (audio)",
      site: "example.com", filename: "Lo-fi study mix.mp3", path: "C:\\y.mp3", status: "completed", progress: 100,
      downloaded: 58 * MB, total: 58 * MB, quality: "MP3", audioOnly: true, audioFormat: "mp3", duration: 3600, createdAt: now - 7_200_000, completedAt: now - 7_100_000,
    },
    {
      ...base, id: "d6", url: "https://video.example.io/private/clip.mp4", kind: "direct", title: "clip",
      site: "video.example.io", filename: "clip.mp4", path: null, status: "failed", progress: 12,
      downloaded: 18 * MB, total: 150 * MB, quality: "original", duration: null, error: "Server returned HTTP 403", createdAt: now - 9_000_000,
    },
    {
      ...base, id: "d7", url: "https://media.example.com/watch/queued", kind: "ytdlp", title: "Photography masterclass, part 2",
      site: "example.com", filename: "Photography masterclass part 2.mp4", path: null, status: "queued", progress: 0,
      downloaded: 0, total: 0, quality: "best", duration: 1840, createdAt: now - 20_000,
    },
  ] as Download[];
}

let items: Download[] = seed();

const state = {
  settings: {} as Partial<CoreSettings>,
  engine: {
    ytdlp: { found: true, path: "C:\\Users\\you\\AppData\\Roaming\\com.minhtrong67.materialvideodownloader\\bin\\yt-dlp.exe", version: "2026.10.12", managed: true },
    ffmpeg: { found: true, path: "C:\\Users\\you\\AppData\\Roaming\\com.minhtrong67.materialvideodownloader\\bin\\ffmpeg.exe", version: "7.1", managed: true },
    canInstallFfmpeg: true,
  } as EngineStatus,
};

setInterval(() => {
  for (const d of items) {
    if (d.status !== "downloading") continue;
    const step = d.speed * 0.5;
    d.downloaded = Math.min(d.total, d.downloaded + step);
    d.progress = Math.min(99.5, (d.downloaded / d.total) * 100);
    d.eta = Math.max(0, Math.round((d.total - d.downloaded) / d.speed));
    if (d.downloaded >= d.total) {
      d.status = "completed";
      d.progress = 100;
      d.speed = 0;
      d.eta = null;
      d.completedAt = Date.now();
      d.path = `C:\\Downloads\\${d.filename}`;
    }
    emit("download-update", { ...d });
  }
}, 500);

function qualities(kind: "ytdlp" | "hls" | "direct"): QualityOption[] {
  if (kind === "direct") return [{ id: "original", label: "original", detail: "MP4", selector: "", audioOnly: false, audioFormat: "", height: 0, size: 184 * MB }];
  const mk = (h: number, size: number, detail: string): QualityOption => ({
    id: `v${h}`, label: `${h}p`, detail, selector: `b[height<=${h}]`, audioOnly: false, audioFormat: "", height: h, size,
  });
  const list: QualityOption[] = [
    { id: "best", label: "best", detail: "1080p", selector: "bv*+ba/b", audioOnly: false, audioFormat: "", height: 1080, size: 412 * MB },
    mk(1080, 412 * MB, "H.264"), mk(720, 168 * MB, "H.264"), mk(480, 86 * MB, "H.264"), mk(360, 48 * MB, "H.264"),
  ];
  if (kind === "ytdlp") {
    list.push({ id: "audio-mp3", label: "MP3", detail: "audio", selector: "ba/b", audioOnly: true, audioFormat: "mp3", height: 0, size: 9 * MB });
    list.push({ id: "audio-m4a", label: "M4A", detail: "audio", selector: "ba[ext=m4a]", audioOnly: true, audioFormat: "m4a", height: 0, size: 8 * MB });
  }
  return list;
}

export const mock = {
  settings: state.settings,
  engine: state.engine,
  on(event: string, h: Handler) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(h);
    return Promise.resolve(() => void listeners.get(event)?.delete(h)) as Promise<() => void>;
  },
  async analyze(url: string): Promise<MediaInfo> {
    await new Promise((r) => setTimeout(r, 900));
    if (!/^https?:\/\//i.test(url)) throw new Error("Enter a valid link that starts with http:// or https://");
    const host = new URL(url).hostname.replace(/^www\./, "");
    const kind = /\.m3u8/i.test(url) ? "hls" : /\.(mp4|webm|mkv|mov|mp3)(\?|$)/i.test(url) ? "direct" : "ytdlp";
    const name = decodeURIComponent(url.split("?")[0].split("/").pop() || "video");
    const title = kind === "ytdlp" ? "Northern lights over the fjord" : name.replace(/\.[a-z0-9]+$/i, "") || "video";
    return {
      kind, url, title, thumbnail: null, site: host, duration: kind === "direct" ? null : 372, uploader: kind === "ytdlp" ? "Nordic Skies" : null,
      filename: kind === "direct" ? name : `${title}.mp4`, size: kind === "direct" ? 184 * MB : null, options: qualities(kind),
      referer: null, userAgent: null, cookie: null,
    };
  },
  async add(req: AddRequest): Promise<Download> {
    const d: Download = {
      id: uid(), url: req.url, kind: req.kind, title: req.title, thumbnail: req.thumbnail, site: req.site,
      filename: req.filename || `${req.title}.mp4`, dir: req.dir ?? "C:\\Users\\you\\Downloads\\Material Video Downloader", path: null,
      status: req.start ? "downloading" : "paused", progress: 0, downloaded: 0, total: req.size ?? 220 * MB, speed: 6 * MB, eta: 40,
      error: null, quality: req.quality, selector: req.selector, audioOnly: req.audioOnly, audioFormat: req.audioFormat,
      duration: req.duration, createdAt: Date.now(), completedAt: null,
    };
    items = [d, ...items];
    emit("download-update", { ...d });
    return d;
  },
  list: () => Promise.resolve(items.map((d) => ({ ...d }))),
  pause(id: string) {
    const d = items.find((x) => x.id === id);
    if (d) { d.status = "paused"; d.speed = 0; d.eta = null; emit("download-update", { ...d }); }
    return Promise.resolve();
  },
  resume(id: string) {
    const d = items.find((x) => x.id === id);
    if (d) { d.status = "downloading"; d.speed = 6 * MB; d.error = null; emit("download-update", { ...d }); }
    return Promise.resolve();
  },
  remove(id: string) {
    items = items.filter((x) => x.id !== id);
    emit("download-removed", id);
    return Promise.resolve();
  },
  pauseAll() { items.forEach((d) => d.status === "downloading" && mock.pause(d.id)); return Promise.resolve(); },
  resumeAll() { items.forEach((d) => (d.status === "paused" || d.status === "failed") && mock.resume(d.id)); return Promise.resolve(); },
  clearFinished() { items.filter((d) => d.status === "completed").forEach((d) => mock.remove(d.id)); return Promise.resolve(); },
  async installEngine(name: "yt-dlp" | "ffmpeg"): Promise<EngineStatus> {
    for (let i = 1; i <= 10; i++) {
      await new Promise((r) => setTimeout(r, 120));
      emit("engine-progress", { name, downloaded: i * 10, total: 100, done: i === 10 });
    }
    return state.engine;
  },
};
