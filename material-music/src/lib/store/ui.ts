import type { GetFn, SetFn, UiSlice } from './types';

export const createUiSlice = (set: SetFn, get: GetFn): UiSlice => {
  return {
    view: { name: 'home' },
    backStack: [],
    query: '',
    showQueue: false,
    showNowPlaying: false,
    navCollapsed: false,
    miniMode: false,
    viewModes: {},
    dragOver: false,
    toast: null,
    dialog: null,
    menu: null,

    set: (p) => set(p),
    nav: (v) =>
      set((s) => ({
        view: v,
        backStack: [...s.backStack.slice(-19), s.view],
        query: '',
        showNowPlaying: false,
      })),
    back: () =>
      set((s) => {
        const prev = s.backStack[s.backStack.length - 1];
        if (!prev) return {};
        return { view: prev, backStack: s.backStack.slice(0, -1), query: '' };
      }),
    setQuery: (q) => set({ query: q }),
    showToast: (text, actionLabel, action, kind = 'info') => {
      const id = Date.now();
      const dur = actionLabel ? 6000 : kind === 'error' ? 5000 : 3500;
      set({ toast: { id, text, kind, dur, actionLabel, action } });
      window.setTimeout(() => {
        if (get().toast?.id === id) set({ toast: null });
      }, dur);
    },
    openDialog: (d) => set({ dialog: d }),
    openMenu: (x, y, items) => set({ menu: { x, y, items } }),
    closeMenu: () => set({ menu: null }),

    setViewMode: (key, mode) => set((s) => ({ viewModes: { ...s.viewModes, [key]: mode } })),
  };
};
