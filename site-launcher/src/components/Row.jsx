import { memo } from "react";
import Avatar from "./Avatar.jsx";
import { Cb } from "./Controls.jsx";
import { WindowIcon } from "./Icons.jsx";

export default memo(function Row({ browser, p, i, on, running, opening, siteCount, custom, onToggle, onOpen, onClose, onSites, t }) {
  const busy = opening && !running;
  return (
    <li style={{ "--i": Math.min(i, 10) }} className={on ? "sel" : ""}>
      <button
        type="button"
        className="rchk"
        role="checkbox"
        aria-checked={on}
        aria-label={t("selectProfile", { name: p.name })}
        onClick={() => onToggle(p.dir)}
      >
        <Cb />
      </button>
      <button type="button" className="row" onClick={() => onOpen([p.dir])}>
        <span className="avw">
          <Avatar browser={browser} p={p} />
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
        className={`sitesbtn ${custom ? "custom" : ""}`}
        aria-label={t("sitesOf", { name: p.name, n: siteCount })}
        title={t("sitesOf", { name: p.name, n: siteCount })}
        onClick={() => onSites(p.dir)}
      >
        <WindowIcon />
        <span>{siteCount}</span>
      </button>
      {running && (
        <button type="button" className="btn sm danger" onClick={() => onClose([p.dir])}>
          {t("close")}
        </button>
      )}
    </li>
  );
});
