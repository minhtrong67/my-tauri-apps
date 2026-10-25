import { useEffect, useMemo, useRef, useState } from "react";
import { Clipboard, ClipboardPaste, DownloadCloud, Link2, Pause, Play, Plus, Search, Trash2, X } from "lucide-react";
import { DownloadCard } from "../components/DownloadCard";
import { Button, Chip, cx, IconButton, ShapeBadge } from "../components/ui";
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
  const [fabOpen, setFabOpen] = useState(false);
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

  const pasteFab = async () => {
    setFabOpen(false);
    const clip = (await api.readClipboard()).trim();
    const urls = extractUrls(clip);
    openDialog(urls.length ? { url: urls.join("\n"), auto: urls.length === 1 } : {});
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
      {/* Headline + link bar */}
      <header className="shrink-0 px-4 pt-5 pb-3 sm:px-10 sm:pt-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <h1 className="text-[2.5rem] leading-none font-semibold tracking-tight text-on-surface sm:text-[3.25rem]">{t("dlTitle")}</h1>
            <p className="pb-1.5 text-sm tabular-nums text-on-surface-variant">
              {anyActive ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-primary-container px-3 py-1 font-semibold text-on-primary-container">
                  <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-primary" /></span>
                  {t("activeSummary", { n: counts.active })}
                  {speed > 0 && <span className="font-medium opacity-80">· {formatSpeed(speed)}</span>}
                </span>
              ) : (
                t("idleSummary")
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-surface-high py-2 pr-2 pl-6 shadow-sm ring-1 ring-outline-variant/40 transition-all duration-300 focus-within:shadow-lg focus-within:shadow-primary/15 focus-within:ring-2 focus-within:ring-primary">
            <Link2 size={22} className="shrink-0 text-primary" />
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={t("pastePlaceholder")}
              aria-label={t("pastePlaceholder")}
              spellCheck={false}
              className="h-11 min-w-0 flex-1 bg-transparent text-base text-on-surface outline-none placeholder:text-on-surface-variant/70"
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
            <Button className="hidden sm:inline-flex" size="lg" icon={<Plus size={20} />} onClick={submit}>
              {t("download")}
            </Button>
            <IconButton label={t("download")} tone="tonal" className="sm:hidden" onClick={submit}>
              <Plus size={20} />
            </IconButton>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1" role="tablist">
              {filters.map((f) => (
                <Chip key={f.id} selected={filter === f.id} onClick={() => setFilter(f.id)} count={counts[f.id]}>
                  {f.label}
                </Chip>
              ))}
            </div>
            <label className="flex h-10 w-full items-center gap-2 rounded-full bg-surface-container px-4 text-on-surface-variant transition-all focus-within:bg-surface-high focus-within:ring-2 focus-within:ring-primary sm:w-52">
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
        </div>
      </header>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-32 sm:px-10">
        <div className="seg-list mx-auto max-w-4xl">
          {visible.map((d, i) => (
            <DownloadCard key={d.id} d={d} index={i} />
          ))}
          {visible.length === 0 && <EmptyState filtered={items.length > 0} />}
        </div>
      </div>

      {/* Floating toolbar (bulk actions) */}
      {(anyActive || anyPaused || counts.done > 0) && (
        <div className="anim-pop absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-surface-highest p-1.5 shadow-xl ring-1 ring-outline-variant/40 sm:bottom-8">
          {anyActive && (
            <IconButton label={t("pauseAll")} tone="primary" onClick={() => api.pauseAll()}>
              <Pause size={20} />
            </IconButton>
          )}
          {anyPaused && (
            <IconButton label={t("resumeAll")} tone="primary" onClick={() => api.resumeAll()}>
              <Play size={20} />
            </IconButton>
          )}
          {counts.done > 0 && (
            <IconButton label={t("clearDone")} onClick={() => api.clearFinished()}>
              <Trash2 size={20} />
            </IconButton>
          )}
        </div>
      )}

      {/* FAB menu */}
      <div className="absolute right-5 bottom-5 z-30 flex flex-col items-end gap-3 sm:right-10 sm:bottom-8">
        {fabOpen && (
          <div className="flex flex-col items-end gap-2">
            <button onClick={pasteFab} className="anim-pop ripple-host morph flex h-14 items-center gap-3 rounded-full bg-secondary-container px-6 font-semibold text-on-secondary-container shadow-lg">
              <ClipboardPaste size={20} />
              {t("fabPaste")}
            </button>
            <button onClick={() => { setFabOpen(false); openDialog(); }} className="anim-pop ripple-host morph flex h-14 items-center gap-3 rounded-full bg-tertiary-container px-6 font-semibold text-on-tertiary-container shadow-lg" style={{ animationDelay: "50ms" }}>
              <Link2 size={20} />
              {t("fabNew")}
            </button>
          </div>
        )}
        <button
          onClick={() => setFabOpen((o) => !o)}
          aria-label={t("addLink")}
          aria-expanded={fabOpen}
          className={cx(
            "ripple-host flex size-[72px] items-center justify-center bg-primary text-on-primary shadow-xl shadow-primary/30 transition-all duration-500 ease-spring hover:scale-105 active:scale-95",
            fabOpen ? "rounded-full" : "rounded-[28px] hover:rounded-[36px]",
          )}
        >
          <Plus size={30} strokeWidth={2.5} className={cx("transition-transform duration-500 ease-spring", fabOpen && "rotate-[135deg]")} />
        </button>
      </div>

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
    <div className="anim-page flex flex-col items-center rounded-[40px] bg-surface-low px-6 py-16 text-center">
      <div className="relative mb-8 flex size-40 items-center justify-center">
        <span className="shape-flower anim-spin-slow absolute inset-0 bg-tertiary-container" />
        <span className="shape-cookie absolute inset-5 bg-primary-container" />
        <ShapeBadge shape="clover" size={84} tone="primary">
          <DownloadCloud size={38} />
        </ShapeBadge>
      </div>
      <h2 className="text-[1.75rem] font-semibold tracking-tight text-on-surface">{filtered ? t("emptyFilterTitle") : t("emptyTitle")}</h2>
      <p className="mt-2 max-w-md text-[0.95rem] leading-relaxed text-on-surface-variant">{filtered ? t("emptyFilterBody") : t("emptyBody")}</p>
      {!filtered && (
        <Button className="mt-7" size="lg" icon={<Plus size={20} />} onClick={() => openDialog()}>
          {t("addLink")}
        </Button>
      )}
    </div>
  );
}
