import { invoke } from "@tauri-apps/api/core";
import type { ChromeProfile } from "./types";
import { AccountView, fmtAgo, fmtClock, fmtCountdown, fmtDay, progressPct } from "./lib";

const BADGE = {
  ready: { text: "Sẵn sàng", tone: "ok" },
  expected: { text: "Chờ xác nhận", tone: "warn" },
  waiting: { text: "Đang chờ reset", tone: "danger" },
  nodata: { text: "Chưa có dữ liệu", tone: "muted" },
} as const;

function Hero({ view, now }: { view: AccountView; now: number }) {
  const f = view.focus;
  const a = view.account;

  if (view.state === "nodata" || !f) {
    return (
      <div className="hero">
        <div className="hero-kicker">Trạng thái</div>
        <div className="hero-word muted">Chưa có dữ liệu</div>
        <div className="hero-sub">Mở claude.ai trong profile này để extension đọc trạng thái giới hạn.</div>
      </div>
    );
  }

  if (view.state === "ready") {
    const used = f.util !== null && f.limit.key !== "free_window" ? `Đã dùng ${Math.round(f.util)}%` : null;
    return (
      <div className="hero">
        <div className="hero-kicker">Trạng thái</div>
        <div className="hero-word ok">Dùng được</div>
        <div className="hero-sub">
          {used ? `${used} · ` : ""}Xác nhận lúc {a.fetched_at ? fmtClock(a.fetched_at) : "—"}
        </div>
      </div>
    );
  }

  const r = f.resetMs as number;
  const expected = view.state === "expected";
  const pct = expected ? 100 : progressPct(f, now);
  return (
    <div className="hero">
      <div className="hero-kicker">{expected ? "Dự kiến đã reset lúc" : "Reset xong lúc"}</div>
      <div className="hero-row">
        <span className="hero-time">{fmtClock(r)}</span>
        <span className="hero-day">{fmtDay(r)}</span>
      </div>
      {pct !== null && (
        <div className="progress">
          <div className="bar">
            <div className={`fill ${expected ? "warn" : "danger"}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="progress-meta">
            <span>
              Tiến độ reset <b>{Math.round(pct)}%</b>
            </span>
            <span>{expected ? "Chưa xác nhận" : `Còn ${fmtCountdown(r - now)}`}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function AccountCard({
  view,
  now,
  profiles,
  onOpen,
}: {
  view: AccountView;
  now: number;
  profiles: ChromeProfile[];
  onOpen: (dir: string) => void;
}) {
  const a = view.account;
  const badge = BADGE[view.state];
  const prof = profiles.find((p) => p.dir === a.profile_dir);
  const others = view.limits.filter((l) => l !== view.focus);
  const setProfile = (dir: string) => invoke("update_account", { id: a.id, profileDir: dir });

  return (
    <article className={`card ${view.state}`}>
      <header className="card-head">
        <div className="ident">
          <div className="email" title={a.email ?? a.id}>
            {a.email ?? a.id}
          </div>
          {a.profile_dir && a.profile_auto !== false ? (
            <div className="profile-tag">
              <span className="chip">{a.profile_dir}</span>
              <span className="pname">{prof?.name ?? "Chrome Profile"}</span>
            </div>
          ) : (
            <select value={a.profile_dir ?? ""} onChange={(e) => setProfile(e.target.value)} title="Gán Chrome Profile">
              <option value="">Chọn Chrome Profile…</option>
              {profiles.map((p) => (
                <option key={p.dir} value={p.dir}>
                  {p.name} ({p.dir})
                </option>
              ))}
            </select>
          )}
        </div>
        <span className={`badge ${badge.tone}`}>{badge.text}</span>
      </header>

      <Hero view={view} now={now} />

      {others.length > 0 && (
        <ul className="extras">
          {others.map((o) => (
            <li key={o.limit.key}>
              <span>{o.limit.label}</span>
              <b>{o.util === null ? "—" : `${Math.round(o.util)}%`}</b>
              <span className="muted">{o.resetMs ? `${fmtDay(o.resetMs)} ${fmtClock(o.resetMs)}` : ""}</span>
            </li>
          ))}
        </ul>
      )}

      {a.last_error && <div className="alert small">Lỗi thu thập: {a.last_error}</div>}

      <footer className="card-foot">
        <span className={`small ${view.stale ? "stale" : "muted"}`}>
          Cập nhật {fmtAgo(a.fetched_at, now)}
        </span>
        <div className="actions">
          <button
            className="ghost icon"
            title="Xoá khỏi dashboard"
            onClick={() => confirm(`Xoá "${a.email ?? a.id}" khỏi dashboard?`) && invoke("remove_account", { id: a.id })}
          >
            ✕
          </button>
          <button className="primary" disabled={!a.profile_dir} onClick={() => a.profile_dir && onOpen(a.profile_dir)}>
            {view.state === "expected" ? "Mở & xác nhận" : "Mở Chrome"}
          </button>
        </div>
      </footer>
    </article>
  );
}
