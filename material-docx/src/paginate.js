// Page layout engine.
//
// The document is edited as one continuous contenteditable flow. To look and behave like paged paper we insert
// invisible, non-editable "push" spacers (class .pg-sp) wherever content would cross the bottom margin of a page;
// the page chrome (grey gaps between sheets, headers and footers) is drawn in a separate overlay that never touches
// the editable DOM. Spacers are removed before the HTML is saved / snapshotted / exported (see unpaginate()).
//
// Geometry (all editor-relative px, unscaled):   page k content = [mt + k*pitch, mt + k*pitch + CH]
//   pitch = pageHeight + GAP,  CH = pageHeight - mt - mb,  band between pages = mb + GAP + mt.
import { doc, pageDims, bus } from './state.js';

export const GAP = 28;
// Safety margin for mid-paragraph splits: glyph boxes can be smaller than the real line box (fallback fonts such as
// Vietnamese diacritics, odd line-heights), so keep split lines clear of the header / footer zones by this many px.
const SPLIT_PAD = 7;
export const layout = { count: 1, pitch: 0, CH: 0, mt: 0, mb: 0, PH: 0, PW: 0, GAP, pageOf: new Map(), enabled: true };

let ed = null;
let overlay = null;
let hfRender = null; // (zone:'header'|'footer', pageNo, total) → html

export function initPaginate(editorEl, overlayEl, renderHF) {
  ed = editorEl;
  overlay = overlayEl;
  hfRender = renderHF;
}

const HEAD_RE = /^H[1-6]$/;

/** Removes every spacer (and merges the text nodes that were split by inline spacers). */
export function unpaginate() {
  if (!ed) return false;
  const sps = ed.querySelectorAll('.pg-sp');
  if (!sps.length) return false;
  const parents = new Set();
  for (const s of sps) { parents.add(s.parentNode); s.remove(); }
  for (const p of parents) if (p && p.normalize) p.normalize();
  return true;
}

export function metrics() {
  const d = pageDims();
  const m = doc.page.margins;
  const mt = Math.max(0, m.top), mb = Math.max(0, m.bottom);
  const CH = Math.max(120, d.h - mt - mb);
  return { PW: d.w, PH: d.h, mt, mb, ml: m.left, mr: m.right, CH, pitch: d.h + GAP };
}

/** Writes the CSS variables the stylesheet needs. */
export function applyPageVars() {
  const M = metrics();
  const r = document.documentElement.style;
  r.setProperty('--pg-w', M.PW + 'px');
  r.setProperty('--pg-h', M.PH + 'px');
  r.setProperty('--mt', M.mt + 'px');
  r.setProperty('--mb', M.mb + 'px');
  r.setProperty('--ml', M.ml + 'px');
  r.setProperty('--mr', M.mr + 'px');
  r.setProperty('--pg-gap', GAP + 'px');
  return M;
}

const hasText = (el) => {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) if (n.nodeValue.trim()) return true;
  return false;
};

/** Text nodes that belong to `el` itself (not to nested lists / existing spacers). */
function ownTextNodes(el) {
  const out = [];
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      for (let p = n.parentNode; p && p !== el; p = p.parentNode) {
        if (p.nodeType === 1 && (p.tagName === 'UL' || p.tagName === 'OL' || p.classList.contains('pg-sp'))) return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n;
  while ((n = w.nextNode())) out.push(n);
  return out;
}

function collectUnits() {
  const units = [];
  const addBlock = (el, extra = {}) => units.push({ el, kind: 'block', ...extra });
  const addList = (list) => {
    for (const li of list.children) {
      if (li.tagName !== 'LI') continue;
      units.push({ el: li, kind: 'li' });
      for (const c of li.children) if (c.tagName === 'UL' || c.tagName === 'OL') addList(c);
    }
  };
  const addTable = (table) => {
    let first = true;
    for (const tr of table.rows) {
      units.push({ el: tr, kind: 'row', first, table });
      first = false;
    }
  };
  const top = (parent) => {
    for (const c of parent.children) {
      if (c.classList.contains('pg-sp')) continue;
      const tag = c.tagName;
      if (c.classList.contains('pb')) units.push({ el: c, kind: 'pb' });
      else if (tag === 'UL' || tag === 'OL') addList(c);
      else if (tag === 'TABLE') addTable(c);
      else if (tag === 'DIV' && c.hasAttribute('data-toc')) top(c);
      else addBlock(c);
    }
  };
  top(ed);
  return units;
}

function makeSpacer(kind, h) {
  const tag = kind === 'li' ? 'li' : kind === 'row' ? 'tr' : kind === 'inline' ? 'span' : 'div';
  const s = document.createElement(tag);
  s.className = 'pg-sp';
  s.setAttribute('contenteditable', 'false');
  s.dataset.h = String(h);
  if (kind === 'row') {
    const td = document.createElement('td');
    td.colSpan = 99;
    td.style.height = h + 'px';
    s.appendChild(td);
  } else s.style.height = h + 'px';
  return s;
}

const setSpacerH = (s, h) => {
  s.dataset.h = String(h);
  if (s.tagName === 'TR') s.firstChild.style.height = h + 'px';
  else s.style.height = h + 'px';
};

/** Finds the first line of `el` that starts below `limit` (clean editor coordinates) and returns where to split. */
function findLineSplit(el, limit, er, scale, paraTop) {
  const nodes = ownTextNodes(el);
  if (!nodes.length) return null;
  const map = [];
  let total = 0;
  for (const n of nodes) { map.push({ n, start: total }); total += n.nodeValue.length; }
  const rng = document.createRange();
  const halfLead = new Map();
  const locate = (i) => {
    let lo = 0, hi = map.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (map[mid].start <= i) lo = mid; else hi = mid - 1;
    }
    return { node: map[lo].n, off: i - map[lo].start };
  };
  const rectAt = (i) => {
    const { node, off } = locate(i);
    if (off >= node.nodeValue.length) return null;
    rng.setStart(node, off);
    rng.setEnd(node, off + 1);
    const rs = rng.getClientRects();
    if (!rs.length) return null;
    const r = rs[0];
    if (r.width === 0 && r.height === 0) return null;
    // use the full line box (line-height may exceed the glyph box) so a line is never cut by the footer
    let half = halfLead.get(node);
    if (half === undefined) {
      const pe = node.parentElement;
      const cs = pe ? getComputedStyle(pe) : null;
      const lh = cs ? parseFloat(cs.lineHeight) : NaN;
      half = Number.isFinite(lh) ? Math.max(0, (lh - r.height / scale) / 2) : 0;
      halfLead.set(node, half);
    }
    return { top: (r.top - er.top) / scale - half, bottom: (r.bottom - er.top) / scale + half };
  };
  // first char whose line extends below the limit
  const rectNear = (i, dir) => {
    for (let k = 0; k < 64 && i >= 0 && i < total; k++, i += dir) { const r = rectAt(i); if (r) return { r, i }; }
    return null;
  };
  let lo = 0, hi = total - 1, found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const hit = rectNear(mid, 1) || rectNear(mid, -1);
    if (!hit) break;
    if (hit.r.bottom > limit + 0.5) { found = hit.i; hi = mid - 1; } else lo = mid + 1;
  }
  if (found < 0) return null;
  const first = rectAt(found) || rectNear(found, 1)?.r;
  if (!first) return null;
  const lineTop = first.top;
  // walk back to the first char of that line
  lo = 0; hi = found;
  let start = found;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const hit = rectNear(mid, 1);
    if (!hit || hit.i > found) { hi = mid - 1; continue; }
    if (hit.r.top >= lineTop - 2) { start = Math.min(start, hit.i); hi = mid - 1; } else lo = hit.i + 1;
  }
  const lineH = Math.max(8, first.bottom - first.top);
  const before = Math.round((lineTop - paraTop) / lineH);
  const loc = locate(start);
  return { node: loc.node, off: loc.off, lineTop, lineH, before, lineIndexStart: start, total };
}

/** Recomputes the pagination. Returns the layout. */
export function paginate() {
  if (!ed) return layout;
  unpaginate();
  const M = metrics();
  Object.assign(layout, { PW: M.PW, PH: M.PH, mt: M.mt, mb: M.mb, CH: M.CH, pitch: M.pitch, GAP });
  ed.style.minHeight = '';
  if (!layout.enabled) {
    layout.count = 1;
    layout.pageOf = new Map();
    if (overlay) overlay.innerHTML = '';
    return layout;
  }
  const er = ed.getBoundingClientRect();
  const scale = er.width / M.PW || 1;
  const units = collectUnits();
  const rects = units.map((u) => u.el.getBoundingClientRect());
  // list items: the box that counts ends where a nested list begins
  units.forEach((u, i) => {
    u.top = (rects[i].top - er.top) / scale;
    u.bottom = (rects[i].bottom - er.top) / scale;
    if (u.kind === 'li') {
      const nested = [...u.el.children].find((c) => c.tagName === 'UL' || c.tagName === 'OL');
      if (nested) u.bottom = (nested.getBoundingClientRect().top - er.top) / scale;
    }
    u.h = Math.max(0, u.bottom - u.top);
    u.prev = u.el.previousElementSibling;
  });

  const unitByEl = new Map(units.map((x) => [x.el, x]));
  const pageTop = (k) => M.mt + k * M.pitch;
  const contentEnd = (k) => M.mt + k * M.pitch + M.CH;
  const pageIdx = (y) => Math.max(0, Math.floor((y - M.mt + 0.5) / M.pitch));

  const actions = []; // {unit, kind:'before'|'inline', el, node, off, h, target}
  let shift = 0;
  let forceNew = false;
  let lastBottom = M.mt;
  const pageOf = new Map();

  for (let ui = 0; ui < units.length; ui++) {
    const u = units[ui];
    if (u.kind === 'pb') {
      forceNew = true;
      const y = u.top + shift;
      lastBottom = Math.max(lastBottom, y);
      continue;
    }
    if (u.h === 0 && u.top === 0 && u.bottom === 0) continue; // not rendered
    let y = u.top + shift;
    let k = pageIdx(y);
    const startShift = shift;
    const push = () => {
      const target = pageTop(k + 1);
      let h;
      let prevBottom = null;
      if (u.prev && !(u.kind === 'row' && u.first)) {
        const pu = unitByEl.get(u.prev);
        if (pu) prevBottom = pu.bottom;
      }
      if (prevBottom != null && (u.kind === 'block' || u.kind === 'li' || u.kind === 'row')) {
        const hh = target - (prevBottom + shift);
        h = hh;
      } else h = target - y;
      if (h < 0) h = 0;
      const kindForSp = u.kind === 'row' && u.first ? 'block' : u.kind;
      const el = u.kind === 'row' && u.first ? u.table : u.el;
      actions.push({ type: 'before', kind: kindForSp, el, h, target, unit: u, usePrev: prevBottom != null });
      shift += target - y;
      y = target;
      k += 1;
    };

    if (forceNew && y > pageTop(k) + 1) push();
    else if (y >= contentEnd(k) - 0.5 && u.h > 0) push();
    forceNew = false;

    let yb = u.top + shift + u.h;
    if (u.kind === 'block' && HEAD_RE.test(u.el.tagName) && yb + 54 > contentEnd(k) && y > pageTop(k) + 1) {
      push();
      yb = y + u.h;
    }
    // overflow
    if (yb > contentEnd(k) + 0.5) {
      const splittable = (u.kind === 'block' || u.kind === 'li') && u.h > 0;
      let didSplit = false;
      if (splittable) {
        const cleanTop = u.top;
        let guard = 0;
        let curShiftBase = shift;
        let curK = k;
        let curYTop = y; // actual top of the part being placed
        let segStartClean = cleanTop;
        let partTopClean = cleanTop;
        while (guard++ < 200) {
          const limitClean = contentEnd(curK) - curShiftBase - SPLIT_PAD;
          const bottomActual = u.bottom + curShiftBase;
          if (bottomActual <= contentEnd(curK) + 0.5) break;
          const sp = findLineSplit(u.el, limitClean, er, scale, partTopClean);
          let ok = !!sp && sp.lineTop > partTopClean - 1;
          if (ok) {
            const linesAfter = Math.round((u.bottom - sp.lineTop) / sp.lineH);
            let before = Math.round((sp.lineTop - partTopClean) / sp.lineH);
            // widows / orphans: keep two lines on each side where possible
            if (before < 2 && curYTop > pageTop(curK) + 1 && guard === 1) ok = false;
            else if (linesAfter < 2 && before > 2) {
              // pull one line down with the last one
              const alt = findLineSplit(u.el, sp.lineTop - 1, er, scale, partTopClean);
              if (alt && alt.lineTop > partTopClean - 1) Object.assign(sp, alt);
            }
            if (before < 1) ok = false;
          }
          if (!ok) break;
          const target = pageTop(curK + 1);
          const h = target - (sp.lineTop + curShiftBase) + SPLIT_PAD;
          actions.push({ type: 'inline', el: u.el, node: sp.node, off: sp.off, h, target, unit: u, sort: sp.lineIndexStart });
          curShiftBase += h;
          curK += 1;
          partTopClean = sp.lineTop;
          segStartClean = sp.lineTop;
          didSplit = true;
        }
        if (didSplit) {
          shift = curShiftBase;
          k = curK;
          y = u.top + shift;
        }
      }
      if (!didSplit) {
        if (y > pageTop(k) + 1) { push(); }
        // taller than a page: let it overflow
      }
    }
    pageOf.set(u.el, pageIdx(u.top + shift) + 1);
    lastBottom = Math.max(lastBottom, u.bottom + shift);
    u.finalShift = shift;
    void startShift;
  }

  // ---- apply (reverse document order keeps text offsets valid) ----
  const nodeActs = new Map();
  for (const a of actions) if (a.type === 'inline') (nodeActs.get(a.node) || nodeActs.set(a.node, []).get(a.node)).push(a);
  const applied = [];
  for (let i = actions.length - 1; i >= 0; i--) {
    const a = actions[i];
    if (a.type === 'before') {
      const sp = makeSpacer(a.kind === 'row' ? 'row' : a.kind, Math.max(0, Math.round(a.h * 100) / 100));
      if (a.usePrev && a.kind === 'block') {
        const prev = a.el.previousElementSibling;
        const mb = prev ? parseFloat(getComputedStyle(prev).marginBottom) || 0 : 0;
        const mt = parseFloat(getComputedStyle(a.el).marginTop) || 0;
        sp.style.marginTop = -mb + 'px';
        sp.style.marginBottom = -mt + 'px';
      }
      a.el.parentNode.insertBefore(sp, a.el);
      a.sp = sp;
      applied.push(a);
    } else {
      const sp = makeSpacer('inline', Math.max(0, Math.round(a.h * 100) / 100));
      sp.style.display = 'block';
      let n = a.node;
      let tail = n;
      if (a.off > 0) tail = n.splitText(a.off);
      tail.parentNode.insertBefore(sp, tail);
      a.sp = sp;
      applied.push(a);
    }
  }

  // ---- correction pass for block/li/row spacers (margin or border effects) ----
  const check = applied.filter((a) => a.type === 'before').reverse();
  if (check.length) {
    const errs = check.map((a) => {
      const next = a.sp.nextElementSibling || a.el;
      const r = (a.el.tagName === 'TABLE' || a.kind === 'block' || a.kind === 'li' || a.kind === 'row' ? a.el : next).getBoundingClientRect();
      return a.target - (r.top - er.top) / scale;
    });
    let prevErr = 0;
    check.forEach((a, i) => {
      const e = errs[i];
      const d = e - prevErr;
      if (Math.abs(d) > 0.4) setSpacerH(a.sp, Math.max(0, +(parseFloat(a.sp.dataset.h) + d).toFixed(2)));
      prevErr = e;
    });
  }

  // ---- page count & overlay ----
  const last = lastBottom;
  const count = Math.max(1, pageIdx(Math.max(M.mt, last - 0.5)) + 1);
  layout.count = count;
  layout.pageOf = pageOf;
  ed.style.minHeight = count * M.pitch - GAP + 'px';
  drawOverlay();
  return layout;
}

export function drawOverlay() {
  if (!overlay) return;
  if (!layout.enabled) { overlay.innerHTML = ''; return; }
  const { count, pitch, CH, mt, mb, PH } = layout;
  const zone = (cls, z, k, h) =>
    `<div class="pg-zone ${cls}" data-zone="${z}" style="height:${h}px">${hfRender ? hfRender(z, k + 1, count) : ''}</div>`;
  let html = '';
  html += `<div class="pg-band first" style="top:0;height:${mt}px">${zone('pg-head', 'header', 0, mt)}</div>`;
  for (let k = 0; k < count - 1; k++) {
    const y = mt + k * pitch + CH;
    html += `<div class="pg-band" style="top:${y}px;height:${mb + GAP + mt}px">` +
      zone('pg-foot', 'footer', k, mb) + `<div class="pg-gap" style="height:${GAP}px"></div>` + zone('pg-head', 'header', k + 1, mt) + `</div>`;
  }
  const yl = (count - 1) * pitch + PH - mb;
  html += `<div class="pg-band last" style="top:${yl}px;height:${mb}px">${zone('pg-foot', 'footer', count - 1, mb)}</div>`;
  overlay.innerHTML = html;
  overlay.style.setProperty('--pages', count);
  bus.emit('paginated', layout);
}

/** Editor-relative y of the top of page n (1-based). */
export const pageStartY = (n) => (n - 1) * layout.pitch;

/** Which page (1-based) a point `y` (editor-relative px) falls on. */
export const pageAt = (y) => Math.min(layout.count, Math.max(1, Math.floor(y / (layout.pitch || 1)) + 1));
