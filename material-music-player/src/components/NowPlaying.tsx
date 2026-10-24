import { useEffect, useMemo, useRef, useState } from 'react';
import { tr } from '../lib/i18n';
import { Cover } from './Cover';
import { Button, Icon, IconButton, Segmented } from './ui';
import { LoadingIndicator } from './Expressive';
import { SeekBar, TransportControls } from './PlayerControls';
import { QueuePanel } from './QueuePanel';
import { WindowControls } from './TitleBar';
import { useCurrent, useStore } from '../lib/store';
import { useCover } from '../lib/cover';
import { engine } from '../lib/audio';
import { fetchLyricsOnline, readLyrics, writeTextFile } from '../lib/tauri';
import { activeLine, parseLyrics, type Lyrics } from '../lib/lrc';

export function Visualizer() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    let phase = 0;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth, h = c.clientHeight;
      const cw = Math.round(w * dpr), ch = Math.round(h * dpr);
      if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const rgb = getComputedStyle(document.documentElement).getPropertyValue('--md-primary').trim().split(' ').join(',');
      const n = 48;
      const gap = 6;
      const bw = (w - gap * (n - 1)) / n;
      const spec = engine.getSpectrum();
      phase += 0.06;
      const playing = !engine.audio.paused;
      for (let i = 0; i < n; i++) {
        let v: number;
        if (spec) v = spec[Math.min(spec.length - 1, Math.floor(Math.pow(i / n, 1.4) * spec.length * 0.85))] / 255;
        else v = playing ? 0.25 + 0.2 * Math.sin(phase + i * 0.5) + 0.15 * Math.sin(phase * 1.7 + i * 0.2) : 0.04;
        const bh = Math.max(6, v * h);
        ctx.fillStyle = `rgba(${rgb}, ${0.35 + v * 0.65})`;
        ctx.beginPath();
        ctx.roundRect(i * (bw + gap), h - bh, bw, bh, Math.min(bw / 2, 6));
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="w-full h-full" />;
}

function LyricsPane() {
  const t = useCurrent();
  const position = useStore((s) => s.position);
  const seek = useStore((s) => s.seek);
  const [lyrics, setLyrics] = useState<Lyrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState<{ raw: string; saved: boolean } | null>(null);
  const [searching, setSearching] = useState(false);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const scroller = useRef<HTMLDivElement>(null);

  const searchOnline = async () => {
    if (!t || searching) return;
    const toast = useStore.getState().showToast;
    setSearching(true);
    try {
      const res = await fetchLyricsOnline(t.title, t.artist === tr('unknownArtist') ? '' : t.artist, t.album, t.duration);
      const raw = res ? (res.synced.trim() ? res.synced : res.plain) : '';
      if (!raw.trim()) toast(tr('lyricsNotFoundOnline'), undefined, undefined, 'warning');
      else {
        setLyrics(parseLyrics(raw));
        setOnline({ raw, saved: false });
      }
    } catch (e) {
      toast(tr('lyricsOnlineFailed', { e: String(e) }), undefined, undefined, 'error');
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
    readLyrics(t.path)
      .then((raw) => alive && setLyrics(raw ? parseLyrics(raw) : null))
      .catch(() => alive && setLyrics(null))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [t?.id]);

  const active = useMemo(() => (lyrics?.synced ? activeLine(lyrics.lines, position) : -1), [lyrics, position]);
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
        <div className="text-body-md">{tr('noLyricsHelp')}</div>
        <Button variant="tonal" icon="cloud_download" className="mt-2" disabled={searching} onClick={searchOnline}>{searching ? tr('lyricsSearching') : tr('lyricsSearchOnline')}</Button>
        <div className="text-body-sm">{tr('lyricsOnlineNote')}</div>
      </div>
    );
  return (
    <div ref={scroller} className="h-full overflow-y-auto overflow-x-hidden overscroll-contain text-center [mask-image:linear-gradient(to_bottom,black_calc(100%-96px),transparent)]">
      {online && (
        <div className="sticky top-0 z-10 h-0">
          <div className="absolute top-3 right-4 flex items-center gap-2 animate-fade-in">
            <span className="px-3 h-8 inline-flex items-center rounded-full bg-surface-container-high text-label-md text-on-surface-variant">{tr('lyricsFromOnline')}</span>
            {!online.saved && <Button variant="tonal" icon="save" onClick={saveLrc}>{tr('lyricsSaveLrc')}</Button>}
          </div>
        </div>
      )}
      <div className="px-10 pt-16 pb-[60vh]">
      {lyrics.lines.map((l, i) => {
        // synced lyrics: the further a line is from the one being sung, the softer it gets (focus effect)
        const d = lyrics.synced && active >= 0 ? Math.abs(i - active) : 0;
        const style = lyrics.synced && active >= 0
          ? { opacity: d === 0 ? 1 : Math.max(0.16, 0.72 - d * 0.14), filter: d === 0 ? 'none' : `blur(${Math.min(2.5, d * 0.55).toFixed(2)}px)`, transform: d === 0 ? 'scale(1.1)' : 'scale(1)' }
          : undefined;
        return (
          <div
            key={i} ref={(el) => (refs.current[i] = el)} style={style}
            onClick={() => lyrics.synced && seek(l.time)}
            className={`py-2 origin-center transition-[opacity,filter,transform,color] duration-500 ease-emphasized ${lyrics.synced ? 'cursor-pointer text-title-lg hover:!opacity-100 hover:!blur-none' : 'text-body-lg text-on-surface'} ${i === active ? 'text-primary font-medium lyric-glow' : lyrics.synced ? 'text-on-surface-variant' : ''}`}
          >
            {l.text || '♪'}
          </div>
        );
      })}
      </div>
    </div>
  );
}

export function NowPlaying() {
  const t = useCurrent();
  const cover = useCover(t);
  const liked = useStore((s) => (t ? !!s.liked[t.id] : false));
  const [tab, setTab] = useState<'lyrics' | 'viz' | 'queue'>('lyrics');
  const playing = useStore((s) => s.isPlaying);
  const st = useStore.getState();
  if (!t) return null;
  return (
    <div className="fixed inset-0 z-40 bg-surface animate-slide-up overflow-clip flex flex-col">
      {cover && <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-3xl scale-125 pointer-events-none" />}
      <div className="aurora w-[55vw] h-[55vw] bg-primary -top-[20vw] -left-[15vw]" />
      <div className="aurora w-[45vw] h-[45vw] bg-tertiary -bottom-[18vw] -right-[10vw]" style={{ animationDelay: '-7s' }} />
      <div className="absolute inset-0 bg-gradient-to-b from-primary-container/30 to-surface/80 pointer-events-none" />
      <div data-tauri-drag-region className="relative h-14 shrink-0 flex items-center justify-between px-3">
        <IconButton icon="expand_more" title={`${tr('collapse')} (Esc)`} onClick={() => st.set({ showNowPlaying: false })} />
        <div className="text-title-sm text-on-surface-variant pointer-events-none">{tr('nowPlaying')}</div>
        <WindowControls />
      </div>
      <div className="relative flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(340px,5fr)_6fr] gap-8 px-10 pb-8">
        <div className="flex flex-col items-center justify-center min-h-0 gap-5">
          <Cover key={t.id} track={t} eager className={`cover-in w-[min(46vh,100%)] aspect-square max-w-[440px] rounded-[40px] shadow-2xl transition-transform duration-500 ${playing ? 'breathe' : 'scale-95'}`} iconSize={96} />
          <div className="w-full max-w-[440px]">
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
        <div className="min-h-0 flex flex-col rounded-[32px] bg-surface-container/70 backdrop-blur overflow-hidden">
          <div className="p-4 flex justify-center shrink-0">
            <Segmented value={tab} onChange={setTab} options={[{ value: 'lyrics', label: tr('tabLyrics'), icon: 'lyrics' }, { value: 'viz', label: tr('tabEffects'), icon: 'equalizer' }, { value: 'queue', label: tr('tabQueue'), icon: 'queue_music' }]} />
          </div>
          <div className="flex-1 min-h-0">
            {tab === 'lyrics' && <LyricsPane />}
            {tab === 'viz' && <div className="h-full p-10 flex items-end"><div className="w-full h-[70%]"><Visualizer /></div></div>}
            {tab === 'queue' && <QueuePanel embedded />}
          </div>
        </div>
      </div>
    </div>
  );
}
