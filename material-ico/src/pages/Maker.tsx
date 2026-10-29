import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Ban, Check, CheckCheck, Circle, Download, Expand, FolderCog, ImagePlus, Pipette, RotateCcw, Shrink,
  Sparkles, Square, Squircle, WandSparkles, createLucideIcon,
} from 'lucide-react';
import { Btn, IconBtn } from '../components/Btn';
import { Card, PageHeader, Segmented, Slider } from '../components/Controls';
import { ConfirmDialog } from '../components/Modal';
import { ApplySheet } from '../components/ApplySheet';
import { Tooltip } from '../components/Tooltip';
import { useToast } from '../components/Toast';
import { useSettings } from '../lib/store';
import { buildIco } from '../lib/ico';
import { ALL_SIZES, DEFAULT_OPTS, RECOMMENDED_SIZES, SAMPLE_SVG, downscale, loadSource, renderMaster, type IconOpts, type Shape, type Source } from '../lib/render';
import { baseName, isImagePath, isTauri, pickImage, readFile, saveIco } from '../lib/tauri';
import { getCurrentWebview } from '@tauri-apps/api/webview';

const RoundedSquare = createLucideIcon('RoundedSquare', [['rect', { width: '18', height: '18', x: '3', y: '3', rx: '6', key: 'r' }]]);
const SWATCHES = ['#FFFFFF', '#000000', '#F44336', '#E91E63', '#9C27B0', '#3F51B5', '#2196F3', '#009688', '#4CAF50', '#FFC107', '#FF5722'];

function Preview({ master, px, className = '' }: { master: HTMLCanvasElement | null; px: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !master) return;
    c.width = c.height = px;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, px, px);
    ctx.drawImage(master.width === px ? master : downscale(master, px), 0, 0);
  }, [master, px]);
  return <canvas ref={ref} className={className} />;
}

export default function Maker({ active, onApplied }: { active: boolean; onApplied: (folder: string) => void }) {
  const { t, s } = useSettings();
  const toast = useToast();
  const [src, setSrc] = useState<Source | null>(null);
  const [opts, setOpts] = useState<IconOpts>(DEFAULT_OPTS);
  const [sizes, setSizes] = useState<number[]>(ALL_SIZES);
  const [master, setMaster] = useState<HTMLCanvasElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const patch = (p: Partial<IconOpts>) => setOpts((o) => ({ ...o, ...p }));

  useEffect(() => {
    if (!src) { setMaster(null); return; }
    const id = requestAnimationFrame(() => setMaster(renderMaster(src, opts, 512)));
    return () => cancelAnimationFrame(id);
  }, [src, opts]);

  const importBytes = async (name: string, bytes: Uint8Array) => {
    try {
      const next = await loadSource(name, bytes);
      setSrc((prev) => { if (prev) URL.revokeObjectURL(prev.url); return next; });
      toast.success(t('toast.loaded'), t('toast.loadedMsg', { name }));
    } catch {
      toast.error(t('toast.loadFail'), t('toast.loadFailMsg'));
    }
  };
  const chooseImage = async () => { const f = await pickImage(); if (f) await importBytes(f.name, f.bytes); };
  const loadSample = () => importBytes('sample.svg', new TextEncoder().encode(SAMPLE_SVG));

  const buildBytes = useCallback(async (ensure: number[] = []) => {
    if (!src) return null;
    const list = [...new Set([...sizes, ...ensure])].sort((a, b) => a - b);
    if (!list.length) { toast.warning(t('toast.noSizes'), t('toast.noSizesMsg')); return null; }
    const m = renderMaster(src, opts, 1024);
    return buildIco(list.map((n) => downscale(m, n)));
  }, [src, opts, sizes, toast, t]);

  const exportIco = useCallback(async () => {
    if (!src) return toast.warning(t('toast.noImage'));
    setBusy(true);
    try {
      const bytes = await buildBytes();
      if (!bytes) return;
      const saved = await saveIco(bytes, src.name.replace(/\.[^.]+$/, '') + '.ico', { mode: s.saveMode, dir: s.saveDir });
      if (saved) toast.success(t('toast.exported'), t('toast.exportedMsg', { name: saved }));
    } catch (e) {
      toast.error(t('toast.exportFail'), String(e));
    } finally { setBusy(false); }
  }, [src, buildBytes, toast, t, s.saveMode, s.saveDir]);

  // Always call the latest handlers from global listeners.
  const latest = useRef({ importBytes, chooseImage, exportIco, active });
  latest.current = { importBytes, chooseImage, exportIco, active };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!latest.current.active || !(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === 'o') { e.preventDefault(); void latest.current.chooseImage(); }
      if (e.key.toLowerCase() === 's') { e.preventDefault(); void latest.current.exportIco(); }
    };
    const paste = async (e: ClipboardEvent) => {
      if (!latest.current.active) return;
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/') || isImagePath(f.name));
      if (!file) return toast.warning(t('toast.pasteFail'));
      await latest.current.importBytes(file.name || 'pasted.png', new Uint8Array(await file.arrayBuffer()));
    };
    window.addEventListener('keydown', key);
    window.addEventListener('paste', paste);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('paste', paste); };
  }, [toast, t]);

  useEffect(() => {
    if (isTauri) {
      let un: (() => void) | undefined;
      getCurrentWebview().onDragDropEvent(async (e) => {
        const p = e.payload;
        if (p.type === 'enter' || p.type === 'over') setDragging(true);
        else if (p.type === 'leave') setDragging(false);
        else if (p.type === 'drop') {
          setDragging(false);
          const path = p.paths.find(isImagePath);
          if (path) await latest.current.importBytes(baseName(path), await readFile(path));
        }
      }).then((f) => (un = f));
      return () => un?.();
    }
    const over = (e: DragEvent) => { e.preventDefault(); setDragging(true); };
    const leave = (e: DragEvent) => { if (!e.relatedTarget) setDragging(false); };
    const drop = async (e: DragEvent) => {
      e.preventDefault(); setDragging(false);
      const f = [...(e.dataTransfer?.files ?? [])].find((x) => isImagePath(x.name));
      if (f) await latest.current.importBytes(f.name, new Uint8Array(await f.arrayBuffer()));
    };
    window.addEventListener('dragover', over); window.addEventListener('dragleave', leave); window.addEventListener('drop', drop);
    return () => { window.removeEventListener('dragover', over); window.removeEventListener('dragleave', leave); window.removeEventListener('drop', drop); };
  }, []);

  const toggleSize = (s: number) => setSizes((l) => (l.includes(s) ? l.filter((x) => x !== s) : [...l, s]));
  const shapes: { value: Shape; label: string; icon: typeof Square }[] = [
    { value: 'square', label: t('shape.square'), icon: Square }, { value: 'rounded', label: t('shape.rounded'), icon: RoundedSquare },
    { value: 'squircle', label: t('shape.squircle'), icon: Squircle }, { value: 'circle', label: t('shape.circle'), icon: Circle },
  ];

  const dropOverlay = dragging && (
    <div className="anim-fade pointer-events-none absolute inset-3 z-20 flex items-center justify-center rounded-[32px] border-2 border-dashed border-primary bg-primary-container/80 text-lg font-semibold text-on-primary-container backdrop-blur-sm">
      <ImagePlus className="mr-3" size={28} />{t('maker.drop.release')}
    </div>
  );

  return (
    <div className="p-6 max-sm:p-4">
      <PageHeader title={t('maker.title')} subtitle={t('maker.subtitle')}>
        {src && <Btn variant="tonal" icon={ImagePlus} label={t('maker.replace')} onClick={chooseImage} />}
      </PageHeader>

      {!src ? (
        <div
          onClick={chooseImage}
          className="group relative flex min-h-[440px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[36px] border-2 border-dashed border-outline-variant bg-card px-6 py-12 text-center transition-colors hover:border-primary"
        >
          <span className="anim-blob absolute -left-16 -top-20 size-72 bg-primary-container/70" />
          <span className="anim-blob absolute -bottom-24 -right-10 size-80 bg-tertiary-container/70 [animation-delay:-4s]" />
          <span className="anim-blob anim-float absolute left-[12%] top-[58%] size-20 bg-secondary-container [animation-delay:-2s]" />
          <div className="relative flex flex-col items-center">
            <span className="anim-blob mb-6 flex size-28 items-center justify-center bg-primary text-on-primary shadow-lg transition-transform duration-500 ease-spring group-hover:scale-110">
              <ImagePlus size={44} strokeWidth={1.8} />
            </span>
            <h2 className="text-2xl font-bold">{t('maker.drop.title')}</h2>
            <p className="mt-1.5 text-on-surface-variant">{t('maker.drop.sub')}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {['PNG', 'JPG', 'WebP', 'SVG', 'GIF', 'BMP'].map((f) => (
                <span key={f} className="rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-on-secondary-container">{f}</span>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap justify-center gap-3" onClick={(e) => e.stopPropagation()}>
              <Btn size="lg" icon={ImagePlus} label={t('maker.drop.choose')} onClick={chooseImage} />
              <Btn size="lg" variant="tonal" icon={WandSparkles} label={t('maker.drop.sample')} onClick={loadSample} />
            </div>
          </div>
          {dropOverlay}
        </div>
      ) : (
        <div className="relative grid items-start gap-5 min-[900px]:grid-cols-[minmax(320px,390px)_minmax(0,1fr)]">
          {dropOverlay}
          <div className="space-y-4 min-[900px]:sticky min-[900px]:top-0">
            <Card>
              <div className="checker relative mx-auto aspect-square w-full max-w-[360px] overflow-hidden rounded-[28px] ring-1 ring-outline-variant">
                <Preview master={master} px={512} className="anim-pop h-full w-full" />
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{src.name}</span>
                <span className="shrink-0 rounded-full bg-secondary-container px-2.5 py-0.5 text-xs font-semibold text-on-secondary-container">{src.kind} · {src.w}×{src.h}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {([['maker.onLight', '#FFFFFF', '#1B1B1F'], ['maker.onDark', '#202124', '#E3E2E6']] as const).map(([k, bg, fg]) => (
                  <div key={k} className="rounded-2xl p-3 ring-1 ring-outline-variant" style={{ background: bg, color: fg }}>
                    <p className="mb-2 text-[11px] font-medium opacity-70">{t(k)}</p>
                    <div className="flex items-end gap-2.5">
                      {[48, 32, 24, 16].map((s) => <Preview key={s} master={master} px={s} className="shrink-0" />)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <div className="flex gap-3">
              <Btn className="flex-1" size="lg" icon={Download} label={t('maker.export')} loading={busy} onClick={exportIco} />
              <Btn className="flex-1" size="lg" variant="tonal" icon={FolderCog} label={t('maker.apply')} onClick={() => setSheet(true)} />
            </div>
          </div>

          <div className="stagger space-y-4">
            <Card
              title={t('maker.adjust')} icon={WandSparkles}
              action={<IconBtn icon={RotateCcw} tip={t('maker.resetTip')} onClick={() => setConfirmReset(true)} />}
            >
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-sm font-medium">{t('maker.shape')}</p>
                  <Segmented value={opts.shape} options={shapes} onChange={(shape) => patch({ shape })} ariaLabel={t('maker.shape')} />
                </div>
                <Slider label={t('maker.radius')} value={opts.radius} min={0} max={50} disabled={opts.shape !== 'rounded'} onChange={(radius) => patch({ radius })} />
                <Slider label={t('maker.padding')} value={opts.padding} min={0} max={40} onChange={(padding) => patch({ padding })} />
                <Slider label={t('maker.zoom')} value={opts.zoom} min={25} max={300} onChange={(zoom) => patch({ zoom })} />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Slider label={t('maker.offsetX')} value={opts.offsetX} min={-50} max={50} onChange={(offsetX) => patch({ offsetX })} />
                  <Slider label={t('maker.offsetY')} value={opts.offsetY} min={-50} max={50} onChange={(offsetY) => patch({ offsetY })} />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">{t('maker.fit')}</p>
                  <Segmented
                    value={opts.fit} onChange={(fit) => patch({ fit })} ariaLabel={t('maker.fit')}
                    options={[{ value: 'contain', label: t('fit.contain'), icon: Shrink }, { value: 'cover', label: t('fit.cover'), icon: Expand }]}
                  />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">{t('maker.background')}</p>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Tooltip label={t('maker.transparent')}>
                      <button
                        type="button" aria-label={t('maker.transparent')} onClick={() => patch({ bg: null })}
                        className={`checker ripple flex size-9 items-center justify-center rounded-full text-on-surface-variant ring-1 ring-outline transition-transform duration-300 ease-spring hover:scale-110 ${opts.bg === null ? 'ring-2 !ring-primary ring-offset-2 ring-offset-card' : ''}`}
                      ><Ban size={16} /></button>
                    </Tooltip>
                    {SWATCHES.map((c) => (
                      <Tooltip key={c} label={c}>
                        <button
                          type="button" aria-label={c} onClick={() => patch({ bg: c })} style={{ background: c }}
                          className={`ripple flex size-9 items-center justify-center rounded-full ring-1 ring-outline-variant transition-transform duration-300 ease-spring hover:scale-110 ${opts.bg?.toLowerCase() === c.toLowerCase() ? 'ring-2 !ring-primary ring-offset-2 ring-offset-card' : ''}`}
                        >{opts.bg?.toLowerCase() === c.toLowerCase() && <Check size={16} color={c === '#FFFFFF' || c === '#FFC107' ? '#000' : '#fff'} />}</button>
                      </Tooltip>
                    ))}
                    <Tooltip label={t('maker.custom')}>
                      <label
                        className={`relative flex size-9 cursor-pointer items-center justify-center overflow-hidden rounded-full text-white ring-1 ring-outline-variant transition-transform duration-300 ease-spring hover:scale-110 ${opts.bg && !SWATCHES.some((c) => c.toLowerCase() === opts.bg!.toLowerCase()) ? 'ring-2 !ring-primary ring-offset-2 ring-offset-card' : ''}`}
                        style={{ background: 'conic-gradient(#f44336,#ffc107,#4caf50,#2196f3,#9c27b0,#f44336)' }}
                      >
                        <Pipette size={16} className="drop-shadow" />
                        <input type="color" aria-label={t('maker.custom')} className="absolute inset-0 cursor-pointer opacity-0" value={opts.bg ?? '#ffffff'} onChange={(e) => patch({ bg: e.target.value })} />
                      </label>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </Card>

            <Card
              title={t('maker.sizes')} icon={Sparkles}
              action={<div className="flex gap-1.5">
                <Btn size="sm" variant="text" icon={Sparkles} label={t('maker.recommended')} onClick={() => setSizes(RECOMMENDED_SIZES)} />
                <Btn size="sm" variant="text" icon={CheckCheck} label={t('maker.all')} onClick={() => setSizes(ALL_SIZES)} />
              </div>}
            >
              <div className="flex flex-wrap gap-2">
                {ALL_SIZES.map((s) => {
                  const on = sizes.includes(s);
                  return (
                    <button
                      key={s} type="button" aria-pressed={on} onClick={() => toggleSize(s)}
                      className={`ripple flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold tabular-nums transition-[background-color,border-radius,transform] duration-300 ease-spring active:scale-95 ${on ? 'rounded-full bg-secondary-container text-on-secondary-container' : 'border border-outline-variant text-on-surface-variant hover:bg-on-surface/5'}`}
                    >{on && <Check size={15} />}{s}</button>
                  );
                })}
              </div>
              <p className="mt-3 text-[13px] text-on-surface-variant">{t('maker.sizesHint')}</p>
            </Card>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmReset} onClose={() => setConfirmReset(false)} variant="warning" icon={RotateCcw}
        title={t('reset.title')} message={t('reset.msg')} confirmLabel={t('common.reset')} confirmIcon={RotateCcw}
        onConfirm={() => { setOpts(DEFAULT_OPTS); setConfirmReset(false); toast.info(t('toast.resetDone')); }}
      />
      <ApplySheet open={sheet} onClose={() => setSheet(false)} getIco={() => buildBytes([48, 256])} onApplied={onApplied} />
    </div>
  );
}
