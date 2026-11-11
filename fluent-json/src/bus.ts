type Fn = (...a: any[]) => void;
const map = new Map<string, Set<Fn>>();
export const bus = {
  on(ev: string, f: Fn) { (map.get(ev) ?? map.set(ev, new Set()).get(ev)!).add(f); },
  emit(ev: string, ...a: unknown[]) { map.get(ev)?.forEach((f) => f(...a)); },
};
export function debounce<T extends (...a: any[]) => void>(f: T, ms: number) {
  let id: number | undefined;
  const d = ((...a: any[]) => { clearTimeout(id); id = window.setTimeout(() => f(...a), ms); }) as T & { flush(): void };
  d.flush = () => { clearTimeout(id); };
  return d;
}
