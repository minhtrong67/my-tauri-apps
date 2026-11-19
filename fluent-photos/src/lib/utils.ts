export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");
export const uid = () => Math.random().toString(36).slice(2, 10);
export const fmtSize = (n: number) =>
  n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`;
export const baseName = (p: string) => p.split(/[\\/]/).pop() || p;
export const dirName = (p: string) => p.replace(/[\\/][^\\/]*$/, "");
export const extOf = (p: string) => (p.split(".").pop() || "").toLowerCase();
export const stem = (n: string) => n.replace(/\.[^.]+$/, "");
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...a: A) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
export function shuffle<T>(a: T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}
export const isEditable = (t: EventTarget | null) => {
  const e = t as HTMLElement | null;
  return !!e && (e.tagName === "INPUT" || e.tagName === "TEXTAREA" || e.isContentEditable);
};
