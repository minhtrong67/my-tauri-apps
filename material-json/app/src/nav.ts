import { bus } from './bus';
export type ViewName = 'editor' | 'query' | 'compare' | 'convert' | 'schema' | 'settings';
export const VIEWS: ViewName[] = ['editor', 'query', 'compare', 'convert', 'schema', 'settings'];
let cur: ViewName = 'editor';
export const currentView = () => cur;
export function setView(v: ViewName) {
  if (v === cur) return;
  const prev = cur;
  cur = v;
  bus.emit('view', v, prev);
}
