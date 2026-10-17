import { useEffect, useRef } from "react";
import { Opt, Seg } from "./Controls.jsx";

export default function SettingsPanel({ t, s, patch, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.focus();
    // Bấm ra ngoài thì đóng (nút bánh răng tự xử lý việc bật/tắt)
    const away = (e) => {
      if (!ref.current?.contains(e.target) && !e.target.closest?.(".gear")) onClose();
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [onClose]);

  return (
    <section ref={ref} className="panel" role="dialog" aria-label={t("settings")} tabIndex={-1}>
      <h2>{t("settings")}</h2>

      <div className="grp">
        <span className="lbl">{t("language")}</span>
        <Seg
          label={t("language")}
          value={s.lang}
          onChange={(lang) => patch({ lang })}
          options={[
            { v: "vi", l: "Tiếng Việt" },
            { v: "en", l: "English" },
          ]}
        />
      </div>

      <div className="grp">
        <span className="lbl">{t("theme")}</span>
        <Seg
          label={t("theme")}
          value={s.theme}
          onChange={(theme) => patch({ theme })}
          options={[
            { v: "light", l: t("light") },
            { v: "dark", l: t("dark") },
            { v: "system", l: t("system") },
          ]}
        />
      </div>

      <div className="grp">
        <span className="lbl">{t("contrast")}</span>
        <Seg
          label={t("contrast")}
          value={s.contrast}
          onChange={(contrast) => patch({ contrast })}
          options={[
            { v: "standard", l: t("contrastStandard") },
            { v: "medium", l: t("contrastMedium") },
            { v: "high", l: t("contrastHigh") },
          ]}
        />
      </div>

      <div className="grp">
        <span className="lbl">{t("windowStart")}</span>
        <div className="opts" role="radiogroup" aria-label={t("windowStart")}>
          <Opt checked={s.windowMode === "remember"} title={t("remember")} hint={t("rememberHint")} onClick={() => patch({ windowMode: "remember" })} />
          <Opt checked={s.windowMode === "maximized"} title={t("maximized")} hint={t("maximizedHint")} onClick={() => patch({ windowMode: "maximized" })} />
        </div>
        <p className="note">{t("appliesNext")}</p>
      </div>

      <div className="grp line">
        <div>
          <span className="lbl">{t("savedSites")}</span>
          <b>{t("sitesCount", { n: s.sites.length })}</b>
        </div>
        <button type="button" className="btn text err" disabled={!s.sites.length} onClick={() => patch({ sites: [] })}>
          {t("clearSites")}
        </button>
      </div>
    </section>
  );
}
