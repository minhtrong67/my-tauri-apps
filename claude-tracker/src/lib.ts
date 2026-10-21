import type { Account, Limit } from "./types";

/**
 * Pha của một giới hạn:
 * - ok:       còn dùng được
 * - counting: đã hết lượt, đang đếm ngược tới giờ reset
 * - expected: đã qua giờ reset dự kiến nhưng CHƯA có dữ liệu mới -> chưa xác nhận
 * - unknown:  không có số liệu
 */
export type Phase = "ok" | "counting" | "expected" | "unknown";

export interface LimitView {
  limit: Limit;
  util: number | null;
  resetMs: number | null;
  phase: Phase;
}

export type AccountState = "ready" | "expected" | "waiting" | "nodata";

export interface AccountView {
  account: Account;
  limits: LimitView[];
  focus: LimitView | null;
  state: AccountState;
  availableAt: number | null;
  stale: boolean;
}

export const STALE_MS = 30 * 60 * 1000;
const H = 3600 * 1000;
/** Độ dài cửa sổ của từng loại giới hạn, dùng để tính % tiến độ reset */
export const WINDOW_MS: Record<string, number> = { five_hour: 5 * H, free_window: 5 * H, seven_day: 168 * H };

export function viewLimit(l: Limit, fetchedAt: number | null | undefined, now: number): LimitView {
  const util = l.utilization;
  const resetMs = l.resets_at ? Date.parse(l.resets_at) : NaN;
  const r = Number.isFinite(resetMs) ? resetMs : null;
  let phase: Phase;
  if (util === null && r === null) phase = "unknown";
  else if (r !== null && r <= now && (fetchedAt ?? 0) < r) phase = "expected";
  else if (util !== null && util >= 100 && r !== null && r > now) phase = "counting";
  else phase = "ok";
  return { limit: l, util, resetMs: r, phase };
}

export function analyze(a: Account, now: number): AccountView {
  const limits = a.limits.map((l) => viewLimit(l, a.fetched_at, now));
  const counting = limits.filter((l) => l.phase === "counting");
  const expected = limits.filter((l) => l.phase === "expected" && (l.util ?? 0) >= 100);
  const latest = (xs: LimitView[]) => xs.reduce((m, x) => ((x.resetMs ?? 0) > (m.resetMs ?? 0) ? x : m));

  let state: AccountState;
  let availableAt: number | null = null;
  let focus: LimitView | null = null;
  if (limits.length === 0) state = "nodata";
  else if (counting.length) {
    state = "waiting";
    focus = latest(counting);
    availableAt = focus.resetMs;
  } else if (expected.length) {
    state = "expected";
    focus = latest(expected);
    availableAt = focus.resetMs;
  } else {
    state = "ready";
    focus =
      limits.find((l) => l.limit.key === "five_hour") ??
      limits.find((l) => l.limit.key === "free_window") ??
      limits[0];
  }
  const stale = a.fetched_at ? now - a.fetched_at > STALE_MS : true;
  return { account: a, limits, focus, state, availableAt, stale };
}

const RANK: Record<AccountState, number> = { ready: 0, expected: 1, waiting: 2, nodata: 3 };

/** Sẵn sàng -> dự kiến đã reset -> đang chờ (reset sớm nhất trước) -> chưa có dữ liệu */
export function sortViews(vs: AccountView[]): AccountView[] {
  return [...vs].sort((a, b) => {
    if (RANK[a.state] !== RANK[b.state]) return RANK[a.state] - RANK[b.state];
    if (a.availableAt !== null && b.availableAt !== null) return a.availableAt - b.availableAt;
    return a.account.label.localeCompare(b.account.label);
  });
}

/** % thời gian đã trôi qua của cửa sổ reset (0 -> 100) */
export function progressPct(lv: LimitView, now: number): number | null {
  const w = WINDOW_MS[lv.limit.key];
  if (!w || lv.resetMs === null) return null;
  return Math.min(100, Math.max(0, (1 - (lv.resetMs - now) / w) * 100));
}

export function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d} ngày ${h}g`;
  if (h > 0) return `${h}g ${String(m).padStart(2, "0")}p`;
  return `${m}p ${String(s % 60).padStart(2, "0")}s`;
}

export function fmtClock(ms: number): string {
  return new Date(ms).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function fmtDay(ms: number): string {
  const d = new Date(ms);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(d) - day(new Date())) / 86400000);
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Ngày mai";
  if (diff === -1) return "Hôm qua";
  return d.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export function fmtAgo(ms: number | null | undefined, now: number): string {
  if (!ms) return "chưa có dữ liệu";
  const s = Math.max(0, Math.floor((now - ms) / 1000));
  if (s < 60) return "vừa xong";
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return `${Math.floor(s / 86400)} ngày trước`;
}
