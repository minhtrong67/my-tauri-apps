import type { Account, Limit } from "./types";
import { Lang, TFn, locale } from "./i18n";

/**
 * Pha của một giới hạn:
 * - ok:       còn dùng được
 * - counting: đã hết lượt, đang đếm ngược tới giờ reset
 * - elapsed:  đã qua giờ reset (chưa có dữ liệu mới) -> tự coi như đã hồi, mức dùng = 0
 * - unknown:  không có số liệu
 */
export type Phase = "ok" | "counting" | "elapsed" | "unknown";

export interface LimitView {
  limit: Limit;
  util: number | null;
  resetMs: number | null;
  phase: Phase;
}

export type AccountState = "ready" | "waiting" | "nodata";

export interface AccountView {
  account: Account;
  limits: LimitView[];
  focus: LimitView | null;
  state: AccountState;
  availableAt: number | null;
  /** Mốc reset gần nhất vừa trôi qua của giới hạn từng chạm 100% (để ghi "Đã reset lúc …") */
  recoveredAt: number | null;
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
  else if (r !== null && r <= now && (fetchedAt ?? 0) < r) phase = "elapsed";
  else if (util !== null && util >= 100 && r !== null && r > now) phase = "counting";
  else phase = "ok";
  return { limit: l, util: phase === "elapsed" ? 0 : util, resetMs: r, phase };
}

export function analyze(a: Account, now: number): AccountView {
  const limits = a.limits.map((l) => viewLimit(l, a.fetched_at, now));
  const counting = limits.filter((l) => l.phase === "counting");
  const recovered = limits.filter((l) => l.phase === "elapsed" && (l.limit.utilization ?? 0) >= 100);
  const latest = (xs: LimitView[]) => xs.reduce((m, x) => ((x.resetMs ?? 0) > (m.resetMs ?? 0) ? x : m));

  let state: AccountState;
  let availableAt: number | null = null;
  let focus: LimitView | null = null;
  if (limits.length === 0) state = "nodata";
  else if (counting.length) {
    state = "waiting";
    focus = latest(counting);
    availableAt = focus.resetMs;
  } else {
    state = "ready";
    focus =
      limits.find((l) => l.limit.key === "five_hour") ??
      limits.find((l) => l.limit.key === "free_window") ??
      limits[0];
  }
  const recoveredAt = recovered.length ? latest(recovered).resetMs : null;
  const stale = a.fetched_at ? now - a.fetched_at > STALE_MS : true;
  return { account: a, limits, focus, state, availableAt, recoveredAt, stale };
}

const RANK: Record<AccountState, number> = { ready: 0, waiting: 1, nodata: 2 };

/** Sẵn sàng -> đang chờ (reset sớm nhất trước) -> chưa có dữ liệu */
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

/**
 * Làm tròn "now" theo độ chi tiết thẻ thật sự hiển thị (giây khi còn < 1 giờ, còn lại theo phút)
 * để React.memo bỏ qua được những lần render thừa mỗi giây.
 */
export function tickFor(v: AccountView, now: number): number {
  const r = v.availableAt;
  if (v.state === "waiting" && r !== null && r - now < H) return Math.floor(now / 1000) * 1000;
  return Math.floor(now / 60000) * 60000;
}

const unit = (t: TFn, u: "day" | "hour" | "minute" | "second", n: number) =>
  `${n} ${t(`unit.${u}.${n === 1 ? "one" : "other"}` as const)}`;

/** Viết đầy đủ giờ/phút, không viết tắt: "2 giờ 31 phút", "1 hour 5 minutes" */
export function fmtCountdown(ms: number, t: TFn): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (d > 0) {
    parts.push(unit(t, "day", d));
    if (h > 0) parts.push(unit(t, "hour", h));
  } else if (h > 0) {
    parts.push(unit(t, "hour", h));
    if (m > 0) parts.push(unit(t, "minute", m));
  } else if (m > 0) {
    parts.push(unit(t, "minute", m));
    parts.push(unit(t, "second", sec));
  } else parts.push(unit(t, "second", sec));
  return parts.join(" ");
}

export function fmtClock(ms: number, lang: Lang): string {
  return new Date(ms).toLocaleTimeString(locale(lang), { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function fmtDay(ms: number, lang: Lang, t: TFn): string {
  const d = new Date(ms);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(d) - day(new Date())) / 86400000);
  if (diff === 0) return t("day.today");
  if (diff === 1) return t("day.tomorrow");
  if (diff === -1) return t("day.yesterday");
  return d.toLocaleDateString(locale(lang), { weekday: "short", day: "2-digit", month: "2-digit" });
}

export function fmtAgo(ms: number | null | undefined, now: number, t: TFn): string {
  if (!ms) return t("ago.none");
  const s = Math.max(0, Math.floor((now - ms) / 1000));
  if (s < 60) return t("ago.now");
  const [n, u] = s < 3600 ? [Math.floor(s / 60), "minute"] : s < 86400 ? [Math.floor(s / 3600), "hour"] : [Math.floor(s / 86400), "day"];
  return `${unit(t, u as "minute" | "hour" | "day", n)} ${t("ago.suffix")}`;
}

export function limitLabel(l: Limit, t: TFn): string {
  const k = `limit.${l.key}` as const;
  const s = t(k as never);
  return s === k ? l.label : s;
}

/** Tên hiển thị -> chữ cái đầu cho avatar */
export function initials(name: string): string {
  const w = name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  if (w.length === 0) return "?";
  if (w.length === 1) return w[0][0].toUpperCase();
  return (w[0][0] + w[w.length - 1][0]).toUpperCase();
}
