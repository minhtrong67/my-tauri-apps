import { useEffect, useMemo, useState } from "react";
import { Eye, History, RotateCcw, Save, Tag, X } from "lucide-react";
import { generate } from "../lib/theme";
import { useSettings } from "../state/settings";
import type { SavedTheme, ThemeVersion } from "../state/builder";
import { Button } from "./ui";
import { Dialog, Sheet } from "./overlays";
import { MiniPreview } from "./MiniPreview";

export const MAX_TAGS = 6;
export const cleanTag = (s: string) => s.trim().replace(/\s+/g, " ").slice(0, 20);

/** Dialog to edit the tags of a saved theme. */
export function TagsDialog({ item, existing, onClose, onSave }: { item: SavedTheme | null; existing: string[]; onClose: () => void; onSave: (tags: string[]) => void }) {
  const { t } = useSettings();
  const [tags, setTags] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  useEffect(() => {
    setTags(item?.tags ?? []);
    setDraft("");
  }, [item]);

  const add = (raw: string) => {
    const v = cleanTag(raw);
    if (!v || tags.length >= MAX_TAGS || tags.some((x) => x.toLowerCase() === v.toLowerCase())) return setDraft("");
    setTags([...tags, v]);
    setDraft("");
  };
  const suggestions = existing.filter((x) => !tags.some((y) => y.toLowerCase() === x.toLowerCase())).slice(0, 8);

  return (
    <Dialog
      open={!!item}
      onClose={onClose}
      icon={<Tag className="size-7" />}
      title={t("library.tags")}
      align="start"
      actions={
        <>
          <Button variant="neutral" icon={<X className="size-4" />} onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button icon={<Save className="size-4" />} onClick={() => onSave(tags)}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap gap-1.5">
        {tags.map((x) => (
          <span key={x} className="anim-pop inline-flex items-center gap-1 rounded-full bg-secondary-container py-1 pl-3 pr-1.5 text-sm text-on-secondary-container">
            {x}
            <button type="button" aria-label={t("common.delete")} data-tip={t("common.delete")} className="grid size-5 place-items-center rounded-full hover:bg-on-secondary-container/15" onClick={() => setTags(tags.filter((y) => y !== x))}>
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        {!tags.length && <span className="text-sm">{t("library.noTags")}</span>}
      </div>
      <label className="relative mt-4 block">
        <span className="absolute -top-2 left-3 bg-surface-container-high px-1 text-xs text-primary">{t("library.addTag")}</span>
        <input
          value={draft}
          maxLength={20}
          disabled={tags.length >= MAX_TAGS}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === ",") && (e.preventDefault(), add(draft))}
          onBlur={() => draft && add(draft)}
          className="h-12 w-full select-text rounded-xl border-2 border-primary bg-transparent px-4 text-on-surface outline-none disabled:opacity-40"
        />
      </label>
      {!!suggestions.length && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {suggestions.map((x) => (
            <button key={x} type="button" data-ripple className="rounded-full border border-outline-variant px-3 py-1 text-xs hover:bg-surface-container-highest" onClick={() => add(x)}>
              + {x}
            </button>
          ))}
        </div>
      )}
    </Dialog>
  );
}

function VersionRow({ v, onOpen, onRestore }: { v: ThemeVersion; onOpen: () => void; onRestore: () => void }) {
  const { t, settings } = useSettings();
  const theme = useMemo(() => generate(v.config), [v.config]);
  const when = new Intl.DateTimeFormat(settings.lang === "vi" ? "vi-VN" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(v.at);
  return (
    <li className="rounded-2xl bg-surface-container p-3">
      <MiniPreview light={theme.light} dark={theme.dark} />
      <div className="mt-2 flex items-center gap-2 text-xs text-on-surface-variant">
        <span className="size-3 rounded-full" style={{ background: v.config.source }} />
        <span className="font-mono">{v.config.source}</span>
        <span className="truncate">· {when}</span>
      </div>
      <div className="mt-2 flex gap-2">
        <Button size="xs" variant="tonal" icon={<Eye className="size-3.5" />} onClick={onOpen}>
          {t("library.openVersion")}
        </Button>
        <Button size="xs" icon={<RotateCcw className="size-3.5" />} onClick={onRestore}>
          {t("library.restoreVersion")}
        </Button>
      </div>
    </li>
  );
}

/** Side sheet listing the previous saves of a theme. */
export function HistorySheet({ item, onClose, onOpen, onRestore }: { item: SavedTheme | null; onClose: () => void; onOpen: (v: ThemeVersion) => void; onRestore: (v: ThemeVersion) => void }) {
  const { t } = useSettings();
  const [last, setLast] = useState<SavedTheme | null>(null);
  useEffect(() => {
    if (item) setLast(item);
  }, [item]);
  const shown = item ?? last;
  return (
    <Sheet open={!!item} onClose={onClose} icon={<History className="size-5" />} title={t("library.history", { name: shown?.name ?? "" })}>
      {shown?.versions?.length ? (
        <ul className="space-y-3 pb-3">
          {shown.versions.map((v) => (
            <VersionRow key={v.at} v={v} onOpen={() => onOpen(v)} onRestore={() => onRestore(v)} />
          ))}
        </ul>
      ) : (
        <p className="py-10 text-center text-sm text-on-surface-variant">{t("library.noVersions")}</p>
      )}
    </Sheet>
  );
}
