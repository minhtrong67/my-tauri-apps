import { labelOf, normalizeUrl } from "../sites.js";
import Fav from "./Fav.jsx";
import TabsEditor from "./TabsEditor.jsx";
import { Chevron } from "./Icons.jsx";

function Chips({ tabs, t }) {
  const items = tabs.filter((e) => e.url.trim());
  if (!items.length) return <span className="muted">{t("noTabs")}</span>;
  return (
    <span className="chips">
      {items.slice(0, 3).map((e) => (
        <span key={e.id} className="chip">
          <Fav url={normalizeUrl(e.url) || e.url} size={20} />
          <span className="t">{labelOf(e.url)}</span>
          {e.count > 1 && <em>×{e.count}</em>}
        </span>
      ))}
      {items.length > 3 && <span className="chip more">+{items.length - 3}</span>}
    </span>
  );
}

// Thẻ các tab mặc định: thu gọn hiện chip tóm tắt, mở rộng để chỉnh sửa
export default function TabsCard({ t, tabs, open, onToggle, ...editor }) {
  return (
    <section className={`card ${open ? "open" : ""}`}>
      <button type="button" className="card-head" aria-expanded={open} aria-controls="tabs-body" title={t("editTabs")} onClick={onToggle}>
        <span className="title">{t("tabsToOpen")}</span>
        <Chips tabs={tabs} t={t} />
        <span className="chev">
          <Chevron />
        </span>
      </button>
      <div className={`collapse ${open ? "open" : ""}`} id="tabs-body" inert={open ? undefined : ""}>
        <div>
          <div className="tabs-body">
            <TabsEditor tabs={tabs} t={t} {...editor} />
          </div>
        </div>
      </div>
    </section>
  );
}
