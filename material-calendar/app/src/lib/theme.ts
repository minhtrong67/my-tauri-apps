export const PRESETS = ['#b3261e', '#6750a4', '#0b57d0', '#006a6a', '#2e7d32', '#c25e00', '#9c3d8f', '#5f6368'];
export const FONTS: Record<string, [string, string]> = {
  system: ['System UI', 'system-ui,"Segoe UI",sans-serif'], roboto: ['Roboto', 'Roboto,system-ui,sans-serif'], serif: ['Georgia', 'Georgia,"Times New Roman",serif'],
  rounded: ['Trebuchet', '"Trebuchet MS","Segoe UI",sans-serif'], mono: ['Cascadia / Mono', '"Cascadia Code",Consolas,monospace'],
};
function hs(hex: string) {
  const n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: Math.round((h * 60 + 360) % 360), s: d ? d / (1 - Math.abs(mx + mn - 1)) : 0 };
}
const c = (h: number, s: number, l: number) => `hsl(${h} ${Math.round(Math.min(1, Math.max(0, s)) * 100)}% ${Math.round(l * 1000) / 10}%)`;
function tokens(seed: string, dark: boolean): Record<string, string> {
  const { h, s: s0 } = hs(seed), s = Math.min(0.85, Math.max(0.35, s0)), n = Math.min(0.14, s * 0.2);
  return dark ? {
    primary: c(h, s, .8), 'on-primary': c(h, s, .2), 'primary-container': c(h, s, .3), 'on-primary-container': c(h, s, .9),
    'secondary-container': c(h, s * .3, .3), 'on-secondary-container': c(h, s * .4, .9), surface: c(h, n, .075), card: c(h, n, .105), 'surface-low': c(h, n, .1),
    'surface-container': c(h, n, .125), 'surface-container-high': c(h, n, .165), 'on-surface': c(h, n, .9), 'on-surface-variant': c(h, n, .78),
    outline: c(h, n * .8, .6), 'outline-variant': c(h, n, .3), inverse: c(h, n, .9), 'inverse-on': c(h, n, .15),
  } : {
    primary: c(h, s, .4), 'on-primary': '#fff', 'primary-container': c(h, s, .9), 'on-primary-container': c(h, s, .12),
    'secondary-container': c(h, s * .4, .89), 'on-secondary-container': c(h, s * .4, .14), surface: c(h, n * 1.4, .975), card: c(h, n, .995), 'surface-low': c(h, n * 1.3, .955),
    'surface-container': c(h, n * 1.3, .94), 'surface-container-high': c(h, n * 1.3, .92), 'on-surface': c(h, n, .1), 'on-surface-variant': c(h, n, .3),
    outline: c(h, n * .8, .48), 'outline-variant': c(h, n * 1.2, .84), inverse: c(h, n, .2), 'inverse-on': c(h, n, .95),
  };
}
export function applyTheme(o: { theme: string; seed: string; font: string; size: string }) {
  const dark = o.theme === 'dark' || (o.theme === 'system' && matchMedia('(prefers-color-scheme:dark)').matches);
  const r = document.documentElement, tk = tokens(o.seed, dark);
  for (const k in tk) r.style.setProperty('--' + k, tk[k]);
  r.dataset.theme = dark ? 'dark' : 'light'; r.style.colorScheme = dark ? 'dark' : 'light';
  r.style.setProperty('--font', (FONTS[o.font] || FONTS.system)[1]);
  r.style.fontSize = { sm: '14px', md: '16px', lg: '18px' }[o.size] || '16px';
}
