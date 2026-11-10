import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { tr } from '../lib/i18n';
import { Button, Chip, Icon, IconButton, openMenuAt, openMenuBelow } from '../components/ui';
import { LoadingIndicator } from '../components/Expressive';
import { Cover } from '../components/Cover';
import { ScrollTop } from '../components/ScrollTop';
import { useStore } from '../lib/store';
import { trackMenu } from '../lib/menus';
import { onlineErrorText, onlineKey, resolveStream, toTrack } from '../lib/online';
import { onlineSearch, type OnlineTrack } from '../lib/tauri';
import { fmtTime } from '../lib/utils';

/* ───────────── remembered state (the page is rebuilt every time you come back to it) ───────────── */

interface Last { q: string; results: OnlineTrack[] }
let last: Last | null = null;
const HISTORY_KEY = 'mm-online-searches';

const loadHistory = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 8) : [];
  } catch {
    return [];
  }
};
const saveHistory = (list: string[]) => {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch { /* storage can be unavailable */ }
};

const SUGGESTIONS = ['lofi beats', 'chill pop', 'synthwave', 'acoustic covers', 'jazz piano', 'indie rock'];

/* ───────────── a found song ───────────── */

const ResultRow = memo(function ResultRow({ o, index, onPlay }: { o: OnlineTrack; index: number; onPlay: () => void }) {
  const key = onlineKey(o.source, o.id);
  const isCurrent = useStore((s) => s.queue[s.index] === key);
  const playing = useStore((s) => s.isPlaying);
  const liked = useStore((s) => !!s.liked[key]);
  const t = useMemo(() => toTrack(o), [o]);
  // look the stream up while the pointer rests on the row, so pressing play starts at once
  const warm = useRef<number | undefined>(undefined);
  const warmOn = () => { warm.current = window.setTimeout(() => void resolveStream(key).catch(() => undefined), 180); };
  const warmOff = () => window.clearTimeout(warm.current);
  const menu = () => {
    const st = useStore.getState();
    st.ensureOnline([o]);
    return trackMenu(useStore.getState().byId[key] ?? t, { onPlay });
  };
  const like = () => {
    const st = useStore.getState();
    st.ensureOnline([o]);
    st.toggleLike(key);
  };
  return (
    <div
      onMouseEnter={warmOn} onMouseLeave={warmOff} onDoubleClick={onPlay} onContextMenu={(e) => openMenuAt(e, menu())}
      style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}
      className={`group h-16 mx-2 px-2 rounded-2xl flex items-center gap-3 animate-slide-up transition-[background,transform] duration-200 ease-emphasized hover:bg-on-surface/[.08] hover:translate-x-0.5 ${isCurrent ? 'bg-secondary-container/50' : ''}`}
    >
      <button onClick={onPlay} aria-label={tr('play')} className="relative shrink-0 rounded-xl overflow-hidden focus-ring">
        <Cover track={t} className="w-12 h-12 rounded-xl" iconSize={22} />
        <span className={`absolute inset-0 flex items-center justify-center bg-black/45 text-white transition-opacity ${isCurrent && playing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <Icon name={isCurrent && playing ? 'graphic_eq' : 'play_arrow'} fill size={22} />
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-body-lg ${isCurrent ? 'text-primary font-medium' : 'text-on-surface'}`}>{o.title}</div>
        <div className="truncate text-body-sm text-on-surface-variant">{o.artist}{o.album ? ` • ${o.album}` : ''}</div>
      </div>
      <div className="w-8 shrink-0">
        <IconButton icon="favorite" size="sm" active={liked} fill={liked} pop title={liked ? tr('unfavorite') : tr('favorite')} className={liked ? '' : 'opacity-0 group-hover:opacity-100'} onClick={(e) => { e.stopPropagation(); like(); }} />
      </div>
      <div className="w-12 text-right text-body-md text-on-surface-variant tabular-nums shrink-0">{fmtTime(o.duration)}</div>
      <IconButton icon="more_vert" size="sm" title={tr('options')} className="opacity-0 group-hover:opacity-100" onClick={(e) => openMenuBelow(e, menu(), true)} />
    </div>
  );
});

function SkeletonRows() {
  return (
    <div className="px-4 space-y-2" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="h-16 px-2 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl skeleton" />
          <div className="flex-1 space-y-2"><div className="h-3.5 w-1/2 rounded-full skeleton" /><div className="h-3 w-1/3 rounded-full skeleton" /></div>
        </div>
      ))}
    </div>
  );
}

/* ───────────── page ───────────── */

export function DiscoverView() {
  const [input, setInput] = useState(last?.q ?? '');
  const [results, setResults] = useState<OnlineTrack[] | null>(last?.results ?? null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>(loadHistory);
  const scroller = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);
  const field = useRef<HTMLInputElement>(null);
  const searched = useRef(last?.q ?? '');

  const run = (raw: string) => {
    const q = raw.trim();
    if (q.length < 1) return;
    const id = ++reqId.current;
    searched.current = q;
    setLoading(true);
    onlineSearch(q, 24)
      .then((r) => {
        if (id !== reqId.current) return; // a newer search is already running
        setResults(r);
        last = { q, results: r };
        setHistory((h) => { const next = [q, ...h.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8); saveHistory(next); return next; });
        scroller.current?.scrollTo({ top: 0 });
        if (r[0]) void resolveStream(onlineKey(r[0].source, r[0].id)).catch(() => undefined); // the first song is ready before it is clicked
      })
      .catch((e) => {
        if (id !== reqId.current) return;
        useStore.getState().showToast(onlineErrorText(e), tr('retry'), () => run(q), 'error');
      })
      .finally(() => id === reqId.current && setLoading(false));
  };

  // search while typing (after a short pause)
  useEffect(() => {
    const q = input.trim();
    if (q.length < 2 || q === searched.current) return;
    const id = window.setTimeout(() => run(q), 450);
    return () => window.clearTimeout(id);
  }, [input]);
  useEffect(() => { if (!results) field.current?.focus(); }, [results]);

  const shown = results ?? [];
  const play = (i: number) => useStore.getState().playOnline(shown, i);
  const clear = () => { setInput(''); setResults(null); searched.current = ''; last = null; reqId.current++; setLoading(false); field.current?.focus(); };

  return (
    <div className="h-full relative">
      <div ref={scroller} className="h-full overflow-y-auto pb-8">
        <div className="px-8 pt-8">
          <h1 className="text-headline-lg emph">{tr('navDiscover')}</h1>
          <p className="text-body-lg text-on-surface-variant">{tr('discoverSub')}</p>
        </div>

        {/* search bar */}
        <div className="px-8 pt-5 sticky top-0 z-20 pb-3 bg-surface-container-low/90 backdrop-blur-md">
          <form
            onSubmit={(e) => { e.preventDefault(); run(input); }} role="search"
            className="h-14 rounded-full bg-surface-container-high flex items-center gap-2 pl-5 pr-2 ring-1 ring-transparent focus-within:ring-2 focus-within:ring-primary transition-shadow max-w-3xl"
          >
            {loading ? <LoadingIndicator size={28} contained={false} /> : <Icon name="search" className="text-on-surface-variant" />}
            <input
              ref={field} value={input} onChange={(e) => setInput(e.target.value)} placeholder={tr('onlineSearchPlaceholder')} aria-label={tr('onlineSearchPlaceholder')}
              spellCheck={false} maxLength={200} className="flex-1 min-w-0 h-full bg-transparent outline-none text-body-lg text-on-surface placeholder:text-on-surface-variant select-text"
            />
            {input && <IconButton icon="close" title={tr('clear')} onClick={clear} />}
            <Button icon="search" onClick={() => run(input)} disabled={!input.trim() || loading}>{tr('searchBtn')}</Button>
          </form>
        </div>

        {/* before the first search */}
        {!results && !loading && (
          <div className="px-8 pt-4 max-w-3xl animate-fade-in">
            {history.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-title-md">{tr('onlineRecentSearches')}</h2>
                  <Button variant="text" size="xs" icon="close" onClick={() => { setHistory([]); saveHistory([]); }}>{tr('clear')}</Button>
                </div>
                <div className="flex flex-wrap gap-2">{history.map((h) => <Chip key={h} icon="history" onClick={() => { setInput(h); run(h); }}>{h}</Chip>)}</div>
              </section>
            )}
            <section className="rounded-[32px] bg-primary-container text-on-primary-container p-6 flex items-start gap-5 relative overflow-hidden">
              <div aria-hidden className="absolute -right-8 -top-10 w-44 h-44 bg-primary/10 morph-slow pointer-events-none" />
              <span className="w-14 h-14 rounded-3xl bg-primary text-on-primary flex items-center justify-center shrink-0"><Icon name="explore" size={28} /></span>
              <div className="relative min-w-0">
                <div className="text-title-lg">{tr('discoverHeroTitle')}</div>
                <p className="text-body-md opacity-85 mt-1">{tr('discoverHeroText')}</p>
                <div className="flex flex-wrap gap-2 mt-4">{SUGGESTIONS.map((s) => <button key={s} onClick={() => { setInput(s); run(s); }} className="ripple h-8 px-3.5 rounded-full bg-on-primary-container/10 hover:bg-on-primary-container/15 text-label-lg transition-colors focus-ring">{s}</button>)}</div>
              </div>
            </section>
          </div>
        )}

        {loading && !results && <SkeletonRows />}

        {/* results */}
        {results && (
          <div className="animate-fade-in">
            <div className="px-8 pb-2 flex flex-wrap items-center gap-2">
              <span className="text-title-sm text-on-surface-variant">{tr('onlineResultsCount', { n: shown.length })}</span>
              <div className="ml-auto flex gap-2">
                <Button variant="tonal" icon="play_arrow" disabled={!shown.length} onClick={() => play(0)}>{tr('playAll')}</Button>
                <Button variant="tonal" icon="shuffle" disabled={!shown.length} onClick={() => { const st = useStore.getState(); const ids = st.ensureOnline(shown); st.playTracks(ids, Math.floor(Math.random() * ids.length), true); }}>{tr('shuffle')}</Button>
              </div>
            </div>

            {loading && <div className="px-8 py-2 text-body-sm text-on-surface-variant">{tr('onlineSearching')}</div>}
            {shown.map((o, i) => <ResultRow key={`${o.source}:${o.id}`} o={o} index={i} onPlay={() => play(i)} />)}
            {!shown.length && !loading && (
              <div className="text-center py-16 text-on-surface-variant animate-fade-in"><Icon name="search_off" size={48} /><div className="mt-2">{tr('noResults')}</div><div className="text-body-sm mt-1">{tr('onlineNoResultsHint')}</div></div>
            )}
          </div>
        )}
      </div>
      <ScrollTop target={scroller} />
    </div>
  );
}
