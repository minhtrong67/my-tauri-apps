import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  CheckCircle2, ChevronDown, Chrome, Clock, EyeOff, Hourglass, Inbox, LayoutDashboard, LayoutGrid, List, RefreshCw, Search, SearchX, Settings as SettingsIcon, SlidersHorizontal, Sparkles, TriangleAlert, X,
} from "lucide-react";
import type { AppData, ChromeProfile, Histories, Settings, WindowMode } from "./types";
import { AccountState, accountTitle, analyze, fmtClock, fmtCountdown, fmtDay, sortViews, tickFor } from "./lib";
import { I18nProvider, Key, useI18n } from "./i18n";
import { usePrefs, ViewMode } from "./prefs";
import { AccountCard } from "./AccountCard";
import { SettingsView } from "./SettingsView";
import { EditDialog } from "./EditDialog";
import { ConfirmDialog, Logo, Segmented, Skeleton, Tip, Toast, ToastData, ToastKind } from "./ui";

type Filter = "all" | AccountState;
type Tab = "dashboard" | "settings";
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

function Boot() {
  const { t } = useI18n();
  return (
    <div className="boot" role="status" aria-label={t("boot")}>
      <Logo size={64} />
      <div className="boot-cards">
        <Skeleton className="sk-card" />
        <Skeleton className="sk-card" />
        <Skeleton className="sk-card" />
      </div>
    </div>
  );
}

function Shell({ prefs, setPrefs, lang }: { prefs: ReturnType<typeof usePrefs>["prefs"]; setPrefs: ReturnType<typeof usePrefs>["setPrefs"]; lang: "vi" | "en" }) {
  const { t } = useI18n();
  const [data, setData] = useState<AppData | null>(null);
  const [hist, setHist] = useState<Histories>({});
  const [profiles, setProfiles] = useState<ChromeProfile[]>([]);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<ToastData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [hiding, setHiding] = useState<{ id: string; name: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const now = useNow();
  const lastJson = useRef("");
  const toastTimer = useRef<number>();
  const toastId = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const notify = useCallback((kind: ToastKind, text: string, ms = kind === "error" ? 0 : kind === "warning" ? 6500 : 4200) => {
    window.clearTimeout(toastTimer.current);
    setToast({ kind, text, ms, id: ++toastId.current });
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
    // Backend báo ngay khi có thay đổi; thăm dò thưa (15 giây) + khi quay lại cửa sổ chỉ là lưới an toàn
    const un = listen("store-updated", () => refresh().catch(() => {}));
    const timer = setInterval(() => !document.hidden && refresh().catch(() => {}), 15000);
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

  // Lịch sử chỉ tải lại khi có dữ liệu mới (ingest_seq đổi) hoặc đổi số tài khoản
  const seq = data?.ingest_seq ?? -1;
  const nAcc = data?.accounts.length ?? 0;
  useEffect(() => {
    if (seq < 0) return;
    invoke<Histories>("get_histories").then(setHist).catch(() => {});
  }, [seq, nAcc]);

  // Báo ngôn ngữ cho backend (menu khay + nội dung thông báo Windows)
  useEffect(() => {
    invoke("set_lang", { lang }).catch(() => {});
  }, [lang]);

  const visible = useMemo(() => (data ? data.accounts.filter((a) => !a.hidden) : []), [data]);
  const all = useMemo(() => sortViews(visible.map((a) => analyze(a, now))), [visible, now]);

  const profileOf = useCallback((dir?: string | null) => profiles.find((x) => x.dir === dir), [profiles]);

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return all.filter((v) => {
      if (filter !== "all" && v.state !== filter) return false;
      if (!k) return true;
      const p = profileOf(v.account.profile_dir);
      return [v.account.email, v.account.id, v.account.alias, v.account.note, v.account.profile_dir, p?.name, p?.user_name, p?.email].some((s) => s?.toLowerCase().includes(k));
    });
  }, [all, filter, q, profileOf]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: all.length, ready: 0, waiting: 0, nodata: 0 };
    for (const v of all) c[v.state]++;
    return c;
  }, [all]);

  const next = all.filter((v) => v.state === "waiting" && v.availableAt).sort((a, b) => (a.availableAt as number) - (b.availableAt as number))[0];
  // Tài khoản "tốt nhất" để dùng ngay: sẵn sàng, có Chrome profile, mức dùng thấp nhất
  const best = useMemo(() => {
    const util = (v: (typeof all)[number]) => Math.max(...v.limits.map((l) => l.util ?? 0), 0);
    return all.filter((v) => v.state === "ready" && v.account.profile_dir).sort((a, b) => util(a) - util(b))[0];
  }, [all]);

  const doRefresh = useCallback(async () => {
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
      if (got) notify("success", t("refresh.done"));
      else {
        const seen = (await refresh()).ext_seen;
        notify("warning", !seen || Date.now() - seen > 60000 ? t("refresh.noext") : t("refresh.nodata"));
      }
    } catch (e) {
      notify("error", String(e));
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, notify, refresh, t]);

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
  const askHide = useCallback((id: string, name: string) => setHiding({ id, name }), []);
  const onPin = useCallback((id: string, pinned: boolean) => {
    setData((d) => (d ? { ...d, accounts: d.accounts.map((a) => (a.id === id ? { ...a, pinned } : a)) } : d));
    invoke("update_account", { id, pinned }).catch(() => {});
  }, []);

  const openDirs = useMemo(() => [...new Set(visible.map((a) => a.profile_dir).filter((d): d is string => !!d))], [visible]);
  const openAll = async () => {
    setConfirmAll(false);
    try {
      await invoke("open_profiles", { profileDirs: openDirs, url: "https://claude.ai/" });
      notify("success", t("dash.openAll.done", { n: openDirs.length }));
    } catch (e) {
      notify("error", String(e));
    }
  };
  const openBest = () => (best?.account.profile_dir ? open(best.account.profile_dir) : notify("warning", t("dash.best.none")));

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

  // Phím tắt: Ctrl+R làm mới · Ctrl+F tìm kiếm · Ctrl+, cài đặt · Ctrl+1 dashboard
  const keys = useRef({ doRefresh, setPrefs, prefs });
  keys.current = { doRefresh, setPrefs, prefs };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "r") {
        e.preventDefault();
        keys.current.doRefresh();
      } else if (k === "f") {
        e.preventDefault();
        setTab("dashboard");
        if (!keys.current.prefs.filtersOpen) keys.current.setPrefs({ filtersOpen: true });
        setTimeout(() => searchRef.current?.focus(), 60);
      } else if (k === ",") {
        e.preventDefault();
        setTab("settings");
      } else if (k === "1") {
        e.preventDefault();
        setTab("dashboard");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!data) return <Boot />;

  const connected = !!data.ext_seen && now - data.ext_seen < 60000;
  const editAcc = editing ? data.accounts.find((a) => a.id === editing) : null;
  const toggleFilter = (f: Filter) => setFilter((cur) => (cur === f ? "all" : f));

  return (
    <div className="app">
      <nav className="rail" aria-label="Main">
        <div className="rail-logo">
          <Logo size={40} />
        </div>
        <div className="rail-items" role="tablist" aria-orientation="vertical">
          {(
            [
              ["dashboard", t("nav.dashboard"), <LayoutDashboard size={22} key="d" />, "Ctrl+1"],
              ["settings", t("nav.settings"), <SettingsIcon size={22} key="s" />, "Ctrl+,"],
            ] as [Tab, string, React.ReactNode, string][]
          ).map(([id, label, icon, kbd]) => (
            <Tip key={id} label={label} kbd={kbd} side="right">
              <button role="tab" aria-selected={tab === id} className={`rail-item ${tab === id ? "on" : ""}`} onClick={() => setTab(id)}>
                <span className="rail-pill">{icon}</span>
                <span className="rail-label">{label}</span>
              </button>
            </Tip>
          ))}
        </div>
        <div className="rail-foot">
          <Tip label={connected ? t("status.connected") : t("status.waiting")} side="right">
            <span className={`live ${connected ? "on" : ""}`} role="status" aria-label={connected ? t("status.connected") : t("status.waiting")} tabIndex={0} />
          </Tip>
        </div>
      </nav>

      <div className="main">
        <header className="top">
          <div className="titles">
            <h1>{tab === "dashboard" ? t("dash.title") : t("nav.settings")}</h1>
            <p className="status">
              {tab === "dashboard" ? t("dash.count", { n: all.length, ready: counts.ready }) : `${connected ? t("status.connected") : t("status.waiting")} · 127.0.0.1:${data.port}`}
            </p>
          </div>
          {tab === "dashboard" && (
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
          )}
        </header>

        <div className="scroll">
          <main className="content" key={tab}>
            {tab === "dashboard" ? (
              <>
                {data.server_error && (
                  <div className="banner warn" role="alert">
                    <TriangleAlert size={20} aria-hidden="true" />
                    <span>{t("server.error", { port: data.port })}</span>
                    <button className="btn tonal sm" onClick={() => setTab("settings")}>
                      <SettingsIcon size={15} aria-hidden="true" />
                      {t("nav.settings")}
                    </button>
                  </div>
                )}

                {all.length > 0 && (
                  <section className="stats" aria-label={t("filters.status")}>
                    <button className={`stat ok ${filter === "ready" ? "on" : ""}`} aria-pressed={filter === "ready"} onClick={() => toggleFilter("ready")}>
                      <span className="stat-blob" aria-hidden="true" />
                      <CheckCircle2 size={22} aria-hidden="true" />
                      <span className="stat-num">{counts.ready}</span>
                      <span className="stat-label">{t("dash.stat.ready")}</span>
                    </button>
                    <button className={`stat danger ${filter === "waiting" ? "on" : ""}`} aria-pressed={filter === "waiting"} onClick={() => toggleFilter("waiting")}>
                      <span className="stat-blob" aria-hidden="true" />
                      <Hourglass size={22} aria-hidden="true" />
                      <span className="stat-num">{counts.waiting}</span>
                      <span className="stat-label">{t("dash.stat.waiting")}</span>
                    </button>
                    <div className="stat primary">
                      <span className="stat-blob" aria-hidden="true" />
                      <Clock size={22} aria-hidden="true" />
                      <span className="stat-num">{next?.availableAt ? fmtClock(next.availableAt, lang) : "—"}</span>
                      <span className="stat-label">{t("dash.stat.next")}</span>
                      <span className="stat-sub">
                        {next?.availableAt
                          ? `${accountTitle(next.account, profileOf(next.account.profile_dir)?.user_name)} · ${fmtDay(next.availableAt, lang, t)} · ${t("next.left", { left: fmtCountdown(next.availableAt - now, t) })}`
                          : t("dash.stat.none")}
                      </span>
                    </div>
                    <div className="stat best">
                      <span className="stat-blob" aria-hidden="true" />
                      <Sparkles size={22} aria-hidden="true" />
                      <span className="stat-label">{t("dash.best")}</span>
                      <span className="stat-sub">{best ? t("dash.best.hint", { name: accountTitle(best.account, profileOf(best.account.profile_dir)?.user_name) }) : t("dash.best.none")}</span>
                      <button className="btn filled sm" onClick={openBest} disabled={!best}>
                        <Chrome size={15} aria-hidden="true" />
                        {t("card.open")}
                      </button>
                    </div>
                  </section>
                )}

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
                          <input ref={searchRef} placeholder={t("search.placeholder")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("filters.search")} tabIndex={prefs.filtersOpen ? 0 : -1} />
                          {q && (
                            <Tip label={t("search.clear")}>
                              <button className="clear" onClick={() => setQ("")} aria-label={t("search.clear")}>
                                <X size={15} />
                              </button>
                            </Tip>
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

                {all.length === 0 ? (
                  <div className="empty">
                    <span className="empty-art" aria-hidden="true">
                      <Inbox size={40} />
                    </span>
                    <h2>{t("empty.title")}</h2>
                    <p>{t("empty.body")}</p>
                    <button className="btn filled" onClick={() => setTab("settings")}>
                      <SettingsIcon size={17} aria-hidden="true" />
                      {t("empty.cta")}
                    </button>
                  </div>
                ) : shown.length === 0 ? (
                  <div className="empty">
                    <span className="empty-art" aria-hidden="true">
                      <SearchX size={40} />
                    </span>
                    <p>{t("empty.filter")}</p>
                    <button className="btn tonal" onClick={clearFilters}>
                      <X size={17} aria-hidden="true" />
                      {t("filters.clear")}
                    </button>
                  </div>
                ) : (
                  <section className={`cards ${prefs.view}`} key={prefs.view}>
                    {shown.map((v, i) => (
                      <AccountCard
                        key={v.account.id}
                        view={v}
                        now={tickFor(v, now)}
                        profiles={profiles}
                        hist={hist[v.account.id]}
                        warnAt={data.settings.warn_at ?? 80}
                        index={i}
                        onOpen={open}
                        onHide={askHide}
                        onEdit={setEditing}
                        onPin={onPin}
                      />
                    ))}
                  </section>
                )}
              </>
            ) : (
              <SettingsView data={data} prefs={prefs} setPrefs={setPrefs} onSettings={onSettings} onWindowMode={onWindowMode} notify={notify} refresh={refresh} />
            )}
          </main>
        </div>
      </div>

      {tab === "dashboard" && (
        <Tip label={t("short.refresh")} kbd="Ctrl+R" side="top">
          <button className={`fab ${refreshing ? "busy" : ""}`} onClick={doRefresh} disabled={refreshing} aria-label={t("refresh")}>
            <RefreshCw size={22} aria-hidden="true" />
            <span className="fab-label">{refreshing ? t("refreshing") : t("refresh")}</span>
          </button>
        </Tip>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />

      {confirmAll && (
        <ConfirmDialog
          tone="primary"
          icon={<Chrome size={22} />}
          confirmIcon={<Chrome size={17} aria-hidden="true" />}
          title={t("dash.openAll.title")}
          body={t("dash.openAll.body", { n: openDirs.length })}
          confirm={t("dash.openAll.confirm", { n: openDirs.length })}
          cancel={t("dialog.cancel")}
          onCancel={() => setConfirmAll(false)}
          onConfirm={openAll}
        />
      )}
      {hiding && (
        <ConfirmDialog
          icon={<EyeOff size={22} />}
          confirmIcon={<EyeOff size={17} aria-hidden="true" />}
          title={t("dialog.remove.title")}
          body={t("dialog.remove.body", { name: hiding.name })}
          confirm={t("dialog.remove")}
          cancel={t("dialog.cancel")}
          onCancel={() => setHiding(null)}
          onConfirm={() => {
            invoke("remove_account", { id: hiding.id }).catch(() => {});
            setData((d) => (d ? { ...d, accounts: d.accounts.map((a) => (a.id === hiding.id ? { ...a, hidden: true } : a)) } : d));
            setHiding(null);
          }}
        />
      )}
      {editAcc && (
        <EditDialog
          name={editAcc.email ?? editAcc.id}
          alias={editAcc.alias ?? ""}
          note={editAcc.note ?? ""}
          onClose={() => setEditing(null)}
          onSave={(alias, note) => {
            invoke("update_account", { id: editAcc.id, alias, note }).then(() => refresh()).catch(() => {});
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
