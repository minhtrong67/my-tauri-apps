import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { tr } from '../lib/i18n';
import { Cover } from './Cover';
import { Button, Icon, IconButton, Segmented } from './ui';
import { LoadingIndicator } from './Fluent';
import { SeekBar, TransportControls } from './PlayerControls';
import { QueuePanel } from './QueuePanel';
import { WindowControls } from './TitleBar';
import { useCurrent, useStore } from '../lib/store';
import { engine } from '../lib/audio';
import { fetchLyricsOnline, lyricsCacheGet, lyricsCachePut, readLyrics, writeTextFile, type OnlineLyrics } from '../lib/tauri';
import { SOURCE_LABEL } from '../lib/online';
import { activeLine, parseLyrics, type Lyrics } from '../lib/lrc';
import { playClose, playOpen, prefersReducedMotion, type MorphTargets } from '../lib/morph';

/** Spectrum -> 0..1 level for band i of n (log-ish spread so the bass does not hog the whole width) */
const band = (spec: Uint8Array, i: number, n: number) => spec[Math.min(spec.length - 1, Math.floor(Math.pow(i / n, 1.35) * spec.length * 0.8))] / 255;

const toRgb = (v: string): [number, number, number] => {
  const p = v.trim().split(/\s+/).map(Number);
  return p.length === 3 && p.every((x) => Number.isFinite(x)) ? [p[0], p[1], p[2]] : [96, 165, 250];
};

/**
 * Spectrum bars: smoothed (quick attack, slow fall), colour sliding from the accent to its partner colour across the width,
 * a falling peak cap above every bar and a soft reflection under the baseline. Drawn at 30 fps, and not at all while hidden.
 */
export function Visualizer() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    const N = 56;
    const vals = new Float32Array(N);
    const peaks = new Float32Array(N);
    const fall = new Float32Array(N);
    let raf = 0;
    let phase = 0;
    let last = 0;
    let colA: [number, number, number] = [96, 165, 250];
    let colB: [number, number, number] = [96, 165, 250];
    let colAt = -1e9;
    const mix = (a: number[], b: number[], t: number) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
    const draw = (now = 0) => {
      raf = requestAnimationFrame(draw);
      if (document.hidden || now - last < 32) return;
      last = now;
      const dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth, h = c.clientHeight;
      if (w < 10 || h < 10) return;
      const cw = Math.round(w * dpr), ch = Math.round(h * dpr);
      if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (now - colAt > 400) {
        const st = getComputedStyle(document.documentElement);
        colA = toRgb(st.getPropertyValue('--fl-primary'));
        colB = toRgb(st.getPropertyValue('--fl-tertiary'));
        colAt = now;
      }
      const spec = engine.getSpectrum();
      const playing = !engine.audio.paused;
      phase += 0.05;
      const gap = Math.max(3, Math.round(w * 0.006));
      const bw = (w - gap * (N - 1)) / N;
      const base = h * 0.76;
      const maxH = base - 12;
      const refl = Math.min(h - base - 6, maxH * 0.42);
      for (let i = 0; i < N; i++) {
        // without Web Audio data the bars idle with a soft wave so the screen is never frozen
        const target = spec ? band(spec, i, N) : playing ? 0.3 + 0.22 * Math.sin(phase + i * 0.35) + 0.12 * Math.sin(phase * 1.7 + i * 0.17) : 0.03;
        vals[i] += (target - vals[i]) * (target > vals[i] ? 0.6 : 0.16);
        if (vals[i] >= peaks[i]) { peaks[i] = vals[i]; fall[i] = 0; }
        else { fall[i] += 0.0012; peaks[i] = Math.max(vals[i], peaks[i] - fall[i]); }
      }
      // baseline
      ctx.fillStyle = `rgba(${colA.join(',')},0.25)`;
      ctx.fillRect(0, base + 1, w, 1);
      for (let i = 0; i < N; i++) {
        const x = i * (bw + gap);
        const v = vals[i];
        const bh = Math.max(4, v * maxH);
        const col = mix(colA, colB, i / (N - 1)).join(',');
        const g = ctx.createLinearGradient(0, base - bh, 0, base);
        g.addColorStop(0, `rgba(${col},1)`);
        g.addColorStop(1, `rgba(${col},${0.45 + v * 0.3})`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(x, base - bh, bw, bh, [bw / 2, bw / 2, 2, 2]);
        ctx.fill();
        // peak cap
        const py = base - Math.max(bh, peaks[i] * maxH) - 7;
        ctx.fillStyle = `rgba(${col},0.9)`;
        ctx.beginPath();
        ctx.roundRect(x, py, bw, 3, 1.5);
        ctx.fill();
        // reflection
        if (refl > 8) {
          const rh = Math.min(refl, bh * 0.42);
          const rg = ctx.createLinearGradient(0, base + 3, 0, base + 3 + rh);
          rg.addColorStop(0, `rgba(${col},0.3)`);
          rg.addColorStop(1, `rgba(${col},0)`);
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.roundRect(x, base + 3, bw, rh, [2, 2, bw / 2, bw / 2]);
          ctx.fill();
        }
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="w-full h-full" />;
}

/** − / + 0.1 s correction for the timing of the lyrics (saved per song) */
function OffsetControl({ id }: { id: string }) {
  const ms = useStore((s) => s.lyricOffsets[id] ?? 0);
  const setOffset = useStore((s) => s.setLyricOffset);
  const label = `${ms > 0 ? '+' : ''}${(ms / 1000).toFixed(1)}s`;
  return (
    <div className="inline-flex items-center gap-0.5 h-9 pl-3 pr-1 rounded-lg bg-ctl border border-card-stroke text-label-lg animate-fade-in">
      <Icon name="timer" size={18} className="text-on-surface-variant mr-1" />
      <IconButton icon="remove" size="sm" title={tr('lyricsEarlier')} onClick={() => setOffset(id, ms - 100)} />
      <span className="tabular-nums w-12 text-center" aria-live="polite">{label}</span>
      <IconButton icon="add" size="sm" title={tr('lyricsLater')} onClick={() => setOffset(id, ms + 100)} />
      <IconButton icon="restart" size="sm" title={tr('lyricsOffsetReset')} disabled={ms === 0} onClick={() => setOffset(id, 0)} />
    </div>
  );
}

/** Lyrics found online during this session (null = looked up, nothing found); `autoTried` stops automatic lookups from repeating */
const lyricsCache = new Map<string, OnlineLyrics | null>();
const autoTried = new Set<string>();

/** One lyric line. Memoised: while a song plays only the lines whose distance to the sung line changed are re-rendered.
 *  Only opacity and transform animate (both run on the GPU); a blur filter on every line was the cause of the choppy, washed-out look. */
const LyricLine = memo(function LyricLine({ text, synced, focus, dist, current, onClick, setRef }: { text: string; synced: boolean; focus: boolean; dist: number; current: boolean; onClick: () => void; setRef: (el: HTMLDivElement | null) => void }) {
  const style = focus ? { opacity: current ? 1 : Math.max(0.42, 0.8 - dist * 0.12), transform: current ? 'scale(1.08)' : 'scale(1)' } : undefined;
  return (
    <div
      ref={setRef} style={style} onClick={onClick}
      className={`py-2 origin-center will-change-transform transition-[opacity,transform,color] duration-slower ease-decel ${synced ? 'cursor-pointer text-title-lg hover:!opacity-100' : 'text-body-lg text-on-surface'} ${current ? 'text-primary font-semibold' : synced ? 'text-on-surface' : ''}`}
    >
      {text || '♪'}
    </div>
  );
});

function LyricsPane() {
  const t = useCurrent();
  const position = useStore((s) => s.position);
  const offsetMs = useStore((s) => (t ? s.lyricOffsets[t.id] ?? 0 : 0));
  const seek = useStore((s) => s.seek);
  const [lyrics, setLyrics] = useState<Lyrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState<{ raw: string; saved: boolean; source: string } | null>(null);
  const localAuto = useStore((s) => s.settings.autoLyrics);
  const onlineAuto = useStore((s) => s.settings.onlineLyrics);
  const autoLyrics = t?.source ? onlineAuto : localAuto;
  const [searching, setSearching] = useState(false);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const scroller = useRef<HTMLDivElement>(null);

  const show = (res: OnlineLyrics) => {
    const raw = res.synced.trim() ? res.synced : res.plain;
    const parsed = parseLyrics(raw);
    setLyrics(parsed);
    setOnline({ raw, saved: false, source: [res.artist, res.title].filter(Boolean).join(' – ') });
  };

  /** `silent` = started by the "find lyrics automatically" setting: no toast when nothing is found */
  const searchOnline = async (silent = false) => {
    if (!t || searching) return;
    const toast = useStore.getState().showToast;
    setSearching(true);
    try {
      const noArtist = t.artist === tr('unknownArtist') || (t.source && t.artist === SOURCE_LABEL[t.source]);
      const noAlbum = !t.album || (t.source && t.album === SOURCE_LABEL[t.source]);
      const res = await fetchLyricsOnline(t.title, noArtist ? '' : t.artist, noAlbum ? '' : t.album, t.duration);
      const raw = res ? (res.synced.trim() ? res.synced : res.plain) : '';
      if (res && raw.trim()) {
        lyricsCache.set(t.id, res);
        show(res);
        if (t.source) void lyricsCachePut(t.id, JSON.stringify(res)).catch(() => undefined);
      } else {
        lyricsCache.set(t.id, null);
        if (!silent) toast(tr('lyricsNotFoundOnline'), undefined, undefined, 'warning');
      }
    } catch (e) {
      // network / server problems are not "not found": offer to try again
      if (!silent) toast(tr('lyricsOnlineFailed', { e: String(e) }), tr('retry'), () => void searchOnline(false), 'error');
    } finally {
      setSearching(false);
    }
  };

  const saveLrc = async () => {
    if (!t || !online) return;
    const toast = useStore.getState().showToast;
    try {
      await writeTextFile(t.path.replace(/\.[^.\\/]+$/, '.lrc'), online.raw);
      setOnline({ ...online, saved: true });
      toast(tr('lyricsSaved'), undefined, undefined, 'success');
    } catch (e) {
      toast(tr('lyricsSaveFailed', { e: String(e) }), undefined, undefined, 'error');
    }
  };

  useEffect(() => {
    if (!t) return;
    let alive = true;
    setLoading(true);
    setLyrics(null);
    setOnline(null);
    if (t.source) {
      // online song: there is no file next to it, so look in the lyrics cache (the lookup itself runs below when needed)
      lyricsCacheGet(t.id)
        .then((raw) => {
          if (!alive || !raw) return;
          try {
            const res = JSON.parse(raw) as OnlineLyrics;
            lyricsCache.set(t.id, res);
            show(res);
          } catch { /* a damaged cache file is simply ignored */ }
        })
        .catch(() => undefined)
        .finally(() => alive && setLoading(false));
      return () => { alive = false; };
    }
    readLyrics(t.path)
      .then((raw) => alive && setLyrics(raw ? parseLyrics(raw) : null))
      .catch(() => alive && setLyrics(null))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [t?.id]);

  // no saved lyrics: show what was already found for this song, or look it up when the setting is on
  useEffect(() => {
    if (!t || loading || (lyrics && lyrics.lines.length)) return;
    const hit = lyricsCache.get(t.id);
    if (hit) show(hit);
    else if (autoLyrics && hit === undefined && !autoTried.has(t.id)) {
      autoTried.add(t.id);
      void searchOnline(true);
    }
     
  }, [t?.id, loading, lyrics, autoLyrics]);

  const active = useMemo(() => (lyrics?.synced ? activeLine(lyrics.lines, position + offsetMs / 1000) : -1), [lyrics, position, offsetMs]);
  useEffect(() => {
    // scroll only the lyrics box: scrollIntoView would also scroll the (overflow: hidden) page around it and push the whole screen up
    const box = scroller.current;
    const el = refs.current[active];
    if (active < 0 || !box || !el) return;
    const b = box.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    box.scrollTo({ top: box.scrollTop + (r.top - b.top) - b.height * 0.38 + r.height / 2, behavior: 'smooth' });
  }, [active]);

  if (loading) return <div className="h-full flex flex-col gap-3 items-center justify-center text-on-surface-variant"><LoadingIndicator size={40} />{tr('lyricsLoading')}</div>;
  if (!lyrics || !lyrics.lines.length)
    return (
      <div className="h-full flex flex-col items-center justify-center text-center text-on-surface-variant gap-2 px-10">
        <Icon name="lyrics" size={48} />
        <div className="text-title-md text-on-surface">{tr('noLyrics')}</div>
        <div className="text-body-md">{t?.source ? tr('noLyricsOnlineHelp') : tr('noLyricsHelp')}</div>
        <Button variant="tonal" icon="cloud_download" className="mt-2" disabled={searching} onClick={() => void searchOnline(false)}>{searching ? tr('lyricsSearching') : tr('lyricsSearchOnline')}</Button>
        <div className="text-body-sm">{tr('lyricsOnlineNote')}</div>
      </div>
    );
  return (
    <div ref={scroller} className="h-full overflow-y-auto overflow-x-hidden overscroll-contain text-center [mask-image:linear-gradient(to_bottom,black_calc(100%-96px),transparent)]">
      {(online || (lyrics.synced && t)) && (
        <div className="sticky top-0 z-10 h-0">
          {lyrics.synced && t && <div className="absolute top-3 left-4"><OffsetControl id={t.id} /></div>}
          {online && (
            <div className="absolute top-3 right-4 flex items-center gap-2 animate-fade-in">
              <span title={online.source} className="px-3 h-8 max-w-[300px] inline-flex items-center rounded-lg bg-ctl border border-card-stroke text-label-md text-on-surface-variant"><span className="truncate">{tr('lyricsFromOnline')}{online.source ? ` · ${online.source}` : ''}</span></span>
              {!online.saved && !t?.source && <Button variant="tonal" icon="save" onClick={saveLrc}>{tr('lyricsSaveLrc')}</Button>}
            </div>
          )}
        </div>
      )}
      <div className="px-10 pt-16 pb-[60vh]">
      {lyrics.lines.map((l, i) => (
        <LyricLine
          key={i} text={l.text} synced={lyrics.synced} focus={lyrics.synced && active >= 0}
          dist={lyrics.synced && active >= 0 ? Math.abs(i - active) : 0} current={i === active}
          onClick={() => lyrics.synced && seek(l.time)} setRef={(el) => (refs.current[i] = el)}
        />
      ))}
      </div>
    </div>
  );
}

function VizTab() {
  return <div className="h-full px-8 pb-6 pt-2"><Visualizer /></div>;
}

export function NowPlaying({ open = true, onClosed }: { open?: boolean; onClosed?: () => void }) {
  const t = useCurrent();
  const rootRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const opening = useRef<{ cancel: () => void } | null>(null);
  const closing = useRef(false);

  const targets = (): MorphTargets | null => {
    const root = rootRef.current;
    if (!root) return null;
    return { root, cover: coverRef.current, items: [...root.querySelectorAll<HTMLElement>('[data-np]')] };
  };

  // opens: the player bar grows into this view (before the first paint, so there is no flash)
  useLayoutEffect(() => {
    const tg = targets();
    if (!tg || prefersReducedMotion()) return;
    opening.current = playOpen(tg);
    return () => opening.current?.cancel();
     
  }, []);

  // closes: the same movement backwards, then the parent unmounts the view
  useEffect(() => {
    if (open || closing.current) return;
    closing.current = true;
    const tg = targets();
    opening.current?.cancel();
    if (!tg || prefersReducedMotion()) { onClosed?.(); return; }
    void playClose(tg).then(() => onClosed?.());
     
  }, [open]);
  const liked = useStore((s) => (t ? !!s.liked[t.id] : false));
  const [tab, setTab] = useState<'lyrics' | 'viz' | 'queue'>('lyrics');
  const playing = useStore((s) => s.isPlaying);
  const st = useStore.getState();
  if (!t) return null;
  return (
    <div ref={rootRef} className="fixed inset-0 z-40 bg-surface overflow-clip flex flex-col" style={{ pointerEvents: open ? undefined : 'none' }}>
      {/* opaque base + a soft glow in the accent (which follows the cover): no full-screen blur to repaint */}
      <div className="absolute inset-0 pointer-events-none np-glow" />
      <div data-np data-tauri-drag-region className="relative h-12 shrink-0 flex items-center justify-between pl-2">
        <IconButton icon="expand_more" title={`${tr('collapse')} (Esc)`} onClick={() => st.set({ showNowPlaying: false })} />
        <div className="text-title-sm text-on-surface-variant pointer-events-none">{tr('nowPlaying')}</div>
        <WindowControls />
      </div>
      <div className="relative flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(340px,5fr)_6fr] gap-8 px-10 pb-8">
        <div className="flex flex-col items-center justify-center min-h-0 gap-5">
          <div ref={coverRef} className="w-[min(46vh,100%)] aspect-square max-w-[440px]"><Cover key={t.id} track={t} eager className={`cover-in w-full h-full rounded-2xl shadow-2xl transition-transform duration-slower ease-decel ${playing ? '' : 'scale-95'}`} iconSize={96} /></div>
          <div data-np className="w-full max-w-[440px]">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-headline-sm">{t.title}</div>
                <div className="truncate text-body-lg text-on-surface-variant">{t.artist} • {t.album}</div>
              </div>
              <IconButton icon="favorite" active={liked} fill={liked} pop title={`${tr('favorite')} (L)`} onClick={() => st.toggleLike(t.id)} />
            </div>
            <SeekBar className="mt-2" />
            <div className="flex justify-center mt-2"><TransportControls size="lg" /></div>
          </div>
        </div>
        <div data-np className="min-h-0 flex flex-col rounded-2xl fl-card !shadow-none !bg-surface-container-low overflow-hidden">
          <div className="p-4 flex justify-center shrink-0">
            <Segmented value={tab} onChange={setTab} options={[{ value: 'lyrics', label: tr('tabLyrics'), icon: 'lyrics' }, { value: 'viz', label: tr('tabEffects'), icon: 'equalizer' }, { value: 'queue', label: tr('tabQueue'), icon: 'queue_music' }]} />
          </div>
          <div className="flex-1 min-h-0">
            {tab === 'lyrics' && <LyricsPane />}
            {tab === 'viz' && <VizTab />}
            {tab === 'queue' && <QueuePanel embedded />}
          </div>
        </div>
      </div>
    </div>
  );
}
