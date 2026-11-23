import { memo, useEffect, useState } from 'react';
import { AppWindow, File, FileArchive, FileAudio, FileCode2, FileImage, FileSpreadsheet, FileText, FileVideo, Presentation, type LucideIcon } from '../lib/icons';
import type { Entry } from '../lib/types';
import { FolderIcon } from './FolderIcon';
import { catOf, hasNativeIcon, isRaster, isSvg } from '../lib/fileTypes';
import { EXT_GLYPH, GLYPHS } from '../lib/fileGlyphs.generated';
import { extOf } from '../lib/paths';
import { api, convertFileSrc } from '../lib/api';

const ICONS: Record<string, LucideIcon> = {
  image: FileImage, video: FileVideo, audio: FileAudio, archive: FileArchive, doc: FileText, sheet: FileSpreadsheet,
  slide: Presentation, code: FileCode2, exe: AppWindow, text: FileText, file: File
};
export const FileIcon = memo(function FileIcon({ entry, size = 20, className = '' }: { entry: Pick<Entry, 'name' | 'isDir'> & { path?: string }; size?: number; className?: string }) {
  const cat = catOf(entry);
  if (hasNativeIcon(entry)) return <NativeIcon entry={entry} size={size} className={className} />;
  if (cat === 'folder') return <FolderIcon path={entry.path} size={size} className={className} />;
  /* well-known file types (html, css, js, json, xml, py, sql ...) get their own coloured glyph */
  const lower = entry.name.toLowerCase();
  const gk = EXT_GLYPH[extOf(entry.name)] ?? (lower === 'dockerfile' ? 'mdiDocker' : undefined);
  const glyph = gk ? GLYPHS[gk] : undefined;
  if (glyph) {
    if (size >= 40) return (
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className={`flex-none ${className}`}>
        <path d="M14 4h26l13 13v39a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z" fill={`color-mix(in oklab, ${glyph.c} 22%, var(--surface-container-high))`} />
        <path d="M40 4v10a3 3 0 0 0 3 3h10z" fill={glyph.c} fillOpacity=".55" />
        <svg x="16" y="22" width="32" height="32" viewBox="0 0 24 24"><path d={glyph.p} fill={glyph.c} /></svg>
      </svg>
    );
    return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className={`flex-none ${className}`}><path d={glyph.p} fill={glyph.c} /></svg>;
  }
  const I = ICONS[cat] || File;
  if (size >= 40) {
    /* large view: a page with a folded corner, tinted by file type, like the Windows file-type icons */
    const k = `var(--k-${cat})`;
    return (
      <span className={`relative inline-block flex-none ${className}`} style={{ width: size, height: size }}>
        <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden style={{ display: 'block' }}>
          <path d="M14 4h26l13 13v39a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z" fill={`color-mix(in oklab, ${k} 24%, var(--surface-container-high))`} />
          <path d="M40 4v10a3 3 0 0 0 3 3h10z" fill={k} fillOpacity=".55" />
        </svg>
        <span className="pointer-events-none absolute inset-x-0 grid place-items-center" style={{ top: '40%', height: '40%', color: k }}><I style={{ width: '56%', height: '100%' }} strokeWidth={1.8} /></span>
      </span>
    );
  }
  return <I size={size} className={className} style={{ color: `var(--k-${cat})` }} strokeWidth={1.8} />;
});

/* Thumbnails and shell icons come from Rust (Windows shell, cached on disk). The queue is LIFO - what is on screen now is
   requested first - requests of rows that scrolled away are dropped, and results live in a small LRU so memory stays flat. */
const MAX_CACHE = 500;
const cache = new Map<string, string | null>();
const remember = (k: string, v: string | null) => { cache.delete(k); cache.set(k, v); if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value as string); };
interface Job { run: () => void; dead: boolean }
const queue: Job[] = []; let running = 0;
const pump = () => { while (running < 6 && queue.length) { const j = queue.pop()!; if (j.dead) continue; running++; j.run(); } };
function requestImage(path: string, key: string, size: number, kind: 'thumb' | 'icon'): { promise: Promise<string | null>; cancel: () => void } {
  if (cache.has(key)) return { promise: Promise.resolve(cache.get(key)!), cancel: () => {} };
  let started = false; let resolveFn: (v: string | null) => void = () => {};
  const promise = new Promise<string | null>((r) => { resolveFn = r; });
  const job: Job = { dead: false, run: () => {
    started = true;
    api.getThumbnail(path, size, kind).then((p) => convertFileSrc(p)).catch(() => null).then((r) => { remember(key, r); resolveFn(r); }).finally(() => { running--; pump(); });
  } };
  queue.push(job); pump();
  return { promise, cancel: () => { if (!started) { job.dead = true; resolveFn(null); } } };
}

/** Icon of a shortcut / program taken from Windows (falls back to the generic glyph until it arrives or when unavailable). */
function NativeIcon({ entry, size, className }: { entry: Pick<Entry, 'name' | 'isDir'> & { path?: string }; size: number; className: string }) {
  const px = size >= 72 ? 256 : size >= 40 ? 128 : size >= 24 ? 64 : 48;
  const key = `${entry.path}|icon|${px}`;
  const [src, setSrc] = useState<string | null>(() => (entry.path ? cache.get(key) ?? null : null));
  useEffect(() => {
    if (!entry.path) return;
    const hit = cache.get(key); if (hit !== undefined) { setSrc(hit); return; }
    setSrc(null);
    const r = requestImage(entry.path, key, px, 'icon'); let live = true;
    void r.promise.then((v) => { if (live) setSrc(v); });
    return () => { live = false; r.cancel(); };
  }, [entry.path, key, px]);
  if (src) return <img src={src} alt="" draggable={false} decoding="async" className={`flex-none object-contain ${className}`} style={{ width: size, height: size }} />;
  return <AppWindow size={size} className={className} style={{ color: 'var(--k-exe)' }} />;
}

/** Thumbnail with graceful fallback to the file-type icon. */
export const Thumb = memo(function Thumb({ entry, size, iconSize, big, enabled }: { entry: Entry; size: number; iconSize: number; big?: boolean; enabled: boolean }) {
  const raster = enabled && isRaster(entry);
  const svg = enabled && isSvg(entry) && entry.size < 4 * 1024 * 1024;
  const key = `${entry.path}|${entry.modified}|${size}`;
  const [src, setSrc] = useState<string | null>(() => cache.get(key) ?? null);
  const [bad, setBad] = useState(false);
  useEffect(() => {
    let live = true; setBad(false);
    if (svg) { setSrc(convertFileSrc(entry.path)); return; }
    if (!raster) { setSrc(null); return; }
    const hit = cache.get(key);
    if (hit !== undefined) { setSrc(hit); return; }
    setSrc(null);
    const r = requestImage(entry.path, key, size, 'thumb');
    void r.promise.then((v) => { if (live) setSrc(v || (big && entry.size < 6 * 1024 * 1024 && /\.(png|jpe?g|gif|webp|bmp)$/i.test(entry.name) ? convertFileSrc(entry.path) : null)); });
    return () => { live = false; r.cancel(); };
  }, [entry.path, key, raster, svg, size, big]);
  if (src && !bad) return <img src={src} alt="" decoding="async" draggable={false} onError={() => setBad(true)} className="size-full animate-[fade-in_.2s] rounded-[inherit] object-cover ring-1 ring-outline-variant" />;
  return <FileIcon entry={entry} size={iconSize} />;
});
