// Dùng khi chạy `npm run dev:mock` (trình duyệt, không có Tauri)
export async function listen(_event: string, _cb: () => void): Promise<() => void> {
  return () => {};
}
