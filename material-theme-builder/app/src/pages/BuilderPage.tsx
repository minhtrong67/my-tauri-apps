import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { Accessibility, Bookmark, Check, Code, Download, Eye, EyeOff, Grid3x3, Keyboard, Moon, Palette, Redo2, RotateCcw, Shuffle, Sun, Undo2, Upload, X } from "lucide-react";
import { PreviewScene } from "../components/PreviewScene";
import { SourcePanel } from "../components/SourcePanel";
import { AccessibilityTab } from "../components/tabs/AccessibilityTab";
import { ColorsTab } from "../components/tabs/ColorsTab";
import { ExportTab } from "../components/tabs/ExportTab";
import { PalettesTab } from "../components/tabs/PalettesTab";
import { Button, IconButton, Segmented } from "../components/ui";
import { ImportSheet } from "../components/ImportSheet";
import { ConfirmDialog, PromptDialog, Select, Sheet } from "../components/overlays";
import { DEFAULT_CONFIG } from "../lib/theme";
import { randomSeed } from "../lib/color";
import { useBuilder } from "../state/builder";
import { useSettings } from "../state/settings";
import { useToast } from "../state/toast";

type Tab = "preview" | "colors" | "palettes" | "access" | "export";
type PreviewView = "light" | "dark" | "split";
type Cvd = "normal" | "protan" | "deutan" | "tritan" | "achroma";

/** Machado et al. (2009) color-vision-deficiency matrices, applied as SVG filters. */
const CVD_MATRIX: Record<Exclude<Cvd, "normal">, string> = {
  protan: "0.152286 1.052583 -0.204868 0 0  0.114503 0.786281 0.099216 0 0  -0.003882 -0.048116 1.051998 0 0  0 0 0 1 0",
  deutan: "0.367322 0.860646 -0.227968 0 0  0.280085 0.672501 0.047413 0 0  -0.011820 0.042940 0.968881 0 0  0 0 0 1 0",
  tritan: "1.255528 -0.076749 -0.178779 0 0  -0.078411 0.930809 0.147602 0 0  0.004733 0.691367 0.303900 0 0  0 0 0 1 0",
  achroma: "0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0",
};

function Kbd({ children }: { children: string }) {
  return <kbd className="rounded-md border border-outline-variant bg-surface-container-highest px-2 py-0.5 font-sans text-xs font-semibold">{children}</kbd>;
}

export function BuilderPage() {
  const { t } = useSettings();
  const b = useBuilder();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("preview");
  const [view, setView] = useState<PreviewView>("light");
  const [saveOpen, setSaveOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [cvd, setCvd] = useState<Cvd>("normal");
  const theme = useDeferredValue(b.theme);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key === "?" && !(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA"))) setKeysOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const defaultName = b.currentName ?? `${t("builder.untitled")} ${b.saved.length + 1}`;
  const closeDialog = useCallback(() => setSaveOpen(false), []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center gap-2 px-4 pb-3 pt-4 min-[900px]:px-6">
        <div className="mr-auto min-w-0">
          <h1 className="shimmer-text t-display truncate text-3xl">{t("builder.title")}</h1>
          <p className="truncate text-sm text-on-surface-variant">{b.currentName ? t("builder.editing", { name: b.currentName }) : t("builder.subtitle")}</p>
        </div>
        <IconButton label={`${t("common.undo")} (Ctrl+Z)`} disabled={!b.canUndo} onClick={b.undo}>
          <Undo2 className="size-5" />
        </IconButton>
        <IconButton label={`${t("common.redo")} (Ctrl+Shift+Z)`} disabled={!b.canRedo} onClick={b.redo}>
          <Redo2 className="size-5" />
        </IconButton>
        <IconButton label={t("builder.shortcuts")} onClick={() => setKeysOpen(true)}>
          <Keyboard className="size-5" />
        </IconButton>
        <IconButton label={t("import.tooltip")} onClick={() => setImportOpen(true)}>
          <Upload className="size-5" />
        </IconButton>
        <IconButton label={t("builder.reset")} onClick={() => setResetOpen(true)}>
          <RotateCcw className="size-5" />
        </IconButton>
        <IconButton label={t("builder.random")} tone="tonal" onClick={() => b.update({ source: randomSeed() })}>
          <Shuffle className="size-5" />
        </IconButton>
        <Button variant="tonal" icon={<Bookmark className="size-4" />} onClick={() => setSaveOpen(true)}>
          <span className="hidden sm:inline">{t("common.save")}</span>
        </Button>
        <Button icon={<Download className="size-4" />} onClick={() => setTab("export")}>
          <span className="hidden sm:inline">{t("common.export")}</span>
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 min-[900px]:flex-row min-[900px]:overflow-hidden min-[900px]:px-6">
        <aside className="shrink-0 min-[900px]:w-[340px] min-[900px]:overflow-y-auto min-[900px]:pb-2 min-[900px]:pr-1">
          <SourcePanel />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col min-[900px]:overflow-y-auto min-[900px]:pr-1">
          <div className="sticky top-0 z-20 -mx-1 mb-3 bg-surface/85 px-1 pb-2 pt-1 backdrop-blur-md">
            <Segmented<Tab>
              hideLabelsOnSmall
              value={tab}
              onChange={setTab}
              options={[
                { value: "preview", label: t("tab.preview"), icon: <Eye className="size-4" />, title: t("tab.preview") },
                { value: "colors", label: t("tab.colors"), icon: <Palette className="size-4" />, title: t("tab.colors") },
                { value: "palettes", label: t("tab.palettes"), icon: <Grid3x3 className="size-4" />, title: t("tab.palettes") },
                { value: "access", label: t("tab.access"), icon: <Accessibility className="size-4" />, title: t("tab.access") },
                { value: "export", label: t("tab.export"), icon: <Code className="size-4" />, title: t("tab.export") },
              ]}
            />
          </div>

          <div key={tab} className="anim-page pb-4">
            {tab === "preview" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Segmented<PreviewView>
                    className="w-full max-w-xs flex-1"
                    value={view}
                    onChange={setView}
                    options={[
                      { value: "light", label: t("common.light"), icon: <Sun className="size-4" /> },
                      { value: "dark", label: t("common.dark"), icon: <Moon className="size-4" /> },
                      { value: "split", label: t("common.both") },
                    ]}
                  />
                  <Select<Cvd>
                    className="w-full max-w-[250px]"
                    label={t("cvd.label")}
                    icon={cvd === "normal" ? Eye : EyeOff}
                    value={cvd}
                    onChange={setCvd}
                    options={[
                      { value: "normal", label: t("cvd.normal"), icon: Eye },
                      { value: "protan", label: t("cvd.protan"), icon: EyeOff },
                      { value: "deutan", label: t("cvd.deutan"), icon: EyeOff },
                      { value: "tritan", label: t("cvd.tritan"), icon: EyeOff },
                      { value: "achroma", label: t("cvd.achroma"), icon: EyeOff },
                    ]}
                  />
                </div>
                {cvd !== "normal" && <p className="anim-fade-up text-xs text-on-surface-variant">{t("cvd.hint")}</p>}
                <svg width="0" height="0" className="absolute" aria-hidden>
                  <defs>
                    {(Object.keys(CVD_MATRIX) as Exclude<Cvd, "normal">[]).map((k) => (
                      <filter key={k} id={`mtb-cvd-${k}`} colorInterpolationFilters="sRGB">
                        <feColorMatrix type="matrix" values={CVD_MATRIX[k]} />
                      </filter>
                    ))}
                  </defs>
                </svg>
                <div className="space-y-4 transition-[filter] duration-300" style={{ filter: cvd === "normal" ? undefined : `url(#mtb-cvd-${cvd})` }}>
                  {view !== "dark" && <PreviewScene roles={theme.light} custom={theme.custom} dark={false} />}
                  {view !== "light" && <PreviewScene roles={theme.dark} custom={theme.custom} dark />}
                </div>
              </div>
            )}
            {tab === "colors" && <ColorsTab theme={theme} />}
            {tab === "palettes" && <PalettesTab theme={theme} />}
            {tab === "access" && <AccessibilityTab theme={theme} />}
            {tab === "export" && <ExportTab theme={theme} />}
          </div>
        </main>
      </div>

      <ImportSheet open={importOpen} onClose={() => setImportOpen(false)} />
      <PromptDialog
        open={saveOpen}
        title={t("builder.saveTitle")}
        label={t("builder.themeName")}
        initial={defaultName}
        confirmLabel={t("common.save")}
        onClose={closeDialog}
        onSubmit={(name) => {
          b.saveCurrent(name);
          setSaveOpen(false);
          toast.success(t("builder.saved", { name }));
        }}
      />
      <ConfirmDialog
        open={resetOpen}
        title={t("builder.resetTitle")}
        message={t("builder.resetBody")}
        confirmLabel={t("builder.reset")}
        confirmIcon={<RotateCcw className="size-4" />}
        tone="warning"
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          b.replace(DEFAULT_CONFIG, null, null);
          setResetOpen(false);
          toast.info(t("builder.resetDone"));
        }}
      />

      <Sheet
        open={keysOpen}
        onClose={() => setKeysOpen(false)}
        icon={<Keyboard className="size-5" />}
        title={t("shortcuts.title")}
        actions={
          <Button variant="neutral" icon={<X className="size-4" />} onClick={() => setKeysOpen(false)}>
            {t("common.close")}
          </Button>
        }
      >
        <ul className="divide-y divide-outline-variant">
          {(
            [
              ["shortcuts.undo", "Ctrl + Z"],
              ["shortcuts.redo", "Ctrl + Shift + Z"],
              ["shortcuts.save", "Ctrl + S"],
              ["shortcuts.settings", "Ctrl + ,"],
              ["shortcuts.pages", "Ctrl + 1–4"],
              ["shortcuts.rail", "Ctrl + B"],
              ["shortcuts.tabs", "← →  Home  End"],
              ["shortcuts.help", "?"],
            ] as const
          ).map(([k, keys]) => (
            <li key={k} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span>{t(k)}</span>
              <span className="flex shrink-0 gap-1">
                {keys.split(" + ").map((x) => (
                  <Kbd key={x}>{x}</Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-tertiary-container p-3 text-xs text-on-tertiary-container">
          <Check className="mt-0.5 size-4 shrink-0" />
          {t("shortcuts.tip")}
        </p>
      </Sheet>
    </div>
  );
}
