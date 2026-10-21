import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ChevronDown, Chrome, Clock, Inbox, LayoutDashboard, LayoutGrid, List, RefreshCw, Search, Settings as SettingsIcon, SearchX, SlidersHorizontal, X } from "lucide-react";
import type { AppData, ChromeProfile, Settings, WindowMode } from "./types";
import { AccountState, analyze, fmtClock, fmtCountdown, fmtDay, sortViews, tickFor } from "./lib";
import { I18nProvider, Key, useI18n } from "./i18n";
import { usePrefs, ViewMode } from "./prefs";
import { AccountCard } from "./AccountCard";
import { SettingsView } from "./SettingsView";
import { ConfirmDialog, Logo, Segmented, Toast, ToastData } from "./ui";

type Filter = "all" | AccountState;
const FILTERS: { key: Filter; label: Key }[] = [
  { key: "all", label: "filter.all" },
  { key: "ready", label: "filter.ready" },
  { key: "waiting", label: "filter.waiting" },
  { key: "nodata", label: "filter.nodata" },
];

/** Đồng hồ 1 giây/lần; tạm dừng khi cửa sổ bị ẩn để không tốn CPU dưới khay */
function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let timer: number | undefined;
    const start = () => {
      setNow(Date.now());
      timer = window.setInterval(() => setNow(Date.now()), ms);
    };
    const onVis = () => {
      window.clearInterval(timer);
      if (!document.hidden) start();
    };
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ms]);
  return now;
}

export default function App() {
  const { prefs, setPrefs, lang } = usePrefs();
  return (
    <I18nProvider lang={lang}>
      <Shell prefs={prefs} setPrefs={setPrefs} lang={lang} />
    </I18nProvider>
  );
}

function Shell({ prefs, setPrefs, lang }: { prefs: ReturnType<typeof usePrefs>["prefs"]; setPrefs: ReturnType<typeof usePrefs>["setPrefs"]; lang: "vi" | "en" }) {
  const { t } = useI18n();
  const [data, setData] = useState<AppData | null>(null);
  const [profiles, setProfiles] = useState<ChromeProfile[]>([]);
  const [tab, setTab] = useState<"dashboard" | "settings">("dashboard");
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<ToastData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);
  const now = useNow();
  const lastJson = useRef("");
  const toastTimer = useRef<number>();

  const notify = useCallback((kind: ToastData["kind"], text: string, ms = kind === "info" ? 4000 : 0) => {
    window.clearTimeout(toastTimer.current);
    setToast({ kind, text });
    if (ms) toastTimer.current = window.setTimeout(() => setToast(null), ms);
  }, []);

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
    // 1) Backend báo ngay khi có dữ liệu mới; 2) thăm dò 3 giây/lần (bỏ qua khi ẩn) + khi quay lại cửa sổ làm lưới an toàn
    const un = listen("store-updated", () => refresh().catch(() => {}));
    const timer = setInterval(() => !document.hidden && refresh().catch(() => {}), 3000);
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

  // Báo ngôn ngữ cho backend (menu khay + nội dung thông báo Windows)
  useEffect(() => {
    invoke("set_lang", { lang }).catch(() => {});
  }, [lang]);

  const all = useMemo(() => (data ? sortViews(data.accounts.map((a) => analyze(a, now))) : []), [data, now]);

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return all.filter((v) => {
      if (filter !== "all" && v.state !== filter) return false;
      if (!k) return true;
      const p = profiles.find((x) => x.dir === v.account.profile_dir);
      return [v.account.email, v.account.id, v.account.profile_dir, p?.name, p?.user_name, p?.email].some((s) => s?.toLowerCase().includes(k));
    });
  }, [all, filter, q, profiles]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: all.length, ready: 0, waiting: 0, nodata: 0 };
    for (const v of all) c[v.state]++;
    return c;
  }, [all]);
  const next = all.find((v) => v.state === "waiting" && v.availableAt);

  const doRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    notify("info", t("refresh.syncing"), 0);
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
      if (got) notify("info", t("refresh.done"));
      else {
        const seen = (await refresh()).ext_seen;
        notify("error", !seen || Date.now() - seen > 60000 ? t("refresh.noext") : t("refresh.nodata"));
      }
    } catch (e) {
      notify("error", String(e));
    } finally {
      setRefreshing(false);
    }
  };

  const open = useCallback(
    async (dir: string) => {
      try {
        await invoke("open_profile", { profileDir: dir });
      } catch (e) {
        notify("error", String(e));
      }
    },
    [notify]
  );
  const askRemove = useCallback((id: string, name: string) => setRemoving({ id, name }), []);

  const openDirs = useMemo(() => [...new Set((data?.accounts ?? []).map((a) => a.profile_dir).filter((d): d is string => !!d))], [data]);
  const openAll = async () => {
    setConfirmAll(false);
    try {
      await invoke("open_profiles", { profileDirs: openDirs, url: "https://claude.ai/" });
      notify("info", t("dash.openAll.done", { n: openDirs.length }));
    } catch (e) {
      notify("error", String(e));
    }
  };
  const filtersActive = (filter !== "all" ? 1 : 0) + (q.trim() ? 1 : 0);
  const clearFilters = () => {
    setFilter("all");
    setQ("");
  };

  const onSettings = (s: Settings) => {
    setData((d) => (d ? { ...d, settings: s } : d)); // cập nhật ngay, khỏi giật thanh trượt
    invoke("set_settings", { settings: s }).catch(() => {});
  };
  const onWindowMode = (mode: WindowMode) => {
    setData((d) => (d ? { ...d, window: { ...d.window, mode } } : d));
    invoke("set_window_mode", { mode }).catch(() => {});
  };

  if (!data) return <div className="boot">{t("boot")}</div>;

  const connected = !!data.ext_seen && now - data.ext_seen < 60000;

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <Logo size={42} />
          <div>
            <h1>Claude Tracker</h1>
            <p className="status">
              <span className={`live ${connected ? "on" : ""}`} aria-hidden="true" />
              {connected ? t("status.connected") : t("status.waiting")} · 127.0.0.1:{data.port}
            </p>
          </div>
        </div>
        <div className="top-actions">
          <button className={`btn filled refresh ${refreshing ? "busy" : ""}`} onClick={doRefresh} disabled={refreshing}>
            <RefreshCw size={18} aria-hidden="true" />
            {refreshing ? t("refreshing") : t("refresh")}
          </button>
          <nav className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === "dashboard"} className={tab === "dashboard" ? "on" : ""} onClick={() => setTab("dashboard")}>
              <LayoutDashboard size={17} aria-hidden="true" />
              <span>{t("nav.dashboard")}</span>
            </button>
            <button role="tab" aria-selected={tab === "settings"} className={tab === "settings" ? "on" : ""} onClick={() => setTab("settings")}>
              <SettingsIcon size={17} aria-hidden="true" />
              <span>{t("nav.settings")}</span>
            </button>
          </nav>
        </div>
      </header>

      <div className="scroll">
        <main className="content" key={tab}>
          {tab === "dashboard" ? (
            <>
              <div className="dash-head">
                <div>
                  <h2>{t("dash.title")}</h2>
                  <p className="muted">{t("dash.count", { n: all.length, ready: counts.ready })}</p>
                </div>
                <div className="dash-actions">
                  <button className="btn tonal" onClick={() => setConfirmAll(true)} disabled={openDirs.length === 0}>
                    <Chrome size={17} aria-hidden="true" />
                    {t("dash.openAll")}
                  </button>
                  <Segmented<ViewMode>
                    iconOnly
                    label={t("view.label")}
                    value={prefs.view}
                    onChange={(v) => setPrefs({ view: v })}
                    options={[
                      { value: "grid", label: t("view.grid"), icon: <LayoutGrid size={18} /> },
                      { value: "list", label: t("view.list"), icon: <List size={18} /> },
                    ]}
                  />
                </div>
              </div>

              <section className={`filters ${prefs.filtersOpen ? "open" : ""}`}>
                <div className="filters-head">
                  <button className="filters-toggle" aria-expanded={prefs.filtersOpen} aria-controls="filters-body" onClick={() => setPrefs({ filtersOpen: !prefs.filtersOpen })}>
                    <SlidersHorizontal size={18} aria-hidden="true" />
                    <span className="ft-title">{t("filters.title")}</span>
                    {filtersActive > 0 && <span className="count-pill">{filtersActive}</span>}
                    <span className="ft-sub">{t("filters.showing", { shown: shown.length, total: all.length })}</span>
                    <ChevronDown size={18} className="chev" aria-hidden="true" />
                  </button>
                </div>
                <div className="filters-body" id="filters-body" aria-hidden={!prefs.filtersOpen}>
                  <div className="filters-inner">
                   <div className="f-controls">
                    <label className="search">
                      <Search size={17} aria-hidden="true" />
                      <input placeholder={t("search.placeholder")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("filters.search")} tabIndex={prefs.filtersOpen ? 0 : -1} />
                      {q && (
                        <button className="clear" onClick={() => setQ("")} aria-label={t("search.clear")}>
                          <X size={15} />
                        </button>
                      )}
                    </label>
                    <div className="chips" role="group" aria-label={t("filters.status")}>
                      {FILTERS.map((f) => (
                        <button key={f.key} tabIndex={prefs.filtersOpen ? 0 : -1} className={`fchip st-${f.key} ${filter === f.key ? "on" : ""}`} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                          {f.key !== "all" && <span className="sd" aria-hidden="true" />}
                          {t(f.label)} <span className="n">{counts[f.key]}</span>
                        </button>
                      ))}
                    </div>
                   </div>
                   {filtersActive > 0 && (
                     <div className="filters-foot">
                       <button className="btn text sm" tabIndex={prefs.filtersOpen ? 0 : -1} onClick={clearFilters}>
                         <X size={15} aria-hidden="true" />
                         {t("filters.clear")}
                       </button>
                     </div>
                   )}
                  </div>
                </div>
              </section>

              {next && next.availableAt && (
                <div className="next">
                  <Clock size={18} aria-hidden="true" />
                  <span>
                    {t("next.label")}: <b>{next.account.email ?? next.account.id}</b> {t("next.at")} <b>{fmtClock(next.availableAt, lang)}</b> ({fmtDay(next.availableAt, lang, t)}) ·{" "}
                    {t("next.left", { left: fmtCountdown(next.availableAt - now, t) })}
                  </span>
                </div>
              )}

              {all.length === 0 ? (
                <div className="empty">
                  <Inbox size={40} aria-hidden="true" />
                  <h2>{t("empty.title")}</h2>
                  <p>{t("empty.body")}</p>
                  <button className="btn filled" onClick={() => setTab("settings")}>
                    {t("empty.cta")}
                  </button>
                </div>
              ) : shown.length === 0 ? (
                <div className="empty">
                  <SearchX size={40} aria-hidden="true" />
                  <p>{t("empty.filter")}</p>
                </div>
              ) : (
                <section className={`cards ${prefs.view}`} key={prefs.view}>
                  {shown.map((v, i) => (
                    <AccountCard key={v.account.id} view={v} now={tickFor(v, now)} profiles={profiles} index={i} onOpen={open} onRemove={askRemove} />
                  ))}
                </section>
              )}
            </>
          ) : (
            <SettingsView data={data} views={all} prefs={prefs} setPrefs={setPrefs} onSettings={onSettings} onWindowMode={onWindowMode} />
          )}
        </main>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
      {confirmAll && (
        <ConfirmDialog
          tone="primary"
          title={t("dash.openAll.title")}
          body={t("dash.openAll.body", { n: openDirs.length })}
          confirm={t("dash.openAll.confirm", { n: openDirs.length })}
          cancel={t("dialog.cancel")}
          onCancel={() => setConfirmAll(false)}
          onConfirm={openAll}
        />
      )}
      {removing && (
        <ConfirmDialog
          title={t("dialog.remove.title")}
          body={t("dialog.remove.body", { name: removing.name })}
          confirm={t("dialog.remove")}
          cancel={t("dialog.cancel")}
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            invoke("remove_account", { id: removing.id }).catch(() => {});
            setRemoving(null);
          }}
        />
      )}
    </div>
  );
}
