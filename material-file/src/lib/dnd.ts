/* Pointer-based drag & drop (the native HTML5 one is disabled because Tauri uses native file drops).
   Drop targets are any element carrying data-drop-path="<folder>". */
import { useUI } from '../store/ui';
import { samePath } from './paths';

let active = false;
let hover: HTMLElement | null = null;
export const isDragging = () => active;

export function beginDrag(startEvent: PointerEvent | React.PointerEvent, paths: string[], onDrop: (target: string, copy: boolean) => void) {
  const sx = startEvent.clientX, sy = startEvent.clientY;
  let started = false;
  const mark = (el: HTMLElement | null) => { if (hover !== el) { hover?.classList.remove('drop-target'); hover = el; hover?.classList.add('drop-target'); } };
  const targetAt = (x: number, y: number, el: HTMLElement | null) => {
    const t = (el ?? (document.elementFromPoint(x, y) as HTMLElement | null))?.closest<HTMLElement>('[data-drop-path]') ?? null;
    if (!t) return null;
    const p = t.dataset.dropPath as string;
    return paths.some((s) => samePath(s, p)) ? null : t;
  };
  const move = (e: PointerEvent) => {
    if (!started) {
      if (Math.hypot(e.clientX - sx, e.clientY - sy) < 6) return;
      started = true; active = true; document.body.style.cursor = 'grabbing';
    }
    useUI.setState({ dragging: { paths, x: e.clientX, y: e.clientY, copy: e.ctrlKey || e.metaKey } });
    mark(targetAt(e.clientX, e.clientY, null));
  };
  const end = (e: PointerEvent | null, cancel: boolean) => {
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up, true); window.removeEventListener('keydown', key, true);
    if (started && e && !cancel) {
      const t = targetAt(e.clientX, e.clientY, null);
      if (t) onDrop(t.dataset.dropPath as string, e.ctrlKey || e.metaKey);
    }
    mark(null); document.body.style.cursor = ''; useUI.setState({ dragging: null });
    window.setTimeout(() => { active = false; }, 0);
  };
  const up = (e: PointerEvent) => end(e, false);
  const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); end(null, true); } };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up, true);
  window.addEventListener('keydown', key, true);
}
