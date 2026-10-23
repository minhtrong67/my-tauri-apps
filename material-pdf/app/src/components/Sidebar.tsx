import { useEffect, useRef, useState } from "react";
import { ChevronRight, FileSearch, List, LayoutGrid, Search as SearchIcon, ChevronUp, ChevronDown } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { gotoPage } from "../lib/actions";
import { runSearch, stepHit } from "../lib/search";
import { useStore, useT, type Doc, type SideTab } from "../lib/store";
import { Thumb } from "./Thumb";
import { IconButton } from "./ui";

interface OutlineNode { title: string; dest: any; items: OutlineNode[] }

function Outline({ doc }: { doc: Doc }) {
  const t = useT();
  const [tree, setTree] = useState<OutlineNode[] | null | undefined>(undefined);
  useEffect(() => { let on = true; setTree(undefined); doc.pdf.getOutline().then((o) => on && setTree(o as OutlineNode[] | null)); return () => { on = false; }; }, [doc.pdf]);
  const go = async (dest: any) => {
    try {
      const d = typeof dest === "string" ? await doc.pdf.getDestination(dest) : dest;
      if (d) gotoPage(await doc.pdf.getPageIndex(d[0]));
    } catch { /* ignore */ }
  };
  if (tree === undefined) return <div className="side-empty"><span className="spinner" /></div>;
  if (!tree?.length) return <div className="side-empty"><List size={36} /><p>{t("noOutline")}</p></div>;
  return <ul className="outline">{tree.map((n, i) => <OutlineItem key={i} n={n} go={go} depth={0} />)}</ul>;
}
function OutlineItem({ n, go, depth }: { n: OutlineNode; go: (d: any) => void; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  return (
    <li>
      <div className="outline-row ripple" style={{ paddingLeft: 8 + depth * 14 }} onClick={() => n.dest && go(n.dest)}>
        {n.items.length ? <button className={`chev ${open ? "open" : ""}`} onClick={(e) => { e.stopPropagation(); setOpen(!open); }}><ChevronRight size={16} /></button> : <span className="chev-sp" />}
        <span>{n.title}</span>
      </div>
      {open && n.items.length > 0 && <ul>{n.items.map((c, i) => <OutlineItem key={i} n={c} go={go} depth={depth + 1} />)}</ul>}
    </li>
  );
}

function Thumbs({ doc }: { doc: Doc }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sc = ref.current?.parentElement, el = ref.current?.querySelector<HTMLElement>(".thumb-item.on");
    if (!sc || !el) return;
    const r = el.getBoundingClientRect(), b = sc.getBoundingClientRect();
    if (r.top < b.top + 8) sc.scrollBy({ top: r.top - b.top - 12, behavior: "smooth" });
    else if (r.bottom > b.bottom - 8) sc.scrollBy({ top: r.bottom - b.bottom + 12, behavior: "smooth" });
  }, [doc.page]);
  return (
    <div className="thumbs" ref={ref}>
      {doc.sizes.map((s, i) => (
        <button key={`${doc.rev}-${i}`} className={`thumb-item ripple ${i === doc.page ? "on" : ""}`} onClick={() => gotoPage(i)}>
          <Thumb pdf={doc.pdf as PDFDocumentProxy} page={i + 1} width={140} size={s} rev={doc.rev} />
          <span>{i + 1}</span>
        </button>
      ))}
    </div>
  );
}

function Search({ doc }: { doc: Doc }) {
  const t = useT();
  const { search } = useStore();
  const [q, setQ] = useState(search.q);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); input.current?.select(); }, []);
  useEffect(() => { const id = setTimeout(() => q !== search.q && runSearch(doc, q), 260); return () => clearTimeout(id); }, [q]);
  useEffect(() => { if (!search.q) setQ(""); }, [search.q]);
  return (
    <div className="search-panel">
      <div className="search-box">
        <SearchIcon size={18} />
        <input ref={input} value={q} placeholder={t("search")} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { if (q !== search.q) runSearch(doc, q); else stepHit(e.shiftKey ? -1 : 1); } }} />
        <IconButton size="sm" icon={<ChevronUp size={18} />} label={t("prevPage")} onClick={() => stepHit(-1)} disabled={!search.hits.length} />
        <IconButton size="sm" icon={<ChevronDown size={18} />} label={t("nextPage")} onClick={() => stepHit(1)} disabled={!search.hits.length} />
      </div>
      <div className="search-meta">{search.busy ? t("searching") : q.trim() ? (search.hits.length ? `${search.cur + 1} / ${t("results", { n: search.hits.length })}` : t("noResults")) : ""}</div>
      <ul className="hits">
        {search.hits.slice(0, 400).map((h, i) => (
          <li key={i}>
            <button className={`hit-row ripple ${i === search.cur ? "on" : ""}`} onClick={() => { useStore.getState().setSearch({ cur: i, jump: search.jump + 1 }); gotoPage(h.page); }}>
              <b>{h.page + 1}</b><span>{h.snippet}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sidebar({ doc }: { doc: Doc }) {
  const t = useT();
  const { sidebarOpen, sideTab, setSidebar } = useStore();
  const tabs: { id: SideTab; icon: JSX.Element; label: string }[] = [
    { id: "thumbs", icon: <LayoutGrid size={20} />, label: t("thumbnails") },
    { id: "outline", icon: <List size={20} />, label: t("outline") },
    { id: "search", icon: <FileSearch size={20} />, label: t("search") },
  ];
  return (
    <aside className={`sidebar ${sidebarOpen ? "open" : ""}`} aria-hidden={!sidebarOpen}>
      <div className="side-inner">
        <nav className="side-tabs">
          {tabs.map((x) => (
            <button key={x.id} className={`side-tab ripple ${sideTab === x.id ? "on" : ""}`} title={x.label} aria-label={x.label} onClick={() => setSidebar(true, x.id)}>{x.icon}</button>
          ))}
        </nav>
        <div className="side-content" key={sideTab}>
          {sideTab === "thumbs" && <Thumbs doc={doc} />}
          {sideTab === "outline" && <Outline doc={doc} />}
          {sideTab === "search" && <Search doc={doc} />}
        </div>
      </div>
    </aside>
  );
}
