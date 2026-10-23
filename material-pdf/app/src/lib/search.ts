import { useStore, type Doc, type SearchHit } from "./store";
import { gotoPage } from "./actions";

let token = 0;
export async function runSearch(doc: Doc, q: string) {
  const my = ++token, s = useStore.getState().setSearch;
  s({ q, hits: [], cur: -1, busy: !!q.trim() });
  if (!q.trim()) return;
  const lq = q.toLowerCase(), hits: SearchHit[] = [];
  for (let i = 0; i < doc.numPages; i++) {
    if (my !== token) return;
    const tc = await (await doc.pdf.getPage(i + 1)).getTextContent();
    let idx = 0;
    for (const it of tc.items) {
      if ("str" in it && it.str.trim() && it.str.toLowerCase().includes(lq)) hits.push({ page: i, idx: idx++, snippet: it.str.trim().slice(0, 90) });
    }
    if (hits.length && (i % 15 === 0 || i === doc.numPages - 1)) {
      if (my !== token) return;
      const first = useStore.getState().search.cur < 0;
      s({ hits: [...hits], cur: first ? 0 : useStore.getState().search.cur, jump: useStore.getState().search.jump + (first ? 1 : 0) });
      if (first) gotoPage(hits[0].page);
    }
  }
  if (my === token) s({ hits: [...hits], busy: false });
}
export function stepHit(d: 1 | -1) {
  const { search, setSearch } = useStore.getState();
  if (!search.hits.length) return;
  const cur = (search.cur + d + search.hits.length) % search.hits.length;
  setSearch({ cur, jump: search.jump + 1 });
  gotoPage(search.hits[cur].page);
}
export const cancelSearch = () => { token++; };
