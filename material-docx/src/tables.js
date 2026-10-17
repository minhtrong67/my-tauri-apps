// Tables: creation, grid model (row/column spans), structure edits, cell formatting, column resizing.
import { esc } from './util.js';
import { pageDims, doc, bus } from './state.js';
import { editor, run, getRange, anchorEl, focusEl } from './editor.js';

export const TABLE_STYLES = [
  { id: 'grid', label: 'ts.grid' },
  { id: 'plain', label: 'ts.plain' },
  { id: 'lines', label: 'ts.lines' },
  { id: 'blue', label: 'ts.blue' },
  { id: 'banded', label: 'ts.banded' },
  { id: 'dark', label: 'ts.dark' },
  { id: 'soft', label: 'ts.soft' },
  { id: 'minimal', label: 'ts.minimal' },
];

export function tableHtml(rows, cols, { style = 'grid', header = true } = {}) {
  const w = (100 / cols).toFixed(3);
  const colgroup = '<colgroup>' + Array.from({ length: cols }, () => `<col style="width:${w}%">`).join('') + '</colgroup>';
  let h = `<table data-ts="${style}"${header ? ' data-hdr="1"' : ''}>${colgroup}<tbody>`;
  for (let r = 0; r < rows; r++) h += '<tr>' + '<td><br></td>'.repeat(cols) + '</tr>';
  return h + '</tbody></table><p><br></p>';
}
export function insertTable(rows, cols, opts) {
  run(() => {
    document.execCommand('insertHTML', false, tableHtml(rows, cols, opts));
  });
}

export const cellOf = (n) => {
  const e = n && n.nodeType === 3 ? n.parentElement : n;
  return e && e.closest ? e.closest('td, th') : null;
};
export const tableOf = (n) => {
  const e = n && n.nodeType === 3 ? n.parentElement : n;
  const t = e && e.closest ? e.closest('table') : null;
  return t && editor.contains(t) ? t : null;
};
export const currentTable = () => tableOf(focusEl() || anchorEl());

/** Grid matrix: g.m[r][c] = cell element (spanned positions repeat the same cell), g.pos(cell) = {r, c, rs, cs}. */
export function gridOf(table) {
  const rows = [...table.rows];
  const m = [];
  const pos = new Map();
  rows.forEach((row, r) => {
    m[r] = m[r] || [];
    let c = 0;
    for (const cell of row.cells) {
      while (m[r][c]) c++;
      const cs = Math.max(1, parseInt(cell.getAttribute('colspan') || '1', 10) || 1);
      const rs = Math.max(1, parseInt(cell.getAttribute('rowspan') || '1', 10) || 1);
      pos.set(cell, { r, c, rs, cs });
      for (let i = 0; i < rs; i++) {
        m[r + i] = m[r + i] || [];
        for (let j = 0; j < cs; j++) m[r + i][c + j] = cell;
      }
      c += cs;
    }
  });
  const nc = Math.max(0, ...m.map((x) => x.length));
  return { rows, m, pos, nr: rows.length, nc };
}

export function selectedCells() {
  const r = getRange();
  const t = currentTable();
  if (!t) return [];
  const a = cellOf(r.startContainer), b = cellOf(r.endContainer);
  if (!r || r.collapsed || !a || !b || a === b) return a ? [a] : [];
  const g = gridOf(t);
  const pa = g.pos.get(a), pb = g.pos.get(b);
  if (!pa || !pb) return [a];
  const r0 = Math.min(pa.r, pb.r), r1 = Math.max(pa.r + pa.rs - 1, pb.r + pb.rs - 1);
  const c0 = Math.min(pa.c, pb.c), c1 = Math.max(pa.c + pa.cs - 1, pb.c + pb.cs - 1);
  const set = new Set();
  for (let i = r0; i <= r1; i++) for (let j = c0; j <= c1; j++) if (g.m[i] && g.m[i][j]) set.add(g.m[i][j]);
  return [...set];
}

const newCell = (like) => {
  const td = document.createElement(like && like.tagName === 'TH' ? 'th' : 'td');
  td.innerHTML = '<br>';
  return td;
};
const setSpan = (cell, attr, v) => { if (v > 1) cell.setAttribute(attr, v); else cell.removeAttribute(attr); };
const caretIn = (cell) => {
  if (!cell) return;
  const r = document.createRange();
  r.selectNodeContents(cell);
  r.collapse(true);
  const s = getSelection();
  s.removeAllRanges();
  s.addRange(r);
};

/* --------------------------- structure edits --------------------------- */
export function addRow(cell, below) {
  run(() => {
    const t = tableOf(cell);
    const g = gridOf(t);
    const p = g.pos.get(cell);
    const at = below ? p.r + p.rs : p.r; // new row index
    const row = document.createElement('tr');
    const ref = g.rows[Math.min(at, g.nr - 1)];
    const seen = new Set();
    for (let c = 0; c < g.nc; c++) {
      const over = g.m[at] && g.m[at][c];
      const above = at > 0 && g.m[at - 1] && g.m[at - 1][c];
      if (over && above && over === above) {
        if (!seen.has(over)) { seen.add(over); setSpan(over, 'rowspan', g.pos.get(over).rs + 1); }
        continue;
      }
      row.append(newCell(g.m[Math.min(at, g.nr - 1)][c]));
      void ref;
    }
    const host = g.rows[Math.max(0, Math.min(at, g.nr) - (below ? 1 : 0))] || g.rows[g.nr - 1];
    if (at >= g.nr) host.parentNode.append(row);
    else g.rows[at].before(row);
    void host;
    caretIn(row.cells[0]);
  });
}
export function addCol(cell, right) {
  run(() => {
    const t = tableOf(cell);
    const g = gridOf(t);
    const p = g.pos.get(cell);
    const at = right ? p.c + p.cs : p.c;
    const seen = new Set();
    g.rows.forEach((row, r) => {
      const over = g.m[r] && g.m[r][at];
      const before = at > 0 && g.m[r] && g.m[r][at - 1];
      if (over && before && over === before) {
        if (!seen.has(over)) { seen.add(over); setSpan(over, 'colspan', g.pos.get(over).cs + 1); }
        return;
      }
      const nc = newCell(before || over);
      // insert before the first real cell at/after column `at`, else append
      let ref = null;
      for (let c = at; c < g.nc; c++) { const x = g.m[r] && g.m[r][c]; if (x && x.parentNode === row && g.pos.get(x).r === r) { ref = x; break; } }
      if (ref) ref.before(nc); else row.append(nc);
    });
    redistribute(t, at);
    caretIn(cell);
  });
}
function redistribute(t, newIndex) {
  const cols = t.querySelectorAll(':scope > colgroup > col');
  if (!cols.length) return;
  const arr = [...cols].map((c) => parseFloat(c.style.width) || 0);
  const g = gridOf(t);
  const add = document.createElement('col');
  const avg = arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
  add.style.width = avg + '%';
  const cg = t.querySelector(':scope > colgroup');
  if (newIndex >= cols.length) cg.append(add); else cols[newIndex].before(add);
  const all = [...cg.children];
  const total = all.reduce((a, c) => a + (parseFloat(c.style.width) || 0), 0) || 100;
  for (const c of all) c.style.width = ((parseFloat(c.style.width) || 0) * 100 / total).toFixed(3) + '%';
  void g;
}
export function deleteRow(cell) {
  run(() => {
    const t = tableOf(cell);
    const cells = selectedCells();
    const g = gridOf(t);
    const rs = cells.length ? cells.map((c) => g.pos.get(c)) : [g.pos.get(cell)];
    const r0 = Math.min(...rs.map((p) => p.r)), r1 = Math.max(...rs.map((p) => p.r + p.rs - 1));
    if (r1 - r0 + 1 >= g.nr) { t.remove(); return; }
    for (let r = r1; r >= r0; r--) {
      const seen = new Set();
      for (let c = 0; c < g.nc; c++) {
        const x = g.m[r][c];
        if (!x || seen.has(x)) continue;
        seen.add(x);
        const p = g.pos.get(x);
        if (p.r === r && p.rs > 1) {
          // the cell starts here and continues below: move it into the next row
          const nextRow = g.rows[r + 1];
          if (nextRow) {
            let ref = null;
            for (let cc = p.c + 1; cc < g.nc; cc++) { const y = g.m[r + 1][cc]; if (y && y.parentNode === nextRow && g.pos.get(y).r === r + 1) { ref = y; break; } }
            setSpan(x, 'rowspan', p.rs - 1);
            if (ref) ref.before(x); else nextRow.append(x);
          }
        } else if (p.r < r) setSpan(x, 'rowspan', Math.max(1, parseInt(x.getAttribute('rowspan') || '1', 10) - 1));
      }
      g.rows[r].remove();
    }
    const nr = t.rows[Math.min(r0, t.rows.length - 1)];
    if (nr) caretIn(nr.cells[0]);
  });
}
export function deleteCol(cell) {
  run(() => {
    const t = tableOf(cell);
    const cells = selectedCells();
    const g = gridOf(t);
    const ps = cells.length ? cells.map((c) => g.pos.get(c)) : [g.pos.get(cell)];
    const c0 = Math.min(...ps.map((p) => p.c)), c1 = Math.max(...ps.map((p) => p.c + p.cs - 1));
    if (c1 - c0 + 1 >= g.nc) { t.remove(); return; }
    const seen = new Set();
    for (let r = 0; r < g.nr; r++) {
      for (let c = c0; c <= c1; c++) {
        const x = g.m[r][c];
        if (!x || seen.has(x + ':' + c)) continue;
        seen.add(x + ':' + c);
        const p = g.pos.get(x);
        if (p.cs > 1) setSpan(x, 'colspan', Math.max(1, parseInt(x.getAttribute('colspan') || '1', 10) - 1));
        else x.remove();
      }
    }
    const cols = t.querySelectorAll(':scope > colgroup > col');
    if (cols.length) {
      for (let c = c1; c >= c0; c--) if (cols[c]) cols[c].remove();
      const left = [...t.querySelectorAll(':scope > colgroup > col')];
      const total = left.reduce((a, c) => a + (parseFloat(c.style.width) || 0), 0) || 100;
      for (const c of left) c.style.width = ((parseFloat(c.style.width) || 0) * 100 / total).toFixed(3) + '%';
    }
    const first = t.rows[0] && t.rows[0].cells[Math.max(0, c0 - 1)];
    caretIn(first || t.rows[0].cells[0]);
  });
}
export function deleteTable(cell) { run(() => { const t = tableOf(cell); if (t) t.remove(); }); }

export function mergeCells() {
  const cells = selectedCells();
  if (cells.length < 2) return false;
  run(() => {
    const t = tableOf(cells[0]);
    const g = gridOf(t);
    const ps = cells.map((c) => g.pos.get(c));
    const r0 = Math.min(...ps.map((p) => p.r)), r1 = Math.max(...ps.map((p) => p.r + p.rs - 1));
    const c0 = Math.min(...ps.map((p) => p.c)), c1 = Math.max(...ps.map((p) => p.c + p.cs - 1));
    const first = g.m[r0][c0];
    let html = '';
    for (const c of cells) {
      if (c === first) continue;
      const txt = c.innerHTML.replace(/<br\s*\/?>/g, '').trim();
      if (txt) html += (html || first.textContent.trim() ? '<br>' : '') + txt;
      c.remove();
    }
    if (html) {
      if (!first.textContent.trim()) first.innerHTML = html; else first.insertAdjacentHTML('beforeend', html);
    }
    setSpan(first, 'colspan', c1 - c0 + 1);
    setSpan(first, 'rowspan', r1 - r0 + 1);
    caretIn(first);
  });
  return true;
}
/** Splits a cell into n columns × m rows. */
export function splitCell(cell, nCols, nRows) {
  run(() => {
    const t = tableOf(cell);
    let g = gridOf(t);
    const p = g.pos.get(cell);
    // columns
    if (nCols > 1) {
      if (p.cs >= nCols) {
        // distribute the existing span
        const per = Math.floor(p.cs / nCols);
        let extra = p.cs - per * nCols;
        let last = cell;
        setSpan(cell, 'colspan', per + (extra > 0 ? 1 : 0));
        if (extra > 0) extra--;
        for (let i = 1; i < nCols; i++) {
          const nc = newCell(cell);
          const sp = per + (extra > 0 ? 1 : 0);
          if (extra > 0) extra--;
          setSpan(nc, 'colspan', sp);
          setSpan(nc, 'rowspan', p.rs);
          last.after(nc);
          last = nc;
        }
      } else {
        // need more grid columns: widen every other cell in the table
        const add = nCols - p.cs;
        const seen = new Set([cell]);
        for (let r = 0; r < g.nr; r++) {
          for (let c = p.c; c < p.c + p.cs; c++) {
            const x = g.m[r][c];
            if (x && !seen.has(x)) { seen.add(x); setSpan(x, 'colspan', g.pos.get(x).cs + add); }
          }
        }
        // cells completely right of the split keep their size; add a new grid column span to the ones covering the column
        const cols = t.querySelector(':scope > colgroup');
        if (cols) for (let i = 0; i < add; i++) { const col = document.createElement('col'); col.style.width = '10%'; cols.append(col); }
        setSpan(cell, 'colspan', 1);
        let last = cell;
        for (let i = 1; i < nCols; i++) { const nc = newCell(cell); setSpan(nc, 'rowspan', p.rs); last.after(nc); last = nc; }
        if (cols) normalizeCols(t);
      }
    }
    g = gridOf(t);
    if (nRows > 1) {
      const pp = g.pos.get(cell);
      if (pp.rs >= nRows) {
        const per = Math.floor(pp.rs / nRows);
        setSpan(cell, 'rowspan', per + (pp.rs - per * nRows));
      } else {
        // add rows below
        const addRows = nRows - pp.rs;
        const base = pp.r + pp.rs - 1;
        for (let i = 0; i < addRows; i++) {
          const row = document.createElement('tr');
          for (let c = 0; c < g.nc; c++) {
            const x = g.m[base][c];
            if (x === cell || (g.pos.get(x).c === c && g.pos.get(x).r + g.pos.get(x).rs - 1 >= base && false)) { row.append(newCell(cell)); c += g.pos.get(cell).cs - 1; continue; }
            if (x && g.pos.get(x).c === c) setSpan(x, 'rowspan', parseInt(x.getAttribute('rowspan') || '1', 10) + 1);
          }
          g.rows[base].after(row);
        }
        setSpan(cell, 'rowspan', 1);
      }
    }
    caretIn(cell);
  });
}
function normalizeCols(t) {
  const left = [...t.querySelectorAll(':scope > colgroup > col')];
  const total = left.reduce((a, c) => a + (parseFloat(c.style.width) || 0), 0) || 100;
  for (const c of left) c.style.width = ((parseFloat(c.style.width) || 0) * 100 / total).toFixed(3) + '%';
}

/* --------------------------- table / cell formatting --------------------------- */
export function setTableStyle(table, id) { run(() => { table.setAttribute('data-ts', id); }); }
export function setTableFlag(table, flag, on) { run(() => { if (on) table.setAttribute(flag, '1'); else table.removeAttribute(flag); }); }
export function shadeCells(cells, c) {
  run(() => { for (const x of cells) { if (c) x.style.backgroundColor = c; else x.style.removeProperty('background-color'); if (!x.getAttribute('style')) x.removeAttribute('style'); } });
}
export function cellBorders(cells, kind) {
  const line = '1px solid #444';
  run(() => {
    for (const x of cells) {
      const sides = { all: ['top', 'bottom', 'left', 'right'], top: ['top'], bottom: ['bottom'], left: ['left'], right: ['right'], outside: ['top', 'bottom', 'left', 'right'] }[kind] || [];
      if (kind === 'none') for (const s of ['top', 'bottom', 'left', 'right']) x.style.setProperty('border-' + s, '0 none');
      else if (kind === 'reset') for (const s of ['top', 'bottom', 'left', 'right']) x.style.removeProperty('border-' + s);
      else for (const s of sides) x.style.setProperty('border-' + s, line);
      if (!x.getAttribute('style')) x.removeAttribute('style');
    }
  });
}
export function cellValign(cells, v) {
  run(() => { for (const x of cells) { if (v === 'top') x.removeAttribute('data-valign'); else x.setAttribute('data-valign', v); } });
}
export function cellAlign(cells, a) {
  run(() => { for (const x of cells) for (const b of x.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li')) b.style.textAlign = a; for (const x of cells) if (!x.querySelector('p, h1, h2, h3')) x.style.textAlign = a; });
}
export function alignTable(table, a) {
  run(() => {
    table.style.marginLeft = a === 'left' ? '' : 'auto';
    table.style.marginRight = a === 'right' ? '0' : a === 'center' ? 'auto' : '';
    if (a === 'left') { table.style.removeProperty('margin-left'); table.style.removeProperty('margin-right'); }
    if (!table.getAttribute('style')) table.removeAttribute('style');
  });
}
export function distributeColumns(table) {
  run(() => {
    const cols = [...table.querySelectorAll(':scope > colgroup > col')];
    for (const c of cols) c.style.width = (100 / cols.length).toFixed(3) + '%';
  });
}
export function fitTable(table, mode) {
  run(() => {
    if (mode === 'window') { table.style.width = '100%'; table.style.tableLayout = 'fixed'; } else { table.style.width = 'auto'; table.style.tableLayout = 'auto'; }
  });
}
export function sizeTable(table, pct) {
  run(() => { table.style.width = pct + '%'; });
}
export function setRowHeight(cells, px) {
  run(() => { for (const x of cells) { const tr = x.parentElement; if (px) tr.style.height = px + 'px'; else tr.style.removeProperty('height'); } });
}

/* --------------------------- column resizing --------------------------- */
export function initTableResize(workspace) {
  let drag = null;
  const EDGE = 5;
  const hit = (e) => {
    const t = e.target && e.target.closest ? e.target.closest('td, th') : null;
    if (!t || !editor.contains(t)) return null;
    const r = t.getBoundingClientRect();
    if (e.clientX >= r.right - EDGE) return { cell: t, side: 'right' };
    if (e.clientX <= r.left + EDGE) {
      const prev = t.previousElementSibling;
      if (prev) return { cell: prev, side: 'right' };
    }
    return null;
  };
  editor.addEventListener('mousemove', (e) => {
    if (drag) return;
    editor.classList.toggle('col-resize', !!hit(e));
  });
  editor.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const h = hit(e);
    if (!h) return;
    const table = tableOf(h.cell);
    const g = gridOf(table);
    const p = g.pos.get(h.cell);
    const colIdx = p.c + p.cs - 1;
    const cols = [...table.querySelectorAll(':scope > colgroup > col')];
    if (colIdx >= cols.length - 1 || !cols.length) return; // the last column edge resizes nothing (table fills the page)
    e.preventDefault();
    const tr = table.getBoundingClientRect();
    drag = {
      table, colIdx, cols, x0: e.clientX, tw: tr.width,
      a: parseFloat(cols[colIdx].style.width) || 100 / cols.length,
      b: parseFloat(cols[colIdx + 1].style.width) || 100 / cols.length,
    };
    document.body.classList.add('resizing-col');
  });
  window.addEventListener('mousemove', (e) => {
    if (!drag) return;
    const dp = ((e.clientX - drag.x0) / drag.tw) * 100;
    const sum = drag.a + drag.b;
    const a = Math.min(sum - 3, Math.max(3, drag.a + dp));
    drag.cols[drag.colIdx].style.width = a.toFixed(3) + '%';
    drag.cols[drag.colIdx + 1].style.width = (sum - a).toFixed(3) + '%';
    bus.emit('layout-live');
  });
  window.addEventListener('mouseup', () => {
    if (!drag) return;
    drag = null;
    document.body.classList.remove('resizing-col');
    run(() => {});
  });
  void workspace;
}
export { esc, pageDims, doc };
