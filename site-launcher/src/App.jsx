import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { invoke, appWindow, applyEffect, logicalSize } from "./tauri.js";
import { loadSettings, saveSettings } from "./settings.js";
import { MAX_SITES, cleanUrls, normalizeUrl } from "./sites.js";
import { makeT, errText } from "./i18n.js";
import Row from "./components/Row.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import SitesCard from "./components/SitesCard.jsx";
import SitesModal from "./components/SitesModal.jsx";
import { Pivot } from "./components/Controls.jsx";
import { Info, Logo, Refresh, Search, Sliders } from "./components/Icons.jsx";

const darkQuery = () => matchMedia("(prefers-color-scheme: dark)");

export default function App() {
  const [s, setS] = useState(loadSettings);
  const first = useRef(s); // cài đặt lúc khởi động, dùng cho cửa sổ
  const patch = useCallback((p) => setS((v) => ({ ...v, ...p })), []);
  useEffect(() => saveSettings(s), [s]);
  const t = useMemo(() => makeT(s.lang), [s.lang]);

  const [browsers, setBrowsers] = useState(null); // null: đang dò các trình duyệt đã cài
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(() => new Set());
  const [running, setRunning] = useState(() => new Set());
  const [opening, setOpening] = useState(() => new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [modalDir, setModalDir] = useState(null); // profile đang chỉnh trang riêng
  const [toast, setToast] = useState(null);
  const [sysDark, setSysDark] = useState(() => darkQuery().matches);

  const searchRef = useRef(null);
  const toastTimer = useRef();
  const cfg = useRef(s); // luôn là cài đặt mới nhất, để callback không phải đổi
  cfg.current = s;

  // Trình duyệt đang chọn: nhớ lần trước, nếu không còn thì lấy cái đầu tiên
  const active = browsers?.find((b) => b.id === s.browser)?.id || browsers?.[0]?.id || "";
  const activeName = browsers?.find((b) => b.id === active)?.name || "";
  const activeRef = useRef(active);
  activeRef.current = active;
  const pk = (dir) => `${active}:${dir}`;

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
    document.documentElement.lang = s.lang;
  }, [s.lang]);
  useEffect(() => {
    appWindow()?.setTheme(s.theme === "system" ? null : s.theme).catch(() => {});
  }, [s.theme]);

  // ---- Cửa sổ: áp dụng hiệu ứng nền và kích thước, rồi mới hiện ----
  const shown = useRef(false);
  useEffect(() => {
    let dead = false;
    (async () => {
      const applied = await applyEffect(s.effect);
      if (dead) return;
      document.documentElement.dataset.fx = applied;
      if (shown.current) return;
      shown.current = true;
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
    return () => {
      dead = true;
    };
  }, [s.effect]);

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

  // ---- Trình duyệt và profile ----
  useEffect(() => {
    invoke("list_browsers")
      .then(setBrowsers)
      .catch(() => setBrowsers([]));
  }, []);

  const reqId = useRef(0);
  const load = useCallback(() => {
    if (!activeRef.current) return;
    const id = ++reqId.current;
    setLoading(true);
    setError("");
    invoke("list_profiles", { browser: activeRef.current })
      .then((list) => id === reqId.current && setProfiles(list))
      .catch((e) => {
        if (id !== reqId.current) return;
        setProfiles([]);
        setError(errText(t, e));
      })
      .finally(() => id === reqId.current && setLoading(false));
  }, [t]);

  // Đổi trình duyệt: làm mới mọi thứ rồi tải lại danh sách
  useEffect(() => {
    setProfiles([]);
    setPicked(new Set());
    setRunning(new Set());
    setOpening(new Set());
    setQuery("");
    setModalDir(null);
    setError("");
    if (active) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const refreshRunning = useCallback(async () => {
    const br = activeRef.current;
    if (!br) return;
    try {
      const dirs = await invoke("running_profiles", { browser: br });
      if (br !== activeRef.current) return;
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
  }, [refreshRunning, active]);

  useEffect(() => {
    setOpening((prev) => {
      if (!prev.size) return prev;
      const next = new Set([...prev].filter((d) => !running.has(d)));
      return next.size === prev.size ? prev : next;
    });
  }, [running]);

  // ---- Trang đã lưu và bộ trang sẽ mở ----
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
  const setTabs = useCallback((tabs) => patch({ tabs: cleanUrls(tabs) }), [patch]);
  const setProfileTabs = useCallback(
    (key, tabs) =>
      setS((v) => {
        const next = { ...v.profileTabs };
        if (tabs) next[key] = cleanUrls(tabs);
        else delete next[key];
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
      const browser = activeRef.current;
      const launches = dirs.map((dir) => ({ dir, urls: c.profileTabs[`${browser}:${dir}`] || c.tabs }));
      remember(launches.flatMap((l) => l.urls));
      setOpening((prev) => new Set([...prev, ...dirs]));
      const giveUp = () => setOpening((prev) => new Set([...prev].filter((d) => !dirs.includes(d))));
      try {
        const n = await invoke("launch_profiles", { browser, launches });
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
        const n = await invoke("close_profiles", { browser: activeRef.current, dirs });
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
  const shownList = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles.filter((p) => !q || `${p.name} ${p.email}`.toLowerCase().includes(q));
  }, [profiles, query]);

  const targets = picked.size ? [...picked] : shownList.map((p) => p.dir);
  const runTargets = targets.filter((d) => running.has(d));
  const modalProfile = profiles.find((p) => p.dir === modalDir);
  const allPicked = shownList.length > 0 && shownList.every((p) => picked.has(p.dir));
  const selectAll = () => setPicked(new Set(shownList.map((p) => p.dir)));
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
  const picker = { sites: s.sites, onRemember: remember, onForget: forget };

  const body =
    browsers === null ? (
      <div aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="sk" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
    ) : !browsers.length ? (
      <div className="empty">
        <p>{t("noBrowsers")}</p>
        <small>{t("noBrowsersHint")}</small>
      </div>
    ) : error ? (
      <div className="empty">
        <p>{t("loadError")}</p>
        <small>{error}</small>
        <button type="button" className="btn" onClick={load}>
          {t("retry")}
        </button>
      </div>
    ) : loading && !profiles.length ? (
      <div aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="sk" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
    ) : !shownList.length ? (
      <div className="empty">
        <p>{profiles.length ? t("noMatch") : t("noProfiles")}</p>
        {!profiles.length && <small>{t("noProfilesHint", { browser: activeName })}</small>}
      </div>
    ) : (
      <ul className="list">
        {shownList.map((p, i) => (
          <Row
            key={p.dir}
            browser={active}
            p={p}
            i={i}
            on={picked.has(p.dir)}
            running={running.has(p.dir)}
            opening={opening.has(p.dir)}
            siteCount={(s.profileTabs[pk(p.dir)] || s.tabs).length}
            custom={!!s.profileTabs[pk(p.dir)]}
            onSites={setModalDir}
            onToggle={toggle}
            onOpen={open}
            onClose={close}
            t={t}
          />
        ))}
      </ul>
    );

  return (
    <>
      <main>
        <header className="top">
          <div className="brand">
            <Logo />
            <div>
              <h1>Site Launcher</h1>
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

        <SitesCard t={t} tabs={s.tabs} onChange={setTabs} {...picker} />

        {browsers?.length > 0 && (
          <Pivot
            label={t("browser")}
            value={active}
            onChange={(browser) => patch({ browser })}
            items={browsers.map((b) => ({ v: b.id, l: b.name }))}
          />
        )}

        {active === "firefox" && (
          <div className="infobar" role="note">
            <Info />
            <span>{t("firefoxNote")}</span>
          </div>
        )}

        <div className="bar">
          <label className="search">
            <input
              ref={searchRef}
              placeholder={t("search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t("search")}
              disabled={!active}
            />
            <Search />
          </label>
          <button type="button" className="btn" onClick={toggleAll} disabled={!shownList.length}>
            {allPicked ? t("clearSel") : t("selectAll")}
          </button>
          <button type="button" className="ib" aria-label={t("reload")} title={t("reload")} onClick={load} disabled={!active}>
            <Refresh />
          </button>
        </div>

        {body}
      </main>

      {modalProfile && (
        <SitesModal
          t={t}
          profile={modalProfile}
          defaults={s.tabs}
          custom={s.profileTabs[pk(modalProfile.dir)]}
          onCustom={(tabs) => setProfileTabs(pk(modalProfile.dir), tabs)}
          onClose={() => setModalDir(null)}
          {...picker}
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
            {picked.size ? t("selectedCount", { n: picked.size, total: profiles.length }) : t("profiles", { n: shownList.length })}
          </span>
          <button type="button" className="btn danger" disabled={!runTargets.length} onClick={() => close(runTargets)}>
            {!runTargets.length ? t("close") : picked.size ? t("closeSelected", { n: runTargets.length }) : t("closeAll", { n: runTargets.length })}
          </button>
          <button type="button" className="btn accent" disabled={!targets.length} onClick={() => open(targets)}>
            {picked.size ? t("openSelected", { n: picked.size }) : t("openAll", { n: shownList.length })}
          </button>
        </div>
      </footer>
    </>
  );
}
