import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  ArrowSync20Regular, Box48Regular, ChevronDown16Regular, Filter20Regular, CheckmarkCircle20Filled, Clock20Regular, Dismiss16Regular, EyeOff24Regular, Globe20Regular, Grid20Regular, Timer20Filled, Home20Filled, Home20Regular, Navigation20Regular, Open16Regular, Search20Regular, SearchInfo24Regular, Settings20Filled, Settings20Regular, Sparkle20Regular, TextBulletListLtr20Regular,
} from "@fluentui/react-icons";
import type { AppData, ChromeProfile, Histories, Settings, WindowMode } from "./types";
import { AccountState, accountTitle, analyze, fmtClock, fmtCountdown, fmtDay, sortViews, tickFor } from "./lib";
import { I18nProvider, Key, useI18n } from "./i18n";
import { usePrefs, ViewMode } from "./prefs";
import { AccountCard } from "./AccountCard";
import { SettingsView } from "./SettingsView";
import { EditDialog } from "./EditDialog";
import { TitleBar } from "./TitleBar";
import { ConfirmDialog, InfoBar, Logo, ProgressRing, Segmented, Skeleton, Tip, Toast, ToastData, ToastKind } from "./ui";

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
  const { prefs, setPrefs, lang, fx } = usePrefs();
  return (
    <I18nProvider lang={lang}>
      <Shell prefs={prefs} setPrefs={setPrefs} lang={lang} fx={fx} />
    </I18nProvider>
  );
}

function Boot({ error, onRetry }: { error: boolean; onRetry: () => void }) {
  const { t } = useI18n();
  if (error)
    return (
      <div className="boot">
        <InfoBar kind="error" title={t("err.load.title")} action={<button className="btn" onClick={onRetry}>{t("err.retry")}</button>}>
          {t("err.load.body")}
        </InfoBar>
      </div>
    );
  return (
    <div className="boot" role="status" aria-label={t("boot")}>
      <Logo size={72} />
      <ProgressRing size={28} stroke={3} label={t("boot")} />
      <div className="boot-cards">
        <Skeleton className="sk-card" />
        <Skeleton className="sk-card" />
        <Skeleton className="sk-card" />
      </div>
    </div>
  );
}

function Shell({ prefs, setPrefs, lang, fx }: { prefs: ReturnType<typeof usePrefs>["prefs"]; setPrefs: ReturnType<typeof usePrefs>["setPrefs"]; lang: "vi" | "en"; fx: ReturnType<typeof usePrefs>["fx"] }) {
  const { t } = useI18n();
  const [data, setData] = useState<AppData | null>(null);
  const [loadErr, setLoadErr] = useState(false);
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
    setLoadErr(false);
    return d;
  }, []);

  const boot = useCallback(() => {
    setLoadErr(false);
    refresh().catch(() => setLoadErr(true));
    invoke<ChromeProfile[]>("list_chrome_profiles").then(setProfiles).catch(() => {});
  }, [refresh]);

  useEffect(() => {
    boot();
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
  }, [boot, refresh]);

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

  // Báo khi Windows không hỗ trợ chất liệu đã chọn và app phải lùi về chất liệu khác / nền đặc
  const fxKey = `${fx.requested}>${fx.applied}`;
  const lastFx = useRef("");
  useEffect(() => {
    if (!prefs.transparency || fx.applied === fx.requested || lastFx.current === fxKey || !fx.error || fx.error.includes("only available on Windows")) return;
    lastFx.current = fxKey;
    const name = (id: string) => t(`fx.${id}` as Key);
    notify("warning", fx.applied === "none" ? t("fx.solid", { req: name(fx.requested) }) : t("fx.fallback", { req: name(fx.requested), used: name(fx.applied) }), 9000);
  }, [fxKey, fx.error, fx.applied, fx.requested, prefs.transparency, notify, t]);

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

  const filtersActive = filter !== "all" || !!q.trim();
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

  // Phím tắt: Ctrl+R làm mới · Ctrl+F tìm kiếm · Ctrl+, cài đặt · Ctrl+1 dashboard · Ctrl+B thanh điều hướng
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
        keys.current.setPrefs({ filtersOpen: true });
        setTimeout(() => searchRef.current?.focus(), 280);
      } else if (k === ",") {
        e.preventDefault();
        setTab("settings");
      } else if (k === "1") {
        e.preventDefault();
        setTab("dashboard");
      } else if (k === "b") {
        e.preventDefault();
        keys.current.setPrefs({ navOpen: !keys.current.prefs.navOpen });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const connected = !!data?.ext_seen && now - data.ext_seen < 60000;
  const toggleFilter = (f: Filter) => setFilter((cur) => (cur === f ? "all" : f));
  const editAcc = editing && data ? data.accounts.find((a) => a.id === editing) : null;

  const navItems: { id: Tab; label: string; Icon: typeof Home20Regular; IconOn: typeof Home20Filled; kbd: string }[] = [
    { id: "dashboard", label: t("nav.dashboard"), Icon: Home20Regular, IconOn: Home20Filled, kbd: "Ctrl+1" },
  ];
  const settingsItem = { id: "settings" as Tab, label: t("nav.settings"), Icon: Settings20Regular, IconOn: Settings20Filled, kbd: "Ctrl+," };
  const navBtn = (it: (typeof navItems)[number]) => {
    const on = tab === it.id;
    const I = on ? it.IconOn : it.Icon;
    return (
      <Tip key={it.id} label={it.label} kbd={it.kbd} side="right" disabled={prefs.navOpen}>
        <button role="tab" aria-selected={on} className={`nav-item ${on ? "on" : ""}`} onClick={() => setTab(it.id)}>
          <I />
          <span className="nav-label">{it.label}</span>
        </button>
      </Tip>
    );
  };

  return (
    <div className="app" data-nav={prefs.navOpen ? "open" : "compact"}>
      <TitleBar />

      <nav className="nav" aria-label="Main">
        <Tip label={t("nav.toggle")} kbd="Ctrl+B" side="right">
          <button className="nav-item nav-burger" aria-label={t("nav.toggle")} aria-expanded={prefs.navOpen} onClick={() => setPrefs({ navOpen: !prefs.navOpen })}>
            <Navigation20Regular />
          </button>
        </Tip>
        <div className="nav-items" role="tablist" aria-orientation="vertical">
          {navItems.map(navBtn)}
        </div>
        <div className="nav-foot" role="tablist">
          <Tip label={connected ? t("status.connected") : t("status.waiting")} side="right" disabled={prefs.navOpen}>
            <div className="nav-status" role="status" tabIndex={0} aria-label={connected ? t("status.connected") : t("status.waiting")}>
              <span className={`live ${connected ? "on" : ""}`} />
              <span className="nav-label">{connected ? t("status.connected") : t("status.waiting")}</span>
            </div>
          </Tip>
          {navBtn(settingsItem)}
        </div>
      </nav>

      <div className="host">
        {!data ? (
          <Boot error={loadErr} onRetry={boot} />
        ) : (
          <div className="scroll">
            <main className="page" key={tab}>
              <div className="page-head">
                <div className="titles">
                  <h1>{tab === "dashboard" ? t("dash.title") : t("nav.settings")}</h1>
                  <p className="status">
                    {tab === "dashboard" ? t("dash.sub", { n: all.length, ready: counts.ready, waiting: counts.waiting }) : `${connected ? t("status.connected") : t("status.waiting")} · 127.0.0.1:${data.port}`}
                  </p>
                </div>
              </div>

              {tab === "dashboard" ? (
                <>
                  {data.server_error && (
                    <InfoBar kind="warning" action={<button className="btn" onClick={() => setTab("settings")}>{t("nav.settings")}</button>}>
                      {t("server.error", { port: data.port })}
                    </InfoBar>
                  )}

                  {all.length > 0 && (
                    <section className="stats" aria-label={t("filters.status")}>
                      <button className={`tile ok ${filter === "ready" ? "on" : ""}`} aria-pressed={filter === "ready"} onClick={() => toggleFilter("ready")}>
                        <span className="tile-ic"><CheckmarkCircle20Filled aria-hidden="true" /></span>
                        <span className="tile-num">{counts.ready}</span>
                        <span className="tile-label">{t("dash.stat.ready")}</span>
                      </button>
                      <button className={`tile danger ${filter === "waiting" ? "on" : ""}`} aria-pressed={filter === "waiting"} onClick={() => toggleFilter("waiting")}>
                        <span className="tile-ic"><Timer20Filled aria-hidden="true" /></span>
                        <span className="tile-num">{counts.waiting}</span>
                        <span className="tile-label">{t("dash.stat.waiting")}</span>
                      </button>
                      <div className="tile info">
                        <span className="tile-ic"><Clock20Regular aria-hidden="true" /></span>
                        <span className="tile-num">{next?.availableAt ? fmtClock(next.availableAt, lang) : "—"}</span>
                        <span className="tile-label">{t("dash.stat.next")}</span>
                        <span className="tile-sub">
                          {next?.availableAt ? `${accountTitle(next.account, profileOf(next.account.profile_dir)?.user_name)} · ${fmtDay(next.availableAt, lang, t)} · ${t("next.left", { left: fmtCountdown(next.availableAt - now, t) })}` : t("dash.stat.none")}
                        </span>
                      </div>
                      <div className="tile best">
                        <span className="tile-ic"><Sparkle20Regular aria-hidden="true" /></span>
                        <span className="tile-label strong">{t("dash.best")}</span>
                        <span className="tile-sub">{best ? t("dash.best.hint", { name: accountTitle(best.account, profileOf(best.account.profile_dir)?.user_name) }) : t("dash.best.none")}</span>
                        <button className="btn accent sm" onClick={openBest} disabled={!best}>
                          <Open16Regular aria-hidden="true" />
                          {t("card.open")}
                        </button>
                      </div>
                    </section>
                  )}

                  <div className="cmdbar" role="toolbar" aria-label={t("filters.title")}>
                    <button className={`btn filter-toggle ${prefs.filtersOpen ? "open" : ""}`} aria-expanded={prefs.filtersOpen} aria-controls="filter-panel" onClick={() => setPrefs({ filtersOpen: !prefs.filtersOpen })}>
                      <Filter20Regular aria-hidden="true" />
                      {t("filters.title")}
                      {filtersActive && <span className="count">{(filter !== "all" ? 1 : 0) + (q.trim() ? 1 : 0)}</span>}
                      <ChevronDown16Regular className="chev" aria-hidden="true" />
                    </button>
                    {filtersActive && !prefs.filtersOpen && (
                      <div className="fsummary" aria-live="polite">
                        {filter !== "all" && (
                          <button className="fpill" onClick={() => setFilter("all")} aria-label={`${t("filters.clear")}: ${t(FILTERS.find((f) => f.key === filter)!.label)}`}>
                            {t(FILTERS.find((f) => f.key === filter)!.label)}
                            <Dismiss16Regular aria-hidden="true" />
                          </button>
                        )}
                        {q.trim() && (
                          <button className="fpill" onClick={() => setQ("")} aria-label={`${t("search.clear")}: ${q}`}>
                            “{q.trim()}”
                            <Dismiss16Regular aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    )}
                    <span className="cmd-spacer" />
                    <button className="btn" onClick={() => setConfirmAll(true)} disabled={openDirs.length === 0}>
                      <Globe20Regular aria-hidden="true" />
                      <span className="btn-label">{t("dash.openAll")}</span>
                    </button>
                    <Segmented<ViewMode>
                      iconOnly
                      label={t("view.label")}
                      value={prefs.view}
                      onChange={(v) => setPrefs({ view: v })}
                      options={[
                        { value: "grid", label: t("view.grid"), icon: <Grid20Regular /> },
                        { value: "list", label: t("view.list"), icon: <TextBulletListLtr20Regular /> },
                      ]}
                    />
                    <Tip label={t("short.refresh")} kbd="Ctrl+R">
                      <button className={`btn accent ${refreshing ? "busy" : ""}`} onClick={doRefresh} disabled={refreshing} aria-label={t("refresh")}>
                        <ArrowSync20Regular aria-hidden="true" />
                        <span className="btn-label">{refreshing ? t("refreshing") : t("refresh")}</span>
                      </button>
                    </Tip>
                  </div>

                  <div id="filter-panel" className={`fpanel ${prefs.filtersOpen ? "open" : ""}`}>
                    <div>
                      <div className="fbox">
                        <label className="search">
                          <Search20Regular aria-hidden="true" />
                          <input ref={searchRef} placeholder={t("search.placeholder")} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Escape" && setQ("")} aria-label={t("filters.search")} />
                          {q && (
                            <Tip label={t("search.clear")}>
                              <button className="clear" onClick={() => setQ("")} aria-label={t("search.clear")}>
                                <Dismiss16Regular />
                              </button>
                            </Tip>
                          )}
                        </label>
                        <div className="chips" role="group" aria-label={t("filters.status")}>
                          {FILTERS.map((f) => (
                            <button key={f.key} className={`fchip st-${f.key} ${filter === f.key ? "on" : ""}`} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                              {f.key !== "all" && <span className="sd" aria-hidden="true" />}
                              {t(f.label)} <span className="n">{counts[f.key]}</span>
                            </button>
                          ))}
                        </div>
                        {filtersActive && (
                          <button className="btn subtle sm" onClick={clearFilters}>
                            <Dismiss16Regular aria-hidden="true" />
                            {t("filters.clear")}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {all.length === 0 ? (
                    <div className="empty">
                      <Box48Regular className="empty-art" aria-hidden="true" />
                      <h2>{t("empty.title")}</h2>
                      <p>{t("empty.body")}</p>
                      <button className="btn accent" onClick={() => setTab("settings")}>
                        {t("empty.cta")}
                      </button>
                    </div>
                  ) : shown.length === 0 ? (
                    <div className="empty">
                      <SearchInfo24Regular className="empty-art" aria-hidden="true" />
                      <p>{t("empty.filter")}</p>
                      {filtersActive && (
                        <button className="btn" onClick={clearFilters}>
                          <Dismiss16Regular aria-hidden="true" />
                          {t("filters.clear")}
                        </button>
                      )}
                    </div>
                  ) : (
                    <section className={`cards ${prefs.view}`} key={prefs.view}>
                      {shown.map((v, i) => (
                        <AccountCard key={v.account.id} view={v} now={tickFor(v, now)} profiles={profiles} hist={hist[v.account.id]} warnAt={data.settings.warn_at ?? 80} index={i} onOpen={open} onHide={askHide} onEdit={setEditing} onPin={onPin} />
                      ))}
                    </section>
                  )}
                </>
              ) : (
                <SettingsView data={data} prefs={prefs} setPrefs={setPrefs} fx={fx} onSettings={onSettings} onWindowMode={onWindowMode} notify={notify} refresh={refresh} />
              )}
            </main>
          </div>
        )}
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />

      {confirmAll && (
        <ConfirmDialog tone="primary" confirmIcon={<Globe20Regular aria-hidden="true" />} title={t("dash.openAll.title")} body={t("dash.openAll.body", { n: openDirs.length })} confirm={t("dash.openAll.confirm", { n: openDirs.length })} cancel={t("dialog.cancel")} onCancel={() => setConfirmAll(false)} onConfirm={openAll} />
      )}
      {hiding && (
        <ConfirmDialog
          confirmIcon={<EyeOff24Regular style={{ width: 18, height: 18 }} aria-hidden="true" />}
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
