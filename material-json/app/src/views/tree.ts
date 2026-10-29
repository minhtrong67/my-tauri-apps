import { analyze, formatPath, fromValue, indentString, parseJson, replaceAtPath, stringifyNode, type JNode, type PathSeg } from '../json';
import { bus, debounce } from '../bus';
import { ed } from '../editor';
import { active } from '../docs';
import { icon } from '../icons';
import { t } from '../i18n';
import { settings, update } from '../settings';
import { copyText, dialog, esc, h, toast } from '../ui';

const CHUNK = 200;
const expandedByDoc = new Map<string, Set<string>>();
let host: HTMLElement, list: HTMLElement, input: HTMLInputElement, countEl: HTMLElement;
let root: JNode | null = null;
let query = '';
let matches = new Set<JNode>();
let forced = new Set<JNode>();
let selected: HTMLElement | null = null;

const key = (p: PathSeg[]) => JSON.stringify(p);
const expanded = () => {
  const id = active().id;
  let s = expandedByDoc.get(id);
  if (!s) { s = new Set(); expandedByDoc.set(id, s); }
  return s;
};

export function mountTree(el: HTMLElement) {
  host = el;
  host.innerHTML = `
    <div class="tree-bar">
      <label class="search">${icon('search')}<input type="search" id="tree-search" autocomplete="off" spellcheck="false"><span class="count" id="tree-count"></span></label>
      <button class="icon-btn" id="tree-expand">${icon('expandAll')}</button>
      <button class="icon-btn" id="tree-collapse">${icon('collapseAll')}</button>
      <button class="icon-btn toggle" id="tree-sync" aria-pressed="true">${icon('target')}</button>
    </div>
    <div class="tree-scroll"><ul class="tree" id="tree-list" role="tree"></ul></div>`;
  list = host.querySelector('#tree-list')!;
  input = host.querySelector('#tree-search')!;
  countEl = host.querySelector('#tree-count')!;
  const doSearch = debounce(() => { query = input.value.trim().toLowerCase(); render(); }, 180);
  input.addEventListener('input', doSearch);
  host.querySelector('#tree-expand')!.addEventListener('click', () => expandAll(true));
  host.querySelector('#tree-collapse')!.addEventListener('click', () => expandAll(false));
  const sync = host.querySelector<HTMLElement>('#tree-sync')!;
  const paintSync = () => sync.setAttribute('aria-pressed', String(settings.treeSync));
  sync.addEventListener('click', () => { update({ treeSync: !settings.treeSync }); paintSync(); });
  paintSync();
  bus.on('content', render);
  bus.on('active', () => { query = ''; input.value = ''; render(); });
  bus.on('lang', labels);
  labels();
  list.addEventListener('click', onClick);
  list.addEventListener('dblclick', onDbl);
  list.addEventListener('keydown', onKey);
}

function labels() {
  input.placeholder = t('tree.search');
  const set = (id: string, k: Parameters<typeof t>[0]) => { const b = host.querySelector<HTMLElement>(id)!; b.title = t(k); b.setAttribute('aria-label', t(k)); };
  set('#tree-expand', 'tree.expandAll'); set('#tree-collapse', 'tree.collapseAll'); set('#tree-sync', 'tree.sync');
  render();
}

function expandAll(open: boolean) {
  if (!root) return;
  const ex = expanded();
  ex.clear();
  if (open) {
    let n = 0;
    const go = (node: JNode, p: PathSeg[]) => {
      if (n++ > 3000) return;
      if (node.type === 'object') { ex.add(key(p)); node.props.forEach((x) => go(x.value, [...p, x.key])); }
      else if (node.type === 'array') { ex.add(key(p)); node.items.forEach((x, i) => go(x, [...p, i])); }
    };
    go(root, []);
  } else ex.add('[]');
  render();
}

function empty(title: string, sub: string, ic: 'tree' | 'error' = 'tree') {
  list.innerHTML = `<li class="tree-empty">${icon(ic)}<strong>${esc(title)}</strong><span>${esc(sub)}</span></li>`;
  countEl.textContent = '';
}

export function render() {
  if (!host || !active()) return;
  const text = ed.text();
  const r = analyze(text);
  const scroll = list.parentElement!.scrollTop;
  if (r.empty) { root = null; return empty(t('tree.empty'), t('tree.emptySub')); }
  if (!r.ok || !r.node) { root = null; return empty(t('tree.invalid'), r.error ? `${r.error.line}:${r.error.col}` : '', 'error'); }
  root = r.node;
  const ex = expanded();
  if (!ex.size) { ex.add('[]'); if (root.type !== 'string') firstLevel(root, ex); }
  matches = new Set(); forced = new Set();
  if (query) collect(root, [], null);
  countEl.textContent = query ? t('tree.matches', { n: matches.size }) : '';
  list.innerHTML = '';
  list.appendChild(row(root, null, [], 0));
  list.parentElement!.scrollTop = scroll;
}

function firstLevel(n: JNode, ex: Set<string>) {
  const kids = n.type === 'object' ? n.props.map((p) => p.value) : n.type === 'array' ? n.items : [];
  if (kids.length <= 40) kids.forEach((k, i) => { if (k.type === 'object' || k.type === 'array') ex.add(key([n.type === 'object' ? (n as Extract<JNode, { type: 'object' }>).props[i].key : i])); });
}

function collect(n: JNode, path: PathSeg[], k: string | null): boolean {
  let hit = false;
  if (k !== null && k.toLowerCase().includes(query)) hit = true;
  let childHit = false;
  if (n.type === 'object') for (const p of n.props) { if (collect(p.value, [...path, p.key], p.key)) childHit = true; }
  else if (n.type === 'array') n.items.forEach((x, i) => { if (collect(x, [...path, i], null)) childHit = true; });
  else {
    const txt = n.type === 'string' ? n.value : n.type === 'number' ? n.raw : n.type === 'boolean' ? String(n.value) : 'null';
    if (txt.toLowerCase().includes(query)) hit = true;
  }
  if (hit) matches.add(n);
  if (childHit) forced.add(n);
  return hit || childHit;
}

function previewOf(n: JNode): string {
  switch (n.type) {
    case 'string': { const s = n.value.length > 200 ? n.value.slice(0, 200) + '…' : n.value; return `<span class="v str">“${hl(s)}”</span>`; }
    case 'number': return `<span class="v num">${hl(n.raw)}</span>`;
    case 'boolean': return `<span class="v bool">${hl(String(n.value))}</span>`;
    case 'null': return '<span class="v nul">null</span>';
    case 'object': return `<span class="meta">{ } ${n.props.length === 1 ? t('tree.key') : t('tree.keys', { n: n.props.length })}</span>`;
    case 'array': return `<span class="meta">[ ] ${n.items.length === 1 ? t('tree.item') : t('tree.items', { n: n.items.length })}</span>`;
  }
}
function hl(s: string): string {
  const e = esc(s);
  if (!query) return e;
  const i = s.toLowerCase().indexOf(query);
  if (i < 0 || esc(s.slice(0, i)).length !== s.slice(0, i).length) return e;
  return esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + query.length)) + '</mark>' + esc(s.slice(i + query.length));
}

function row(n: JNode, k: string | number | null, path: PathSeg[], depth: number): HTMLElement {
  const li = document.createElement('li');
  li.className = 'tn';
  li.setAttribute('role', 'treeitem');
  const container = n.type === 'object' || n.type === 'array';
  const pk = key(path);
  const open = container && (expanded().has(pk) || forced.has(n));
  li._node = n; li._path = path;
  const keyHtml = k === null ? '' : typeof k === 'number' ? `<span class="idx">${k}</span><span class="colon">:</span>` : `<span class="k">${hl(JSON.stringify(k))}</span><span class="colon">:</span>`;
  const isMatch = query && matches.has(n);
  li.innerHTML = `
    <div class="tn-row${isMatch ? ' hit' : ''}" style="--d:${depth}" tabindex="-1">
      ${container ? `<button class="tn-tog" tabindex="-1" aria-label="toggle">${icon('chevron')}</button>` : '<span class="tn-tog sp"></span>'}
      ${keyHtml}${previewOf(n)}
      <span class="tn-acts">
        ${container ? `<button class="mini" data-a="add" title="${esc(t('tree.add'))}">${icon('listPlus')}</button>` : ''}
        <button class="mini" data-a="path" title="${esc(t('tree.copyPath'))}">${icon('link')}</button>
        <button class="mini" data-a="value" title="${esc(t('tree.copyValue'))}">${icon('copy')}</button>
        ${container || path.length === 0 ? '' : `<button class="mini" data-a="edit" title="${esc(t('tree.edit'))}">${icon('edit')}</button>`}
        ${path.length ? `<button class="mini danger" data-a="del" title="${esc(t('tree.delete'))}">${icon('trash')}</button>` : ''}
      </span>
    </div>`;
  if (container) {
    li.setAttribute('aria-expanded', String(!!open));
    const wrap = document.createElement('div');
    wrap.className = 'tn-kids';
    wrap.innerHTML = '<ul role="group"></ul>';
    li.appendChild(wrap);
    if (open) { li.classList.add('open'); fill(wrap.firstElementChild as HTMLElement, n, path, depth, 0); li._built = true; }
  }
  return li;
}

function fill(ul: HTMLElement, n: JNode, path: PathSeg[], depth: number, from: number) {
  const more = ul.querySelector('.tn-more');
  more?.remove();
  const total = n.type === 'object' ? n.props.length : n.type === 'array' ? n.items.length : 0;
  const to = Math.min(total, from + CHUNK);
  const frag = document.createDocumentFragment();
  for (let i = from; i < to; i++) {
    if (n.type === 'object') { const p = n.props[i]; frag.appendChild(row(p.value, p.key, [...path, p.key], depth + 1)); }
    else if (n.type === 'array') frag.appendChild(row(n.items[i], i, [...path, i], depth + 1));
  }
  ul.appendChild(frag);
  if (to < total) {
    const li = document.createElement('li');
    li.className = 'tn-more';
    li.innerHTML = `<button class="btn text" style="margin-left:calc(var(--d) * 1.1rem)">${t('tree.more', { n: Math.min(CHUNK, total - to) })} (${total - to})</button>`;
    li.style.setProperty('--d', String(depth + 2));
    li.querySelector('button')!.addEventListener('click', (e) => { e.stopPropagation(); fill(ul, n, path, depth, to); });
    ul.appendChild(li);
  }
}

function toggle(li: HTMLElement) {
  const n = li._node!, path = li._path!;
  const wrap = li.querySelector(':scope > .tn-kids') as HTMLElement | null;
  if (!wrap) return;
  const ex = expanded(), pk = key(path);
  const willOpen = !li.classList.contains('open');
  if (willOpen) {
    ex.add(pk);
    if (!li._built) { fill(wrap.firstElementChild as HTMLElement, n, path, path.length, 0); li._built = true; }
    requestAnimationFrame(() => li.classList.add('open'));
  } else { ex.delete(pk); li.classList.remove('open'); }
  li.setAttribute('aria-expanded', String(willOpen));
}

function select(li: HTMLElement, fromUser = true) {
  selected?.classList.remove('sel');
  selected = li.querySelector(':scope > .tn-row');
  selected?.classList.add('sel');
  if (fromUser && settings.treeSync && li._node && li._node.end > 0) ed.selectRange(li._node.start, li._node.end);
}

async function onClick(e: Event) {
  const target = e.target as HTMLElement;
  const li = target.closest<HTMLElement>('.tn');
  if (!li || target.closest('.tn-more')) return;
  const act = target.closest<HTMLElement>('[data-a]')?.dataset.a;
  const path = li._path!, node = li._node!;
  if (act === 'path') { await copyText(formatPath(path)); return void toast(t('toast.pathCopied'), 'success'); }
  if (act === 'value') { await copyText(valueText(node)); return void toast(t('toast.valueCopied'), 'success'); }
  if (act === 'add') return void addChild(li);
  if (act === 'edit') return edit(li);
  if (act === 'del') return remove(path);
  if (target.closest('.tn-row') && (node.type === 'object' || node.type === 'array')) toggle(li);
  select(li);
}

function onDbl(e: Event) {
  const li = (e.target as HTMLElement).closest<HTMLElement>('.tn');
  if (li && li._node && li._node.type !== 'object' && li._node.type !== 'array' && li._path!.length) edit(li);
}

function onKey(e: KeyboardEvent) {
  const row = (e.target as HTMLElement).closest('.tn-row');
  if (!row) return;
  const li = row.parentElement as HTMLElement;
  const rows = Array.from(list.querySelectorAll<HTMLElement>('.tn-row')).filter((r) => r.offsetParent);
  const i = rows.indexOf(row as HTMLElement);
  if (e.key === 'ArrowDown') { e.preventDefault(); rows[i + 1]?.focus(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); rows[i - 1]?.focus(); }
  else if (e.key === 'ArrowRight' && li._node && (li._node.type === 'object' || li._node.type === 'array') && !li.classList.contains('open')) toggle(li);
  else if (e.key === 'ArrowLeft' && li.classList.contains('open')) toggle(li);
  else if (e.key === 'Enter') { select(li); }
}

function valueText(n: JNode) {
  return n.type === 'string' ? n.value : stringifyNode(n, { indent: indentString(settings.indent) });
}

function writeBack(newRoot: JNode) {
  const minified = !ed.text().includes('\n');
  ed.replaceAll(stringifyNode(newRoot, { indent: minified ? '' : indentString(settings.indent) }));
}

function edit(li: HTMLElement) {
  const n = li._node!, path = li._path!;
  const cell = li.querySelector<HTMLElement>(':scope > .tn-row .v');
  if (!cell || !root) return;
  const raw = n.type === 'string' ? JSON.stringify(n.value) : n.type === 'number' ? n.raw : n.type === 'boolean' ? String(n.value) : 'null';
  const inp = document.createElement('input');
  inp.className = 'tn-edit'; inp.value = raw; inp.title = t('tree.editHint'); inp.spellcheck = false;
  inp.style.width = Math.max(8, Math.min(60, raw.length + 3)) + 'ch';
  cell.replaceWith(inp);
  inp.focus(); inp.select();
  let finished = false;
  const finish = (commit: boolean) => {
    if (finished) return; finished = true;
    if (!commit || inp.value === raw) return render();
    let node: JNode;
    try { node = parseJson(inp.value.trim()); if (node.type === 'object' || node.type === 'array') throw 0; }
    catch { node = fromValue(inp.value); }
    writeBack(replaceAtPath(root!, path, node));
    toast(t('toast.edited'), 'success');
  };
  inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') finish(true); else if (e.key === 'Escape') finish(false); });
  inp.addEventListener('blur', () => finish(true));
}

function remove(path: PathSeg[]) {
  if (!root) return;
  writeBack(replaceAtPath(root, path, null));
  toast(t('toast.deleted'), 'success');
}


async function addChild(li: HTMLElement) {
  const n = li._node!, path = li._path!;
  if (!root || (n.type !== 'object' && n.type !== 'array')) return;
  const isObj = n.type === 'object';
  const form = h(`<div class="add-form">${isObj ? `<label class="field"><span>${esc(t('tree.addKey'))}</span><input class="input" id="add-key" spellcheck="false" autocomplete="off"></label>` : ''}
    <label class="field"><span>${esc(t('tree.addValue'))}</span><input class="input" id="add-val" spellcheck="false" autocomplete="off" placeholder="null"></label></div>`);
  form.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') form.closest('.dialog')?.querySelector<HTMLElement>('.btn.filled')?.click(); });
  const r = await dialog({
    title: t('tree.add'), icon: 'listPlus', content: form,
    actions: [{ id: 'cancel', label: t('dlg.cancel'), icon: 'close' }, { id: 'add', label: t('dlg.add'), icon: 'plus', primary: true }],
  });
  if (r !== 'add') return;
  const key = (form.querySelector('#add-key') as HTMLInputElement | null)?.value ?? '';
  const raw = (form.querySelector('#add-val') as HTMLInputElement).value.trim();
  let val: JNode;
  try { val = raw ? parseJson(raw) : fromValue(null); } catch { val = fromValue(raw); }
  let next: JNode;
  if (n.type === 'object') {
    if (n.props.some((p) => p.key === key)) return void toast(t('tree.keyExists'), 'warning');
    next = { ...n, props: [...n.props, { key, keyStart: 0, keyEnd: 0, value: val }] };
  } else next = { ...n, items: [...n.items, val] };
  expanded().add(key_(path));
  writeBack(replaceAtPath(root, path, next));
  toast(t('tree.added'), 'success');
}
const key_ = key;
