import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useDocs, type Doc } from "../store/docs";
import { useSettings } from "../store/settings";
import { useFind, useUi } from "../store/ui";
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

export const Editor = memo(function Editor() {
  const t = useT();
  const docs = useDocs((s) => s.docs);
  const activeId = useDocs((s) => s.activeId);
  const wrap = useSettings((s) => s.wrap);
  const spellcheck = useSettings((s) => s.spellcheck);
  const zen = useUi((s) => s.zen);
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
    <div ref={box} className={cn("relative min-h-0 min-w-0 flex-1 overflow-hidden bg-surface", zen && "zen-mode")}>
      <HighlightLayer activeId={activeId} wrap={wrap} />
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
          "ripple absolute bottom-5 right-6 z-10 grid h-12 w-12 place-items-center rounded-2xl bg-primary-container text-on-primary-container shadow-e3 transition-all duration-300 ease-spring active:scale-90 active:rounded-full",
          scrolled ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-6 scale-75 opacity-0",
        )}
      >
        <ArrowUp size={22} strokeWidth={2.4} />
      </button>
    </div>
  );
});
