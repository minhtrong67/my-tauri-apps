import { memo } from "react";
import {
  Check, Copy, FolderOpen, MoreVertical, Pause, Play, RotateCcw, Trash2, XCircle, PlayCircle, Clock, AlertTriangle,
} from "lucide-react";
import type { Download } from "../lib/types";
import { api } from "../lib/api";
import { formatBytes, formatClock, formatSpeed, timeAgo } from "../lib/format";
import { useT } from "../lib/hooks";
import { useUi } from "../store/ui";
import { cx, IconButton, Menu, MenuItem } from "./ui";
import { Progress } from "./Progress";
import { Thumb } from "./Thumb";

function DownloadCardBase({ d, index }: { d: Download; index: number }) {
  const { t, lang } = useT();
  const toast = useUi((s) => s.toast);
  const done = d.status === "completed";
  const running = d.status === "downloading";
  const merging = d.status === "merging";

  const statusLabel = {
    queued: t("statusQueued"),
    paused: t("statusPaused"),
    downloading: t("statusDownloading"),
    merging: t("statusMerging"),
    completed: t("statusCompleted"),
    failed: t("statusFailed"),
  }[d.status];

  const open = async () => {
    try {
      await api.openDownload(d.id);
    } catch (e) {
      toast(String(e) === "FILE_MISSING" ? t("fileMissing") : String(e), { tone: "error" });
    }
  };

  return (
    <article
      className={cx(
        "anim-item group relative flex flex-col gap-3 p-3.5 hover:shadow-lg hover:shadow-primary/10 sm:flex-row sm:items-center sm:gap-4",
        running || merging ? "bg-primary-container/45" : done ? "bg-surface-low" : d.status === "failed" ? "bg-error-container/40" : "bg-surface-low",
        done && "anim-complete",
      )}
      style={{ ["--i" as string]: Math.min(index, 10) }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Thumb src={d.thumbnail} seed={d.site + d.title} kind={d.kind} audio={d.audioOnly} className="h-[72px] w-28 sm:w-32" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold tracking-tight text-on-surface" title={d.title} data-selectable>
              {d.title}
            </h3>
          </div>
          <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-on-surface-variant">
            <span className="truncate">{d.site || "—"}</span>
            {d.quality && <span className="rounded-md bg-surface-highest px-1.5 py-px font-medium">{d.quality === "best" ? t("qualityBest") : d.quality === "original" ? t("qualityOriginal") : d.quality}</span>}
            {d.total > 0 && <span>{formatBytes(d.total)}</span>}
            {d.status === "completed" && d.completedAt && <span>{timeAgo(d.completedAt, lang)}</span>}
          </p>

          {!done && (
            <div className="mt-2">
              <Progress value={d.progress} status={d.status} />
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs tabular-nums text-on-surface-variant">
                <span
                  className={cx(
                    "inline-flex items-center gap-1 font-medium",
                    d.status === "failed" ? "text-error" : running || merging ? "text-primary" : "",
                  )}
                >
                  {d.status === "failed" ? <AlertTriangle size={13} /> : d.status === "queued" ? <Clock size={13} /> : null}
                  {statusLabel}
                  {(running || d.status === "paused") && d.progress > 0 && ` · ${d.progress.toFixed(d.progress >= 10 ? 0 : 1)}%`}
                </span>
                {running && (
                  <>
                    <span>
                      {formatBytes(d.downloaded)}
                      {d.total > 0 && ` / ${formatBytes(d.total)}`}
                    </span>
                    {d.speed > 0 && <span>{formatSpeed(d.speed)}</span>}
                    {d.eta != null && <span>{t("timeLeft", { time: formatClock(d.eta) })}</span>}
                  </>
                )}
                {d.status === "paused" && d.total > 0 && (
                  <span>
                    {formatBytes(d.downloaded)} / {formatBytes(d.total)}
                  </span>
                )}
                {d.status === "failed" && d.error && (
                  <span className="min-w-0 truncate text-error/90" title={d.error} data-selectable>
                    {d.error}
                  </span>
                )}
              </div>
            </div>
          )}
          {done && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary">
              <span className="relative flex size-5 items-center justify-center"><span className="shape-cookie absolute inset-0 bg-primary" /><Check size={12} strokeWidth={3.5} className="relative text-on-primary" /></span>
              {statusLabel}
              {d.duration ? <span className="font-normal text-on-surface-variant">· {formatClock(d.duration)}</span> : null}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-0.5 self-end sm:self-center">
        {(running || d.status === "queued") && (
          <IconButton label={t("actionPause")} tone="tonal" onClick={() => api.pause(d.id)}>
            <Pause size={19} />
          </IconButton>
        )}
        {d.status === "paused" && (
          <IconButton label={t("actionResume")} tone="tonal" onClick={() => api.resume(d.id)}>
            <Play size={19} />
          </IconButton>
        )}
        {d.status === "failed" && (
          <IconButton label={t("actionRetry")} tone="tonal" onClick={() => api.resume(d.id)}>
            <RotateCcw size={19} />
          </IconButton>
        )}
        {done && (
          <IconButton label={t("actionOpen")} tone="tonal" onClick={open}>
            <PlayCircle size={20} />
          </IconButton>
        )}
        <IconButton label={t("actionReveal")} onClick={() => api.revealDownload(d.id)}>
          <FolderOpen size={19} />
        </IconButton>
        <Menu
          anchor={({ toggle }) => (
            <IconButton label={t("actionMore")} onClick={toggle}>
              <MoreVertical size={19} />
            </IconButton>
          )}
        >
          {(close) => (
            <>
              <MenuItem
                icon={<Copy size={18} />}
                onClick={() => {
                  close();
                  void api.writeClipboard(d.url).then(() => toast(t("linkCopied")));
                }}
              >
                {t("actionCopyLink")}
              </MenuItem>
              <MenuItem
                icon={<XCircle size={18} />}
                onClick={() => {
                  close();
                  void api.remove(d.id, false);
                }}
              >
                {t("actionRemove")}
              </MenuItem>
              {done && (
                <MenuItem
                  danger
                  icon={<Trash2 size={18} />}
                  onClick={() => {
                    close();
                    void api.remove(d.id, true);
                  }}
                >
                  {t("actionDeleteFile")}
                </MenuItem>
              )}
            </>
          )}
        </Menu>
      </div>
    </article>
  );
}

export const DownloadCard = memo(DownloadCardBase);
