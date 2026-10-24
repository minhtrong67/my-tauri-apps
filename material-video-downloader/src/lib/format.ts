export function formatBytes(bytes: number | null | undefined, digits = 1): string {
  if (bytes == null || !isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / Math.pow(1024, i);
  return `${v >= 100 || i === 0 ? v.toFixed(0) : v.toFixed(digits)} ${units[i]}`;
}

export function formatSpeed(bps: number): string {
  return `${formatBytes(bps)}/s`;
}

export function formatClock(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !isFinite(totalSeconds) || totalSeconds < 0) return "--:--";
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function timeAgo(ms: number, lang: "en" | "vi"): string {
  const diff = Math.max(0, Date.now() - ms) / 1000;
  const units: [number, string, string][] = [
    [60, "s", "giây"],
    [3600, "m", "phút"],
    [86400, "h", "giờ"],
    [86400 * 30, "d", "ngày"],
  ];
  if (diff < 45) return lang === "vi" ? "vừa xong" : "just now";
  let div = 1;
  for (let i = 0; i < units.length; i++) {
    const [limit, , vi] = units[i];
    const prev = i === 0 ? 1 : units[i - 1][0];
    if (diff < limit) {
      const n = Math.max(1, Math.floor(diff / prev));
      const en = ["second", "minute", "hour", "day"][i];
      return lang === "vi" ? `${n} ${vi} trước` : `${n} ${en}${n > 1 ? "s" : ""} ago`;
    }
    div = limit;
  }
  const n = Math.floor(diff / (div / 30));
  return lang === "vi" ? `${n} tháng trước` : `${n} month${n > 1 ? "s" : ""} ago`;
}

export function extractUrls(text: string): string[] {
  const found = text.match(/https?:\/\/[^\s<>"'`]+/gi) ?? [];
  const cleaned = found.map((u) => u.replace(/[),.;]+$/, ""));
  return Array.from(new Set(cleaned));
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
