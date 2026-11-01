import { marked, type Token, type Tokens } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import { createElement, Copy, Info, Lightbulb, MessageSquareWarning, TriangleAlert, OctagonAlert } from 'lucide';
import { api, isTauri } from './tauri';
import { t } from './i18n';
import { esc } from './utils';

import js from 'highlight.js/lib/languages/javascript';
import ts from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import shell from 'highlight.js/lib/languages/shell';
import powershell from 'highlight.js/lib/languages/powershell';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import md from 'highlight.js/lib/languages/markdown';
import yaml from 'highlight.js/lib/languages/yaml';
import sql from 'highlight.js/lib/languages/sql';
import diff from 'highlight.js/lib/languages/diff';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import cs from 'highlight.js/lib/languages/csharp';
import ini from 'highlight.js/lib/languages/ini';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import php from 'highlight.js/lib/languages/php';
import kotlin from 'highlight.js/lib/languages/kotlin';
import swift from 'highlight.js/lib/languages/swift';

const LANGS: Record<string, Parameters<typeof hljs.registerLanguage>[1]> = { javascript: js, typescript: ts, json, bash, shell, powershell, python, rust, css, xml, markdown: md, yaml, sql, diff, go, java, c, cpp, csharp: cs, ini, dockerfile, php, kotlin, swift };
for (const [k, v] of Object.entries(LANGS)) hljs.registerLanguage(k, v);
const ALIAS: Record<string, string> = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', sh: 'bash', zsh: 'bash', ps1: 'powershell', py: 'python', rs: 'rust', html: 'xml', svg: 'xml', yml: 'yaml', md: 'markdown', toml: 'ini', 'c++': 'cpp', 'c#': 'csharp', kt: 'kotlin', docker: 'dockerfile' };
const resolveLang = (l: string) => { const k = ALIAS[l.toLowerCase()] || l.toLowerCase(); return hljs.getLanguage(k) ? k : ''; };

marked.use({ gfm: true, breaks: false });

const BLOCK_TAGS = /^(div|details|section|center|table|blockquote|article|aside|figure|header|footer|nav|ul|ol|pre|p|a|span|summary|form|dl)$/;
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-') || 'section';

function inlineText(tokens?: Token[]): string {
  let o = '';
  for (const k of tokens || []) {
    const tk = k as Tokens.Generic;
    if (tk.tokens) o += inlineText(tk.tokens);
    else if (k.type === 'html' || k.type === 'br') o += '';
    else o += tk.text ?? tk.raw ?? '';
  }
  return o;
}
const nl = (s: string) => { let n = 0, i = -1; while ((i = s.indexOf('\n', i + 1)) !== -1) n++; return n; };

/** Counts opened minus closed HTML tags of an html token, to keep split HTML blocks together. */
function balance(raw: string, open: Record<string, number>) {
  const re = /<(\/?)([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g; let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const tag = m[2].toLowerCase();
    if (!BLOCK_TAGS.test(tag) || m[3] || /^(br|hr|img|input)$/.test(tag)) continue;
    open[tag] = (open[tag] || 0) + (m[1] ? -1 : 1);
  }
}
const unbalanced = (open: Record<string, number>) => Object.values(open).some((v) => v > 0);

export interface Heading { level: number; text: string; slug: string; line: number }
export interface Block { line: number; kind: 'fm' | 'blk'; fm?: string; group: Token[]; key: string; heading?: Heading }
export interface Parsed { blocks: Block[]; outline: Heading[] }

/** Lexes Markdown once. Returns top level blocks (with their 1-based source line) and the outline. */
export function parseDoc(text: string): Parsed {
  let fm = '', fmLines = 0;
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/);
  if (m) { fm = m[1]; fmLines = nl(m[0]); text = text.slice(m[0].length); }
  const tokens = marked.lexer(text);
  const blocks: Block[] = [], outline: Heading[] = [], used = new Set<string>();
  let line = fmLines + 1;
  if (fm) blocks.push({ line: 1, key: 'fm:' + fm, kind: 'fm', fm, group: [] });
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i], start = line;
    line += nl(tok.raw);
    if (tok.type === 'space' || tok.type === 'def') continue;
    const group: Token[] = [tok];
    if (tok.type === 'html') {
      const open: Record<string, number> = {}; balance(tok.raw, open);
      let guard = 0;
      while (unbalanced(open) && i + 1 < tokens.length && guard++ < 400) {
        const nx = tokens[++i]; line += nl(nx.raw); group.push(nx);
        if (nx.type === 'html') balance(nx.raw, open);
      }
    }
    const b: Block = { line: start, kind: 'blk', group, key: '' };
    if (tok.type === 'heading') {
      const h = tok as Tokens.Heading;
      const txt = inlineText(h.tokens).trim() || h.text;
      const base = slugify(txt); let id = base, n = 1; while (used.has(id)) id = base + '-' + ++n; used.add(id);
      b.heading = { level: h.depth, text: txt, slug: id, line: start };
      outline.push(b.heading);
    }
    blocks.push(b);
  }
  return { blocks, outline };
}

const ALERTS: Record<string, Parameters<typeof createElement>[0]> = { note: Info, tip: Lightbulb, important: MessageSquareWarning, warning: TriangleAlert, caution: OctagonAlert };
export const svgIcon = (node: Parameters<typeof createElement>[0], size = 18) => {
  const el = createElement(node); el.setAttribute('width', String(size)); el.setAttribute('height', String(size)); return el;
};
const iconHtml = (node: Parameters<typeof createElement>[0], size = 18) => svgIcon(node, size).outerHTML;

function renderBlock(b: Block) {
  if (b.kind === 'fm') return `<details class="fm"><summary>Front matter</summary><pre><code>${esc(b.fm || '')}</code></pre></details>`;
  return DOMPurify.sanitize(marked.parser(b.group as Token[]), { ADD_ATTR: ['target'] });
}

interface Cur { key: string; el: HTMLElement; line: number }

export class Preview {
  private cur: Cur[] = [];
  private imgCache = new Map<string, string>();
  private docPath = '';
  constructor(private root: HTMLElement, private scroller: HTMLElement) {}

  private loadImg(img: HTMLImageElement) {
    const s = img.getAttribute('src');
    if (!s || /^(https?:|data:|blob:|\/\/)/i.test(s) || !isTauri || !this.docPath) return;
    const ck = this.docPath + '|' + s;
    const hit = this.imgCache.get(ck);
    if (hit) { img.src = hit; return; }
    img.removeAttribute('src');
    api.asset(this.docPath, s).then(([mime, b64]) => {
      const url = `data:${mime};base64,${b64}`;
      if (this.imgCache.size > 80) this.imgCache.delete(this.imgCache.keys().next().value as string);
      this.imgCache.set(ck, url); img.src = url;
    }).catch(() => { img.alt = (img.alt || s) + ' (?)'; });
  }

  private enhance(el: HTMLElement) {
    el.querySelectorAll<HTMLElement>('pre > code').forEach((c) => {
      const pre = c.parentElement as HTMLElement, raw = (c.className.match(/language-([\w+#.-]+)/) || [])[1] || '';
      const lg = raw ? resolveLang(raw) : '';
      if (lg) { try { c.innerHTML = hljs.highlight(c.textContent || '', { language: lg, ignoreIllegals: true }).value; c.classList.add('hljs'); } catch { /* ignore */ } }
      const w = document.createElement('div'); w.className = 'cb';
      w.innerHTML = `<div class="ch"><span>${esc(raw || 'text')}</span><button class="cp" type="button">${iconHtml(Copy, 14)}<span>${esc(t('copy'))}</span></button></div>`;
      pre.replaceWith(w); w.append(pre);
    });
    el.querySelectorAll('table').forEach((tb) => { const w = document.createElement('div'); w.className = 'tw'; tb.replaceWith(w); w.append(tb); });
    el.querySelectorAll<HTMLImageElement>('img[src]').forEach((i) => this.loadImg(i));
    el.querySelectorAll('blockquote').forEach((q) => {
      const p = q.firstElementChild as HTMLElement | null, mm = p && /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i.exec(p.textContent || '');
      if (!p || !mm) return;
      const kind = mm[1].toLowerCase();
      p.innerHTML = p.innerHTML.replace(/^\s*\[!\w+\]\s*(<br\s*\/?>)?\s*/i, '');
      if (!(p.textContent || '').trim()) p.remove();
      q.classList.add('alert', kind);
      const title = document.createElement('div'); title.className = 'at';
      title.innerHTML = iconHtml(ALERTS[kind], 18) + `<span>${esc(t(('alert_' + kind) as 'alert_note'))}</span>`;
      q.prepend(title);
    });
    el.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((c) => { c.disabled = true; });
  }

  private make(b: Block) {
    const el = document.createElement('div');
    el.className = 'blk' + (b.heading ? ' h' : '');
    el.innerHTML = renderBlock(b);
    this.enhance(el);
    return el;
  }

  /** Patches the DOM so that only changed blocks are rebuilt (no flicker; scroll position and images stay). */
  render(parsed: Parsed, path: string) {
    this.docPath = path;
    const next = parsed.blocks, cur = this.cur;
    for (const b of next) b.key = b.kind === 'fm' ? b.key : b.group.map((g) => g.raw).join('') + (b.heading ? '#' : '');
    let p = 0;
    while (p < cur.length && p < next.length && cur[p].key === next[p].key) p++;
    let so = cur.length, sn = next.length;
    while (so > p && sn > p && cur[so - 1].key === next[sn - 1].key) { so--; sn--; }
    for (let i = p; i < so; i++) cur[i].el.remove();
    const anchor = so < cur.length ? cur[so].el : null;
    const frag = document.createDocumentFragment(), out: Cur[] = [];
    for (let i = 0; i < p; i++) out.push(cur[i]);
    for (let i = p; i < sn; i++) { const el = this.make(next[i]); frag.append(el); out.push({ key: next[i].key, el, line: 0 }); }
    for (let i = so; i < cur.length; i++) out.push(cur[i]);
    this.root.insertBefore(frag, anchor);
    this.cur = out;
    out.forEach((o, i) => {
      o.line = next[i].line; o.el.dataset.line = String(next[i].line);
      const h = next[i].heading; if (h && o.el.firstElementChild) o.el.firstElementChild.id = h.slug;
    });
  }
  clear() { this.root.innerHTML = ''; this.cur = []; }
  yForLine(line: number) {
    const cur = this.cur; if (!cur.length) return 0;
    let i = cur.length - 1;
    while (i > 0 && cur[i].line > line) i--;
    const a = cur[i].el, top = a.offsetTop, h = a.offsetHeight;
    const nextLine = i + 1 < cur.length ? cur[i + 1].line : cur[i].line + 1;
    const f = Math.max(0, Math.min(1, (line - cur[i].line) / Math.max(1, nextLine - cur[i].line)));
    return top + h * f;
  }
  lineForY(y: number) {
    const cur = this.cur; if (!cur.length) return 1;
    let i = 0;
    while (i + 1 < cur.length && cur[i + 1].el.offsetTop <= y) i++;
    const a = cur[i], h = Math.max(1, a.el.offsetHeight);
    const nextLine = i + 1 < cur.length ? cur[i + 1].line : a.line + 1;
    return a.line + Math.max(0, Math.min(1, (y - a.el.offsetTop) / h)) * (nextLine - a.line);
  }
  elForLine(line: number) { return this.cur.find((c) => c.line === line)?.el || null; }
  get scrollEl() { return this.scroller; }
}
