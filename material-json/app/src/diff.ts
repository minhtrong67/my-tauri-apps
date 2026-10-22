import { formatPath, type PathSeg } from './json';

export interface DiffEntry { op: 'add' | 'remove' | 'change'; path: PathSeg[]; left?: unknown; right?: unknown }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function diffValues(a: unknown, b: unknown, path: PathSeg[] = [], out: DiffEntry[] = []): DiffEntry[] {
  if (Array.isArray(a) && Array.isArray(b)) {
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      if (i >= a.length) out.push({ op: 'add', path: [...path, i], right: b[i] });
      else if (i >= b.length) out.push({ op: 'remove', path: [...path, i], left: a[i] });
      else diffValues(a[i], b[i], [...path, i], out);
    }
  } else if (isObj(a) && isObj(b)) {
    for (const k of Object.keys(a)) {
      if (!(k in b)) out.push({ op: 'remove', path: [...path, k], left: a[k] });
      else diffValues(a[k], b[k], [...path, k], out);
    }
    for (const k of Object.keys(b)) if (!(k in a)) out.push({ op: 'add', path: [...path, k], right: b[k] });
  } else if (a !== b) out.push({ op: 'change', path, left: a, right: b });
  return out;
}

export { formatPath };

export interface Row { l?: { n: number; text: string }; r?: { n: number; text: string }; kind: 'eq' | 'add' | 'del' | 'chg' }

/** Side-by-side line diff (common prefix/suffix trimming + LCS). Returns null when too large. */
export function lineDiff(a: string[], b: string[], limit = 6_000_000): Row[] | null {
  let s = 0;
  while (s < a.length && s < b.length && a[s] === b[s]) s++;
  let ea = a.length, eb = b.length;
  while (ea > s && eb > s && a[ea - 1] === b[eb - 1]) { ea--; eb--; }
  const A = a.slice(s, ea), B = b.slice(s, eb);
  if (A.length * B.length > limit) return null;

  const n = A.length, m = B.length, w = m + 1;
  const dp = new Uint32Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i * w + j] = A[i] === B[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);

  const rows: Row[] = [];
  for (let i = 0; i < s; i++) rows.push({ l: { n: i + 1, text: a[i] }, r: { n: i + 1, text: b[i] }, kind: 'eq' });
  let i = 0, j = 0, dels: Row[] = [], adds: Row[] = [];
  const flush = () => {
    const k = Math.max(dels.length, adds.length);
    for (let x = 0; x < k; x++) {
      const d = dels[x], ad = adds[x];
      rows.push({ l: d?.l, r: ad?.r, kind: d && ad ? 'chg' : d ? 'del' : 'add' });
    }
    dels = []; adds = [];
  };
  while (i < n || j < m) {
    if (i < n && j < m && A[i] === B[j]) { flush(); rows.push({ l: { n: s + i + 1, text: A[i] }, r: { n: s + j + 1, text: B[j] }, kind: 'eq' }); i++; j++; }
    else if (j < m && (i === n || dp[i * w + j + 1] >= dp[(i + 1) * w + j])) { adds.push({ r: { n: s + j + 1, text: B[j] }, kind: 'add' }); j++; }
    else { dels.push({ l: { n: s + i + 1, text: A[i] }, kind: 'del' }); i++; }
  }
  flush();
  for (let k = 0; ea + k < a.length; k++) rows.push({ l: { n: ea + k + 1, text: a[ea + k] }, r: { n: eb + k + 1, text: b[eb + k] }, kind: 'eq' });
  return rows;
}
