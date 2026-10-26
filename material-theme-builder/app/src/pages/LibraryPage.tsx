import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowDownUp, Bookmark, Download, FolderOpen, History, Search, SearchX, Sparkles, Tag, Trash2, Upload, X } from "lucide-react";
import { buildExport } from "../lib/export";
import { generate, generateAll, STARTERS, DEFAULT_CONFIG, type ThemeConfig } from "../lib/theme";
import { saveTextFile } from "../lib/tauri";
import { useBuilder, type SavedTheme } from "../state/builder";
import { useSettings } from "../state/settings";
import { useToast } from "../state/toast";
import { Button, IconButton } from "../components/ui";
import { ImportSheet } from "../components/ImportSheet";
import { MiniPreview } from "../components/MiniPreview";
import { HistorySheet, TagsDialog } from "../components/LibraryDialogs";
import { ConfirmDialog, Select } from "../components/overlays";

function ThemeCard({ title, subtitle, config, delay, onOpen, actions, tags }: { title: string; subtitle: string; config: ThemeConfig; delay: number; onOpen: () => void; actions?: React.ReactNode; tags?: string[] }) {
  const theme = useMemo(() => generate(config), [config]);
  return (
    <div className="anim-fade-up group relative rounded-3xl bg-surface-container-low p-3 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-elev-2" style={{ "--d": `${delay}ms` } as CSSProperties}>
      <button type="button" data-ripple onClick={onOpen} className="block w-full rounded-2xl text-left">
        <MiniPreview light={theme.light} dark={theme.dark} />
        <div className="px-1.5 pb-1 pt-3">
          <div className="truncate text-base font-medium">{title}</div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <span className="size-3 rounded-full" style={{ background: config.source }} />
            <span className="font-mono">{config.source}</span>
            <span className="truncate">· {subtitle}</span>
          </div>
          {!!tags?.length && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.map((x) => (
                <span key={x} className="rounded-full bg-secondary-container px-2 py-0.5 text-[11px] text-on-secondary-container">
                  {x}
                </span>
              ))}
            </div>
          )}
        </div>
      </button>
      {actions && <div className="absolute right-3 top-3 flex gap-1 rounded-full bg-surface-container-high/90 p-0.5 opacity-0 backdrop-blur-sm transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100">{actions}</div>}
    </div>
  );
}

export function LibraryPage({ onOpen }: { onOpen: () => void }) {
  const { t, settings } = useSettings();
  const b = useBuilder();
  const toast = useToast();
  const [importOpen, setImportOpen] = useState(false);
  const [toDelete, setToDelete] = useState<SavedTheme | null>(null);
  const [sort, setSort] = useState<"recent" | "oldest" | "name">("recent");
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [tagsFor, setTagsFor] = useState<SavedTheme | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const allTags = useMemo(() => [...new Set(b.saved.flatMap((s) => s.tags ?? []))].sort((x, y) => x.localeCompare(y, settings.lang)), [b.saved, settings.lang]);
  const historyItem = b.saved.find((s) => s.id === historyId) ?? null;
  useEffect(() => {
    if (activeTag && !allTags.includes(activeTag)) setActiveTag(null);
  }, [allTags, activeTag]);
  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = b.saved.filter((s) => (!activeTag || s.tags?.includes(activeTag)) && (!q || s.name.toLowerCase().includes(q) || s.config.source.toLowerCase().includes(q) || s.tags?.some((x) => x.toLowerCase().includes(q))));
    if (sort === "recent") list.sort((x, y) => y.updatedAt - x.updatedAt);
    else if (sort === "oldest") list.sort((x, y) => x.updatedAt - y.updatedAt);
    else list.sort((x, y) => x.name.localeCompare(y.name, settings.lang));
    return list;
  }, [b.saved, sort, settings.lang, query, activeTag]);

  const open = (config: ThemeConfig, name: string | null, id: string | null) => {
    b.replace(config, name, id);
    onOpen();
  };

  const download = async (item: SavedTheme) => {
    const cfg = item.config;
    const text = buildExport("project", { config: cfg, theme: generate(cfg), schemes: generateAll(cfg) });
    try {
      if (await saveTextFile(`${item.name.replace(/[^\w-]+/g, "-")}.mtb.json`, text, "json")) toast.success(t("export.saved", { name: item.name }));
    } catch {
      toast.error(t("export.saveFailed"));
    }
  };

  const dateFmt = new Intl.DateTimeFormat(settings.lang === "vi" ? "vi-VN" : "en-US", { dateStyle: "medium" });

  return (
    <div className="mx-auto h-full max-w-6xl overflow-y-auto px-4 pb-8 pt-4 min-[900px]:px-8">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="t-display text-3xl">{t("library.title")}</h1>
          <p className="text-sm text-on-surface-variant">{t("library.subtitle")}</p>
        </div>
        <Button variant="tonal" icon={<Upload className="size-4" />} onClick={() => setImportOpen(true)}>
          {t("library.import")}
        </Button>
      </header>

      <section className="mb-10">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="flex flex-1 items-center gap-2 text-sm font-semibold uppercase tracking-wider text-on-surface-variant">
            <Bookmark className="size-4" /> {t("library.mine")}
            <span className="rounded-full bg-secondary-container px-2 py-0.5 text-xs text-on-secondary-container">{b.saved.length}</span>
          </h2>
          {b.saved.length > 1 && (
            <Select
              className="w-48"
              label={t("library.sort")}
              icon={ArrowDownUp}
              value={sort}
              onChange={setSort}
              options={[
                { value: "recent", label: t("library.sortRecent") },
                { value: "oldest", label: t("library.sortOldest") },
                { value: "name", label: t("library.sortName") },
              ]}
            />
          )}
        </div>
        {b.saved.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <label className="relative block min-w-[220px] max-w-sm flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("library.search")}
                aria-label={t("library.search")}
                className="h-11 w-full select-text rounded-full bg-surface-container-high pl-11 pr-10 text-sm outline-none ring-primary transition-shadow focus:ring-2"
              />
              {query && (
                <button type="button" aria-label={t("common.clear")} data-tip={t("common.clear")} className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full hover:bg-on-surface/10" onClick={() => setQuery("")}>
                  <X className="size-4" />
                </button>
              )}
            </label>
            {allTags.map((x) => (
              <button
                key={x}
                type="button"
                data-ripple
                aria-pressed={activeTag === x}
                onClick={() => setActiveTag(activeTag === x ? null : x)}
                className={`inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-medium transition-colors ${activeTag === x ? "border-transparent bg-secondary-container text-on-secondary-container" : "border-outline-variant text-on-surface-variant hover:bg-surface-container-high"}`}
              >
                <Tag className="size-3" /> {x}
              </button>
            ))}
          </div>
        )}
        {b.saved.length > 0 && sorted.length === 0 && (
          <div className="anim-fade-up flex flex-col items-center gap-2 rounded-3xl bg-surface-container-low px-6 py-10 text-center">
            <SearchX className="size-8 text-on-surface-variant" />
            <p className="font-medium">{t("library.noResults")}</p>
          </div>
        )}
        {b.saved.length === 0 ? (
          <div className="anim-fade-up flex flex-col items-center gap-3 rounded-3xl border border-dashed border-outline-variant px-6 py-12 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-primary-container text-on-primary-container">
              <FolderOpen className="anim-bounce size-8" />
            </span>
            <p className="text-lg font-medium">{t("library.emptyTitle")}</p>
            <p className="max-w-sm text-sm text-on-surface-variant">{t("library.emptyBody")}</p>
            <Button icon={<Sparkles className="size-4" />} onClick={onOpen}>
              {t("library.startBuilding")}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
            {sorted.map((s, i) => (
              <ThemeCard
                key={s.id}
                title={s.name}
                subtitle={dateFmt.format(s.updatedAt)}
                config={s.config}
                delay={i * 50}
                tags={s.tags}
                onOpen={() => open(s.config, s.name, s.id)}
                actions={
                  <>
                    <IconButton label={t("library.tags")} className="size-8" onClick={() => setTagsFor(s)}>
                      <Tag className="size-4" />
                    </IconButton>
                    <IconButton label={t("library.historyTip", { n: s.versions?.length ?? 0 })} className="size-8" onClick={() => setHistoryId(s.id)}>
                      <History className="size-4" />
                    </IconButton>
                    <IconButton label={t("library.download")} className="size-8" onClick={() => void download(s)}>
                      <Download className="size-4" />
                    </IconButton>
                    <IconButton
                      label={t("common.delete")}
                      className="size-8"
                      onClick={() => setToDelete(s)}
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  </>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-on-surface-variant">
          <Sparkles className="size-4" /> {t("library.starters")}
        </h2>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
          {STARTERS.map((s, i) => (
            <ThemeCard
              key={s.id}
              title={settings.lang === "vi" ? s.vi : s.en}
              subtitle={t(`variant.${s.variant}` as never)}
              config={{ ...DEFAULT_CONFIG, source: s.seed, variant: s.variant }}
              delay={i * 40}
              onOpen={() => open({ ...DEFAULT_CONFIG, source: s.seed, variant: s.variant }, null, null)}
            />
          ))}
        </div>
      </section>
      <TagsDialog
        item={tagsFor}
        existing={allTags}
        onClose={() => setTagsFor(null)}
        onSave={(tags) => {
          if (tagsFor) b.setTags(tagsFor.id, tags);
          setTagsFor(null);
        }}
      />
      <HistorySheet
        item={historyItem}
        onClose={() => setHistoryId(null)}
        onOpen={(v) => {
          if (historyItem) open(v.config, historyItem.name, null);
          setHistoryId(null);
        }}
        onRestore={(v) => {
          if (!historyItem) return;
          b.restoreVersion(historyItem.id, v.at);
          toast.success(t("library.restored", { name: historyItem.name }));
          setHistoryId(null);
        }}
      />
      <ImportSheet open={importOpen} onClose={() => setImportOpen(false)} onImported={onOpen} />
      <ConfirmDialog
        open={!!toDelete}
        title={t("library.confirmTitle")}
        message={t("library.confirmBody", { name: toDelete?.name ?? "" })}
        confirmLabel={t("common.delete")}
        confirmIcon={<Trash2 className="size-4" />}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (!toDelete) return;
          const removed = b.remove(toDelete.id);
          setToDelete(null);
          if (removed) toast.info(t("library.deleted", { name: removed.name }), { label: t("common.undo"), run: () => b.restore(removed) });
        }}
      />
    </div>
  );
}
