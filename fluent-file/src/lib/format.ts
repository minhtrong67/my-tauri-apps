import { getSettings } from '../store/settings';
export function fmtSize(n: number, precise = false): string {
  if (n < 1024) return n + ' B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  if (i === 1 && !precise) return Math.ceil(v).toLocaleString() + ' KB';
  return (v >= 100 ? v.toFixed(0) : v.toFixed(1)) + ' ' + units[i];
}
const pad = (n: number, w = 2) => String(n).padStart(w, '0');
const MONTHS: Record<string, string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  vi: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
};
const TOKEN = /'([^']*)'|yyyy|yy|MMMM|MMM|MM|M|dd|d|HH|H|hh|h|mm|m|ss|s|a|A/g;

/** Renders a pattern: yyyy yy MMMM MMM MM M dd d HH H hh h mm m ss s a (AM/PM); text in 'quotes' is kept as is. */
export function formatPattern(ms: number, pattern: string, lang: string): string {
  const d = new Date(ms); const months = MONTHS[lang === 'vi' ? 'vi' : 'en']; const h12 = d.getHours() % 12 || 12;
  return pattern.replace(TOKEN, (m, lit?: string) => {
    if (lit !== undefined) return lit;
    switch (m) {
      case 'yyyy': return String(d.getFullYear());
      case 'yy': return pad(d.getFullYear() % 100);
      case 'MMMM': return months[d.getMonth()];
      case 'MMM': return lang === 'vi' ? 'Th' + (d.getMonth() + 1) : months[d.getMonth()].slice(0, 3);
      case 'MM': return pad(d.getMonth() + 1);
      case 'M': return String(d.getMonth() + 1);
      case 'dd': return pad(d.getDate());
      case 'd': return String(d.getDate());
      case 'HH': return pad(d.getHours());
      case 'H': return String(d.getHours());
      case 'hh': return pad(h12);
      case 'h': return String(h12);
      case 'mm': return pad(d.getMinutes());
      case 'm': return String(d.getMinutes());
      case 'ss': return pad(d.getSeconds());
      case 's': return String(d.getSeconds());
      case 'a': case 'A': return d.getHours() < 12 ? (lang === 'vi' ? 'SA' : 'AM') : (lang === 'vi' ? 'CH' : 'PM');
      default: return m;
    }
  });
}

const intl = new Map<string, Intl.DateTimeFormat>();
const sysFmt = (lang: string, o: Intl.DateTimeFormatOptions) => {
  const l = lang === 'vi' ? 'vi-VN' : 'en-US'; const k = l + JSON.stringify(o);
  let f = intl.get(k); if (!f) { f = new Intl.DateTimeFormat(l, o); intl.set(k, f); } return f;
};

/** Date + time as the user configured it (Settings > Files & view > Date and time). */
export function fmtDate(ms: number | null | undefined, lang: string): string {
  if (!ms) return '';
  const S = getSettings(); const sec = S.showSeconds;
  if (S.dateFmt === 'custom') return formatPattern(ms, S.dateCustom || 'dd/MM/yyyy HH:mm', lang);
  const time = S.timeFmt === '24' ? (sec ? 'HH:mm:ss' : 'HH:mm') : S.timeFmt === '12' ? (sec ? 'hh:mm:ss a' : 'hh:mm a') : null;
  if (S.dateFmt === 'auto') {
    if (!time) return sysFmt(lang, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', ...(sec ? { second: '2-digit' } : null) }).format(ms);
    return sysFmt(lang, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms) + ' ' + formatPattern(ms, time, lang);
  }
  return formatPattern(ms, S.dateFmt + ' ' + (time ?? (sec ? 'hh:mm:ss a' : 'hh:mm a')), lang);
}
export const coll = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
