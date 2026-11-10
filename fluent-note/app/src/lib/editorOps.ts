import { activeEditor } from "./editors";
import { useCursor, toast } from "../store/ui";
import { t } from "./i18n";
import { clamp } from "./utils";

/* ---------- status bar statistics ---------- */
let raf = 0;
export function scheduleStatus() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    computeStatus();
  });
}

function countWords(v: string): number {
  let n = 0;
  let inWord = false;
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    const space = c <= 32 || c === 160;
    if (!space && !inWord) n++;
    inWord = !space;
  }
  return n;
}

let wordsCache = { text: "", n: 0 };

function computeStatus() {
  const ta = activeEditor();
  if (!ta) {
    useCursor.setState({ ln: 1, col: 1, sel: 0, chars: 0, words: 0 });
    return;
  }
  const v = ta.value;
  const pos = ta.selectionStart;
  let ln = 1;
  let last = -1;
  for (let i = v.indexOf("\n"); i !== -1 && i < pos; i = v.indexOf("\n", i + 1)) {
    ln++;
    last = i;
  }
  if (wordsCache.text !== v) wordsCache = { text: v, n: countWords(v) };
  useCursor.setState({
    ln,
    col: pos - last,
    sel: ta.selectionEnd - ta.selectionStart,
    chars: v.length,
    words: wordsCache.n,
  });
}

/* ---------- scrolling a character index into view (works without focus) ---------- */
let mirror: HTMLDivElement | null = null;

export function scrollToIndex(ta: HTMLTextAreaElement, index: number, center = true) {
  if (!mirror) {
    mirror = document.createElement("div");
    mirror.className = "editor-text editor-mirror";
    document.body.appendChild(mirror);
  }
  const cs = getComputedStyle(ta);
  mirror.style.cssText = `position:fixed;left:-99999px;top:0;visibility:hidden;pointer-events:none;overflow:hidden;width:${ta.clientWidth}px;` +
    `font:${cs.font};letter-spacing:${cs.letterSpacing};tab-size:${cs.tabSize};padding:${cs.padding};` +
    `white-space:${ta.wrap === "off" ? "pre" : "pre-wrap"};overflow-wrap:break-word;box-sizing:border-box;`;
  mirror.textContent = ta.value.slice(0, index);
  const marker = document.createElement("span");
  marker.textContent = "\u200b";
  mirror.appendChild(marker);
  const top = marker.offsetTop;
  const left = marker.offsetLeft;
  const lh = parseFloat(cs.lineHeight) || 24;
  if (center) ta.scrollTop = clamp(top - ta.clientHeight / 2 + lh, 0, ta.scrollHeight);
  else if (top < ta.scrollTop) ta.scrollTop = top;
  else if (top + lh * 2 > ta.scrollTop + ta.clientHeight) ta.scrollTop = top - ta.clientHeight + lh * 2;
  if (ta.wrap === "off") {
    if (left < ta.scrollLeft || left > ta.scrollLeft + ta.clientWidth - 40) ta.scrollLeft = Math.max(0, left - ta.clientWidth / 2);
  }
  mirror.textContent = "";
}

export function lineCount(v: string) {
  let n = 1;
  for (let i = v.indexOf("\n"); i !== -1; i = v.indexOf("\n", i + 1)) n++;
  return n;
}

export function goToLine(line: number) {
  const ta = activeEditor();
  if (!ta) return;
  const v = ta.value;
  let idx = 0;
  for (let l = 1; l < line; l++) {
    const nx = v.indexOf("\n", idx);
    if (nx === -1) break;
    idx = nx + 1;
  }
  ta.focus();
  ta.setSelectionRange(idx, idx);
  scrollToIndex(ta, idx);
  scheduleStatus();
}

/* ---------- editing helpers (execCommand keeps native undo/redo working) ---------- */
export function insertText(ta: HTMLTextAreaElement, text: string) {
  ta.focus();
  if (!document.execCommand("insertText", false, text)) {
    ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, "end");
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

export function exec(cmd: "undo" | "redo" | "cut" | "copy" | "delete" | "selectAll") {
  const ta = activeEditor();
  if (!ta) return;
  ta.focus();
  document.execCommand(cmd === "selectAll" ? "selectAll" : cmd);
}

export async function pasteFromClipboard() {
  const ta = activeEditor();
  if (!ta) return;
  try {
    const text = await navigator.clipboard.readText();
    insertText(ta, text);
  } catch {
    toast.warning(t("err.paste"));
  }
}

export function insertTimeDate() {
  const ta = activeEditor();
  if (!ta) return;
  const lang = document.documentElement.lang || "en";
  insertText(ta, new Date().toLocaleString(lang === "vi" ? "vi-VN" : undefined));
}

function lineBounds(v: string, s: number, e: number): [number, number] {
  const start = v.lastIndexOf("\n", s - 1) + 1;
  let end = v.indexOf("\n", e > s && v[e - 1] === "\n" ? e - 1 : e);
  if (end === -1) end = v.length;
  return [start, end];
}

export function duplicateLine() {
  const ta = activeEditor();
  if (!ta) return;
  const [start, end] = lineBounds(ta.value, ta.selectionStart, ta.selectionEnd);
  const block = ta.value.slice(start, end);
  ta.focus();
  ta.setSelectionRange(end, end);
  insertText(ta, "\n" + block);
}

export function deleteLine() {
  const ta = activeEditor();
  if (!ta) return;
  const v = ta.value;
  const [start, end] = lineBounds(v, ta.selectionStart, ta.selectionEnd);
  const from = end < v.length ? start : Math.max(0, start - 1);
  const to = end < v.length ? end + 1 : end;
  ta.focus();
  ta.setSelectionRange(from, to);
  document.execCommand("delete");
}

export function transformCase(mode: "upper" | "lower") {
  const ta = activeEditor();
  if (!ta) return;
  const { selectionStart: s, selectionEnd: e } = ta;
  if (s === e) return;
  const sel = ta.value.slice(s, e);
  ta.focus();
  insertText(ta, mode === "upper" ? sel.toLocaleUpperCase() : sel.toLocaleLowerCase());
  ta.setSelectionRange(s, s + sel.length);
}

export function printActive() {
  const ta = activeEditor();
  if (!ta) return;
  const holder = document.createElement("pre");
  holder.id = "print-root";
  holder.textContent = ta.value;
  document.body.appendChild(holder);
  const done = () => {
    holder.remove();
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  window.print();
}
