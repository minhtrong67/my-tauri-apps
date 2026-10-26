// Giả lập @tauri-apps/api/window cho `npm run dev:mock`
export const getCurrentWindow = () => ({ setTheme: async (_t: unknown) => {} });
