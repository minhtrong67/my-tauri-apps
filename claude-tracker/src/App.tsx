import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AppData, ChromeProfile, Settings } from "./types";
import { AccountState, analyze, fmtClock, fmtCountdown, fmtDay, sortViews } from "./lib";
import { AccountCard } from "./AccountCard";
import { SettingsView } from "./SettingsView";

type Filter = "all" | AccountState;
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "ready", label: "Sẵn sàng" },
  { key: "waiting", label: "Đang chờ" },
  { key: "expected", label: "Chờ xác nhận" },
  { key: "nodata", label: "Chưa có dữ liệu" },
];

function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [profiles, setProfiles] = useState<ChromeProfile[]>([]);
  const [tab, setTab] = useState<"dashboard" | "settings">("dashboard");
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const now = useNow();

  const lastJson = useRef("");

  /** Đọc state từ backend; chỉ setState khi thật sự đổi để khỏi vẽ lại thừa. Trả về state mới nhất. */
  const refresh = useCallback(async () => {
    const d = await invoke<AppData>("get_state");
    const j = JSON.stringify(d);
    if (j !== lastJson.current) {
      lastJson.current = j;
      setData(d);
    }
    return d;
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
    invoke<ChromeProfile[]>("list_chrome_profiles").then(setProfiles).catch(() => {});
    // 1) Backend báo ngay khi có dữ liệu mới; 2) thăm dò 3 giây/lần + khi quay lại cửa sổ làm lưới an toàn
    // (sự kiện có thể lỡ khi cửa sổ đang ẩn dưới khay) -> người dùng không bao giờ phải F5
    const un = listen("store-updated", () => refresh().catch(() => {}));
    const timer = setInterval(() => refresh().catch(() => {}), 3000);
    const wake = () => !document.hidden && refresh().catch(() => {});
    window.addEventListener("focus", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      un.then((f) => f());
      clearInterval(timer);
      window.removeEventListener("focus", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [refresh]);

  const all = useMemo(
    () => (data ? sortViews(data.accounts.map((a) => analyze(a, now))) : []),
    [data, now]
  );

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return all.filter((v) => {
      if (filter !== "all" && v.state !== filter) return false;
      if (!k) return true;
      const p = profiles.find((x) => x.dir === v.account.profile_dir);
      return [v.account.email, v.account.id, v.account.profile_dir, p?.name].some((s) => s?.toLowerCase().includes(k));
    });
  }, [all, filter, q, profiles]);

  const count = (f: Filter) => (f === "all" ? all.length : all.filter((v) => v.state === f).length);
  const next = all.find((v) => v.state === "waiting" && v.availableAt);

  const doRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);
    setNote("Đang yêu cầu các extension đồng bộ…");
    try {
      const before = (await refresh()).ingest_seq;
      await invoke("request_refresh");
      invoke<ChromeProfile[]>("list_chrome_profiles").then(setProfiles).catch(() => {});
      // Chờ tới khi có dữ liệu mới thật sự về (tối đa 25 giây) rồi mới báo kết quả
      let got = false;
      for (let i = 0; i < 36 && !got; i++) {
        await new Promise((r) => setTimeout(r, 700));
        got = (await refresh()).ingest_seq !== before;
      }
      if (got) {
        setNote("Đã cập nhật dữ liệu mới.");
        setTimeout(() => setNote(null), 4000);
      } else {
        setNote(null);
        const seen = (await refresh()).ext_seen;
        setError(
          !seen || Date.now() - seen > 60000
            ? "Chưa có extension nào kết nối tới app. Kiểm tra token/cổng trong extension (Lưu & kết nối) và Chrome đang mở."
            : "Extension đã nhận lệnh nhưng chưa đọc được dữ liệu. Hãy mở claude.ai trong Chrome profile đó rồi bấm Làm mới lại."
        );
      }
    } catch (e) {
      setNote(null);
      setError(String(e));
    } finally {
      setRefreshing(false);
    }
  };

  const open = async (dir: string) => {
    try {
      setError(null);
      await invoke("open_profile", { profileDir: dir });
    } catch (e) {
      setError(String(e));
    }
  };

  if (!data) return <div className="boot">Đang khởi động…</div>;

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <div className="logo">▮▮</div>
          <div>
            <h1>Claude Tracker</h1>
            <p className="muted small">
              <span className="live" />{" "}
              {data.ext_seen && now - data.ext_seen < 60000 ? "Extension đã kết nối" : "Đang chờ extension"} · 127.0.0.1:
              {data.port}
            </p>
          </div>
        </div>
        <div className="top-actions">
        <button className="ghost refresh" onClick={doRefresh} disabled={refreshing}>
          {refreshing ? "Đang làm mới…" : "⟳ Làm mới"}
        </button>
        <nav className="tabs">
          <button className={tab === "dashboard" ? "on" : ""} onClick={() => setTab("dashboard")}>
            Dashboard
          </button>
          <button className={tab === "settings" ? "on" : ""} onClick={() => setTab("settings")}>
            Cài đặt
          </button>
        </nav>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}
      {note && <div className="note">{note}</div>}

      {tab === "dashboard" ? (
        <>
          <div className="toolbar">
            <div className="chips">
              {FILTERS.map((f) => (
                <button key={f.key} className={`fchip ${filter === f.key ? "on" : ""}`} onClick={() => setFilter(f.key)}>
                  {f.label} <span className="n">{count(f.key)}</span>
                </button>
              ))}
            </div>
            <input
              className="search"
              placeholder="Tìm email hoặc profile…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {next && next.availableAt && (
            <div className="next">
              Tài khoản dùng lại sớm nhất: <b>{next.account.email ?? next.account.id}</b> lúc{" "}
              <b>{fmtClock(next.availableAt)}</b> ({fmtDay(next.availableAt)}) · còn {fmtCountdown(next.availableAt - now)}
            </div>
          )}

          {all.length === 0 ? (
            <div className="empty">
              <h2>Chưa có tài khoản nào</h2>
              <p className="muted">
                Cài extension <b>Claude Usage Reporter</b> vào từng Chrome Profile đã đăng nhập Claude, rồi dán token ở
                tab <b>Cài đặt</b>. Tài khoản sẽ tự xuất hiện tại đây.
              </p>
              <button className="primary" onClick={() => setTab("settings")}>
                Mở hướng dẫn
              </button>
            </div>
          ) : shown.length === 0 ? (
            <div className="empty">
              <p className="muted">Không có tài khoản nào khớp bộ lọc.</p>
            </div>
          ) : (
            <section className="grid">
              {shown.map((v) => (
                <AccountCard key={v.account.id} view={v} now={now} profiles={profiles} onOpen={open} />
              ))}
            </section>
          )}
        </>
      ) : (
        <SettingsView data={data} views={all} onSettings={(s: Settings) => invoke("set_settings", { settings: s })} />
      )}
    </div>
  );
}
