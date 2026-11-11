/// <reference types="vite/client" />
import type { JNode, PathSeg } from './json';

declare global {
  const __APP_VERSION__: string;
  interface HTMLElement { _node?: JNode; _path?: PathSeg[]; _built?: boolean }
}
export {};
