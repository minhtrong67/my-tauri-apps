import { useDocs, getDoc } from "../store/docs";

/** One <textarea> per tab stays mounted, so every tab keeps its own undo history. */
export const editors = new Map<number, HTMLTextAreaElement>();

/** Cursor / scroll position remembered per tab (not reactive on purpose). */
export interface ViewState {
  sel: [number, number];
  scroll: [number, number];
}
export const viewState = new Map<number, ViewState>();

export const getText = (id: number): string => editors.get(id)?.value ?? getDoc(id)?.initial ?? "";

export const activeEditor = (): HTMLTextAreaElement | undefined => {
  const id = useDocs.getState().activeId;
  return id === null ? undefined : editors.get(id);
};

export function rememberView(id: number) {
  const ta = editors.get(id);
  if (!ta) return;
  viewState.set(id, { sel: [ta.selectionStart, ta.selectionEnd], scroll: [ta.scrollTop, ta.scrollLeft] });
}
