export const cn = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");
export const baseName = (p: string) => p.split(/[\\/]/).pop() ?? p;
export const isWin = typeof navigator !== "undefined" && /Win/i.test(navigator.platform);
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function readJson<T = unknown>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const samePath = (a: string, b: string) => (isWin ? a.toLowerCase() === b.toLowerCase() : a === b);

export function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number) {
  let t = 0;
  const d = (...a: A) => {
    clearTimeout(t);
    t = window.setTimeout(() => fn(...a), ms);
  };
  d.cancel = () => clearTimeout(t);
  return d;
}

export const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
