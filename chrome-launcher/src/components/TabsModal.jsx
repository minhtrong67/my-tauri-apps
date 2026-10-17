import { useEffect, useRef } from "react";
import { countTabs, uid } from "../sites.js";
import { Opt } from "./Controls.jsx";
import TabsEditor from "./TabsEditor.jsx";

// Bộ tab riêng cho một profile (không chọn thì dùng bộ mặc định)
export default function TabsModal({ t, profile, defaults, custom, onCustom, onClose, ...editor }) {
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
        aria-label={t("profileTabsTitle", { name: profile.name })}
        tabIndex={-1}
      >
        <div className="mh">
          <div>
            <h2>{t("profileTabsTitle", { name: profile.name })}</h2>
            <p className="sub">{profile.email || profile.dir}</p>
          </div>
        </div>

        <div className="mb">
          <div className="opts" role="radiogroup" aria-label={t("tabsToOpen")}>
            <Opt checked={!isCustom} title={t("useDefault")} hint={t("useDefaultHint", { n: countTabs(defaults) })} onClick={() => onCustom(null)} />
            <Opt
              checked={isCustom}
              title={t("customTabs")}
              hint={t("customHint")}
              onClick={() => !isCustom && onCustom(defaults.map((e) => ({ ...e, id: uid() })))}
            />
          </div>
          {isCustom && (
            <div className="mt">
              <TabsEditor tabs={custom} onChange={onCustom} t={t} {...editor} />
            </div>
          )}
        </div>

        <div className="mf">
          <button type="button" className="btn text" onClick={onClose}>
            {t("done")}
          </button>
        </div>
      </section>
    </div>
  );
}
