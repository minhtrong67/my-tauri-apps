import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { invoke, appWindow, logicalSize } from "./tauri.js";
import { loadSettings, saveSettings } from "./settings.js";
import { MAX_TABS, countTabs, expand, hasBad, normalizeUrl } from "./sites.js";
import { makeT, errText } from "./i18n.js";
import Row from "./components/Row.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import TabsCard from "./components/TabsCard.jsx";
import TabsModal from "./components/TabsModal.jsx";
import { Logo, Refresh, Search, Sliders } from "./components/Icons.jsx";

const darkQuery = () => matchMedia("(prefers-color-scheme: dark)");

export default function App() {
  const [s, setS] = useState(loadSettings);
  const first = useRef(s); // cài đặt lúc khởi động, dùng cho cửa sổ
  const patch = useCallback((p) => setS((v) => ({ ...v, ...p })), []);
  useEffect(() => saveSettings(s), [s]);
  const t = useMemo(() => makeT(s.lang), [s.lang]);

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(() => new Set());
  const [running, setRunning] = useState(() => new Set());
  const [opening, setOpening] = useState(() => new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [modalDir, setModalDir] = useState(null); // profile đang chỉnh tab riêng
  const [toast, setToast] = useState(null);
  const [sysDark, setSysDark] = useState(() => darkQuery().matches);

  const searchRef = useRef(null);
  const toastTimer = useRef();
  const cfg = useRef(s); // luôn là cài đặt mới nhất, để callback không phải đổi
  cfg.current = s;

  // ---- Giao diện sáng / tối / hệ thống ----
  useEffect(() => {
    const mq = darkQuery();
    const on = (e) => setSysDark(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const resolved = s.theme === "system" ? (sysDark ? "dark" : "light") : s.theme;
  const themed = useRef(false);
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (themed.current) {
      root.classList.add("theme-anim");
      setTimeout(() => root.classList.remove("theme-anim"), 350);
    }
    themed.current = true;
    root.dataset.theme = resolved;
  }, [resolved]);
  useLayoutEffect(() => {
    const r = document.documentElement;
    if (s.contrast === "standard") delete r.dataset.contrast;
    else r.dataset.contrast = s.contrast;
  }, [s.contrast]);
  useLayoutEffect(() => {
    document.documentElement.lang = s.lang;
  }, [s.lang]);
  useEffect(() => {
    appWindow()?.setTheme(s.theme === "system" ? null : s.theme).catch(() => {});
  }, [s.theme]);

  // ---- Cửa sổ: áp dụng kích thước rồi mới hiện ----
  useEffect(() => {
    (async () => {
      const w = appWindow();
      if (!w) return;
      const init = first.current;
      try {
        if (init.windowMode === "maximized") {
          await w.maximize();
        } else if (init.size) {
          const sw = Math.min(init.size.w, screen.availWidth);
          const sh = Math.min(init.size.h, screen.availHeight);
          await w.setSize(logicalSize(sw, sh));
          await w.center();
        }
      } catch {}
      try {
        await w.show();
      } catch {}
    })();
  }, []);

  // Ghi nhớ kích thước khi người dùng kéo cửa sổ
  useEffect(() => {
    const w = appWindow();
    if (!w || s.windowMode !== "remember") return;
    let timer;
    let off;
    let dead = false;
    w.onResized(() => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          if ((await w.isMaximized()) || (await w.isMinimized())) return;
          const [size, f] = await Promise.all([w.innerSize(), w.scaleFactor()]);
          const width = Math.round(size.width / f);
          const height = Math.round(size.height / f);
          if (width >= 400 && height >= 400) patch({ size: { w: width, h: height } });
        } catch {}
      }, 400);
    })
      .then((u) => (dead ? u() : (off = u)))
      .catch(() => {});
    return () => {
      dead = true;
      clearTimeout(timer);
      off?.();
    };
  }, [s.windowMode, patch]);

  // ---- Dữ liệu profile ----
  const load = useCallback(() => {
    setLoading(true);
    setError("");
    invoke("list_profiles")
      .then(setProfiles)
      .catch((e) => setError(errText(t, e)))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshRunning = useCallback(async () => {
    try {
      const dirs = await invoke("running_profiles");
      setRunning((prev) => (prev.size === dirs.length && dirs.every((d) => prev.has(d)) ? prev : new Set(dirs)));
    } catch {}
  }, []);

  // Dò profile đang mở, chỉ khi cửa sổ đang hiển thị
  useEffect(() => {
    const tick = () => {
      if (!document.hidden) refreshRunning();
    };
    tick();
    const id = setInterval(tick, 2500);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refreshRunning]);

  useEffect(() => {
    setOpening((prev) => {
      if (!prev.size) return prev;
      const next = new Set([...prev].filter((d) => !running.has(d)));
      return next.size === prev.size ? prev : next;
    });
  }, [running]);

  // ---- Trang đã lưu và bộ tab ----
  // Ghi nhớ địa chỉ (mới nhất lên đầu, tối đa 50)
  const remember = useCallback(
    (urls) =>
      setS((v) => {
        const list = [...new Set([].concat(urls).map(normalizeUrl).filter(Boolean))];
        if (!list.length) return v;
        const now = Date.now();
        const rest = v.sites.filter((x) => !list.includes(x.url));
        return { ...v, sites: [...list.map((url) => ({ url, last: now })), ...rest].slice(0, 50) };
      }),
    []
  );
  const forget = useCallback((url) => setS((v) => ({ ...v, sites: v.sites.filter((x) => x.url !== url) })), []);
  const setTabs = useCallback((tabs) => patch({ tabs }), [patch]);
  const setProfileTabs = useCallback(
    (dir, tabs) =>
      setS((v) => {
        const next = { ...v.profileTabs };
        if (tabs) next[dir] = tabs;
        else delete next[dir];
        return { ...v, profileTabs: next };
      }),
    []
  );

  // ---- Hành động ----
  const notify = useCallback((text, kind = "ok") => {
    clearTimeout(toastTimer.current);
    setToast({ text, kind, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const open = useCallback(
    async (dirs) => {
      if (!dirs.length) return;
      const c = cfg.current;
      const launches = [];
      for (const dir of dirs) {
        const entries = c.profileTabs[dir] || c.tabs;
        if (hasBad(entries)) return notify(t("invalidTabs"), "err");
        const urls = expand(entries);
        if (urls.length > MAX_TABS) return notify(t("err_too_many"), "err");
        launches.push({ dir, urls });
      }
      remember(launches.flatMap((l) => l.urls));
      setOpening((prev) => new Set([...prev, ...dirs]));
      const giveUp = () => setOpening((prev) => new Set([...prev].filter((d) => !dirs.includes(d))));
      try {
        const n = await invoke("launch_profiles", { launches });
        notify(t("openedN", { n }));
        [900, 2200, 4000].forEach((ms) => setTimeout(refreshRunning, ms));
        setTimeout(giveUp, 9000 + dirs.length * 1500);
      } catch (e) {
        giveUp();
        notify(errText(t, e), "err");
      }
    },
    [t, notify, refreshRunning, remember]
  );

  const close = useCallback(
    async (dirs) => {
      if (!dirs.length) return;
      try {
        const n = await invoke("close_profiles", { dirs });
        notify(n ? t("closedN", { n }) : t("nothingToClose"), n ? "ok" : "err");
      } catch (e) {
        notify(errText(t, e), "err");
      }
      [700, 1800].forEach((ms) => setTimeout(refreshRunning, ms));
    },
    [t, notify, refreshRunning]
  );

  const toggle = useCallback(
    (dir) =>
      setPicked((prev) => {
        const next = new Set(prev);
        next.has(dir) ? next.delete(dir) : next.add(dir);
        return next;
      }),
    []
  );

  // ---- Dữ liệu dẫn xuất ----
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles.filter((p) => !q || `${p.name} ${p.email}`.toLowerCase().includes(q));
  }, [profiles, query]);

  const defBad = hasBad(s.tabs);
  const badDirs = useMemo(
    () => new Set(Object.entries(s.profileTabs).filter(([, e]) => hasBad(e)).map(([d]) => d)),
    [s.profileTabs]
  );
  const isBad = (d) => (s.profileTabs[d] ? badDirs.has(d) : defBad);
  const targets = picked.size ? [...picked] : shown.map((p) => p.dir);
  const runTargets = targets.filter((d) => running.has(d));
  const anyBad = targets.some(isBad);
  const modalProfile = profiles.find((p) => p.dir === modalDir);
  const allPicked = shown.length > 0 && shown.every((p) => picked.has(p.dir));
  const selectAll = () => setPicked(new Set(shown.map((p) => p.dir)));
  const toggleAll = () => (allPicked ? setPicked(new Set()) : selectAll());

  // ---- Phím tắt ----
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName);
      if (mod && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (mod && e.key.toLowerCase() === "a" && !typing) {
        e.preventDefault();
        selectAll();
      } else if (e.key === "Escape") {
        if (modalDir) setModalDir(null);
        else if (showSettings) setShowSettings(false);
        else if (query) setQuery("");
        else if (picked.size) setPicked(new Set());
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  const closeSettings = useCallback(() => setShowSettings(false), []);

  return (
    <>
      <main>
        <header className="top">
          <div className="brand">
            <Logo />
            <div>
              <h1>Chrome Launcher</h1>
              <p className="sub">{t("tagline")}</p>
              <p className="credit">
                {t("by")} <span className="tag author">minhtrong67</span> {t("withAi")} <span className="tag ai">Claude</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="ib gear"
            aria-label={t("settings")}
            title={t("settings")}
            aria-expanded={showSettings}
            onClick={() => setShowSettings((v) => !v)}
          >
            <Sliders />
          </button>
          {showSettings && <SettingsPanel t={t} s={s} patch={patch} onClose={closeSettings} />}
        </header>

        <TabsCard
          t={t}
          tabs={s.tabs}
          open={s.tabsOpen}
          onToggle={() => patch({ tabsOpen: !s.tabsOpen })}
          onChange={setTabs}
          sites={s.sites}
          onCommit={remember}
          onForget={forget}
        />
        {defBad && <p className="hint">{t("invalidTabs")}</p>}

        <div className="bar">
          <label className="search">
            <Search />
            <input
              ref={searchRef}
              placeholder={t("search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t("search")}
            />
          </label>
          <button type="button" className="btn tonal" onClick={toggleAll} disabled={!shown.length}>
            {allPicked ? t("clearSel") : t("selectAll")}
          </button>
          <button type="button" className="ib" aria-label={t("reload")} title={t("reload")} onClick={load}>
            <Refresh />
          </button>
        </div>

        {error ? (
          <div className="empty">
            <p>{t("loadError")}</p>
            <small>{error}</small>
            <button type="button" className="btn tonal" onClick={load}>
              {t("retry")}
            </button>
          </div>
        ) : loading && !profiles.length ? (
          <div aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="sk" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        ) : !shown.length ? (
          <div className="empty">
            <p>{profiles.length ? t("noMatch") : t("noProfiles")}</p>
            {!profiles.length && <small>{t("noProfilesHint")}</small>}
          </div>
        ) : (
          <ul className="list">
            {shown.map((p, i) => (
              <Row
                key={p.dir}
                p={p}
                i={i}
                on={picked.has(p.dir)}
                running={running.has(p.dir)}
                opening={opening.has(p.dir)}
                canOpen={!isBad(p.dir)}
                tabCount={countTabs(s.profileTabs[p.dir] || s.tabs)}
                custom={!!s.profileTabs[p.dir]}
                onTabs={setModalDir}
                onToggle={toggle}
                onOpen={open}
                onClose={close}
                t={t}
              />
            ))}
          </ul>
        )}
      </main>

      {modalProfile && (
        <TabsModal
          t={t}
          profile={modalProfile}
          defaults={s.tabs}
          custom={s.profileTabs[modalProfile.dir]}
          onCustom={(tabs) => setProfileTabs(modalProfile.dir, tabs)}
          onClose={() => setModalDir(null)}
          sites={s.sites}
          onCommit={remember}
          onForget={forget}
        />
      )}

      {toast && (
        <div key={toast.id} className={`toast ${toast.kind === "err" ? "err" : ""}`} role="status">
          {toast.text}
        </div>
      )}

      <footer>
        <div>
          <span className="count">
            {picked.size ? t("selectedCount", { n: picked.size, total: profiles.length }) : t("profiles", { n: shown.length })}
          </span>
          <button type="button" className="btn outlined err" disabled={!runTargets.length} onClick={() => close(runTargets)}>
            {!runTargets.length ? t("close") : picked.size ? t("closeSelected", { n: runTargets.length }) : t("closeAll", { n: runTargets.length })}
          </button>
          <button type="button" className="btn filled" disabled={anyBad || !targets.length} onClick={() => open(targets)}>
            {picked.size ? t("openSelected", { n: picked.size }) : t("openAll", { n: shown.length })}
          </button>
        </div>
      </footer>
    </>
  );
}
