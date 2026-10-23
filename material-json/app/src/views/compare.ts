import { analyze, indentString, stringifyNode, toValue } from '../json';
import { diffValues, lineDiff, formatPath } from '../diff';
import { bus } from '../bus';
import { active, docs, displayName, textOf, openLoaded, switchTo } from '../docs';
import { icon } from '../icons';
import { t } from '../i18n';
import { currentView } from '../nav';
import { esc, Select } from '../ui';
import { pickFiles } from '../tauri';

let el: HTMLElement, body: HTMLElement, sel: Select, ignore: HTMLInputElement;
let otherId = '';
let swapped = false;
let tab: 'changes' | 'text' = 'changes';

export function mountCompare(host: HTMLElement) {
  el = host;
  el.innerHTML = `
    <div class="page wide">
      <h1 class="page-title" id="cmp-title"></h1>
      <div class="card">
        <div class="field-row wrap">
          <div class="field grow"><label id="cmp-lbl-with"></label><div id="cmp-sel" class="select-host"></div></div>
          <button class="btn tonal" id="cmp-swap">${icon('updown')}<span id="cmp-swap-l"></span></button>
          <button class="btn outlined" id="cmp-open">${icon('open')}<span id="cmp-open-l"></span></button>
        </div>
        <label class="switch-row"><span id="cmp-ignore-l"></span><span class="switch"><input type="checkbox" id="cmp-ignore" checked><i></i></span></label>
      </div>
      <div id="cmp-body"></div>
    </div>`;
  body = el.querySelector('#cmp-body')!; sel = new Select(el.querySelector('#cmp-sel')!, (v) => { otherId = v; render(); }); ignore = el.querySelector('#cmp-ignore')!;
  ignore.addEventListener('change', render);
  el.querySelector('#cmp-swap')!.addEventListener('click', () => { swapped = !swapped; render(); });
  el.querySelector('#cmp-open')!.addEventListener('click', async () => {
    const files = await pickFiles();
    if (!files.length) return;
    const cur = active().id;
    openLoaded(files);
    otherId = active().id;
    switchTo(cur);
    render();
  });
  body.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-tab]');
    if (b) { tab = b.dataset.tab as typeof tab; render(); }
  });
  const refresh = () => { if (currentView() === 'compare') render(); };
  bus.on('view', refresh); bus.on('content', refresh); bus.on('active', refresh); bus.on('docs', refresh); bus.on('lang', refresh);
}

function norm(id: string): { ok: true; text: string; value: unknown } | { ok: false } {
  const d = docs.find((x) => x.id === id)!;
  const r = analyze(textOf(d));
  if (!r.ok || !r.node) return { ok: false };
  const text = stringifyNode(r.node, { indent: indentString(2), sort: ignore.checked ? 'asc' : false });
  return { ok: true, text, value: toValue(r.node) };
}

function render() {
  el.querySelector('#cmp-title')!.textContent = t('cmp.title');
  el.querySelector('#cmp-lbl-with')!.textContent = t('cmp.with');
  el.querySelector('#cmp-swap-l')!.textContent = t('act.swap');
  el.querySelector('#cmp-open-l')!.textContent = t('cmp.openFile');
  el.querySelector('#cmp-ignore-l')!.textContent = t('cmp.ignoreOrder');
  const cur = active();
  const others = docs.filter((d) => d.id !== cur.id);
  if (!others.find((d) => d.id === otherId)) otherId = others[0]?.id ?? '';
  sel.set(others.map((d) => ({ value: d.id, label: displayName(d) })), otherId, !others.length);
  if (!others.length) { body.innerHTML = `<div class="card"><div class="empty">${icon('compare')}<strong>${esc(t('cmp.noOther'))}</strong></div></div>`; return; }

  const leftId = swapped ? otherId : cur.id, rightId = swapped ? cur.id : otherId;
  const L = norm(leftId), R = norm(rightId);
  if (!L.ok || !R.ok) {
    const bad = docs.find((d) => d.id === (!L.ok ? leftId : rightId))!;
    body.innerHTML = `<div class="card"><div class="empty">${icon('error')}<strong>${esc(t('cmp.invalid', { name: displayName(bad) }))}</strong></div></div>`;
    return;
  }
  const diffs = diffValues(L.value, R.value);
  const c = { a: 0, r: 0, c: 0 };
  diffs.forEach((d) => { if (d.op === 'add') c.a++; else if (d.op === 'remove') c.r++; else c.c++; });
  const names = `${esc(displayName(docs.find((d) => d.id === leftId)!))} <span class="vs">⇄</span> ${esc(displayName(docs.find((d) => d.id === rightId)!))}`;
  if (!diffs.length) { body.innerHTML = `<div class="card"><div class="empty ok">${icon('ok')}<strong>${esc(t('cmp.identical'))}</strong><span>${names}</span></div></div>`; return; }

  let inner = '';
  if (tab === 'changes') {
    const fmt = (v: unknown) => { const s = JSON.stringify(v); return esc(s.length > 140 ? s.slice(0, 140) + '…' : s); };
    inner = `<ul class="diff-list">${diffs.slice(0, 1000).map((d) => `
      <li class="diff ${d.op}">
        <span class="badge">${d.op === 'add' ? '+' : d.op === 'remove' ? '−' : '~'}</span>
        <code class="p">${esc(formatPath(d.path))}</code>
        <span class="vals">${d.op !== 'add' ? `<code class="l">${fmt(d.left)}</code>` : ''}${d.op === 'change' ? '<span class="arrow">→</span>' : ''}${d.op !== 'remove' ? `<code class="r">${fmt(d.right)}</code>` : ''}</span>
      </li>`).join('')}</ul>`;
  } else {
    const rows = lineDiff(L.text.split('\n'), R.text.split('\n'));
    inner = rows ? `<div class="sbs"><table>${rows.map((r) => `
      <tr class="${r.kind}"><td class="n">${r.l?.n ?? ''}</td><td class="c">${r.l ? esc(r.l.text) : ''}</td><td class="n">${r.r?.n ?? ''}</td><td class="c">${r.r ? esc(r.r.text) : ''}</td></tr>`).join('')}</table></div>`
      : `<div class="empty">${icon('info')}<strong>${esc(t('cmp.tooLarge'))}</strong></div>`;
  }
  body.innerHTML = `
    <div class="card">
      <div class="res-head"><div class="summary">
        <span class="chip add">+ ${c.a} ${esc(t('cmp.added'))}</span><span class="chip rem">− ${c.r} ${esc(t('cmp.removed'))}</span><span class="chip chg">~ ${c.c} ${esc(t('cmp.changed'))}</span>
      </div><div class="seg">
        <button data-tab="changes" aria-pressed="${tab === 'changes'}">${esc(t('cmp.structure'))}</button>
        <button data-tab="text" aria-pressed="${tab === 'text'}">${esc(t('cmp.text'))}</button>
      </div></div>
      <div class="names">${names}</div>
      ${inner}
    </div>`;
}
