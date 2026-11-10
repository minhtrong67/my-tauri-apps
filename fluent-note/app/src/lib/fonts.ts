export type FontId =
  | "system" | "googleSansFlex" | "robotoFlex" | "roboto" | "arial" | "inter" | "beVietnamPro" | "openSans" | "notoSans" | "sourceSans"
  | "lora" | "jetbrains" | "cascadia" | "consolas";

export interface FontOption {
  id: FontId;
  name: string;
  stack: string;
  kind: "font.sans" | "font.serif" | "font.mono";
}

// Web fonts are bundled (they work offline). System UI, Arial, Cascadia Code and Consolas come from Windows.
export const FONTS: FontOption[] = [
  { id: "system", name: "System UI", kind: "font.sans", stack: '"Segoe UI Variable Text", "Segoe UI Variable", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif' },
  { id: "googleSansFlex", name: "Google Sans Flex", kind: "font.sans", stack: '"Google Sans Flex Variable", "Segoe UI", system-ui, sans-serif' },
  { id: "robotoFlex", name: "Roboto Flex", kind: "font.sans", stack: '"Roboto Flex Variable", "Segoe UI", system-ui, sans-serif' },
  { id: "roboto", name: "Roboto", kind: "font.sans", stack: '"Roboto Variable", Roboto, system-ui, sans-serif' },
  { id: "arial", name: "Arial", kind: "font.sans", stack: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
  { id: "inter", name: "Inter", kind: "font.sans", stack: '"Inter Variable", Inter, system-ui, sans-serif' },
  { id: "beVietnamPro", name: "Be Vietnam Pro", kind: "font.sans", stack: '"Be Vietnam Pro", "Segoe UI", system-ui, sans-serif' },
  { id: "openSans", name: "Open Sans", kind: "font.sans", stack: '"Open Sans Variable", "Segoe UI", system-ui, sans-serif' },
  { id: "notoSans", name: "Noto Sans", kind: "font.sans", stack: '"Noto Sans Variable", "Segoe UI", system-ui, sans-serif' },
  { id: "sourceSans", name: "Source Sans 3", kind: "font.sans", stack: '"Source Sans 3 Variable", "Segoe UI", system-ui, sans-serif' },
  { id: "lora", name: "Lora", kind: "font.serif", stack: '"Lora Variable", Lora, Georgia, "Times New Roman", serif' },
  { id: "jetbrains", name: "JetBrains Mono", kind: "font.mono", stack: '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, Consolas, monospace' },
  { id: "cascadia", name: "Cascadia Code", kind: "font.mono", stack: '"Cascadia Code", "Cascadia Mono", Consolas, ui-monospace, monospace' },
  { id: "consolas", name: "Consolas", kind: "font.mono", stack: 'Consolas, "Cascadia Mono", ui-monospace, monospace' },
];

export const fontById = (id: string) => FONTS.find((f) => f.id === id) ?? FONTS[0];
