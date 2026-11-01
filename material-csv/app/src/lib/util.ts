import { lang } from './i18n';

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const debounce = <A extends unknown[]>(fn: (...a: A) => void, ms: number) => { let h: ReturnType<typeof setTimeout>; return (...a: A) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; };
export const fmtSize = (n: number) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n > 1024 ? (n / 1024).toFixed(1) + ' KB' : n + ' B');
export const fmtNum = (n: number) => Number(n).toLocaleString(lang() === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 4 });
export const baseName = (p: string) => p.split(/[\\/]/).pop() || p;
export const stripExt = (n: string) => n.replace(/\.[^.]+$/, '');
export const extOf = (p: string) => (p.split('.').pop() || '').toLowerCase();
