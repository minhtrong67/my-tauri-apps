import Ajv from 'ajv';
import Ajv2019 from 'ajv/dist/2019';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { analyze, nodeAtPath, toValue, type PathSeg } from '../json';
import { toJsonSchema } from '../convert';
import { bus } from '../bus';
import { active, docs, displayName, textOf, create, switchTo } from '../docs';
import { ed } from '../editor';
import { icon } from '../icons';
import { t } from '../i18n';
import { currentView, setView } from '../nav';
import { esc } from '../ui';

let el: HTMLElement, body: HTMLElement, sel: HTMLSelectElement;
let schemaId = '';
let errors: { path: PathSeg[] }[] = [];

export function mountSchema(host: HTMLElement) {
  el = host;
  el.innerHTML = `
    <div class="page wide">
      <h1 class="page-title" id="sc-title"></h1>
      <div class="card">
        <div class="field-row wrap">
          <div class="field grow"><label id="sc-l"></label><select class="select" id="sc-sel"></select></div>
          <button class="btn tonal" id="sc-gen">${icon('sparkles')}<span id="sc-gen-l"></span></button>
        </div>
      </div>
      <div id="sc-body"></div>
    </div>`;
  body = el.querySelector('#sc-body')!; sel = el.querySelector('#sc-sel')!;
  sel.addEventListener('change', () => { schemaId = sel.value; render(); });
  el.querySelector('#sc-gen')!.addEventListener('click', () => {
    const r = analyze(ed.text());
    if (!r.ok || !r.node) return void render();
    const cur = active().id;
    const d = create(toJsonSchema(toValue(r.node)), { name: 'schema.json', activate: false });
    schemaId = d.id; switchTo(cur); render();
  });
  body.addEventListener('click', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('[data-i]');
    if (!li) return;
    const r = analyze(ed.text());
    const hit = r.node && nodeAtPath(r.node, errors[+li.dataset.i!].path);
    if (hit) { setView('editor'); setTimeout(() => ed.selectRange(hit.node.start, hit.node.end, true), 60); }
  });
  const refresh = () => { if (currentView() === 'schema') render(); };
  bus.on('view', refresh); bus.on('content', refresh); bus.on('active', refresh); bus.on('docs', refresh); bus.on('lang', refresh);
}

function ajvFor(schema: Record<string, unknown>) {
  const s = String(schema.$schema ?? '');
  const opts = { allErrors: true, strict: false, validateFormats: true };
  const a = s.includes('2020-12') ? new Ajv2020(opts) : s.includes('2019-09') ? new Ajv2019(opts) : new Ajv(opts);
  const af = ((addFormats as unknown as { default?: typeof addFormats }).default ?? addFormats) as (a: unknown) => void;
  af(a);
  return a;
}

const unesc = (s: string) => s.replace(/~1/g, '/').replace(/~0/g, '~');

function render() {
  el.querySelector('#sc-title')!.textContent = t('sc.title');
  el.querySelector('#sc-l')!.textContent = t('sc.schema');
  el.querySelector('#sc-gen-l')!.textContent = t('sc.generate');
  const cur = active();
  const others = docs.filter((d) => d.id !== cur.id);
  if (!others.find((d) => d.id === schemaId)) schemaId = others[0]?.id ?? '';
  sel.innerHTML = others.length ? others.map((d) => `<option value="${d.id}" ${d.id === schemaId ? 'selected' : ''}>${esc(displayName(d))}</option>`).join('') : `<option>${esc(t('sc.pick'))}</option>`;
  sel.disabled = !others.length;
  errors = [];
  const box = (ic: Parameters<typeof icon>[0], title: string, cls = '', sub = '') => `<div class="card"><div class="empty ${cls}">${icon(ic)}<strong>${esc(title)}</strong>${sub ? `<span>${esc(sub)}</span>` : ''}</div></div>`;
  if (!others.length) { body.innerHTML = box('schema', t('sc.noSchema')); return; }
  const data = analyze(ed.text());
  if (!data.ok || !data.node) { body.innerHTML = box('error', t('sc.invalidDoc')); return; }
  const sch = analyze(textOf(docs.find((d) => d.id === schemaId)!));
  if (!sch.ok || !sch.node) { body.innerHTML = box('error', t('sc.badSchema', { msg: displayName(docs.find((d) => d.id === schemaId)!) })); return; }
  try {
    const schema = toValue(sch.node) as Record<string, unknown>;
    const validate = ajvFor(schema).compile(schema);
    const ok = validate(toValue(data.node));
    if (ok) { body.innerHTML = box('ok', t('sc.valid'), 'ok'); return; }
    const errs = validate.errors ?? [];
    errors = errs.map((e) => ({ path: e.instancePath.split('/').slice(1).map(unesc).map((x) => (/^\d+$/.test(x) ? Number(x) : x)) }));
    body.innerHTML = `<div class="card"><div class="res-head"><strong>${errs.length === 1 ? t('sc.error') : t('sc.errors', { n: errs.length })}</strong></div>
      <ul class="diff-list">${errs.map((e, i) => `<li class="diff change clickable" data-i="${i}"><span class="badge">!</span>
        <code class="p">${esc(e.instancePath || t('sc.root'))}</code><span class="vals">${esc(e.message ?? '')}${e.params && 'additionalProperty' in e.params ? ` <code>${esc(String(e.params.additionalProperty))}</code>` : ''}${e.params && 'missingProperty' in e.params ? ` <code>${esc(String(e.params.missingProperty))}</code>` : ''}</span></li>`).join('')}</ul></div>`;
  } catch (e) { body.innerHTML = box('error', t('sc.badSchema', { msg: e instanceof Error ? e.message : String(e) })); }
}
