// Backend giả cho `npm run dev:mock`: dữ liệu demo tính theo giờ hiện tại để đếm ngược trông thật.
import type { Account, AppData, ChromeProfile } from "../types";

const MIN = 60_000;
const iso = (offsetMin: number) => new Date(Date.now() + offsetMin * MIN).toISOString();
const ago = (m: number) => Date.now() - m * MIN;

/** Ảnh chân dung minh hoạ (SVG data URL) để mô phỏng ảnh thật của Chrome profile */
const portrait = (h1: number, h2: number, skin: string, hair: string) =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h1} 60% 70%)"/><stop offset="1" stop-color="hsl(${h2} 55% 45%)"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/><path d="M14 100c2-26 17-36 36-36s34 10 36 36z" fill="hsl(${h2} 35% 25%)"/><circle cx="50" cy="42" r="19" fill="${skin}"/><path d="M30 41c-1-17 10-24 21-24 12 0 21 8 19 24-5-8-10-11-20-11-9 0-16 3-20 11z" fill="${hair}"/></svg>`
  );
const AV: Record<string, string> = {
  "Profile 4": portrait(200, 230, "#e9b48e", "#2b1d16"),
  "Profile 7": portrait(330, 300, "#f1c7a3", "#4a2a1b"),
  "Profile 14": portrait(150, 180, "#d79f77", "#171210"),
  "Profile 10": portrait(25, 10, "#e9b48e", "#2b1d16"),
  "Profile 9": portrait(260, 280, "#c68e68", "#241a14"),
  "Profile 11": portrait(95, 130, "#f1c7a3", "#6b4a2b"),
};

const profiles: ChromeProfile[] = [
  { avatar: AV["Profile 4"], dir: "Profile 4", name: "01 - Work", email: "alex.work@example.com", user_name: "Alex Morgan" },
  { avatar: AV["Profile 7"], dir: "Profile 7", name: "02 - Personal", email: "jamie.personal@example.com", user_name: "Jamie Lee" },
  { avatar: AV["Profile 14"], dir: "Profile 14", name: "03 - Media", email: "morgan.dao.longaddress1411@example.com", user_name: "Morgan Dao Nguyen" },
  { avatar: AV["Profile 10"], dir: "Profile 10", name: "04 - Private", email: "alex.private@example.com", user_name: "Alex Morgan" },
  { avatar: AV["Profile 9"], dir: "Profile 9", name: "05 - Gaming", email: "sam.gaming@example.com", user_name: "Sam Rivera" },
  { avatar: AV["Profile 11"], dir: "Profile 11", name: "06 - Backup", email: "taylor.backup@example.com", user_name: "Taylor Kim" },
  { dir: "Profile 12", name: "07 - Studio", email: "riley.studio@example.com", user_name: "Riley Park" },
];

const acc = (id: string, p: string, five: [number, string | null], week: [number, string | null], fetched: number): Account => ({
  id,
  label: id,
  email: id,
  profile_dir: p,
  profile_auto: true,
  chrome_email: profiles.find((x) => x.dir === p)?.email,
  limits: [
    { key: "five_hour", label: "5-hour", utilization: five[0], resets_at: five[1] },
    { key: "seven_day", label: "Weekly", utilization: week[0], resets_at: week[1] },
  ],
  fetched_at: fetched,
});

let accounts: Account[] = [
  acc("alex.work@example.com", "Profile 4", [18, iso(210)], [41, iso(60 * 52)], ago(3)),
  acc("alex.private@example.com", "Profile 10", [0, null], [12, iso(60 * 96)], ago(3)),
  acc("taylor.backup@example.com", "Profile 11", [100, iso(151)], [62, iso(60 * 40)], ago(1)),
  acc("sam.gaming@example.com", "Profile 9", [100, iso(196)], [55, iso(60 * 70)], ago(48)),
  acc("jamie.personal@example.com", "Profile 7", [100, iso(256)], [34, iso(60 * 100)], ago(52)),
  acc("morgan.dao.longaddress1411@example.com", "Profile 14", [100, iso(276)], [28, iso(60 * 120)], ago(44)),
  acc("riley.studio@example.com", "Profile 12", [100, iso(-12)], [47, iso(60 * 30)], ago(95)),
];

let seq = 0;
let ext = Date.now();
let windowPrefs = { mode: "remember", width: 1280, height: 800, x: 0, y: 0, maximized: false };
let settings = { notify_enabled: true, notify_threshold: 100, warn_enabled: true, warn_at: 80, quiet_enabled: false, quiet_from: 22 * 60, quiet_to: 7 * 60, close_to_tray: true };
let autostart = false;

/** Lịch sử giả: mức dùng 5 giờ tăng dần trong cửa sổ hiện tại để thấy biểu đồ + dự báo */
function fakeHistory(a: Account): [number, string, number][] {
  const five = a.limits[0];
  const r = five.resets_at ? Date.parse(five.resets_at) : null;
  const end = Math.min(Date.now(), r ?? Date.now());
  const start = (r ?? Date.now() + 5 * 3600000) - 5 * 3600000;
  const u = five.utilization ?? 0;
  const out: [number, string, number][] = [];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    const t = start + (end - start) * f;
    out.push([t, "five_hour", Math.round(u * (0.15 + 0.85 * f * f) * 10) / 10]);
  }
  return out;
}

export async function invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  switch (cmd) {
    case "get_state": {
      ext = Date.now();
      const d: AppData = {
        token: "6455f2249133418a929e0a9d68c6b68c",
        port: 47821,
        accounts: accounts.map((a) => ({ ...a, last_raw: { five_hour: a.limits[0], seven_day: a.limits[1] } })),
        settings,
        window: windowPrefs as AppData["window"],
        ingest_seq: seq,
        ext_seen: ext,
        autostart,
        server_error: null,
      };
      return d as T;
    }
    case "open_profiles":
      return (args as { profileDirs: string[] }).profileDirs.length as T;
    case "list_chrome_profiles":
      return profiles as T;
    case "request_refresh":
      setTimeout(() => seq++, 900);
      return undefined as T;
    case "set_settings":
      settings = (args as { settings: typeof settings }).settings;
      return undefined as T;
    case "set_window_mode":
      windowPrefs = { ...windowPrefs, mode: (args as { mode: string }).mode };
      return undefined as T;
    case "get_histories": {
      const m: Record<string, [number, string, number][]> = {};
      for (const a of accounts) if (!a.hidden && a.limits[0].utilization !== null && a.limits[0].utilization < 100) m[a.id] = fakeHistory(a);
      return m as T;
    }
    case "update_account": {
      const x = args as { id: string; profileDir?: string; alias?: string; note?: string; pinned?: boolean };
      accounts = accounts.map((a) =>
        a.id === x.id
          ? { ...a, profile_dir: x.profileDir ?? a.profile_dir, alias: x.alias !== undefined ? x.alias || null : a.alias, note: x.note !== undefined ? x.note || null : a.note, pinned: x.pinned ?? a.pinned }
          : a
      );
      return undefined as T;
    }
    case "remove_account":
    case "restore_account":
      accounts = accounts.map((a) => (a.id === (args as { id: string }).id ? { ...a, hidden: cmd === "remove_account" } : a));
      return undefined as T;
    case "forget_account":
      accounts = accounts.filter((a) => a.id !== (args as { id: string }).id);
      return undefined as T;
    case "set_autostart":
      autostart = (args as { enabled: boolean }).enabled;
      return autostart as T;
    case "regenerate_token":
      return "mock-" + Math.random().toString(16).slice(2, 18) as T;
    case "export_csv":
      return "C:\\Users\\you\\Downloads\\claude-tracker-history.csv" as T;
    default:
      return undefined as T;
  }
}
