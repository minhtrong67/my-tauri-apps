export interface Limit {
  key: string;
  label: string;
  utilization: number | null;
  resets_at: string | null;
}
export interface Account {
  id: string;
  label: string;
  email?: string | null;
  org_name?: string | null;
  plan?: string | null;
  profile_dir?: string | null;
  profile_auto?: boolean;
  chrome_email?: string | null;
  limits: Limit[];
  fetched_at?: number | null;
  last_error?: string | null;
  last_raw?: unknown;
  hidden?: boolean;
  pinned?: boolean;
  alias?: string | null;
  note?: string | null;
}
/** [thời điểm ms, khoá giới hạn, % đã dùng] */
export type Sample = [number, string, number];
export type Histories = Record<string, Sample[]>;
export interface Settings {
  notify_enabled: boolean;
  notify_threshold: number;
  warn_enabled: boolean;
  warn_at: number;
  quiet_enabled: boolean;
  /** phút kể từ 00:00 */
  quiet_from: number;
  quiet_to: number;
  close_to_tray: boolean;
}
export type WindowMode = "remember" | "maximized";
export interface WindowPrefs {
  mode: WindowMode;
  width?: number | null;
  height?: number | null;
  x?: number | null;
  y?: number | null;
  maximized: boolean;
}
export interface AppData {
  token: string;
  port: number;
  accounts: Account[];
  settings: Settings;
  window: WindowPrefs;
  /** Tăng mỗi khi nhận dữ liệu mới từ extension */
  ingest_seq: number;
  /** Lần cuối extension gọi tới app (ms epoch), 0 = chưa từng */
  ext_seen: number;
  autostart?: boolean;
  server_error?: string | null;
}
export interface ChromeProfile {
  dir: string;
  /** Tên hiển thị của profile, ví dụ "01 - Work" */
  name: string;
  /** Email Google đăng nhập trong profile */
  email: string;
  /** Tên người dùng của tài khoản Google (gaia_name) */
  user_name?: string;
  /** Ảnh đại diện thật của profile (data URL), rỗng nếu không có */
  avatar?: string;
}
