export const HOME = '@home';
export const isWin = typeof navigator !== 'undefined' && /Win/i.test(navigator.platform);
/** Home page (virtual) or This PC ('') */
export const isVirtual = (p: string | null) => p === '' || p === HOME;
export const pk = (p: string) => (isWin ? p.toLowerCase() : p);
export const samePath = (a: string, b: string) => (isWin ? a.toLowerCase() === b.toLowerCase() : a === b);
export const sepOf = (p: string) => (p.includes('\\') || /^[A-Za-z]:/.test(p) ? '\\' : '/');
export const joinPath = (dir: string, name: string) => { const s = sepOf(dir); return dir.endsWith(s) ? dir + name : dir + s + name; };
export const baseName = (p: string) => p.split(/[\\/]/).filter(Boolean).pop() || p;

/** Parent folder; '' means "This PC", null means there is none. */
export function parentOf(p: string | null): string | null {
  if (!p || p === HOME) return null;
  const trimmed = p.length > 3 ? p.replace(/[\\/]+$/, '') : p;
  if (/^[A-Za-z]:[\\/]?$/.test(trimmed) || trimmed === '/') return '';
  const i = Math.max(trimmed.lastIndexOf('\\'), trimmed.lastIndexOf('/'));
  if (i < 0) return '';
  if (i === 0) return '/';
  const parent = trimmed.slice(0, i);
  return /^[A-Za-z]:$/.test(parent) ? parent + '\\' : parent;
}

export interface Crumb { label: string; path: string }
export function crumbsOf(p: string | null, driveName?: (path: string) => string | undefined): Crumb[] {
  if (!p || p === HOME) return [];
  const m = p.match(/^([A-Za-z]:)[\\/]?(.*)$/);
  const out: Crumb[] = [];
  if (m) {
    let acc = m[1] + '\\';
    const dn = driveName?.(acc);
    out.push({ label: dn ? `${dn} (${m[1]})` : m[1], path: acc });
    m[2].split(/[\\/]/).filter(Boolean).forEach((part) => { acc = joinPath(acc, part); out.push({ label: part, path: acc }); });
  } else {
    out.push({ label: '/', path: '/' });
    let acc = '';
    p.split('/').filter(Boolean).forEach((part) => { acc += '/' + part; out.push({ label: part, path: acc }); });
  }
  return out;
}

export const extOf = (name: string) => { const i = name.lastIndexOf('.'); return i > 0 ? name.slice(i + 1).toLowerCase() : ''; };
export const stripExt = (name: string) => { const i = name.lastIndexOf('.'); return i > 0 ? name.slice(0, i) : name; };
