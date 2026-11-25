import { useEffect, useRef } from "react";
import { Opt } from "./Controls.jsx";
import SitePicker from "./SitePicker.jsx";

// Bộ trang riêng cho một profile (không chọn thì dùng bộ mặc định)
export default function SitesModal({ t, profile, defaults, custom, onCustom, onClose, ...picker }) {
  const ref = useRef(null);
  const isCustom = Array.isArray(custom);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("profileSitesTitle", { name: profile.name })}
        tabIndex={-1}
      >
        <div className="mh">
          <h2>{t("profileSitesTitle", { name: profile.name })}</h2>
          <p className="sub">{profile.email || profile.dir}</p>
        </div>

        <div className="mb">
          <div className="opts" role="radiogroup" aria-label={t("sitesTitle")}>
            <Opt checked={!isCustom} title={t("useDefault")} hint={t("useDefaultHint", { n: defaults.length })} onClick={() => onCustom(null)} />
            <Opt checked={isCustom} title={t("customSites")} hint={t("customHint")} onClick={() => !isCustom && onCustom([...defaults])} />
          </div>
          {isCustom && (
            <div className="mt">
              <SitePicker value={custom} onChange={onCustom} t={t} {...picker} />
            </div>
          )}
        </div>

        <div className="mf">
          <button type="button" className="btn accent" onClick={onClose}>
            {t("done")}
          </button>
        </div>
      </section>
    </div>
  );
}
