/** Màu nhấn kiểu Windows. "system" dùng màu nhấn của Windows (CSS `AccentColor`), còn lại là màu cố định. */
export type AccentId = "system" | "blue" | "purple" | "teal" | "green" | "claude" | "red" | "pink";
export const ACCENTS: { id: AccentId; seed: string }[] = [
  { id: "system", seed: "#0078d4" },
  { id: "blue", seed: "#0078d4" },
  { id: "purple", seed: "#8764b8" },
  { id: "teal", seed: "#038387" },
  { id: "green", seed: "#107c10" },
  { id: "claude", seed: "#c6613f" },
  { id: "red", seed: "#d13438" },
  { id: "pink", seed: "#c239b3" },
];
