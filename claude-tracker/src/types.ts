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
}
export interface Settings {
  notify_enabled: boolean;
  notify_threshold: number;
}
export interface AppData {
  token: string;
  port: number;
  accounts: Account[];
  settings: Settings;
  /** Tăng mỗi khi nhận dữ liệu mới từ extension */
  ingest_seq: number;
  /** Lần cuối extension gọi tới app (ms epoch), 0 = chưa từng */
  ext_seen: number;
}
export interface ChromeProfile {
  dir: string;
  name: string;
  email: string;
}
