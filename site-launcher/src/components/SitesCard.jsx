import { MAX_SITES } from "../sites.js";
import SitePicker from "./SitePicker.jsx";
import { Globe } from "./Icons.jsx";

// Thẻ các trang web mặc định sẽ mở cho mọi profile
export default function SitesCard({ t, tabs, onChange, ...picker }) {
  return (
    <section className="card">
      <div className="card-h">
        <span className="cico">
          <Globe />
        </span>
        <div className="grow">
          <h2>{t("sitesTitle")}</h2>
          <p>{t("sitesHint", { max: MAX_SITES })}</p>
        </div>
        <span className="badge" aria-label={`${tabs.length}/${MAX_SITES}`}>
          {tabs.length}/{MAX_SITES}
        </span>
      </div>
      <SitePicker value={tabs} onChange={onChange} t={t} {...picker} />
    </section>
  );
}
