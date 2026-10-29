import { useDocs, createDoc, setActiveId, type Eol } from "../store/docs";
import { useSettings } from "../store/settings";
import { useUi, toast } from "../store/ui";
import { editors, viewState, rememberView } from "./editors";
import { readTextFile } from "./tauri";
import { t } from "./i18n";
import { readJson } from "./utils";

const SESSION_KEY = "material-note.session";
const DRAFT_LIMIT = 3_000_000; // max characters of unsaved text kept between launches

let ready = false;
let timer = 0;
export const markSessionReady = () => {
  ready = true;
};

interface SessionTab {
  path: string | null;
  eol?: Eol;
  encoding?: string;
  sel?: [number, number];
  scroll?: [number, number];
  draft?: string;
  forced?: boolean;
}

export const queuePersist = () => {
  clearTimeout(timer);
  timer = window.setTimeout(persistSession, 400);
};

export function persistSession() {
  clearTimeout(timer);
  const { restore } = useSettings.getState();
  if (!ready || !restore) return;
  const { docs, activeId } = useDocs.getState();
  if (activeId !== null) rememberView(activeId);
  let budget = DRAFT_LIMIT;
  const kept = docs.filter((d) => d.path || (editors.get(d.id)?.value ?? d.initial) || d.dirty);
  const data = {
    v: 2,
    active: Math.max(0, kept.findIndex((d) => d.id === activeId)),
    tabs: kept.map((d) => {
      const text = editors.get(d.id)?.value ?? d.initial;
      const v = viewState.get(d.id);
      const item: SessionTab = { path: d.path, eol: d.eol, encoding: d.encoding, sel: v?.sel, scroll: v?.scroll };
      if (d.dirty && text.length <= budget) {
        item.draft = text;
        item.forced = d.forced;
        budget -= text.length;
      }
      return item;
    }),
  };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {
    // quota exceeded: unsaved text would be lost on the next launch, so say so (once)
    if (!useUi.getState().draftWarned) {
      useUi.setState({ draftWarned: true });
      toast.warning(t("msg.draftFail"));
    }
  }
}

export const clearSession = () => {
  clearTimeout(timer);
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
};

/** Re-creates the tabs of the last session. Returns how many tabs were restored. */
export async function restoreSession(): Promise<number> {
  const s = readJson<{ tabs?: SessionTab[]; paths?: string[]; active?: number }>(SESSION_KEY);
  if (!useSettings.getState().restore || !s) return 0;
  const items: SessionTab[] = Array.isArray(s.tabs)
    ? s.tabs
    : Array.isArray(s.paths)
      ? s.paths.map((p) => ({ path: p }))
      : [];
  const loaded = await Promise.all(
    items.map((it) =>
      it && it.path
        ? readTextFile(it.path, it.encoding && it.encoding !== "utf-8" ? it.encoding : undefined).then(
            (data) => ({ it, data }),
            () => ({ it, data: null }),
          )
        : Promise.resolve({ it, data: null }),
    ),
  );
  let missing = 0;
  const made: number[] = [];
  for (const { it, data } of loaded) {
    if (!it) continue;
    const hasDraft = typeof it.draft === "string";
    if (it.path && !data && !hasDraft) {
      missing++;
      continue;
    }
    const disk = data ? data.content : "";
    const doc = createDoc({
      path: it.path || null,
      content: hasDraft ? (it.draft as string) : disk,
      saved: disk,
      eol: it.eol === "lf" || it.eol === "crlf" ? it.eol : data?.eol,
      encoding: data?.encoding ?? it.encoding,
      mtime: data?.mtime ?? null,
    });
    if (it.forced) useDocs.setState((st) => ({ docs: st.docs.map((d) => (d.id === doc.id ? { ...d, forced: true, dirty: true } : d)) }));
    viewState.set(doc.id, {
      sel: Array.isArray(it.sel) ? [it.sel[0] | 0, it.sel[1] | 0] : [0, 0],
      scroll: Array.isArray(it.scroll) ? [it.scroll[0] | 0, it.scroll[1] | 0] : [0, 0],
    });
    made.push(doc.id);
  }
  if (made.length) setActiveId(made[Math.min(Math.max(0, (s.active ?? 0) | 0), made.length - 1)]);
  if (missing) toast.warning(t("session.missing", { n: missing }));
  return made.length;
}
