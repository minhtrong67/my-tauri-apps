import { useEffect, useMemo, useRef, useState } from "react";
import { Clipboard, DownloadCloud, Link2, Pause, Play, Plus, Search, Trash2, X } from "lucide-react";
import { DownloadCard } from "../components/DownloadCard";
import { Button, Chip, IconButton } from "../components/ui";
import { api } from "../lib/api";
import { extractUrls, formatSpeed } from "../lib/format";
import { useT } from "../lib/hooks";
import { matchesFilter, useDownloads, type Filter } from "../store/downloads";
import { useUi } from "../store/ui";

export function DownloadsPage() {
  const { t } = useT();
  const { items, filter, query, setFilter, setQuery } = useDownloads();
  const openDialog = useUi((s) => s.openDialog);
  const [link, setLink] = useState("");
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: items.length, active: 0, queued: 0, done: 0, failed: 0 };
    for (const d of items) {
      if (matchesFilter(d, "active")) c.active++;
      else if (matchesFilter(d, "queued")) c.queued++;
      else if (matchesFilter(d, "done")) c.done++;
      else if (matchesFilter(d, "failed")) c.failed++;
    }
    return c;
  }, [items]);

  const speed = useMemo(() => items.filter((d) => d.status === "downloading").reduce((n, d) => n + d.speed, 0), [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((d) => matchesFilter(d, filter) && (!q || d.title.toLowerCase().includes(q) || d.site.toLowerCase().includes(q)));
  }, [items, filter, query]);

  // Drag & drop a link (or text containing links) anywhere on the page.
  useEffect(() => {
    const hasLink = (e: DragEvent) => !!e.dataTransfer && (e.dataTransfer.types.includes("text/uri-list") || e.dataTransfer.types.includes("text/plain"));
    const enter = (e: DragEvent) => {
      if (!hasLink(e)) return;
      dragDepth.current++;
      setDragging(true);
    };
    const leave = () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    };
    const over = (e: DragEvent) => hasLink(e) && e.preventDefault();
    const drop = (e: DragEvent) => {
      dragDepth.current = 0;
      setDragging(false);
      const text = e.dataTransfer?.getData("text/uri-list") || e.dataTransfer?.getData("text/plain") || "";
      const urls = extractUrls(text);
      if (urls.length) {
        e.preventDefault();
        openDialog({ url: urls.join("\n"), auto: urls.length === 1 });
      }
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [openDialog]);

  const submit = () => {
    const urls = extractUrls(link);
    if (!urls.length) {
      openDialog({ url: link.trim() });
      return;
    }
    openDialog({ url: urls.join("\n"), auto: urls.length === 1 });
    setLink("");
  };

  const paste = async () => {
    const clip = (await api.readClipboard()).trim();
    if (clip) setLink(clip);
  };

  const anyActive = counts.active > 0;
  const anyPaused = items.some((d) => d.status === "paused" || d.status === "failed");

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: t("filterAll") },
    { id: "active", label: t("filterActive") },
    { id: "queued", label: t("filterQueued") },
    { id: "done", label: t("filterDone") },
    { id: "failed", label: t("filterFailed") },
  ];

  return (
    <div className="anim-page relative flex h-full min-h-0 flex-col">
      {/* Link bar */}
      <header className="shrink-0 px-4 pt-4 pb-3 sm:px-8 sm:pt-6">
        <div className="mx-auto flex max-w-4xl items-center gap-2 rounded-full bg-surface-high py-1.5 pr-1.5 pl-5 shadow-sm ring-1 ring-outline-variant/50 transition-shadow focus-within:shadow-md focus-within:ring-2 focus-within:ring-primary">
          <Link2 size={20} className="shrink-0 text-on-surface-variant" />
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={t("pastePlaceholder")}
            aria-label={t("pastePlaceholder")}
            spellCheck={false}
            className="h-10 min-w-0 flex-1 bg-transparent text-[0.95rem] text-on-surface outline-none placeholder:text-on-surface-variant/70"
          />
          {link ? (
            <IconButton label={t("close")} size="sm" onClick={() => setLink("")}>
              <X size={18} />
            </IconButton>
          ) : (
            <IconButton label={t("paste")} size="sm" onClick={paste}>
              <Clipboard size={18} />
            </IconButton>
          )}
          <Button className="hidden sm:inline-flex" icon={<Plus size={18} />} onClick={submit}>
            {t("download")}
          </Button>
          <IconButton label={t("download")} tone="tonal" className="sm:hidden" onClick={submit}>
            <Plus size={20} />
          </IconButton>
        </div>

        <div className="mx-auto mt-4 flex max-w-4xl flex-wrap items-center gap-x-4 gap-y-3">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1" role="tablist">
            {filters.map((f) => (
              <Chip key={f.id} selected={filter === f.id} onClick={() => setFilter(f.id)} count={counts[f.id]}>
                {f.label}
              </Chip>
            ))}
          </div>
          <label className="flex h-9 w-full items-center gap-2 rounded-full bg-surface-container px-3 text-on-surface-variant transition-all focus-within:ring-2 focus-within:ring-primary sm:w-52">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/70"
            />
          </label>
        </div>
      </header>

      {/* Summary + bulk actions */}
      {items.length > 0 && (
        <div className="mx-auto flex w-full max-w-4xl shrink-0 flex-wrap items-center gap-2 px-4 pb-2 sm:px-8">
          <p className="flex-1 text-sm text-on-surface-variant tabular-nums">
            {anyActive ? (
              <>
                <span className="font-medium text-primary">{t("activeSummary", { n: counts.active })}</span>
                {speed > 0 && <span> · {t("totalSpeed", { speed: formatSpeed(speed) })}</span>}
              </>
            ) : (
              t("idleSummary")
            )}
          </p>
          {anyActive && (
            <Button variant="text" icon={<Pause size={17} />} onClick={() => api.pauseAll()}>
              {t("pauseAll")}
            </Button>
          )}
          {anyPaused && (
            <Button variant="text" icon={<Play size={17} />} onClick={() => api.resumeAll()}>
              {t("resumeAll")}
            </Button>
          )}
          {counts.done > 0 && (
            <Button variant="text" icon={<Trash2 size={17} />} onClick={() => api.clearFinished()}>
              {t("clearDone")}
            </Button>
          )}
        </div>
      )}

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-24 sm:px-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-2.5">
          {visible.map((d, i) => (
            <DownloadCard key={d.id} d={d} index={i} />
          ))}
          {visible.length === 0 && <EmptyState filtered={items.length > 0} />}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => openDialog()}
        className="ripple-host group absolute right-5 bottom-5 flex h-14 items-center gap-0 rounded-2xl bg-primary-container px-4 text-on-primary-container shadow-lg transition-all duration-300 ease-emphasized hover:gap-2 hover:shadow-xl active:scale-95 sm:right-8 sm:bottom-8"
        aria-label={t("addLink")}
      >
        <Plus size={24} className="transition-transform duration-300 ease-spring group-hover:rotate-90" />
        <span className="max-w-0 overflow-hidden text-sm font-medium whitespace-nowrap transition-all duration-300 ease-emphasized group-hover:max-w-32">{t("addLink")}</span>
      </button>

      {dragging && (
        <div className="anim-scrim pointer-events-none absolute inset-3 z-40 flex flex-col items-center justify-center gap-3 rounded-[28px] border-2 border-dashed border-primary bg-primary-container/80 text-on-primary-container backdrop-blur-sm">
          <DownloadCloud size={48} className="anim-float" />
          <p className="text-lg font-medium">{t("dropHere")}</p>
        </div>
      )}
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  const { t } = useT();
  const openDialog = useUi((s) => s.openDialog);
  return (
    <div className="anim-page flex flex-col items-center px-6 py-16 text-center">
      <div className="relative mb-6 flex size-28 items-center justify-center">
        <div className="absolute inset-0 rounded-[2rem] bg-primary-container/60" style={{ transform: "rotate(-8deg)" }} />
        <div className="absolute inset-2 rounded-[1.6rem] bg-secondary-container/70" style={{ transform: "rotate(6deg)" }} />
        <div className="anim-float relative flex size-20 items-center justify-center rounded-3xl bg-primary text-on-primary shadow-lg">
          <DownloadCloud size={38} />
        </div>
      </div>
      <h2 className="text-xl font-medium text-on-surface">{filtered ? t("emptyFilterTitle") : t("emptyTitle")}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-on-surface-variant">{filtered ? t("emptyFilterBody") : t("emptyBody")}</p>
      {!filtered && (
        <Button className="mt-6" size="lg" icon={<Plus size={20} />} onClick={() => openDialog()}>
          {t("addLink")}
        </Button>
      )}
    </div>
  );
}
