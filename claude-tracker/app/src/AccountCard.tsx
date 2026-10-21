import { memo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Chrome, CircleCheck, CircleDashed, ExternalLink, Hourglass, Clock, Trash2, TriangleAlert, ShieldQuestion } from "lucide-react";
import type { ChromeProfile } from "./types";
import { AccountView, fmtAgo, fmtClock, fmtCountdown, fmtDay, limitLabel, progressPct } from "./lib";
import { useI18n } from "./i18n";
import { Avatar } from "./ui";

const BADGE = {
  ready: { key: "badge.ready", tone: "ok", Icon: CircleCheck },
  expected: { key: "badge.expected", tone: "warn", Icon: ShieldQuestion },
  waiting: { key: "badge.waiting", tone: "danger", Icon: Hourglass },
  nodata: { key: "badge.nodata", tone: "muted", Icon: CircleDashed },
} as const;

function Hero({ view, now }: { view: AccountView; now: number }) {
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

  if (view.state === "ready") {
    const used = f.util !== null && f.limit.key !== "free_window" ? t("card.used", { pct: Math.round(f.util) }) : null;
    return (
      <div className="hero">
        <div className="hero-kicker">{t("card.status")}</div>
        <div className="hero-word ok">{t("card.available")}</div>
        <div className="hero-sub">
          {used ? `${used} · ` : ""}
          {t("card.confirmedAt", { time: a.fetched_at ? fmtClock(a.fetched_at, lang) : "—" })}
        </div>
      </div>
    );
  }

  const r = f.resetMs as number;
  const expected = view.state === "expected";
  const pct = expected ? 100 : progressPct(f, now);
  return (
    <div className="hero">
      <div className="hero-kicker">{expected ? t("card.resetExpected") : t("card.resetAt")}</div>
      <div className="hero-row">
        <span className="hero-time">{fmtClock(r, lang)}</span>
        <span className="hero-day">{fmtDay(r, lang, t)}</span>
      </div>
      {pct !== null && (
        <div className="progress">
          <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
            <div className={`fill ${expected ? "warn" : "danger"}`} style={{ transform: `scaleX(${pct / 100})` }} />
          </div>
          <div className="progress-meta">
            <span>
              {t("card.progress")} <b>{Math.round(pct)}%</b>
            </span>
            <span>{expected ? t("card.unconfirmed") : t("card.left", { left: fmtCountdown(r - now, t) })}</span>
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
  index,
  onOpen,
  onRemove,
}: {
  view: AccountView;
  now: number;
  profiles: ChromeProfile[];
  index: number;
  onOpen: (dir: string) => void;
  onRemove: (id: string, name: string) => void;
}) {
  const { t, lang } = useI18n();
  const a = view.account;
  const badge = BADGE[view.state];
  const prof = profiles.find((p) => p.dir === a.profile_dir);
  const others = view.limits.filter((l) => l !== view.focus);
  const claudeEmail = a.email ?? a.id;
  const userName = prof?.user_name?.trim() || "";
  const title = userName || claudeEmail;
  const chromeMail = prof?.email || a.chrome_email || "";
  const setProfile = (dir: string) => invoke("update_account", { id: a.id, profileDir: dir });

  return (
    <article className={`card ${view.state}`} style={{ ["--i" as string]: Math.min(index, 12) }}>
      <header className="card-head">
        <Avatar name={title} />
        <div className="ident">
          <h3 className="name">{title}</h3>
          {userName && <div className="mail">{claudeEmail}</div>}
          {chromeMail && chromeMail.toLowerCase() !== claudeEmail.toLowerCase() && (
            <div className="mail dim">{t("card.chromeAccount", { email: chromeMail })}</div>
          )}
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
        <select className="select" value={a.profile_dir ?? ""} onChange={(e) => setProfile(e.target.value)} aria-label={t("card.assignTitle")}>
          <option value="">{t("card.assign")}</option>
          {profiles.map((p) => (
            <option key={p.dir} value={p.dir}>
              {p.name} ({p.dir})
            </option>
          ))}
        </select>
      )}

      <div className="body">
        <Hero view={view} now={now} />

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
          <button className="btn icon-btn" aria-label={t("card.remove")} title={t("card.remove")} onClick={() => onRemove(a.id, title)}>
            <Trash2 size={18} />
          </button>
          <button className="btn tonal" disabled={!a.profile_dir} onClick={() => a.profile_dir && onOpen(a.profile_dir)}>
            <ExternalLink size={16} aria-hidden="true" />
            {view.state === "expected" ? t("card.openConfirm") : t("card.open")}
          </button>
        </div>
      </footer>
    </article>
  );
});
