export type FontKey = 'system' | 'segoe' | 'inter' | 'roboto' | 'be-vietnam-pro' | 'arial';

/** Windows 11 UI font first, so the app looks native; the others fall back to it. */
const SYS = "'Segoe UI Variable Text', 'Segoe UI Variable', 'Segoe UI', system-ui, -apple-system, Roboto, 'Helvetica Neue', Arial, sans-serif";
export const FONTS: { key: FontKey; label: string; stack: string }[] = [
  { key: 'system', label: 'Segoe UI Variable', stack: SYS },
  { key: 'segoe', label: 'Segoe UI', stack: `'Segoe UI', system-ui, ${SYS}` },
  { key: 'inter', label: 'Inter', stack: `'Inter', ${SYS}` },
  { key: 'roboto', label: 'Roboto', stack: `'Roboto', ${SYS}` },
  { key: 'be-vietnam-pro', label: 'Be Vietnam Pro', stack: `'Be Vietnam Pro', ${SYS}` },
  { key: 'arial', label: 'Arial', stack: `Arial, 'Helvetica Neue', Helvetica, sans-serif` },
];
export const fontStack = (k: FontKey) => (FONTS.find((f) => f.key === k) || FONTS[0]).stack;

export type SizeKey = 'sm' | 'md' | 'lg';
/** Root font size per option: the whole interface is built in rem, so it scales together. */
export const SIZES: Record<SizeKey, number> = { sm: 14, md: 16, lg: 18 };
