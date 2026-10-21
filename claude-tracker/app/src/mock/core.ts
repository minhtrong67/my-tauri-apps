// Backend giả cho `npm run dev:mock`: dữ liệu demo tính theo giờ hiện tại để đếm ngược trông thật.
import type { Account, AppData, ChromeProfile } from "../types";

const MIN = 60_000;
const iso = (offsetMin: number) => new Date(Date.now() + offsetMin * MIN).toISOString();
const ago = (m: number) => Date.now() - m * MIN;

const profiles: ChromeProfile[] = [
  { dir: "Profile 4", name: "01 - Work", email: "alex.work@example.com", user_name: "Alex Morgan" },
  { dir: "Profile 7", name: "02 - Personal", email: "jamie.personal@example.com", user_name: "Jamie Lee" },
  { dir: "Profile 14", name: "03 - Media", email: "morgan.dao.longaddress1411@example.com", user_name: "Morgan Dao Nguyen" },
  { dir: "Profile 10", name: "04 - Private", email: "alex.private@example.com", user_name: "Alex Morgan" },
  { dir: "Profile 9", name: "05 - Gaming", email: "sam.gaming@example.com", user_name: "Sam Rivera" },
  { dir: "Profile 11", name: "06 - Backup", email: "taylor.backup@example.com", user_name: "Taylor Kim" },
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
let settings = { notify_enabled: true, notify_threshold: 100 };

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
      };
      return d as T;
    }
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
    case "remove_account":
      accounts = accounts.filter((a) => a.id !== (args as { id: string }).id);
      return undefined as T;
    default:
      return undefined as T;
  }
}
