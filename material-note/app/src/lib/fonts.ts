export type FontId = "system" | "roboto" | "inter" | "lora" | "jetbrains";

export interface FontOption {
  id: FontId;
  name: string;
  stack: string;
  kind: "font.sans" | "font.serif" | "font.mono";
}

// Exactly five fonts. All except the system font are bundled (works offline).
export const FONTS: FontOption[] = [
  { id: "system", name: "System UI", kind: "font.sans", stack: 'system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif' },
  { id: "roboto", name: "Roboto", kind: "font.sans", stack: '"Roboto Variable", Roboto, system-ui, sans-serif' },
  { id: "inter", name: "Inter", kind: "font.sans", stack: '"Inter Variable", Inter, system-ui, sans-serif' },
  { id: "lora", name: "Lora", kind: "font.serif", stack: '"Lora Variable", Lora, Georgia, "Times New Roman", serif' },
  { id: "jetbrains", name: "JetBrains Mono", kind: "font.mono", stack: '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, Consolas, monospace' },
];

export const fontById = (id: string) => FONTS.find((f) => f.id === id) ?? FONTS[0];
