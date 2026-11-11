import { ed, errText } from './editor';
import { analyze, escapeText, indentString, parseJson, stringifyNode, unescapeText } from './json';
import { t } from './i18n';
import { copyText, toast } from './ui';
import { settings } from './settings';

const indent = () => indentString(settings.indent);

/** Toolbar actions give feedback through the editor flash only — no toast. Errors still use toasts. */
function done(_msg?: Parameters<typeof t>[0]) { ed.flash(); }

/** Parse the whole document; falls back to the lenient parser so Format also repairs. */
function parsed(): { node: ReturnType<typeof parseJson>; repaired: boolean } | null {
  const text = ed.text();
  if (!text.trim()) return null;
  const r = analyze(text);
  if (r.ok && r.node) return { node: r.node, repaired: false };
  if (r.repairable) return { node: parseJson(text, { lenient: true }), repaired: true };
  if (r.error) toast(`${t('toast.invalid')} — ${errText(r.error)} (${r.error.line}:${r.error.col})`, 'error');
  return null;
}

export function format() {
  const p = parsed(); if (!p) return;
  ed.replaceAll(stringifyNode(p.node, { indent: indent() }));
  done(p.repaired ? 'toast.repaired' : 'toast.formatted');
}
export function minify() {
  const p = parsed(); if (!p) return;
  ed.replaceAll(stringifyNode(p.node));
  done(p.repaired ? 'toast.repaired' : 'toast.minified');
}
export function sortKeys(order: 'asc' | 'desc') {
  const p = parsed(); if (!p) return;
  const minified = !ed.text().includes('\n');
  ed.replaceAll(stringifyNode(p.node, { indent: minified ? '' : indent(), sort: order }));
  done('toast.sorted');
}
export function repair() {
  const text = ed.text();
  if (!text.trim()) return;
  try {
    const node = parseJson(text, { lenient: true });
    ed.replaceAll(stringifyNode(node, { indent: indent() }));
    done('toast.repaired');
  } catch { toast(t('toast.cantRepair'), 'error'); }
}
export function escapeSel() {
  const s = ed.selection();
  const text = s.empty ? ed.text() : ed.state.sliceDoc(s.from, s.to);
  if (!text) return;
  const out = escapeText(text);
  if (s.empty) ed.replaceAll(out); else ed.replaceRange(s.from, s.to, out);
  done('toast.escaped');
}
export function unescapeSel() {
  const s = ed.selection();
  const text = s.empty ? ed.text() : ed.state.sliceDoc(s.from, s.to);
  if (!text) return;
  try {
    const out = unescapeText(text);
    if (s.empty) ed.replaceAll(out); else ed.replaceRange(s.from, s.to, out);
    done('toast.unescaped');
  } catch { toast(t('toast.cantUnescape'), 'error'); }
}
export async function copyDoc() {
  const s = ed.selection();
  const text = s.empty ? ed.text() : ed.state.sliceDoc(s.from, s.to);
  if (!text) return toast(t('toast.nothingToCopy'), 'warning');
  if (!(await copyText(text))) toast(t('toast.pasteFail'), 'warning');
}
export async function pasteDoc() {
  try {
    const text = await navigator.clipboard.readText();
    if (!text) return;
    ed.view.dispatch(ed.view.state.replaceSelection(text));
    ed.focus();
  } catch { toast(t('toast.pasteFail'), 'warning'); }
}
