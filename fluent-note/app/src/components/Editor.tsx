import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUp } from "./ui/icons";
import { useDocs, type Doc } from "../store/docs";
import { useSettings } from "../store/settings";
import { useCursor, useFind, useUi } from "../store/ui";
import { editors, viewState } from "../lib/editors";
import { onEdit, zoomBy } from "../lib/actions";
import { scheduleStatus, insertText } from "../lib/editorOps";
import { allMatches, buildRegex } from "../lib/find";
import { useT } from "../lib/i18n";
import { cn } from "../lib/utils";
import { FindBar } from "./FindBar";
import { EmptyState } from "./EmptyState";

const EditorPane = memo(function EditorPane({ doc, active, wrap, spellcheck, onScrolled }: {
  doc: Doc; active: boolean; wrap: boolean; spellcheck: boolean; onScrolled: (v: boolean) => void;
}) {
  const ref = useCallback(
    (el: HTMLTextAreaElement | null) => {
      if (el) editors.set(doc.id, el);
      else editors.delete(doc.id);
    },
    [doc.id],
  );

  // restore cursor + scroll when a tab becomes active
  useLayoutEffect(() => {
    if (!active) return;
    const ta = editors.get(doc.id);
    if (!ta) return;
    const v = viewState.get(doc.id);
    if (v) {
      ta.setSelectionRange(Math.min(v.sel[0], ta.value.length), Math.min(v.sel[1], ta.value.length));
      ta.scrollTop = v.scroll[0];
      ta.scrollLeft = v.scroll[1];
    }
    const ui = useUi.getState();
    if (!ui.settingsOpen && !ui.aboutOpen && !ui.gotoOpen && !ui.paletteOpen && !ui.confirm && !document.activeElement?.closest("[data-find]")) ta.focus({ preventScroll: true });
    onScrolled(ta.scrollTop > 1200);
    scheduleStatus();
  }, [active, doc.id, onScrolled]);

  return (
    <textarea
      ref={ref}
      hidden={!active}
      className="editor-text"
      defaultValue={doc.initial}
      wrap={wrap ? "soft" : "off"}
      spellCheck={spellcheck}
      autoCapitalize="off"
      autoCorrect="off"
      aria-label="Editor"
      data-gramm="false"
      onInput={() => onEdit(doc.id)}
      onScroll={(e) => active && onScrolled(e.currentTarget.scrollTop > 1200)}
      onSelect={scheduleStatus}
      onKeyUp={scheduleStatus}
      onMouseUp={scheduleStatus}
      onKeyDown={(e) => {
        if (e.key === "Tab" && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          insertText(e.currentTarget, "\t");
        }
      }}
    />
  );
});

/** Draws the find matches behind the (transparent) textarea. */
function HighlightLayer({ activeId, wrap }: { activeId: number | null; wrap: boolean }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const open = useFind((f) => f.open);
  const query = useFind((f) => f.query);
  const matchCase = useFind((f) => f.matchCase);
  const wholeWord = useFind((f) => f.wholeWord);
  const regex = useFind((f) => f.regex);
  const rev = useUi((u) => u.editRev);
  const zoom = useSettings((s) => s.zoom);
  const font = useSettings((s) => s.font);
  const size = useSettings((s) => s.textSize);

  useEffect(() => {
    const inner = innerRef.current;
    const ta = activeId === null ? undefined : editors.get(activeId);
    if (!inner) return;
    inner.textContent = "";
    if (!open || !query || !ta) return;
    const re = buildRegex({ query, matchCase, wholeWord, regex });
    if (!re || re === "invalid") return;
    const text = ta.value;
    const ms = allMatches(text, re);
    inner.style.width = ta.clientWidth + "px";
    const frag = document.createDocumentFragment();
    let pos = 0;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    for (const [a, b] of ms) {
      if (a > pos) frag.appendChild(document.createTextNode(text.slice(pos, a)));
      const mark = document.createElement("mark");
      if (a === s && b === e) mark.className = "cur";
      mark.textContent = text.slice(a, b);
      frag.appendChild(mark);
      pos = b;
    }
    frag.appendChild(document.createTextNode(text.slice(pos) + "\n "));
    inner.appendChild(frag);
    inner.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
  }, [open, query, matchCase, wholeWord, regex, rev, activeId, wrap, zoom, font, size]);

  useEffect(() => {
    const ta = activeId === null ? undefined : editors.get(activeId);
    const inner = innerRef.current;
    if (!ta || !inner) return;
    const sync = () => {
      inner.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
    };
    const ro = new ResizeObserver(() => {
      inner.style.width = ta.clientWidth + "px";
    });
    ro.observe(ta);
    ta.addEventListener("scroll", sync, { passive: true });
    return () => {
      ta.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [activeId]);

  return (
    <div className="hl-layer" aria-hidden>
      <div ref={innerRef} className={cn("editor-text hl-inner absolute left-0 top-0", !wrap && "nowrap")} />
    </div>
  );
}

/** Line numbers beside the text. Numbers are per logical line; with word wrap the real wrapped heights are measured
 *  (in a hidden mirror of the text) so every number stays level with the first row of its line. */
const MAX_WRAPPED_LINES = 40000;

function Gutter({ activeId, wrap }: { activeId: number | null; wrap: boolean }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const rev = useUi((u) => u.editRev);
  const zoom = useSettings((s) => s.zoom);
  const font = useSettings((s) => s.font);
  const size = useSettings((s) => s.textSize);
  const cur = useCursor((c) => c.ln);
  // tops === null -> every line has the same height (no wrapping)
  const lay = useRef<{ n: number; lh: number; top: number; tops: number[] | null; hidden: boolean }>({ n: 1, lh: 24, top: 12, tops: null, hidden: false });
  const [range, setRange] = useState<[number, number]>([0, 60]);
  const [, bump] = useState(0);
  const remeasure = useRef<() => void>(() => {});

  useEffect(() => {
    const ta = activeId === null ? undefined : editors.get(activeId);
    const inner = innerRef.current;
    if (!ta || !inner) return;
    let timer = 0;
    let raf = 0;

    const topOf = (i: number) => (lay.current.tops ? lay.current.tops[i] : i * lay.current.lh);
    const visibleRange = (): [number, number] => {
      const { n, lh } = lay.current;
      const from = ta.scrollTop - lay.current.top;
      const to = from + ta.clientHeight;
      let a: number;
      if (!lay.current.tops) a = Math.floor(from / lh);
      else {
        let lo = 0;
        let hi = n - 1;
        while (lo < hi) {
          const mid = (lo + hi + 1) >> 1;
          if (lay.current.tops[mid] <= from) lo = mid;
          else hi = mid - 1;
        }
        a = lo;
      }
      let b = a;
      while (b < n - 1 && topOf(b + 1) < to) b++;
      return [Math.max(0, a - 20), Math.min(n - 1, b + 20)];
    };
    const syncScroll = () => {
      inner.style.transform = `translateY(${-ta.scrollTop}px)`;
      const [a, b] = visibleRange();
      setRange((r) => (r[0] <= a + 8 && r[1] >= b - 8 && r[0] >= a - 60 && r[1] <= b + 60 ? r : [a, b]));
    };
    const onScroll = () => {
      inner.style.transform = `translateY(${-ta.scrollTop}px)`;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(syncScroll);
    };

    const compute = () => {
      const cs = getComputedStyle(ta);
      const lh = parseFloat(cs.lineHeight) || 24;
      const top = parseFloat(cs.paddingTop) || 0;
      const text = ta.value;
      let n = 1;
      for (let i = text.indexOf("\n"); i !== -1; i = text.indexOf("\n", i + 1)) n++;
      ta.parentElement?.style.setProperty("--gd", String(Math.max(2, String(n).length)));
      let tops: number[] | null = null;
      let hidden = false;
      if (wrap) {
        if (n > MAX_WRAPPED_LINES) hidden = true;
        else {
          const m = document.createElement("div");
          m.className = "editor-text";
          const w = ta.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
          m.style.cssText = `position:absolute;left:0;top:0;visibility:hidden;pointer-events:none;padding:0;width:${Math.max(0, w)}px;white-space:pre-wrap;overflow-wrap:break-word;`;
          const frag = document.createDocumentFragment();
          for (const line of text.split("\n")) {
            const d = document.createElement("div");
            d.textContent = line === "" ? " " : line;
            frag.appendChild(d);
          }
          m.appendChild(frag);
          ta.parentElement?.appendChild(m);
          const kids = m.children;
          tops = new Array<number>(kids.length);
          for (let i = 0; i < kids.length; i++) tops[i] = (kids[i] as HTMLElement).offsetTop;
          m.remove();
        }
      }
      lay.current = { n, lh, top, tops, hidden };
      inner.style.top = top + "px";
      bump((x) => x + 1);
      syncScroll();
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = window.setTimeout(compute, 40);
    };

    compute();
    remeasure.current = schedule;
    const ro = new ResizeObserver(schedule);
    ro.observe(ta);
    ta.addEventListener("scroll", onScroll, { passive: true });
    ta.addEventListener("input", schedule);
    void document.fonts?.ready.then(schedule);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      ro.disconnect();
      ta.removeEventListener("scroll", onScroll);
      ta.removeEventListener("input", schedule);
    };
  }, [activeId, wrap]);

  // text, font or size changed: remeasure (debounced)
  useEffect(() => {
    remeasure.current();
  }, [rev, zoom, font, size]);

  const { n, lh, tops, hidden } = lay.current;
  const items: ReactNode[] = [];
  if (!hidden) {
    for (let i = range[0]; i <= Math.min(range[1], n - 1); i++) {
      items.push(
        <div key={i} className={cn("gutter-n", i + 1 === cur && "cur")} style={{ top: tops ? tops[i] : i * lh }}>
          {i + 1}
        </div>,
      );
    }
  }
  return (
    <div className="gutter" aria-hidden>
      <div ref={innerRef} className="gutter-inner">
        {items}
      </div>
    </div>
  );
}

export const Editor = memo(function Editor() {
  const t = useT();
  const docs = useDocs((s) => s.docs);
  const activeId = useDocs((s) => s.activeId);
  const wrap = useSettings((s) => s.wrap);
  const spellcheck = useSettings((s) => s.spellcheck);
  const zen = useUi((s) => s.zen);
  const lineNumbers = useSettings((s) => s.lineNumbers) && !zen;
  const box = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  // Ctrl + mouse wheel zooms the text (needs a non-passive listener)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? 10 : -10);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);

  const toTop = () => {
    const ta = activeId === null ? undefined : editors.get(activeId);
    ta?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div ref={box} className={cn("relative min-h-0 min-w-0 flex-1 overflow-hidden bg-layer", zen && "zen-mode", lineNumbers && "has-gutter")}>
      <HighlightLayer activeId={activeId} wrap={wrap} />
      {lineNumbers && <Gutter activeId={activeId} wrap={wrap} />}
      {docs.map((d) => (
        <EditorPane key={d.id} doc={d} active={d.id === activeId} wrap={wrap} spellcheck={spellcheck} onScrolled={setScrolled} />
      ))}
      <EmptyState />
      <FindBar />
      <button
        type="button"
        aria-label={t("common.scrollTop")}
        data-tip={t("common.scrollTop")}
        data-tip-pos="top"
        tabIndex={scrolled ? 0 : -1}
        onClick={toTop}
        className={cn(
          "fl-ctl absolute bottom-5 right-6 z-10 grid h-9 w-9 place-items-center rounded shadow-fl8 transition-[transform,opacity] duration-150 ease-decel",
          scrolled ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        )}
      >
        <ArrowUp size={17} strokeWidth={1.8} />
      </button>
    </div>
  );
});
