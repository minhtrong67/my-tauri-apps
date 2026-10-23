import { analyze, indentString, parseJson, stringifyNode, toValue, fromValue } from '../json';
import { toYaml, toCsv, toXml, toTypeScript, toJsonSchema, fromYaml, fromCsv, fromXml } from '../convert';
import { bus, debounce } from '../bus';
import { ed, errText } from '../editor';
import { create, displayName, active } from '../docs';
import { icon } from '../icons';
import { t, type Key } from '../i18n';
import { currentView, setView } from '../nav';
import { settings } from '../settings';
import { copyText, esc, Select, toast } from '../ui';
import { pickFiles, saveTextAs } from '../tauri';

type Out = 'yaml' | 'csv' | 'xml' | 'ts' | 'schema';
type In = 'yaml' | 'csv' | 'xml';
const OUT: { id: Out; label: string; ext: string }[] = [
  { id: 'yaml', label: 'YAML', ext: 'yaml' }, { id: 'csv', label: 'CSV', ext: 'csv' }, { id: 'xml', label: 'XML', ext: 'xml' },
  { id: 'ts', label: 'TypeScript', ext: 'ts' }, { id: 'schema', label: 'JSON Schema', ext: 'schema.json' },
];
const IN: { id: In; label: string }[] = [{ id: 'yaml', label: 'YAML' }, { id: 'csv', label: 'CSV' }, { id: 'xml', label: 'XML' }];

let el: HTMLElement;
let dir: 'from' | 'to' = 'from';
let outFmt: Out = 'yaml';
let inFmt: In = 'yaml';
let delim = ',';
let infer = true;
let root = 'root';
let inputEl: HTMLTextAreaElement, outputEl: HTMLTextAreaElement, errEl: HTMLElement, optsEl: HTMLElement;
let outExt = 'yaml';
let fmtSel: Select;

export function mountConvert(host: HTMLElement) {
  el = host;
  el.innerHTML = `
    <div class="page wide">
      <h1 class="page-title" id="cv-title"></h1>
      <div class="card">
        <div class="field-row wrap">
          <div class="seg" id="cv-dir"><button data-d="from"></button><button data-d="to"></button></div>
          <div class="field"><label id="cv-fmt-l"></label><div id="cv-fmt" class="select-host"></div></div>
          <div id="cv-opts" class="field-row wrap"></div>
        </div>
      </div>
      <div class="cv-grid">
        <div class="card cv-pane"><div class="res-head"><strong id="cv-in-l"></strong><span id="cv-in-act"></span></div><textarea id="cv-in" spellcheck="false"></textarea></div>
        <div class="card cv-pane"><div class="res-head"><strong id="cv-out-l"></strong>
          <span class="acts"><button class="btn text" id="cv-copy">${icon('copy')}<span></span></button><button class="btn text" id="cv-save">${icon('save')}<span></span></button><button class="btn tonal" id="cv-tab">${icon('plus')}<span></span></button></span></div>
          <div class="cv-err" id="cv-err" hidden></div><textarea id="cv-out" readonly spellcheck="false"></textarea></div>
      </div>
    </div>`;
  inputEl = el.querySelector('#cv-in')!; outputEl = el.querySelector('#cv-out')!; errEl = el.querySelector('#cv-err')!; optsEl = el.querySelector('#cv-opts')!;
  const run = debounce(convert, 200);
  inputEl.addEventListener('input', run);
  el.querySelector('#cv-dir')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-d]');
    if (b) { dir = b.dataset.d as typeof dir; delim = dir === 'to' ? 'auto' : ','; chrome(); sync(); convert(); }
  });
  fmtSel = new Select(el.querySelector('#cv-fmt')!, (v) => { if (dir === 'from') outFmt = v as Out; else inFmt = v as In; chrome(); convert(); });
  el.querySelector('#cv-copy')!.addEventListener('click', async () => { if (outputEl.value) { await copyText(outputEl.value); toast(t('toast.copied'), 'success'); } else toast(t('toast.nothingToCopy')); });
  el.querySelector('#cv-save')!.addEventListener('click', async () => {
    if (!outputEl.value) return toast(t('toast.nothingToCopy'));
    const base = displayName(active()).replace(/\.[^.]+$/, '');
    const ext = dir === 'from' ? outExt : 'json';
    const p = await saveTextAs({ text: outputEl.value, name: `${base}.${ext}`, filters: [{ name: ext.toUpperCase(), extensions: [ext.split('.').pop()!] }, { name: 'All files', extensions: ['*'] }] });
    if (p) toast(t('toast.saved', { name: p.replace(/^.*[\\/]/, '') }), 'success');
  });
  el.querySelector('#cv-tab')!.addEventListener('click', () => {
    if (!outputEl.value) return toast(t('toast.nothingToCopy'));
    const base = displayName(active()).replace(/\.[^.]+$/, '');
    create(outputEl.value, { name: `${base}.${dir === 'from' ? outExt : 'json'}` });
    setView('editor');
  });
  el.addEventListener('click', async (e) => {
    if ((e.target as HTMLElement).closest('#cv-load')) {
      const f = (await pickFiles())[0];
      if (f) { inputEl.value = f.text; const ext = f.name.split('.').pop()?.toLowerCase(); if (ext === 'csv' || ext === 'tsv') inFmt = 'csv'; else if (ext === 'xml') inFmt = 'xml'; else if (ext === 'yml' || ext === 'yaml') inFmt = 'yaml'; chrome(); convert(); }
    }
  });
  const refresh = () => { if (currentView() === 'convert') { chrome(); sync(); convert(); } };
  bus.on('view', refresh); bus.on('lang', refresh);
  bus.on('content', () => { if (currentView() === 'convert' && dir === 'from') { sync(); run(); } });
  bus.on('active', () => { if (currentView() === 'convert' && dir === 'from') { sync(); convert(); } });
  chrome();
}

function sync() {
  if (dir === 'from') { const txt = ed.text(); inputEl.value = txt.length > 300_000 ? txt.slice(0, 300_000) : txt; inputEl.readOnly = true; }
  else inputEl.readOnly = false;
}

function chrome() {
  const q = <T extends HTMLElement>(s: string) => el.querySelector<T>(s)!;
  q('#cv-title').textContent = t('cv.title');
  const [a, b] = Array.from(q('#cv-dir').children) as HTMLElement[];
  a.textContent = t('cv.fromJson'); b.textContent = t('cv.toJson');
  a.setAttribute('aria-pressed', String(dir === 'from')); b.setAttribute('aria-pressed', String(dir === 'to'));
  q('#cv-fmt-l').textContent = t('cv.format');
  const list = dir === 'from' ? OUT : IN;
  const cur = dir === 'from' ? outFmt : inFmt;
  fmtSel.set(list.map((f) => ({ value: f.id, label: f.label })), cur);
  q('#cv-in-l').textContent = dir === 'from' ? t('cv.fromTab') : t('cv.input');
  q('#cv-out-l').textContent = t('cv.output');
  q('#cv-copy span').textContent = t('cv.copy'); q('#cv-save span').textContent = t('cv.save'); q('#cv-tab span').textContent = t('cv.openTab');
  q('#cv-in-act').innerHTML = dir === 'to' ? `<button class="btn text" id="cv-load">${icon('open')}${esc(t('cv.openFile'))}</button>` : '';
  inputEl.placeholder = dir === 'to' ? t('cv.paste', { fmt: IN.find((f) => f.id === inFmt)!.label }) : '';
  let opts = '';
  const dsel = (withAuto: boolean) => `<div class="field"><label>${esc(t('cv.delimiter'))}</label><div id="cv-delim" class="select-host"></div></div>`;
  const delimOptions = (withAuto: boolean) => [...(withAuto ? [['auto', t('cv.auto')]] : []), [',', t('cv.comma')], [';', t('cv.semicolon')], ['\t', t('cv.tab')], ['|', t('cv.pipe')]].map(([value, label]) => ({ value, label }));
  if (dir === 'from' && outFmt === 'csv') opts = dsel(false);
  if (dir === 'from' && outFmt === 'xml') opts = `<div class="field"><label>${esc(t('cv.rootName'))}</label><input class="input" id="cv-root" value="${esc(root)}"></div>`;
  if (dir === 'to' && inFmt === 'csv') opts = dsel(true) + `<label class="switch-row inline"><span>${esc(t('cv.infer'))}</span><span class="switch"><input type="checkbox" id="cv-infer" ${infer ? 'checked' : ''}><i></i></span></label>`;
  optsEl.innerHTML = opts;
  const dh = optsEl.querySelector<HTMLElement>('#cv-delim');
  if (dh) new Select(dh, (v) => { delim = v; convert(); }).set(delimOptions(dir === 'to'), delim);
  optsEl.querySelector('#cv-infer')?.addEventListener('change', (e) => { infer = (e.target as HTMLInputElement).checked; convert(); });
  optsEl.querySelector('#cv-root')?.addEventListener('input', (e) => { root = (e.target as HTMLInputElement).value || 'root'; convert(); });
  if (dir === 'from' && delim === 'auto') delim = ',';
  if (dir === 'to' && !['auto', ',', ';', '\t', '|'].includes(delim)) delim = 'auto';
}

function fail(msg: string) { errEl.hidden = false; errEl.innerHTML = `${icon('error')}<span>${esc(t('cv.error', { msg }))}</span>`; outputEl.value = ''; }

function convert() {
  errEl.hidden = true;
  try {
    if (dir === 'from') {
      const r = analyze(ed.text());
      if (r.empty) { outputEl.value = ''; outputEl.placeholder = t('cv.idle'); return; }
      if (!r.ok || !r.node) return fail(r.error ? errText(r.error) : '');
      const v = toValue(r.node);
      const f = OUT.find((x) => x.id === outFmt)!;
      outExt = f.ext;
      outputEl.value = outFmt === 'yaml' ? toYaml(v) : outFmt === 'csv' ? toCsv(v, delim === 'auto' ? ',' : delim) : outFmt === 'xml' ? toXml(v, root) : outFmt === 'ts' ? toTypeScript(v) : toJsonSchema(v);
    } else {
      const src = inputEl.value;
      if (!src.trim()) { outputEl.value = ''; outputEl.placeholder = t('cv.idle'); return; }
      const v = inFmt === 'yaml' ? fromYaml(src) : inFmt === 'csv' ? fromCsv(src, { delimiter: delim, infer }) : fromXml(src);
      outputEl.value = stringifyNode(fromValue(v), { indent: indentString(settings.indent) });
    }
  } catch (e) { fail(e instanceof Error ? e.message : String(e)); }
  void parseJson;
}
