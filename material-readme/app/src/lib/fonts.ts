export type FontKey = 'system' | 'google-sans-flex' | 'roboto-flex' | 'roboto' | 'arial' | 'inter' | 'be-vietnam-pro';

const SYS = "system-ui, 'Segoe UI Variable Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
export const FONTS: { key: FontKey; label: string; stack: string }[] = [
  { key: 'system', label: 'System', stack: SYS },
  { key: 'google-sans-flex', label: 'Google Sans Flex', stack: `'Google Sans Flex', ${SYS}` },
  { key: 'roboto-flex', label: 'Roboto Flex', stack: `'Roboto Flex', ${SYS}` },
  { key: 'roboto', label: 'Roboto', stack: `'Roboto', ${SYS}` },
  { key: 'arial', label: 'Arial', stack: `Arial, 'Helvetica Neue', Helvetica, sans-serif` },
  { key: 'inter', label: 'Inter', stack: `'Inter', ${SYS}` },
  { key: 'be-vietnam-pro', label: 'Be Vietnam Pro', stack: `'Be Vietnam Pro', ${SYS}` },
];
export const fontStack = (k: FontKey) => (FONTS.find((f) => f.key === k) || FONTS[0]).stack;

export type SizeKey = 'sm' | 'md' | 'lg';
/** Root font size per option: the whole interface is built in rem, so it scales together. */
export const SIZES: Record<SizeKey, number> = { sm: 14, md: 16, lg: 18 };
