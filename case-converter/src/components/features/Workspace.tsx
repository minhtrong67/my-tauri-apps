import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight, Check, ChevronDown, CircleX, Copy, Eraser, FolderOpen, ClipboardPaste, Save, Sparkles, Star, Type as TypeIcon, Wrench,
} from 'lucide-react';
import {
  CASES, CASE_GROUPS, TOOLS, TOOL_GROUPS, displayName, paramText, textStats,
  type CaseDef, type Item, type Lang, type Params, type ParamDef, type ToolDef,
} from '@/lib/engine';
import type { Key, TFn } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, Chip, Switch } from '@/components/ui/controls';
import { Select } from '@/components/ui/Select';

const GROUP_LABEL: Record<string, Key> = {
  text: 'gText', code: 'gCode', other: 'gOther', lines: 'tgLines', edit: 'tgEdit', encode: 'tgEncode', analyze: 'tgAnalyze',
};

/* ------------------------------------------------------------------ Source */

interface SourceProps {
  t: TFn;
  value: string;
  onChange: (v: string) => void;
  onOpen: () => void;
  onPaste: () => void;
  onClear: () => void;
  onSample: () => void;
  className?: string;
}

export function SourceCard({ className, t, value, onChange, onOpen, onPaste, onClear, onSample }: SourceProps) {
  const stats = textStats(value);
  const fmt = (n: number) => n.toLocaleString();
  return (
    <Card
      title={t('source')} icon={TypeIcon} className={cn('min-h-[18rem]', className)}
      actions={
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="tonal" icon={FolderOpen} onClick={onOpen} data-tip={t('open')} data-tip-kbd="Ctrl+O" aria-label={t('open')}>
            <span className="max-sm:hidden">{t('lbOpen')}</span>
          </Button>
          <Button size="sm" variant="tonal" icon={ClipboardPaste} onClick={onPaste} data-tip={t('paste')} aria-label={t('paste')}>
            <span className="max-sm:hidden">{t('lbPaste')}</span>
          </Button>
          <Button size="sm" variant="text" icon={Eraser} className="text-error" disabled={!value} onClick={onClear} data-tip={t('clear')} data-tip-kbd="Ctrl+Shift+X" aria-label={t('clear')}>
            <span className="max-sm:hidden">{t('lbClear')}</span>
          </Button>
        </div>
      }
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('inPlaceholder')}
          spellCheck={false}
          aria-label={t('source')}
          className="min-h-48 flex-1 resize-none rounded-lg bg-surface-container-highest p-4 text-[0.9375rem] leading-relaxed text-on-surface outline-none transition-shadow duration-300 placeholder:text-on-surface-variant/70 focus:shadow-[0_0_0_2px_var(--md-primary)]"
        />
        {!value && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
            <Button variant="tonal" size="sm" icon={Sparkles} className="pointer-events-auto anim-pop" onClick={onSample}>{t('sample')}</Button>
          </div>
        )}
      </div>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant tabular-nums">
        <span>{fmt(stats.chars)} {t('chars')}</span><span>{fmt(stats.words)} {t('wordsU')}</span><span>{fmt(stats.lines)} {t('linesU')}</span>
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ Result */

interface ResultProps {
  t: TFn;
  lang: Lang;
  item: Item;
  output: string;
  errorKey: Key | null;
  pending: boolean;
  isFavorite?: boolean;
  onFavorite?: () => void;
  onCopy: () => void;
  onSwap: () => void;
  onSave: () => void;
}

export function ResultCard({ t, lang, item, output, errorKey, pending, isFavorite, onFavorite, onCopy, onSwap, onSave }: ResultProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const doCopy = () => {
    onCopy();
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1700);
  };
  const empty = !output;
  return (
    <Card
      title={t('result')}
      icon={Check}
      className="min-h-[18rem]"
      actions={
        <div className="flex items-center gap-1">
          {pending && <span className="loader mr-1" role="status" aria-label={t('converting')} />}
          {onFavorite && (
            <IconButton icon={Star} size="sm" label={isFavorite ? t('removeFav') : t('addFav')} pressed={isFavorite} onClick={onFavorite}
              className={cn(isFavorite && 'bg-tertiary-container text-on-tertiary-container [&_svg]:fill-current')} />
          )}
          <IconButton icon={Save} size="sm" label={t('save')} kbd="Ctrl+S" disabled={empty} onClick={onSave} />
          <IconButton icon={ArrowLeftRight} size="sm" label={t('swap')} disabled={empty} onClick={onSwap} />
          <Button
            size="sm" variant={copied ? 'success' : 'filled'} icon={copied ? Check : Copy} disabled={empty} onClick={doCopy}
            data-tip={t('copyTip')} data-tip-kbd="Ctrl+Shift+C" className="ml-1 min-w-28"
          >
            {copied ? t('copied') : t('copy')}
          </Button>
        </div>
      }
    >
      <p className="mb-2 inline-flex w-fit items-center rounded-full bg-tertiary-container px-3 py-1 text-xs font-medium text-on-tertiary-container">{displayName(item, lang)}</p>
      {errorKey ? (
        <div role="alert" className="anim-pop flex flex-1 flex-col items-center justify-center gap-3 rounded-lg bg-error-container p-6 text-center text-on-error-container">
          <CircleX className="size-9" aria-hidden />
          <p className="text-sm font-medium">{t(errorKey)}</p>
        </div>
      ) : empty ? (
        <div className="grid flex-1 place-items-center rounded-lg border border-dashed border-outline-variant p-6 text-center text-sm text-on-surface-variant">
          {t('emptyResult')}
        </div>
      ) : (
        <pre
          key={item.id}
          tabIndex={0}
          className="selectable anim-pop m-0 min-h-48 flex-1 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-surface-container-highest p-4 font-[inherit] text-[0.9375rem] leading-relaxed outline-none focus-visible:shadow-[0_0_0_2px_var(--md-primary)]"
        >
          {output}
        </pre>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ All cases */

interface AllProps {
  t: TFn;
  lang: Lang;
  rows: { item: CaseDef; text: string }[];
  empty: boolean;
  onCopy: (item: CaseDef) => void;
}

export function AllList({ t, lang, rows, empty, onCopy }: AllProps) {
  return (
    <Card title={t('allTitle')} icon={Check} className="min-h-[18rem]" bodyClassName="px-2 sm:px-3">
      {empty ? (
        <div className="m-2 grid flex-1 place-items-center rounded-lg border border-dashed border-outline-variant p-6 text-center text-sm text-on-surface-variant">{t('emptyAll')}</div>
      ) : (
        <div className="min-h-0 flex-1 space-y-3">
          {CASE_GROUPS.map((g) => (
            <div key={g}>
              <h3 className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wider text-primary">{t(GROUP_LABEL[g])}</h3>
              <ul className="space-y-1">
                {rows.filter((r) => r.item.g === g).map(({ item, text }, i) => (
                  <li key={item.id} className="anim-row" style={{ animationDelay: `${i * 22}ms` }}>
                    <div className="rip state group flex items-center gap-3 rounded-lg px-3 py-2" role="button" tabIndex={0}
                      onClick={() => onCopy(item)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCopy(item); } }}>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-on-surface-variant">{displayName(item, lang)}</p>
                        <p className="selectable line-clamp-2 whitespace-pre-wrap break-words text-sm leading-snug">{text || '\u00A0'}</p>
                      </div>
                      <span className="grid size-9 shrink-0 place-items-center rounded-full text-on-surface-variant transition-colors group-hover:bg-secondary-container group-hover:text-on-secondary-container" aria-hidden>
                        <Copy className="size-[1.125rem]" />
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ Pickers */

function GroupLabel({ children }: { children: string }) {
  return <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-on-surface-variant">{children}</h3>;
}

/** Collapsible card: the header always shows the current choice, the body holds the full list. */
function Accordion({ id, title, icon: Icon, summary, open, onToggle, children }: {
  id: string; title: string; icon: typeof Sparkles; summary: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-surface-container-low">
      <h2>
        <button
          type="button" aria-expanded={open} aria-controls={id} onClick={onToggle}
          className="rip state flex min-h-14 w-full items-center gap-3 rounded-xl px-4 py-2 text-left outline-none sm:px-5"
        >
          <Icon className="size-5 shrink-0 text-primary" strokeWidth={2.1} aria-hidden />
          <span className="shrink-0 text-base font-medium">{title}</span>
          <span className="min-w-0 flex-1">
            <span className="inline-block max-w-full truncate rounded-full bg-tertiary-container px-3 py-1 align-middle text-xs font-medium text-on-tertiary-container">{summary}</span>
          </span>
          <span className={cn(
            'grid size-9 shrink-0 place-items-center bg-secondary-container text-on-secondary-container transition-[transform,border-radius] duration-500 ease-spring',
            open ? 'rotate-180 rounded-md' : 'rounded-full',
          )}>
            <ChevronDown className="size-5" aria-hidden />
          </span>
        </button>
      </h2>
      <div id={id} inert={!open} className={cn('grid transition-[grid-template-rows] duration-500 ease-emphasized', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="min-h-0 overflow-hidden">
          <div className={cn('px-4 pb-4 pt-1 transition-opacity duration-300 sm:px-5', open ? 'opacity-100' : 'opacity-0')}>{children}</div>
        </div>
      </div>
    </section>
  );
}

interface CasePickerProps {
  t: TFn;
  lang: Lang;
  value: string;
  favorites: string[];
  smart: boolean;
  keepAcronyms: boolean;
  open: boolean;
  onToggle: () => void;
  onPick: (id: string) => void;
  onSmart: (v: boolean) => void;
  onKeepAcronyms: (v: boolean) => void;
}

export function CasePicker({ t, lang, value, favorites, smart, keepAcronyms, open, onToggle, onPick, onSmart, onKeepAcronyms }: CasePickerProps) {
  const favs = favorites.map((id) => CASES.find((c) => c.id === id)).filter((c): c is CaseDef => !!c);
  const current = CASES.find((c) => c.id === value) ?? CASES[0];
  return (
    <Accordion id="case-picker" title={t('pickStyle')} icon={Sparkles} summary={displayName(current, lang)} open={open} onToggle={onToggle}>
      <div className="space-y-4">
        {favs.length > 0 && (
          <div>
            <GroupLabel>{t('favorites')}</GroupLabel>
            <div className="flex flex-wrap gap-2">
              {favs.map((c) => <Chip key={c.id} selected={c.id === value} onClick={() => onPick(c.id)}>{displayName(c, lang)}</Chip>)}
            </div>
          </div>
        )}
        {CASE_GROUPS.map((g) => (
          <div key={g}>
            <GroupLabel>{t(GROUP_LABEL[g])}</GroupLabel>
            <div className="flex flex-wrap gap-2">
              {CASES.filter((c) => c.g === g).map((c) => <Chip key={c.id} selected={c.id === value} onClick={() => onPick(c.id)}>{displayName(c, lang)}</Chip>)}
            </div>
          </div>
        ))}
        {value === 'title' && <OptionRow key="smart" label={t('smart')} hint={t('smartHint')} checked={smart} onChange={onSmart} />}
        {value === 'sentence' && <OptionRow key="acr" label={t('keepAcr')} hint={t('keepAcrHint')} checked={keepAcronyms} onChange={onKeepAcronyms} />}
      </div>
    </Accordion>
  );
}

function OptionRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="anim-pop flex items-center gap-4 rounded-lg bg-surface-container px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-on-surface-variant">{hint}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

interface ToolPickerProps {
  t: TFn;
  lang: Lang;
  value: string;
  open: boolean;
  onToggle: () => void;
  onPick: (id: string) => void;
}

export function ToolPicker({ t, lang, value, open, onToggle, onPick }: ToolPickerProps) {
  const current = TOOLS.find((x) => x.id === value) ?? TOOLS[0];
  return (
    <Accordion id="tool-picker" title={t('pickTool')} icon={Wrench} summary={displayName(current, lang)} open={open} onToggle={onToggle}>
      <div className="space-y-4">
        {TOOL_GROUPS.map((g) => (
          <div key={g}>
            <GroupLabel>{t(GROUP_LABEL[g])}</GroupLabel>
            <div className="flex flex-wrap gap-2">
              {TOOLS.filter((x) => x.g === g).map((x) => <Chip key={x.id} selected={x.id === value} onClick={() => onPick(x.id)}>{displayName(x, lang)}</Chip>)}
            </div>
          </div>
        ))}
      </div>
    </Accordion>
  );
}

/** Options of the selected tool. It stays visible even when the tool list is collapsed. */
export function ToolParams({ lang, tool, params, onParam }: { lang: Lang; tool: ToolDef; params: Params; onParam: (id: string, v: string | boolean) => void }) {
  if (!tool.params) return null;
  return (
    <div key={tool.id} className="anim-pop relative z-20 grid gap-3 rounded-xl bg-surface-container-low p-4 sm:grid-cols-2 sm:px-5">
      {tool.params.map((p) => <ParamField key={p.id} def={p} lang={lang} value={params[p.id] ?? p.def} onChange={(v) => onParam(p.id, v)} />)}
    </div>
  );
}

function ParamField({ def, lang, value, onChange }: { def: ParamDef; lang: Lang; value: string | boolean; onChange: (v: string | boolean) => void }) {
  const label = paramText(def.l, lang);
  if (def.kind === 'toggle') {
    return (
      <div className="flex items-center gap-4 sm:col-span-2">
        <p className="min-w-0 flex-1 text-sm font-medium">{label}</p>
        <Switch checked={value === true} onChange={onChange} label={label} />
      </div>
    );
  }
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-medium text-on-surface-variant">{label}</span>
      {def.kind === 'select' ? (
        <Select
          label={label} value={String(value)} onChange={onChange}
          options={def.options.map((o) => ({ value: o.v, label: (lang === 'vi' && o.l[1]) || o.l[0] }))}
        />
      ) : (
        <input
          type="text" value={String(value)} onChange={(e) => onChange(e.target.value)} spellCheck={false}
          placeholder={def.ph ? paramText(def.ph, lang) : undefined}
          className="h-12 w-full rounded-md border border-outline-variant bg-surface-container-highest px-4 text-sm outline-none transition-colors placeholder:text-on-surface-variant/70 focus:border-primary focus:shadow-[0_0_0_1px_var(--md-primary)]"
        />
      )}
    </label>
  );
}
