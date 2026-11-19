export function fmtSize(n: number, precise = false): string {
  if (n < 1024) return n + ' B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  if (i === 1 && !precise) return Math.ceil(v).toLocaleString() + ' KB';
  return (v >= 100 ? v.toFixed(0) : v.toFixed(1)) + ' ' + units[i];
}
let dtfLang = ''; let dtf: Intl.DateTimeFormat | null = null;
export function fmtDate(ms: number | null | undefined, lang: string): string {
  if (!ms) return '';
  const l = lang === 'vi' ? 'vi-VN' : 'en-US';
  if (l !== dtfLang || !dtf) { dtfLang = l; dtf = new Intl.DateTimeFormat(l, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  return dtf.format(ms);
}
export const coll = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
