import { activeEditor } from "./editors";
import { scrollToIndex, scheduleStatus } from "./editorOps";
import { useFind, useUi, toast } from "../store/ui";
import { t } from "./i18n";

export const MAX_MATCHES = 5000;

export interface FindOpts {
  query: string;
  matchCase: boolean;
  wholeWord: boolean;
  regex: boolean;
}

export function buildRegex(o: FindOpts): RegExp | null | "invalid" {
  if (!o.query) return null;
  let src = o.regex ? o.query : o.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (o.wholeWord) src = `(?<![\\p{L}\\p{N}_])(?:${src})(?![\\p{L}\\p{N}_])`;
  try {
    const re = new RegExp(src, "gmu" + (o.matchCase ? "" : "i"));
    return re;
  } catch {
    return "invalid";
  }
}

export function allMatches(text: string, re: RegExp): [number, number][] {
  const out: [number, number][] = [];
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) && out.length < MAX_MATCHES) {
    if (m[0].length === 0) {
      re.lastIndex++;
      continue;
    }
    out.push([m.index, m.index + m[0].length]);
  }
  return out;
}

const opts = (): FindOpts => {
  const f = useFind.getState();
  return { query: f.query, matchCase: f.matchCase, wholeWord: f.wholeWord, regex: f.regex };
};

export function currentMatches(): [number, number][] {
  const ta = activeEditor();
  const re = buildRegex(opts());
  if (!ta || !re || re === "invalid") return [];
  return allMatches(ta.value, re);
}

/** Recomputes the match counter (and which match is "current"). */
export function refreshFind() {
  const ta = activeEditor();
  const re = buildRegex(opts());
  if (!ta || !re) {
    useFind.setState({ total: 0, current: 0, invalid: false });
    return;
  }
  if (re === "invalid") {
    useFind.setState({ total: 0, current: 0, invalid: true });
    return;
  }
  const ms = allMatches(ta.value, re);
  const s = ta.selectionStart;
  const e = ta.selectionEnd;
  let current = 0;
  const i = ms.findIndex((m) => m[0] === s && m[1] === e);
  if (i >= 0) current = i + 1;
  useFind.setState({ total: ms.length, current, invalid: false });
}

function select(ta: HTMLTextAreaElement, m: [number, number]) {
  ta.setSelectionRange(m[0], m[1]);
  scrollToIndex(ta, m[0]);
  scheduleStatus();
  useUi.setState((s) => ({ editRev: s.editRev + 1 }));
}

export function findStep(dir: 1 | -1) {
  const ta = activeEditor();
  if (!ta) return;
  const ms = currentMatches();
  if (!ms.length) {
    refreshFind();
    return;
  }
  const s = ta.selectionStart;
  const e = ta.selectionEnd;
  let pick: [number, number] | undefined;
  if (dir === 1) pick = ms.find((m) => m[0] >= e && !(m[0] === s && m[1] === e)) ?? ms.find((m) => m[0] >= e) ?? ms[0];
  else {
    for (let i = ms.length - 1; i >= 0; i--) {
      if (ms[i][1] <= s) {
        pick = ms[i];
        break;
      }
    }
    pick = pick ?? ms[ms.length - 1];
  }
  select(ta, pick);
  refreshFind();
}

/** Selects the first match at/after the caret while the user types in the find box. */
export function findFromCaret() {
  const ta = activeEditor();
  if (!ta) return;
  const ms = currentMatches();
  if (!ms.length) {
    refreshFind();
    return;
  }
  const s = ta.selectionStart;
  select(ta, ms.find((m) => m[0] >= s) ?? ms[0]);
  refreshFind();
}

export function replaceCurrent() {
  const ta = activeEditor();
  const f = useFind.getState();
  if (!ta) return;
  const re = buildRegex(opts());
  if (!re || re === "invalid") return;
  const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
  re.lastIndex = 0;
  const m = re.exec(sel);
  if (m && m[0] === sel && sel.length > 0) {
    const repl = f.regex ? sel.replace(new RegExp(re.source, re.flags.replace("g", "")), f.replace) : f.replace;
    ta.focus();
    document.execCommand("insertText", false, repl);
    useUi.setState((s) => ({ editRev: s.editRev + 1 }));
  }
  findStep(1);
}

export function replaceAll() {
  const ta = activeEditor();
  const f = useFind.getState();
  if (!ta) return;
  const re = buildRegex(opts());
  if (!re || re === "invalid") return;
  const n = allMatches(ta.value, re).length;
  if (!n) {
    toast.info(t("find.none"));
    return;
  }
  const next = ta.value.replace(re, f.regex ? f.replace : f.replace.replace(/\$/g, "$$$$"));
  ta.focus();
  const y = ta.scrollTop;
  ta.select();
  if (!document.execCommand("insertText", false, next)) {
    ta.value = next;
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }
  ta.scrollTop = y;
  toast.success(t("find.replaced", { n }));
  refreshFind();
}

export function openFind(replaceMode: boolean) {
  const ta = activeEditor();
  const f = useFind.getState();
  let query = f.query;
  if (ta && ta.selectionEnd > ta.selectionStart && ta.selectionEnd - ta.selectionStart < 200 && !ta.value.slice(ta.selectionStart, ta.selectionEnd).includes("\n")) {
    query = ta.value.slice(ta.selectionStart, ta.selectionEnd);
  }
  useFind.setState({ open: true, replaceMode: replaceMode || (f.open && f.replaceMode), query, focusTick: f.focusTick + 1 });
  queueMicrotask(refreshFind);
}

export function closeFind() {
  useFind.setState({ open: false });
  activeEditor()?.focus();
}
