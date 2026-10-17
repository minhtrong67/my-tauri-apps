import { memo } from "react";
import Avatar from "./Avatar.jsx";
import { TabsIcon } from "./Icons.jsx";

export default memo(function Row({ p, i, on, running, opening, canOpen, tabCount, custom, onToggle, onOpen, onClose, onTabs, t }) {
  const busy = opening && !running;
  return (
    <li style={{ "--i": Math.min(i, 10) }} className={on ? "sel" : ""}>
      <button
        type="button"
        className="chk"
        role="checkbox"
        aria-checked={on}
        aria-label={t("selectProfile", { name: p.name })}
        onClick={() => onToggle(p.dir)}
      />
      <button type="button" className="row" disabled={!canOpen} onClick={() => onOpen([p.dir])}>
        <span className="avw">
          <Avatar p={p} />
          {(running || busy) && <i className={`dot ${running ? "live" : "wait"}`} />}
        </span>
        <span className="meta">
          <b>{p.name}</b>
          <small>{p.email || p.dir}</small>
        </span>
        {(running || busy) && (
          <span className={`pill ${running ? "live" : "wait"}`}>{t(running ? "running" : "opening")}</span>
        )}
        <span className="go">{t("open")}</span>
      </button>
      <button
        type="button"
        className={`tabsbtn ${custom ? "custom" : ""}`}
        aria-label={t("tabsOf", { name: p.name, n: tabCount })}
        title={t("tabsOf", { name: p.name, n: tabCount })}
        onClick={() => onTabs(p.dir)}
      >
        <TabsIcon />
        <span>{tabCount}</span>
      </button>
      {running && (
        <button type="button" className="btn outlined err sm" onClick={() => onClose([p.dir])}>
          {t("close")}
        </button>
      )}
    </li>
  );
});
