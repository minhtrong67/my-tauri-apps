import { analyze, nodeAtPath, toValue, type JNode } from '../json';
import { formatPath, queryPath, PathError, type Match } from '../jsonpath';
import { bus, debounce } from '../bus';
import { ed } from '../editor';
import { icon } from '../icons';
import { t } from '../i18n';
import { currentView, setView } from '../nav';
import { copyText, esc, toast } from '../ui';

let el: HTMLElement, input: HTMLInputElement, out: HTMLElement, chips: HTMLElement;
let lastMatches: Match[] = [];
const HK = 'material-json:qhist';
const hist = (): string[] => { try { return JSON.parse(localStorage.getItem(HK) || '[]'); } catch { return []; } };

export function mountQuery(host: HTMLElement) {
  el = host;
  el.innerHTML = `
    <div class="page">
      <h1 class="page-title" data-k="q.title"></h1>
      <div class="card">
        <div class="field-row">
          <label class="search wide">${icon('query')}<input id="q-input" type="text" spellcheck="false" autocomplete="off"></label>
          <button class="btn filled" id="q-run">${icon('play')}<span data-k="q.run"></span></button>
        </div>
        <div class="chips" id="q-chips"></div>
        <p class="hint" data-k="q.hint"></p>
      </div>
      <div class="card results" id="q-out"></div>
    </div>`;
  input = el.querySelector('#q-input')!; out = el.querySelector('#q-out')!; chips = el.querySelector('#q-chips')!;
  const run = debounce(() => exec(false), 240);
  input.addEventListener('input', run);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') exec(true); });
  el.querySelector('#q-run')!.addEventListener('click', () => exec(true));
  const refresh = () => { if (currentView() === 'query') render(); };
  bus.on('view', refresh); bus.on('content', refresh); bus.on('active', refresh); bus.on('lang', () => { labels(); refresh(); });
  chips.addEventListener('click', (e) => {
    const c = (e.target as HTMLElement).closest<HTMLElement>('.chip');
    if (c) { input.value = c.dataset.q!; exec(true); input.focus(); }
  });
  out.addEventListener('click', onOut);
  labels();
}

function labels() {
  el.querySelectorAll<HTMLElement>('[data-k]').forEach((n) => { n.textContent = t(n.dataset.k as Parameters<typeof t>[0]); });
  input.placeholder = t('q.placeholder');
}

function examples(root: JNode | undefined): string[] {
  if (!root) return [];
  const ex: string[] = [];
  if (root.type === 'array') { ex.push('$[0]', '$[*]', '$[-1]'); const f = root.items[0]; if (f?.type === 'object' && f.props[0]) ex.push(`$[*].${f.props[0].key}`, `$..${f.props[0].key}`); }
  else if (root.type === 'object') {
    root.props.slice(0, 3).forEach((p) => ex.push(formatPath([p.key])));
    const arr = root.props.find((p) => p.value.type === 'array');
    if (arr) ex.push(`${formatPath([arr.key])}[*]`);
    if (root.props[0]) ex.push(`$..${root.props[0].key}`);
  }
  ex.push('$..*');
  return [...new Set(ex)].slice(0, 7);
}

function render() {
  const r = analyze(ed.text());
  const h = hist();
  chips.innerHTML = [
    ...examples(r.node).map((q) => `<button class="chip" data-q="${esc(q)}">${esc(q)}</button>`),
    ...h.filter((q) => !examples(r.node).includes(q)).slice(0, 4).map((q) => `<button class="chip hist" data-q="${esc(q)}" title="${esc(t('q.history'))}">${icon('history')}${esc(q)}</button>`),
  ].join('');
  exec(false);
}

function exec(commit: boolean) {
  const r = analyze(ed.text());
  const q = input.value.trim();
  if (!r.ok || !r.node) { lastMatches = []; out.innerHTML = state('error', t('q.invalidDoc')); return; }
  if (!q) { lastMatches = []; out.innerHTML = state('query', t('q.emptyTitle'), t('q.emptySub')); return; }
  let res: Match[];
  try { res = queryPath(toValue(r.node), q); }
  catch (e) { lastMatches = []; out.innerHTML = state('error', e instanceof PathError ? e.message : String(e)); return; }
  lastMatches = res;
  if (commit) {
    const h = [q, ...hist().filter((x) => x !== q)].slice(0, 12);
    try { localStorage.setItem(HK, JSON.stringify(h)); } catch { /* ignore */ }
  }
  if (!res.length) { out.innerHTML = state('search', t('q.none')); return; }
  const shown = res.slice(0, 500);
  out.innerHTML = `
    <div class="res-head"><strong>${res.length === 1 ? t('q.result') : t('q.results', { n: res.length })}</strong>
      <button class="btn text" id="q-copy">${icon('copy')}${esc(t('q.copyAll'))}</button></div>
    <ul class="res-list">${shown.map((m, i) => `
      <li class="res" data-i="${i}">
        <div class="res-path">${esc(formatPath(m.path))}</div>
        <pre class="res-val">${esc(preview(m.value))}</pre>
        <div class="res-acts">
          <button class="icon-btn sm" data-a="copy" title="${esc(t('tree.copyValue'))}">${icon('copy')}</button>
          <button class="icon-btn sm" data-a="jump" title="${esc(t('q.openInEditor'))}">${icon('target')}</button>
        </div>
      </li>`).join('')}</ul>`;
}

const state = (ic: Parameters<typeof icon>[0], title: string, sub = '') => `<div class="empty">${icon(ic)}<strong>${esc(title)}</strong>${sub ? `<span>${esc(sub)}</span>` : ''}</div>`;
function preview(v: unknown): string {
  const s = typeof v === 'string' ? JSON.stringify(v) : JSON.stringify(v, null, 2);
  return s.length > 1200 ? s.slice(0, 1200) + '\n…' : s;
}

async function onOut(e: Event) {
  const tg = e.target as HTMLElement;
  if (tg.closest('#q-copy')) {
    await copyText(JSON.stringify(lastMatches.map((m) => m.value), null, 2));
    return void toast(t('toast.copied'), 'success');
  }
  const li = tg.closest<HTMLElement>('.res');
  const btn = tg.closest<HTMLElement>('[data-a]');
  if (!li || !btn) return;
  const m = lastMatches[+li.dataset.i!];
  if (btn.dataset.a === 'copy') { await copyText(typeof m.value === 'string' ? m.value : JSON.stringify(m.value, null, 2)); toast(t('toast.valueCopied'), 'success'); }
  else {
    const r = analyze(ed.text());
    const hit = r.node && nodeAtPath(r.node, m.path);
    if (hit) { setView('editor'); setTimeout(() => ed.selectRange(hit.node.start, hit.node.end, true), 60); }
  }
}
