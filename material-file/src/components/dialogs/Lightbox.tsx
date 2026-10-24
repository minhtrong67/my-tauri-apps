import { useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { ChevronLeft, ChevronRight, ExternalLink, Minus, Plus, RotateCcw, X, FileQuestion } from 'lucide-react';
import { closeModal, openModal, useUI } from '../../store/ui';
import { useT } from '../../lib/i18n';
import { api, convertFileSrc } from '../../lib/api';
import type { Entry } from '../../lib/types';
import { extOf } from '../../lib/paths';
import { getView, useExplorer, openEntry } from '../../store/explorer';
import { IconButton } from '../ui/Buttons';
import { createPortal } from 'react-dom';

const IMG = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico', 'avif']);
const VID = new Set(['mp4', 'webm', 'mkv', 'mov', 'm4v', 'ogv']); const AUD = new Set(['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'opus']);
const TXT = new Set(['txt', 'md', 'json', 'js', 'ts', 'tsx', 'jsx', 'css', 'html', 'xml', 'yml', 'yaml', 'toml', 'ini', 'log', 'csv', 'rs', 'py', 'sh', 'bat', 'sql', 'c', 'cpp', 'h', 'java', 'go', 'vue']);
const kindOf = (e: Entry) => { const x = extOf(e.name); return IMG.has(x) ? 'img' : VID.has(x) ? 'vid' : AUD.has(x) ? 'aud' : x === 'pdf' ? 'pdf' : x === 'md' ? 'md' : TXT.has(x) ? 'txt' : 'none'; };

function ImageView({ src }: { src: string }) {
  const [z, setZ] = useState(1); const [p, setP] = useState({ x: 0, y: 0 }); const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  useEffect(() => { setZ(1); setP({ x: 0, y: 0 }); }, [src]);
  const zoom = (d: number) => setZ((v) => Math.min(8, Math.max(0.2, +(v * d).toFixed(3))));
  return (
    <div className="relative size-full overflow-hidden" onWheel={(e) => zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15)}
      onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, ox: p.x, oy: p.y }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
      onPointerMove={(e) => { const d = drag.current; if (d) setP({ x: d.ox + e.clientX - d.x, y: d.oy + e.clientY - d.y }); }} onPointerUp={() => { drag.current = null; }}
      onDoubleClick={() => { setZ(z === 1 ? 2 : 1); setP({ x: 0, y: 0 }); }}>
      <img src={src} alt="" draggable={false} className="absolute top-1/2 left-1/2 max-h-full max-w-full select-none" style={{ transform: `translate(-50%,-50%) translate(${p.x}px,${p.y}px) scale(${z})`, transition: drag.current ? 'none' : 'transform .25s var(--ease-emph)', cursor: z > 1 ? 'grab' : 'zoom-in' }} />
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-inverse-surface/90 px-2 py-1 text-inverse-on-surface" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
        <IconButton icon={Minus} label="−" side="top" small onClick={() => zoom(1 / 1.25)} className="!text-inverse-on-surface" /><span className="w-12 text-center text-xs font-semibold tabular-nums">{Math.round(z * 100)}%</span>
        <IconButton icon={Plus} label="+" side="top" small onClick={() => zoom(1.25)} className="!text-inverse-on-surface" /><IconButton icon={RotateCcw} label="100%" side="top" small onClick={() => { setZ(1); setP({ x: 0, y: 0 }); }} className="!text-inverse-on-surface" />
      </div>
    </div>
  );
}
function TextView({ e, md }: { e: Entry; md: boolean }) {
  const [txt, setTxt] = useState<string | null>(null);
  useEffect(() => { let live = true; setTxt(null); api.previewText(e.path).then((r) => live && setTxt(r)).catch(() => live && setTxt('')); return () => { live = false; }; }, [e.path]);
  const html = useMemo(() => (md && txt ? DOMPurify.sanitize(marked.parse(txt, { async: false }) as string) : ''), [md, txt]);
  if (txt === null) return <div className="skeleton m-6 h-40" />;
  return md ? <article className="prose-md mx-auto max-w-3xl p-8 select-text" dangerouslySetInnerHTML={{ __html: html }} /> : <pre className="m-0 h-full overflow-auto p-6 font-mono text-[0.8125rem] leading-5 whitespace-pre-wrap break-words select-text">{txt}</pre>;
}

/** Quick preview (Space): images with zoom/pan, video, audio, PDF, Markdown and text. ← → browse the folder. */
export function Lightbox() {
  const t = useT(); const e = useUI((s) => s.modals.lightbox) as Entry | undefined; const id = useExplorer((s) => s.activePane);
  const list = useMemo(() => (e ? getView(id).list.filter((x) => !x.isDir && kindOf(x) !== 'none') : []), [e, id]);
  const idx = e ? list.findIndex((x) => x.path === e.path) : -1;
  const go = (d: number) => { if (list.length > 1 && idx >= 0) openModal('lightbox', list[(idx + d + list.length) % list.length]); };
  useEffect(() => {
    if (!e) return;
    const h = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); closeModal('lightbox'); }
      else if (ev.key === 'ArrowRight') { ev.preventDefault(); go(1); } else if (ev.key === 'ArrowLeft') { ev.preventDefault(); go(-1); }
    };
    window.addEventListener('keydown', h, true); return () => window.removeEventListener('keydown', h, true);
  });
  if (!e) return null;
  const k = kindOf(e); const src = convertFileSrc(e.path);
  return createPortal(
    <div className="fixed inset-0 z-[120] flex flex-col bg-black/85 anim-fade" style={{ backdropFilter: 'blur(6px)' }} role="dialog" aria-modal="true" aria-label={e.name}>
      <header className="flex flex-none items-center gap-2 px-4 py-2 text-white">
        <span className="min-w-0 flex-1 truncate text-base font-semibold">{e.name}</span>
        {list.length > 1 && <span className="text-xs opacity-70">{idx + 1} / {list.length}</span>}
        <IconButton icon={ExternalLink} label={t('cmd.open')} onClick={() => { closeModal('lightbox'); void openEntry(e, id); }} className="!text-white" />
        <IconButton icon={X} label={t('common.close')} kbd="Esc" onClick={() => closeModal('lightbox')} className="!text-white" />
      </header>
      <div className="relative min-h-0 flex-1" onPointerDown={(ev) => { if (ev.target === ev.currentTarget) closeModal('lightbox'); }}>
        <div key={e.path} className="mx-auto size-full animate-[pop-in_.4s_var(--spring)]">
          {k === 'img' && <ImageView src={src} />}
          {k === 'vid' && <div className="grid size-full place-items-center p-4"><video src={src} controls autoPlay className="max-h-full max-w-full rounded-2xl" /></div>}
          {k === 'aud' && <div className="grid size-full place-items-center"><audio src={src} controls autoPlay className="w-[min(32rem,90%)]" /></div>}
          {k === 'pdf' && <iframe src={src} title={e.name} className="size-full rounded-t-2xl border-0 bg-white" />}
          {(k === 'txt' || k === 'md') && <div className="mx-auto h-full max-w-4xl overflow-auto rounded-t-3xl bg-surface text-on-surface"><TextView e={e} md={k === 'md'} /></div>}
          {k === 'none' && <div className="grid size-full place-items-center text-white"><div className="text-center"><FileQuestion className="mx-auto mb-3 size-14 opacity-70" />{t('preview.none')}</div></div>}
        </div>
        {list.length > 1 && <>
          <button type="button" aria-label="Previous" onClick={() => go(-1)} className="ibtn ripple absolute top-1/2 left-3 !size-12 -translate-y-1/2 bg-white/10 !text-white"><ChevronLeft /></button>
          <button type="button" aria-label="Next" onClick={() => go(1)} className="ibtn ripple absolute top-1/2 right-3 !size-12 -translate-y-1/2 bg-white/10 !text-white"><ChevronRight /></button></>}
      </div>
    </div>, document.body);
}
