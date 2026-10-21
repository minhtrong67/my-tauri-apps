/** Bảng màu chủ đề kiểu Material Design. `seed` dùng để pha sắc nhẹ vào các màu nền (giống tonal surface của M3). */
export type AccentId = "terracotta" | "purple" | "blue" | "teal" | "green" | "amber" | "pink" | "red";
export const ACCENTS: { id: AccentId; seed: string }[] = [
  { id: "terracotta", seed: "#c05534" },
  { id: "purple", seed: "#6750a4" },
  { id: "blue", seed: "#0b57d0" },
  { id: "teal", seed: "#00897b" },
  { id: "green", seed: "#2e7d32" },
  { id: "amber", seed: "#f29900" },
  { id: "pink", seed: "#d6336c" },
  { id: "red", seed: "#d93025" },
];
