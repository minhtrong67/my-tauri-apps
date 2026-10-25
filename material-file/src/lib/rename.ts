import type { Entry } from './types';
import { stripExt } from './paths';

export type Case = 'keep' | 'lower' | 'upper' | 'title';
export interface RenameOpts {
  mode: 'pattern' | 'replace';
  pattern: string; start: number; step: number; pad: number; casing: Case;
  find: string; replace: string; regex: boolean; matchCase: boolean;
}
export const DEFAULT_RENAME: RenameOpts = { mode: 'pattern', pattern: '{name} ({n})', start: 1, step: 1, pad: 1, casing: 'keep', find: '', replace: '', regex: false, matchCase: false };
const ILLEGAL = /[<>:"/\\|?*\u0000-\u001f]/;
const title = (s: string) => s.replace(/\p{L}[\p{L}\p{N}']*/gu, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());

export interface RenamePlan { from: Entry; to: string; error: string | null }
/** Computes the new name of every selected entry (extensions of files are always kept). */
export function planRename(items: Entry[], o: RenameOpts, siblings: Set<string>): RenamePlan[] {
  let re: RegExp | null = null; let reErr = false;
  if (o.mode === 'replace' && o.find) {
    try { re = new RegExp(o.regex ? o.find : o.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g' + (o.matchCase ? '' : 'i')); } catch { reErr = true; }
  }
  const plans = items.map((e, i) => {
    const dot = !e.isDir && e.name.lastIndexOf('.') > 0 ? e.name.lastIndexOf('.') : -1;
    const base = dot > 0 ? e.name.slice(0, dot) : e.name; const ext = dot > 0 ? e.name.slice(dot) : '';
    let nb = base;
    if (o.mode === 'pattern') {
      const n = String(o.start + i * o.step).padStart(Math.max(1, o.pad), '0');
      nb = o.pattern.split('{name}').join(base).split('{n}').join(n).split('{ext}').join(ext.slice(1)).split('{date}').join(new Date(e.modified || Date.now()).toISOString().slice(0, 10));
    } else if (re) nb = base.replace(re, o.replace);
    nb = o.casing === 'lower' ? nb.toLowerCase() : o.casing === 'upper' ? nb.toUpperCase() : o.casing === 'title' ? title(nb) : nb;
    return { from: e, to: (nb + ext).trim(), error: reErr ? 'regex' : null as string | null };
  });
  const mine = new Set(items.map((e) => e.name.toLowerCase()));
  const seen = new Map<string, number>();
  plans.forEach((p) => { const k = p.to.toLowerCase(); seen.set(k, (seen.get(k) || 0) + 1); });
  plans.forEach((p) => {
    const k = p.to.toLowerCase();
    if (p.error) return;
    if (!p.to || p.to === '.' || p.to === '..' || stripExt(p.to) === '') p.error = 'empty';
    else if (ILLEGAL.test(p.to) || /[. ]$/.test(p.to)) p.error = 'invalid';
    else if ((seen.get(k) || 0) > 1) p.error = 'duplicate';
    else if (siblings.has(k) && !mine.has(k)) p.error = 'exists';
  });
  return plans;
}
