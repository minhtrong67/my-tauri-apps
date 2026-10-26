import { memo, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Chrome, CircleCheck, CircleDashed, Clock, EyeOff, ExternalLink, Hourglass, Pencil, Pin, PinOff, TrendingUp, TriangleAlert } from "lucide-react";
import type { ChromeProfile, Sample } from "./types";
import { AccountView, accountTitle, fmtAgo, fmtClock, fmtCountdown, fmtDay, forecastHit, limitLabel, progressPct, windowSamples } from "./lib";
import { useI18n } from "./i18n";
import { Avatar, Select, Sparkline, Tip, WavyProgress } from "./ui";

const BADGE = {
  ready: { key: "badge.ready", tone: "ok", Icon: CircleCheck },
  waiting: { key: "badge.waiting", tone: "danger", Icon: Hourglass },
  nodata: { key: "badge.nodata", tone: "muted", Icon: CircleDashed },
} as const;

function Hero({ view, now, hist, warnAt }: { view: AccountView; now: number; hist?: Sample[]; warnAt: number }) {
  const { t, lang } = useI18n();
  const f = view.focus;
  const a = view.account;

  if (view.state === "nodata" || !f) {
    return (
      <div className="hero">
        <div className="hero-kicker">{t("card.status")}</div>
        <div className="hero-word muted">{t("card.nodata")}</div>
        <div className="hero-sub">{t("card.nodata.hint")}</div>
      </div>
    );
  }

  const pts = windowSamples(hist, f.limit.key, f.resetMs, now);
  const from = f.resetMs !== null ? f.resetMs - (f.limit.key === "seven_day" ? 168 : 5) * 3600000 : now;

  if (view.state === "ready") {
    const showUsage = f.util !== null && f.limit.key !== "free_window";
    const eta = showUsage ? forecastHit(pts, f.util, f.resetMs, now) : null;
    return (
      <div className="hero">
        <div className="hero-kicker">{t("card.status")}</div>
        <div className="hero-word ok">{t("card.available")}</div>
        <div className="hero-sub">
          {showUsage ? `${t("card.used", { pct: Math.round(f.util as number) })} · ` : ""}
          {view.recoveredAt ? t("card.resetDone", { time: fmtClock(view.recoveredAt, lang) }) : t("card.confirmedAt", { time: a.fetched_at ? fmtClock(a.fetched_at, lang) : "—" })}
        </div>
        {showUsage && (
          <div className="progress">
            <WavyProgress value={f.util as number} tone={(f.util as number) >= warnAt ? "warn" : "ok"} label={t("card.usage")} />
          </div>
        )}
        {showUsage && f.resetMs !== null && <Sparkline pts={pts} from={from} to={f.resetMs} tone={(f.util as number) >= warnAt ? "warn" : "ok"} />}
        {eta && (
          <div className="forecast">
            <TrendingUp size={14} aria-hidden="true" />
            {t("card.forecast", { time: fmtClock(eta, lang) })}
          </div>
        )}
      </div>
    );
  }

  const r = f.resetMs as number;
  const pct = progressPct(f, now);
  return (
    <div className="hero">
      <div className="hero-kicker">{t("card.resetAt")}</div>
      <div className="hero-row">
        <span className="hero-time">{fmtClock(r, lang)}</span>
        <span className="hero-day">{fmtDay(r, lang, t)}</span>
      </div>
      {pct !== null && (
        <div className="progress">
          <WavyProgress value={pct} tone="danger" label={t("card.progress")} />
          <div className="progress-meta">
            <span>
              {t("card.progress")} <b>{Math.round(pct)}%</b>
            </span>
            <span>{t("card.left", { left: fmtCountdown(r - now, t) })}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export const AccountCard = memo(function AccountCard({
  view,
  now,
  profiles,
  hist,
  warnAt,
  index,
  onOpen,
  onHide,
  onEdit,
  onPin,
}: {
  view: AccountView;
  now: number;
  profiles: ChromeProfile[];
  hist?: Sample[];
  warnAt: number;
  index: number;
  onOpen: (dir: string) => void;
  onHide: (id: string, name: string) => void;
  onEdit: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
}) {
  const { t, lang } = useI18n();
  const a = view.account;
  const badge = BADGE[view.state];
  const prof = profiles.find((p) => p.dir === a.profile_dir);
  const others = view.limits.filter((l) => l !== view.focus);
  const claudeEmail = a.email ?? a.id;
  const userName = prof?.user_name?.trim() || "";
  const title = accountTitle(a, userName);
  const subtitle = title.toLowerCase() !== claudeEmail.toLowerCase() ? claudeEmail : "";
  const chromeMail = prof?.email || a.chrome_email || "";
  const setProfile = (dir: string) => invoke("update_account", { id: a.id, profileDir: dir });

  // Khoảnh khắc "vừa hồi lượt": hiệu ứng nhấn ngắn khi trạng thái chuyển từ chờ sang sẵn sàng
  const prev = useRef(view.state);
  const [pop, setPop] = useState(false);
  useEffect(() => {
    if (prev.current === "waiting" && view.state === "ready") {
      setPop(true);
      const id = window.setTimeout(() => setPop(false), 1800);
      return () => window.clearTimeout(id);
    }
    prev.current = view.state;
  }, [view.state]);
  useEffect(() => {
    prev.current = view.state;
  });

  return (
    <article className={`card ${view.state} ${pop ? "pop" : ""} ${a.pinned ? "pinned" : ""}`} style={{ ["--i" as string]: Math.min(index, 12) }}>
      <header className="card-head">
        <Avatar name={title} src={prof?.avatar} />
        <div className="ident">
          <h3 className="name">
            {title}
            {a.pinned && <Pin size={14} className="pin-mark" aria-label={t("card.unpin")} />}
          </h3>
          {subtitle && <div className="mail">{subtitle}</div>}
          {chromeMail && chromeMail.toLowerCase() !== claudeEmail.toLowerCase() && <div className="mail dim">{t("card.chromeAccount", { email: chromeMail })}</div>}
          {a.note && <div className="note">{a.note}</div>}
        </div>
        <span className={`badge ${badge.tone}`}>
          <badge.Icon size={14} aria-hidden="true" />
          {t(badge.key)}
        </span>
      </header>

      {a.profile_dir && a.profile_auto !== false ? (
        <div className="profile-tag">
          <Chrome size={15} aria-hidden="true" />
          <span className="chip">{a.profile_dir}</span>
          <span className="pname">{prof?.name ?? "Chrome Profile"}</span>
        </div>
      ) : (
        <Select
          className="in-card"
          icon={<Chrome size={16} aria-hidden="true" />}
          label={t("card.assignTitle")}
          placeholder={t("card.assign")}
          value={a.profile_dir ?? ""}
          onChange={(v) => setProfile(v)}
          options={profiles.map((p) => ({ value: p.dir, label: p.name, hint: p.dir }))}
        />
      )}

      <div className="body">
        <Hero view={view} now={now} hist={hist} warnAt={warnAt} />

        {others.length > 0 && (
          <ul className="extras">
            {others.map((o) => (
              <li key={o.limit.key}>
                <span className="x-label">{limitLabel(o.limit, t)}</span>
                <b>{o.util === null ? "—" : `${Math.round(o.util)}%`}</b>
                <span className="muted x-reset">{o.resetMs ? `${fmtDay(o.resetMs, lang, t)} ${fmtClock(o.resetMs, lang)}` : ""}</span>
              </li>
            ))}
          </ul>
        )}

        {a.last_error && (
          <div className="inline-alert">
            <TriangleAlert size={16} aria-hidden="true" />
            <span>{t("card.error", { e: a.last_error })}</span>
          </div>
        )}
      </div>

      <footer className="card-foot">
        <span className={`updated ${view.stale ? "stale" : ""}`}>
          <Clock size={14} aria-hidden="true" />
          {t("card.updated", { ago: fmtAgo(a.fetched_at, now, t) })}
        </span>
        <div className="actions">
          <Tip label={a.pinned ? t("card.unpin") : t("card.pin")}>
            <button className={`btn icon-btn ${a.pinned ? "on" : ""}`} aria-label={a.pinned ? t("card.unpin") : t("card.pin")} aria-pressed={!!a.pinned} onClick={() => onPin(a.id, !a.pinned)}>
              {a.pinned ? <PinOff size={18} /> : <Pin size={18} />}
            </button>
          </Tip>
          <Tip label={t("card.edit")}>
            <button className="btn icon-btn" aria-label={t("card.edit")} onClick={() => onEdit(a.id)}>
              <Pencil size={18} />
            </button>
          </Tip>
          <Tip label={t("card.remove")}>
            <button className="btn icon-btn" aria-label={t("card.remove")} onClick={() => onHide(a.id, title)}>
              <EyeOff size={18} />
            </button>
          </Tip>
          <button className="btn tonal" disabled={!a.profile_dir} onClick={() => a.profile_dir && onOpen(a.profile_dir)}>
            <ExternalLink size={16} aria-hidden="true" />
            {t("card.open")}
          </button>
        </div>
      </footer>
    </article>
  );
});

