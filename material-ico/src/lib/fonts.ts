export type FontId = 'system' | 'roboto' | 'inter' | 'poppins' | 'nunito';

export const FONTS: { id: FontId; label: string; stack: string }[] = [
  { id: 'system', label: 'System UI', stack: "system-ui, -apple-system, 'Segoe UI Variable Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" },
  { id: 'roboto', label: 'Roboto', stack: "'Roboto', system-ui, sans-serif" },
  { id: 'inter', label: 'Inter', stack: "'Inter', system-ui, sans-serif" },
  { id: 'poppins', label: 'Poppins', stack: "'Poppins', system-ui, sans-serif" },
  { id: 'nunito', label: 'Nunito', stack: "'Nunito', system-ui, sans-serif" },
];

export const fontStack = (id: FontId) => (FONTS.find((f) => f.id === id) ?? FONTS[0]).stack;
export const SIZE_PX = { small: 14, medium: 16, large: 18 } as const;
