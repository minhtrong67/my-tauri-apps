import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { searchPlaces, type Found } from '../lib/api';
import { useStore } from '../lib/store';
import { useT } from '../lib/i18n';
import { placeSub } from '../lib/format';
import { selectFound } from '../lib/actions';
import { cn } from './ui/cn';
import { IconBtn } from './ui/Button';

export interface SearchHandle { focus: () => void }

/** Search bar with debounced geocoding, request cancellation and keyboard navigation. */
export const SearchBar = forwardRef<SearchHandle>(function SearchBar(_, ref) {
  const t = useT();
  const lang = useStore((s) => s.settings.lang);
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Found[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'none' | 'error'>('idle');
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const ctrl = useRef<AbortController | null>(null);
  useImperativeHandle(ref, () => ({ focus: () => { input.current?.focus(); input.current?.select(); } }));

  useEffect(() => {
    ctrl.current?.abort();
    const text = q.trim();
    if (text.length < 2) { setOpen(false); setStatus('idle'); return; }
    const id = setTimeout(async () => {
      const c = (ctrl.current = new AbortController());
      setOpen(true); setStatus('loading');
      try {
        const r = await searchPlaces(text, lang, c.signal);
        setItems(r); setSel(0); setStatus(r.length ? 'idle' : 'none');
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setStatus('error');
      }
    }, 280);
    return () => clearTimeout(id);
  }, [q, lang]);

  const pick = (p?: Found) => {
    if (!p) return;
    setQ(''); setOpen(false); input.current?.blur();
    selectFound(p, { notify: true });
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setQ(''); setOpen(false); input.current?.blur(); e.stopPropagation(); return; }
    if (!open || !items.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => (s + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(items[sel]); }
  };
  return (
    <div className="relative h-12 max-w-[35rem] flex-1">
      <div className="flex h-full items-center gap-2 rounded-full bg-sc-high pl-4 pr-2 transition-[background-color,box-shadow] duration-200 focus-within:bg-sc-highest focus-within:shadow-[inset_0_0_0_2px_var(--md-primary)]">
        <Search size={22} className="shrink-0 text-on-surface-variant" />
        <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} onFocus={() => items.length && q.trim().length >= 2 && setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder={t('search.placeholder')} autoComplete="off" spellCheck={false} role="combobox" aria-expanded={open} aria-label={t('search.placeholder')}
          className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-on-surface-variant" />
        {q && <IconBtn label={t('action.clear')} icon={X} size={18} className="!size-9" onClick={() => { setQ(''); input.current?.focus(); }} />}
      </div>
      {open && (
        <div role="listbox" onPointerDown={(e) => e.preventDefault()} className="absolute inset-x-0 top-14 z-50 max-h-96 origin-top animate-[tipIn_0.2s_var(--ease-emphasized)_both] overflow-y-auto rounded-3xl bg-sc p-2 shadow-e3">
          {status === 'loading' && <div className="p-4 text-center text-on-surface-variant">{t('search.loading')}</div>}
          {status === 'none' && <div className="p-4 text-center text-on-surface-variant">{t('search.none')}</div>}
          {status === 'error' && <div className="p-4 text-center text-error">{t('search.error')}</div>}
          {status === 'idle' && items.map((p, i) => (
            <div key={`${p.lat},${p.lon}`} role="option" aria-selected={i === sel} onClick={() => pick(p)} onPointerEnter={() => setSel(i)}
              className={cn('ripple flex h-14 cursor-pointer items-center gap-3 rounded-2xl px-3', i === sel && 'bg-primary/12')}>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-container text-on-primary-container"><MapPin size={18} /></span>
              <span className="flex min-w-0 flex-col"><b className="truncate font-semibold">{p.name}</b><small className="truncate text-on-surface-variant">{placeSub(p)}</small></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
