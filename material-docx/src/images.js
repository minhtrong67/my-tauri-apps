// Pictures: insert, select, resize (drag handles), wrap, rotate / flip, alt text.
import { $, clamp, pxToCm } from './util.js';
import { doc, bus, pageDims } from './state.js';
import { editor, workspace, run, selInEditor, restoreSel } from './editor.js';
import { setImageGetter } from './cmds.js';

const MAX_PX = 1600;
let sel = null;
const hostEl = () => $('#img-handles');
export const selectedImage = () => (sel && editor.contains(sel) ? sel : null);
setImageGetter(selectedImage);

export const contentWidth = () => {
  const d = pageDims();
  return Math.max(120, d.w - doc.page.margins.left - doc.page.margins.right);
};

const readAsDataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

async function prepare(url) {
  const img = await loadImg(url);
  let w = img.naturalWidth, h = img.naturalHeight;
  let out = url;
  if (w > MAX_PX && /^data:image\/(png|jpe?g|webp|bmp)/.test(url)) {
    const sc = MAX_PX / w;
    const c = document.createElement('canvas');
    c.width = MAX_PX; c.height = Math.round(h * sc);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const png = /^data:image\/png/.test(url);
    out = c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.9);
    w = c.width; h = c.height;
  }
  return { url: out, w, h };
}

export async function insertImageUrl(url, alt = '') {
  const p = await prepare(url);
  const cw = contentWidth();
  let w = p.w, h = p.h;
  if (w > cw) { h = Math.round((h * cw) / w); w = Math.round(cw); }
  restoreSel();
  run(() => { document.execCommand('insertHTML', false, `<img src="${p.url}" width="${w}" height="${h}" alt="${alt.replace(/"/g, '&quot;')}">`); });
}
export async function insertImageBlob(blob) { await insertImageUrl(await readAsDataUrl(blob), blob.name ? blob.name.replace(/\.[^.]+$/, '') : ''); }

/* ------------------------------ selection ------------------------------ */
export function selectImage(img) {
  if (sel === img) { placeHandles(); return; }
  clearImage(true);
  sel = img;
  img.classList.add('sel');
  placeHandles();
  bus.emit('image', img);
}
export function clearImage(quiet) {
  if (!sel) return;
  sel.classList.remove('sel');
  sel = null;
  hostEl().hidden = true;
  if (!quiet) bus.emit('image', null);
}

const DIRS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
function buildHandles() {
  const h = hostEl();
  h.innerHTML = '<div class="ih-box"></div>' + DIRS.map((d) => `<i class="ih ${d}" data-d="${d}"></i>`).join('');
}
export function placeHandles() {
  const img = selectedImage();
  const h = hostEl();
  if (!img) { h.hidden = true; return; }
  const r = img.getBoundingClientRect();
  const w = workspace.getBoundingClientRect();
  if (!h.firstChild) buildHandles();
  h.hidden = false;
  const box = h.firstChild;
  box.style.cssText = `left:${r.left - w.left + workspace.scrollLeft}px;top:${r.top - w.top + workspace.scrollTop}px;width:${r.width}px;height:${r.height}px`;
  const pos = { nw: [0, 0], n: [0.5, 0], ne: [1, 0], e: [1, 0.5], se: [1, 1], s: [0.5, 1], sw: [0, 1], w: [0, 0.5] };
  for (const i of h.querySelectorAll('.ih')) {
    const [fx, fy] = pos[i.dataset.d];
    i.style.left = r.left - w.left + workspace.scrollLeft + r.width * fx + 'px';
    i.style.top = r.top - w.top + workspace.scrollTop + r.height * fy + 'px';
  }
}

export function initImages() {
  editor.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'IMG') { const img = e.target; setTimeout(() => selectImage(img), 0); } else clearImage();
  });
  editor.addEventListener('dblclick', (e) => { if (e.target.tagName === 'IMG') bus.emit('image-dialog', e.target); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') clearImage(); });
  workspace.addEventListener('scroll', placeHandles, { passive: true });
  window.addEventListener('resize', placeHandles);
  bus.on('settled', () => { if (sel && !editor.contains(sel)) clearImage(); else placeHandles(); });
  bus.on('layout-live', placeHandles);
  hostEl().addEventListener('mousedown', startDrag);
}

function startDrag(e) {
  const d = e.target.dataset && e.target.dataset.d;
  const img = selectedImage();
  if (!d || !img) return;
  e.preventDefault();
  const r0 = img.getBoundingClientRect();
  const zoom = r0.width / (parseFloat(img.getAttribute('width')) || img.naturalWidth || r0.width) || 1;
  const w0 = r0.width / zoom, h0 = r0.height / zoom;
  const ratio = w0 / h0;
  const maxW = contentWidth();
  const x0 = e.clientX, y0 = e.clientY;
  const move = (ev) => {
    let dx = (ev.clientX - x0) / zoom, dy = (ev.clientY - y0) / zoom;
    let w = w0, h = h0;
    if (d.includes('e')) w = w0 + dx;
    if (d.includes('w')) w = w0 - dx;
    if (d.includes('s')) h = h0 + dy;
    if (d.includes('n')) h = h0 - dy;
    if (d.length === 2) { // corner keeps the aspect ratio
      const byW = Math.abs(w - w0) / w0 >= Math.abs(h - h0) / h0;
      if (byW) h = w / ratio; else w = h * ratio;
    } else if (!ev.shiftKey) {
      if (d === 'e' || d === 'w') h = h0;
      else w = w0;
    } else if (d === 'e' || d === 'w') h = w / ratio; else w = h * ratio;
    w = clamp(w, 16, maxW); if (d.length === 2) h = w / ratio;
    h = Math.max(16, h);
    img.setAttribute('width', Math.round(w));
    img.setAttribute('height', Math.round(h));
    placeHandles();
  };
  const up = () => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
    run(() => {});
    placeHandles();
  };
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
}

/* ------------------------------ operations ------------------------------ */
export function imageSize(img = selectedImage()) {
  if (!img) return null;
  return { w: parseFloat(img.getAttribute('width')) || img.width, h: parseFloat(img.getAttribute('height')) || img.height, nw: img.naturalWidth, nh: img.naturalHeight };
}
export function setImageSize(w, h) {
  const img = selectedImage();
  if (!img) return;
  run(() => { img.setAttribute('width', Math.round(clamp(w, 8, 5000))); img.setAttribute('height', Math.round(clamp(h, 8, 5000))); });
  placeHandles();
}
export function scaleImage(factor) {
  const s = imageSize();
  if (s) setImageSize(Math.min(contentWidth(), s.w * factor), (Math.min(contentWidth(), s.w * factor) / s.w) * s.h);
}
export function resetImageSize() {
  const s = imageSize();
  if (!s || !s.nw) return;
  const cw = contentWidth();
  const w = Math.min(s.nw, cw);
  setImageSize(w, (w / s.nw) * s.nh);
}
export function setWrap(mode) {
  const img = selectedImage();
  if (!img) return;
  run(() => { if (mode === 'inline') img.removeAttribute('data-wrap'); else img.setAttribute('data-wrap', mode); });
  placeHandles();
}
function applyTransform(img) {
  const rot = parseInt(img.getAttribute('data-rot') || '0', 10) || 0;
  const fl = img.getAttribute('data-flip') || '';
  const parts = [];
  if (rot) parts.push(`rotate(${rot}deg)`);
  if (fl.includes('h')) parts.push('scaleX(-1)');
  if (fl.includes('v')) parts.push('scaleY(-1)');
  if (parts.length) img.style.transform = parts.join(' '); else img.style.removeProperty('transform');
  if (!img.getAttribute('style')) img.removeAttribute('style');
}
export function rotateImage(delta) {
  const img = selectedImage();
  if (!img) return;
  run(() => {
    const rot = (((parseInt(img.getAttribute('data-rot') || '0', 10) || 0) + delta) % 360 + 360) % 360;
    if (rot) img.setAttribute('data-rot', rot); else img.removeAttribute('data-rot');
    applyTransform(img);
  });
  placeHandles();
}
export function flipImage(axis) {
  const img = selectedImage();
  if (!img) return;
  run(() => {
    let fl = img.getAttribute('data-flip') || '';
    fl = fl.includes(axis) ? fl.replace(axis, '') : fl + axis;
    if (fl) img.setAttribute('data-flip', fl); else img.removeAttribute('data-flip');
    applyTransform(img);
  });
}
export function setAlt(text) {
  const img = selectedImage();
  if (!img) return;
  run(() => { img.setAttribute('alt', text); });
}
export function removeImage() {
  const img = selectedImage();
  if (!img) return;
  run(() => { img.remove(); });
  clearImage();
}
export const toCm = pxToCm;
void selInEditor;
