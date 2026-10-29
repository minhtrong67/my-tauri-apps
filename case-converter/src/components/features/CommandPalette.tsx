import { useEffect, useMemo, useRef, useState } from 'react';
import { CaseSensitive, CornerDownLeft, Search, Wrench, type LucideIcon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { CASES, TOOLS, deburr, displayName } from '@/lib/engine';
import { useSettings } from '@/lib/settings';
import { cn } from '@/lib/utils';

export interface PaletteAction { id: string; label: string; icon: LucideIcon; kbd?: string; run: () => void }
interface Entry { id: string; section: 'palCases' | 'palTools' | 'palActions'; label: string; icon: LucideIcon; kbd?: string; run: () => void }

interface Props {
  open: boolean;
  onClose: () => void;
  actions: PaletteAction[];
  onPickItem: (id: string, kind: 'case' | 'tool') => void;
}

const norm = (s: string) => deburr(s).toLowerCase();

export function CommandPalette({ open, onClose, actions, onPickItem }: Props) {
  const { t, lang } = useSettings();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (open) { setQ(''); setActive(0); setTimeout(() => input.current?.focus(), 30); }
  }, [open]);

  const entries = useMemo<Entry[]>(() => {
    const all: Entry[] = [
      ...actions.map((a) => ({ id: `a:${a.id}`, section: 'palActions' as const, label: a.label, icon: a.icon, kbd: a.kbd, run: a.run })),
      ...CASES.map((c) => ({ id: `c:${c.id}`, section: 'palCases' as const, label: displayName(c, lang), icon: CaseSensitive, run: () => onPickItem(c.id, 'case') })),
      ...TOOLS.map((x) => ({ id: `t:${x.id}`, section: 'palTools' as const, label: displayName(x, lang), icon: Wrench, run: () => onPickItem(x.id, 'tool') })),
    ];
    const needle = norm(q.trim());
    const hits = needle ? all.filter((e) => norm(e.label).includes(needle) || e.id.slice(2).toLowerCase().includes(needle)) : all;
    // Keep section order: actions first when searching is empty, otherwise styles, tools, actions.
    return hits;
  }, [q, lang, actions, onPickItem]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => { list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active]);

  const run = (e: Entry | undefined) => { if (e) { onClose(); setTimeout(e.run, 60); } };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(entries.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(entries[active]); }
  };

  let lastSection = '';
  return (
    <Modal open={open} onClose={onClose} title={t('palette')} bare top size="md">
      <div onKeyDown={onKey} className="flex max-h-[min(34rem,80dvh)] flex-col">
        <div className="flex items-center gap-3 border-b border-outline-variant/60 px-5 py-3.5">
          <Search className="size-5 shrink-0 text-primary" aria-hidden />
          <input
            ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('palPlaceholder')} aria-label={t('palette')} spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-on-surface-variant/70"
          />
          <kbd className="rounded-xs bg-surface-container-highest px-2 py-0.5 text-xs font-medium text-on-surface-variant">Esc</kbd>
        </div>
        <ul ref={list} role="listbox" aria-label={t('palette')} className="min-h-0 flex-1 overflow-y-auto p-2">
          {entries.length === 0 && <li className="px-4 py-10 text-center text-sm text-on-surface-variant">{t('palEmpty')}</li>}
          {entries.map((e, i) => {
            const head = e.section !== lastSection;
            lastSection = e.section;
            return (
              <li key={e.id} role="presentation">
                {head && <p className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-primary">{t(e.section)}</p>}
                <div
                  role="option" aria-selected={i === active} data-i={i} onPointerMove={() => setActive(i)} onClick={() => run(e)}
                  className={cn('flex h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors', i === active ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface')}
                >
                  <e.icon className="size-[1.125rem] shrink-0 opacity-80" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{e.label}</span>
                  {e.kbd && <kbd className="rounded-xs bg-surface-container-highest px-1.5 py-0.5 text-[0.6875rem] text-on-surface-variant">{e.kbd}</kbd>}
                  {i === active && <CornerDownLeft className="size-4 opacity-60" aria-hidden />}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
}
