// Document state shared between modules, plus a tiny event bus.
import { settings } from './settings.js';

// Paper sizes in twips (1/1440 in) — the unit .docx uses. 1 px (96 dpi) = 15 twips.
export const PAPERS = {
  A3: { tw: 16838, th: 23811 },
  A4: { tw: 11906, th: 16838 },
  A5: { tw: 8392, th: 11906 },
  B5: { tw: 9979, th: 14173 },
  Letter: { tw: 12240, th: 15840 },
  Legal: { tw: 12240, th: 20160 },
  Executive: { tw: 10440, th: 15120 },
};
export const MARGIN_PRESETS = {
  normal: { top: 96, bottom: 96, left: 96, right: 96 },
  narrow: { top: 48, bottom: 48, left: 48, right: 48 },
  moderate: { top: 96, bottom: 96, left: 72, right: 72 },
  wide: { top: 96, bottom: 96, left: 192, right: 192 },
};

const listeners = {};
export const bus = {
  on(ev, fn) { (listeners[ev] ||= new Set()).add(fn); return () => listeners[ev].delete(fn); },
  emit(ev, data) { for (const fn of listeners[ev] || []) { try { fn(data); } catch (e) { console.error(ev, e); } } },
};

/** The document model that lives next to the editor HTML: page setup, header/footer, properties. */
export const doc = {
  path: null,
  dirty: false,
  title: '',
  author: '',
  created: Date.now(),
  page: {
    size: settings.size, orientation: settings.orientation,
    margins: { ...settings.margins },
    headerDist: 48, footerDist: 48,
    color: '',            // page colour ('' = white)
  },
  header: { text: '', align: 'left' },
  footer: { text: '', align: 'center' },
  diffFirst: false,       // hide header/footer on the first page
};

export function pageDims(p = doc.page) {
  const base = PAPERS[p.size] || PAPERS.A4;
  const land = p.orientation === 'landscape';
  const tw = land ? base.th : base.tw;
  const th = land ? base.tw : base.th;
  return { w: tw / 15, h: th / 15, tw, th };
}

export const cloneMeta = () => JSON.parse(JSON.stringify({ page: doc.page, header: doc.header, footer: doc.footer, diffFirst: doc.diffFirst }));
export function applyMeta(m) {
  if (!m) return;
  if (m.page) doc.page = { ...doc.page, ...m.page, margins: { ...doc.page.margins, ...(m.page.margins || {}) } };
  if (m.header) doc.header = { text: '', align: 'left', ...m.header };
  if (m.footer) doc.footer = { text: '', align: 'center', ...m.footer };
  if ('diffFirst' in m) doc.diffFirst = !!m.diffFirst;
}
