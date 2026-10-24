import { useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowDownUp, Bookmark, Download, FolderOpen, Sparkles, Trash2, Upload } from "lucide-react";
import { buildExport, parseProject } from "../lib/export";
import { generate, generateAll, STARTERS, DEFAULT_CONFIG, type ThemeConfig, type Roles } from "../lib/theme";
import { saveTextFile } from "../lib/tauri";
import { useBuilder, type SavedTheme } from "../state/builder";
import { useSettings } from "../state/settings";
import { useToast } from "../state/toast";
import { Button, IconButton } from "../components/ui";
import { ConfirmDialog, Select } from "../components/overlays";

function MiniPreview({ light, dark }: { light: Roles; dark: Roles }) {
  const half = (r: Roles) => (
    <div className="flex flex-1 flex-col gap-1.5 p-2.5 transition-colors duration-300" style={{ background: r.surface }}>
      <div className="h-3 w-2/3 rounded-full" style={{ background: r.primary }} />
      <div className="flex gap-1.5">
        <div className="h-6 flex-1 rounded-lg" style={{ background: r.primaryContainer }} />
        <div className="h-6 flex-1 rounded-lg" style={{ background: r.secondaryContainer }} />
        <div className="h-6 flex-1 rounded-lg" style={{ background: r.tertiaryContainer }} />
      </div>
      <div className="h-2 w-full rounded-full" style={{ background: r.surfaceContainerHighest }} />
    </div>
  );
  return (
    <div className="flex overflow-hidden rounded-2xl ring-1 ring-inset ring-outline-variant">
      {half(light)}
      {half(dark)}
    </div>
  );
}

function ThemeCard({ title, subtitle, config, delay, onOpen, actions }: { title: string; subtitle: string; config: ThemeConfig; delay: number; onOpen: () => void; actions?: React.ReactNode }) {
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [toDelete, setToDelete] = useState<SavedTheme | null>(null);
  const [sort, setSort] = useState<"recent" | "oldest" | "name">("recent");
  const sorted = useMemo(() => {
    const list = [...b.saved];
    if (sort === "recent") list.sort((x, y) => y.updatedAt - x.updatedAt);
    else if (sort === "oldest") list.sort((x, y) => x.updatedAt - y.updatedAt);
    else list.sort((x, y) => x.name.localeCompare(y.name, settings.lang));
    return list;
  }, [b.saved, sort, settings.lang]);

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

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    const cfg = parseProject(await file.text());
    if (!cfg) {
      toast.error(t("library.importFailed"));
      return;
    }
    open(cfg, file.name.replace(/\.mtb\.json$|\.json$/i, ""), null);
    toast.success(t("library.imported"));
  };

  const dateFmt = new Intl.DateTimeFormat(settings.lang === "vi" ? "vi-VN" : "en-US", { dateStyle: "medium" });

  return (
    <div className="mx-auto h-full max-w-6xl overflow-y-auto px-4 pb-8 pt-4 min-[900px]:px-8">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="t-display text-3xl">{t("library.title")}</h1>
          <p className="text-sm text-on-surface-variant">{t("library.subtitle")}</p>
        </div>
        <Button variant="tonal" icon={<Upload className="size-4" />} onClick={() => fileRef.current?.click()}>
          {t("library.import")}
        </Button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => void onImport(e.target.files?.[0]).then(() => (e.target.value = ""))} />
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
                onOpen={() => open(s.config, s.name, s.id)}
                actions={
                  <>
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
