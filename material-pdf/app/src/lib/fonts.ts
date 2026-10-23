export type FontId = "system" | "roboto" | "inter" | "opensans" | "notosans";
export const FONTS: { id: FontId; label: string; stack: string }[] = [
  { id: "system", label: "System", stack: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif' },
  { id: "roboto", label: "Roboto", stack: '"Roboto Variable", Roboto, system-ui, sans-serif' },
  { id: "inter", label: "Inter", stack: '"Inter Variable", Inter, system-ui, sans-serif' },
  { id: "opensans", label: "Open Sans", stack: '"Open Sans Variable", "Open Sans", system-ui, sans-serif' },
  { id: "notosans", label: "Noto Sans", stack: '"Noto Sans Variable", "Noto Sans", system-ui, sans-serif' },
];
export const fontStack = (id: FontId) => (FONTS.find((f) => f.id === id) ?? FONTS[0]).stack;
