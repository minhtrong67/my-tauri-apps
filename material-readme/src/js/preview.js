import { $, $$, esc, icon, hydrateIcons } from './util.js';
import { api, isTauri } from './bridge.js';
import { t } from './i18n.js';

const { marked, DOMPurify, hljs } = window;
marked.use({ gfm: true, breaks: false });

const BLOCK_TAGS = /^(div|details|section|center|table|blockquote|article|aside|figure|header|footer|nav|ul|ol|pre|p|a|span|summary|form|dl)$/;
const slugify = (s) => s.toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-') || 'section';

function inlineText(tokens) {
  let o = '';
  for (const k of tokens || []) {
    if (k.tokens) o += inlineText(k.tokens);
    else if (k.type === 'html' || k.type === 'br') o += '';
    else o += k.text ?? k.raw ?? '';
  }
  return o;
}
const nl = (s) => { let n = 0, i = -1; while ((i = s.indexOf('\n', i + 1)) !== -1) n++; return n; };

/** Counts opened minus closed HTML tags of an html token, to keep split HTML blocks together. */
function balance(raw, open) {
  const re = /<(\/?)([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g; let m;
  while ((m = re.exec(raw))) {
    const tag = m[2].toLowerCase();
    if (!BLOCK_TAGS.test(tag) || m[3] || /^(br|hr|img|input)$/.test(tag)) continue;
    open[tag] = (open[tag] || 0) + (m[1] ? -1 : 1);
  }
}
const unbalanced = (open) => Object.values(open).some((v) => v > 0);

/**
 * Lexes Markdown once. Returns top level blocks (with their 1-based source line) and the outline.
 * Blocks of raw HTML that span several Markdown blocks are merged so the browser sees valid markup.
 */
export function parseDoc(text) {
  let fm = '', fmLines = 0;
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/);
  if (m) { fm = m[1]; fmLines = nl(m[0]); text = text.slice(m[0].length); }
  const tokens = marked.lexer(text);
  const blocks = [], outline = [], used = new Set();
  let line = fmLines + 1;
  if (fm) blocks.push({ line: 1, key: 'fm:' + fm, kind: 'fm', fm });
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i], start = line;
    line += nl(tok.raw);
    if (tok.type === 'space' || tok.type === 'def') continue;
    let group = [tok];
    if (tok.type === 'html') {
      const open = {}; balance(tok.raw, open);
      let guard = 0;
      while (unbalanced(open) && i + 1 < tokens.length && guard++ < 400) {
        const nx = tokens[++i]; line += nl(nx.raw); group.push(nx);
        if (nx.type === 'html') balance(nx.raw, open);
      }
    }
    const b = { line: start, kind: 'blk', group, key: '' };
    if (tok.type === 'heading') {
      const txt = inlineText(tok.tokens).trim() || tok.text;
      b.heading = { level: tok.depth, text: txt, slug: (() => { const base = slugify(txt); let id = base, n = 1; while (used.has(id)) id = base + '-' + ++n; used.add(id); return id; })(), line: start };
      outline.push(b.heading);
    }
    blocks.push(b);
  }
  return { blocks, outline };
}

const ALERTS = { note: 'info', tip: 'lightbulb', important: 'priority', warning: 'warning', caution: 'error' };

function renderBlock(b) {
  if (b.kind === 'fm') return `<details class="fm"><summary>Front matter</summary><pre><code>${esc(b.fm)}</code></pre></details>`;
  return DOMPurify.sanitize(marked.parser(b.group), { ADD_ATTR: ['target'] });
}

export function createPreview(root, scroller) {
  let cur = [];            // { key, el, line }
  const imgCache = new Map();
  let docPath = '';
  let seq = 0;

  function loadImg(img) {
    const s = img.getAttribute('src');
    if (!s || /^(https?:|data:|blob:|\/\/)/i.test(s) || !isTauri || !docPath) return;
    const ck = docPath + '|' + s;
    if (imgCache.has(ck)) { img.src = imgCache.get(ck); return; }
    img.removeAttribute('src');
    api.asset(docPath, s).then(([mime, b64]) => {
      const url = `data:${mime};base64,${b64}`;
      if (imgCache.size > 80) imgCache.delete(imgCache.keys().next().value);
      imgCache.set(ck, url); img.src = url;
    }).catch(() => { img.alt = (img.alt || s) + ' (?)'; });
  }

  function enhance(el) {
    $$('pre > code', el).forEach((c) => {
      const pre = c.parentElement, lg = (c.className.match(/language-([\w+#.-]+)/) || [])[1] || '';
      if (lg && hljs.getLanguage(lg)) { try { hljs.highlightElement(c); } catch { /* ignore */ } }
      const w = document.createElement('div'); w.className = 'cb';
      w.innerHTML = `<div class="ch"><span>${esc(lg || 'text')}</span><button class="cp" type="button">${icon('copy')}<span>${esc(t('copy'))}</span></button></div>`;
      pre.replaceWith(w); w.append(pre);
    });
    $$('table', el).forEach((tb) => { const w = document.createElement('div'); w.className = 'tw'; tb.replaceWith(w); w.append(tb); });
    $$('img[src]', el).forEach(loadImg);
    $$('blockquote', el).forEach((q) => {
      const p = q.firstElementChild, mm = p && /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i.exec(p.textContent);
      if (!mm) return;
      const kind = mm[1].toLowerCase();
      p.innerHTML = p.innerHTML.replace(/^\s*\[!\w+\]\s*(<br\s*\/?>)?\s*/i, '');
      if (!p.textContent.trim()) p.remove();
      q.classList.add('alert', kind);
      const title = document.createElement('div'); title.className = 'at';
      title.innerHTML = icon(ALERTS[kind]) + `<span>${esc(t('alert_' + kind))}</span>`;
      q.prepend(title);
    });
    $$('input[type=checkbox]', el).forEach((c) => { c.disabled = true; });
  }

  function make(b) {
    const el = document.createElement('div');
    el.className = 'blk' + (b.heading ? ' h' : '');
    el.innerHTML = renderBlock(b);
    enhance(el);
    hydrateIcons(el);
    return el;
  }

  return {
    /** Patches the DOM so that only changed blocks are rebuilt (no flicker, scroll and images stay). */
    render(parsed, path) {
      const me = ++seq;
      if (path !== docPath) { docPath = path; }
      const next = parsed.blocks;
      for (const b of next) {
        b.key = b.kind === 'fm' ? b.key : (b.group.map((g) => g.raw).join('') + (b.heading ? '#' : ''));
      }
      let p = 0;
      while (p < cur.length && p < next.length && cur[p].key === next[p].key) p++;
      let so = cur.length, sn = next.length;
      while (so > p && sn > p && cur[so - 1].key === next[sn - 1].key) { so--; sn--; }
      for (let i = p; i < so; i++) cur[i].el.remove();
      const anchor = so < cur.length ? cur[so].el : null;
      const frag = document.createDocumentFragment();
      const out = [];
      for (let i = 0; i < p; i++) out.push({ key: cur[i].key, el: cur[i].el });
      for (let i = p; i < sn; i++) { const el = make(next[i]); frag.append(el); out.push({ key: next[i].key, el }); }
      for (let i = so; i < cur.length; i++) out.push({ key: cur[i].key, el: cur[i].el });
      root.insertBefore(frag, anchor);
      cur = out;
      out.forEach((o, i) => { o.line = next[i].line; o.el.dataset.line = next[i].line; if (next[i].heading) { o.el.firstElementChild && (o.el.firstElementChild.id = next[i].heading.slug); } });
      return me;
    },
    clear() { root.innerHTML = ''; cur = []; },
    blocks: () => cur,
    /** Scroll position (in px of the scroller) for a source line (fractional). */
    yForLine(line) {
      if (!cur.length) return 0;
      let i = cur.length - 1;
      while (i > 0 && cur[i].line > line) i--;
      const a = cur[i].el, top = a.offsetTop, h = a.offsetHeight;
      const nextLine = i + 1 < cur.length ? cur[i + 1].line : cur[i].line + 1;
      const f = Math.max(0, Math.min(1, (line - cur[i].line) / Math.max(1, nextLine - cur[i].line)));
      return top + h * f;
    },
    /** Source line (fractional) at a scroll position. */
    lineForY(y) {
      if (!cur.length) return 1;
      let i = 0;
      while (i + 1 < cur.length && cur[i + 1].el.offsetTop <= y) i++;
      const a = cur[i], h = Math.max(1, a.el.offsetHeight);
      const nextLine = i + 1 < cur.length ? cur[i + 1].line : a.line + 1;
      return a.line + Math.max(0, Math.min(1, (y - a.el.offsetTop) / h)) * (nextLine - a.line);
    },
    elForLine(line) { return cur.find((c) => c.line === line)?.el || null; },
    imgCache,
  };
}
