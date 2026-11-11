// Giả lập @tauri-apps/api/window cho `npm run dev:mock`
let maximized = false;
const subs = new Set<() => void>();
export const getCurrentWindow = () => ({
  setTheme: async (_t: unknown) => {},
  minimize: async () => {},
  close: async () => {},
  toggleMaximize: async () => {
    maximized = !maximized;
    subs.forEach((f) => f());
  },
  isMaximized: async () => maximized,
  onResized: async (cb: () => void) => {
    subs.add(cb);
    return () => subs.delete(cb);
  },
});
