/* Material File - Material Design 3 theming
 *
 * A seed color is converted to OKLCH. Its hue and chroma drive a set of CSS custom properties
 * (--h, --c); styles.css maps them to the M3 color roles (primary, secondary-container,
 * surface-container...) using oklch() tones.
 *
 * The default Material Blue seed (#2196F3) uses the exact tonal scheme exported from the
 * Material Theme Builder (material-theme-blue.json) instead of the approximation.
 */
const Theme = (() => {
  /* Material Design color palette (500 swatches) + the M3 baseline purple */
  const PALETTE = [
    { hex: '#F44336', en: 'Red', vi: 'Đỏ' }, { hex: '#E91E63', en: 'Pink', vi: 'Hồng' },
    { hex: '#9C27B0', en: 'Purple', vi: 'Tím' }, { hex: '#673AB7', en: 'Deep Purple', vi: 'Tím đậm' },
    { hex: '#3F51B5', en: 'Indigo', vi: 'Chàm' }, { hex: '#2196F3', en: 'Blue', vi: 'Xanh dương' },
    { hex: '#03A9F4', en: 'Light Blue', vi: 'Xanh da trời' }, { hex: '#00BCD4', en: 'Cyan', vi: 'Xanh lơ' },
    { hex: '#009688', en: 'Teal', vi: 'Xanh mòng két' }, { hex: '#4CAF50', en: 'Green', vi: 'Xanh lá' },
    { hex: '#8BC34A', en: 'Light Green', vi: 'Xanh lá nhạt' }, { hex: '#CDDC39', en: 'Lime', vi: 'Xanh chanh' },
    { hex: '#FFEB3B', en: 'Yellow', vi: 'Vàng' }, { hex: '#FFC107', en: 'Amber', vi: 'Hổ phách' },
    { hex: '#FF9800', en: 'Orange', vi: 'Cam' }, { hex: '#FF5722', en: 'Deep Orange', vi: 'Cam đậm' },
    { hex: '#795548', en: 'Brown', vi: 'Nâu' }, { hex: '#607D8B', en: 'Blue Grey', vi: 'Xám xanh' },
    { hex: '#6750A4', en: 'Baseline', vi: 'Mặc định M3' }
  ];
  const DEFAULT_SEED = '#2196F3';

  /* Popular fonts. "bundled" fonts ship with the app (assets/fonts); the others use what the OS has. */
  const FONTS = [
    { id: 'system', label: null, stack: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif' },
    { id: 'roboto', label: 'Roboto', stack: '"Roboto", system-ui, "Segoe UI", sans-serif', bundled: true },
    { id: 'inter', label: 'Inter', stack: '"Inter", system-ui, "Segoe UI", sans-serif', bundled: true },
    { id: 'opensans', label: 'Open Sans', stack: '"Open Sans", system-ui, "Segoe UI", sans-serif', bundled: true },
    { id: 'notosans', label: 'Noto Sans', stack: '"Noto Sans", system-ui, "Segoe UI", sans-serif', bundled: true },
    { id: 'nunito', label: 'Nunito', stack: '"Nunito", system-ui, "Segoe UI", sans-serif', bundled: true },
    { id: 'segoe', label: 'Segoe UI', stack: '"Segoe UI", system-ui, Roboto, sans-serif' },
    { id: 'arial', label: 'Arial', stack: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
    { id: 'verdana', label: 'Verdana', stack: 'Verdana, Geneva, sans-serif' },
    { id: 'tahoma', label: 'Tahoma', stack: 'Tahoma, Geneva, sans-serif' },
    { id: 'trebuchet', label: 'Trebuchet MS', stack: '"Trebuchet MS", "Segoe UI", sans-serif' },
    { id: 'georgia', label: 'Georgia', stack: 'Georgia, "Times New Roman", serif' },
    { id: 'times', label: 'Times New Roman', stack: '"Times New Roman", Times, serif' },
    { id: 'consolas', label: 'Consolas', stack: 'Consolas, "Cascadia Mono", "SF Mono", monospace' }
  ];

  const EXACT = {
    '#2196f3': {
        "light": {
            "--primary": "#36618E",
            "--on-primary": "#FFFFFF",
            "--primary-container": "#D1E4FF",
            "--on-primary-container": "#194975",
            "--secondary-container": "#D7E3F7",
            "--on-secondary-container": "#3B4858",
            "--surface": "#F8F9FF",
            "--surface-container-low": "#F2F3FA",
            "--surface-container": "#ECEEF4",
            "--surface-container-high": "#E6E8EE",
            "--surface-container-highest": "#E1E2E8",
            "--on-surface": "#191C20",
            "--on-surface-variant": "#43474E",
            "--outline": "#73777F",
            "--outline-variant": "#C3C7CF",
            "--error": "#BA1A1A",
            "--inverse-surface": "#2E3135",
            "--inverse-on-surface": "#EFF0F7"
        },
        "dark": {
            "--primary": "#A0CAFD",
            "--on-primary": "#003258",
            "--primary-container": "#194975",
            "--on-primary-container": "#D1E4FF",
            "--secondary-container": "#3B4858",
            "--on-secondary-container": "#D7E3F7",
            "--surface": "#111418",
            "--surface-container-low": "#191C20",
            "--surface-container": "#1D2024",
            "--surface-container-high": "#272A2F",
            "--surface-container-highest": "#32353A",
            "--on-surface": "#E1E2E8",
            "--on-surface-variant": "#C3C7CF",
            "--outline": "#8D9199",
            "--outline-variant": "#43474E",
            "--error": "#FFB4AB",
            "--inverse-surface": "#E1E2E8",
            "--inverse-on-surface": "#2E3135"
        }
    }
  };

  function hexToOklch(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const r = lin(((n >> 16) & 255) / 255);
    const g = lin(((n >> 8) & 255) / 255);
    const b = lin((n & 255) / 255);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return { c: Math.hypot(a, bb), h: (Math.atan2(bb, a) * 180 / Math.PI + 360) % 360 };
  }

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = (mode) => mode === 'dark' || (mode === 'system' && mq.matches);
  const validHex = (s) => typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s);
  const fontById = (id) => FONTS.find((f) => f.id === id) || FONTS[0];
  let applied = [];

  function apply(settings, appWindow) {
    const root = document.documentElement;
    const seed = validHex(settings.seed) ? settings.seed : DEFAULT_SEED;
    const dark = isDark(settings.theme);
    const { c, h } = hexToOklch(seed);
    root.style.setProperty('--h', h.toFixed(1));
    root.style.setProperty('--c', Math.min(0.16, Math.max(0.025, c)).toFixed(3));
    root.dataset.scheme = dark ? 'dark' : 'light';

    // exact Material Theme Builder scheme for the default blue, tonal approximation for everything else
    applied.forEach((k) => root.style.removeProperty(k));
    applied = [];
    const exact = EXACT[seed.toLowerCase()];
    if (exact) {
      const scheme = exact[dark ? 'dark' : 'light'];
      Object.keys(scheme).forEach((k) => { root.style.setProperty(k, scheme[k]); applied.push(k); });
    }

    root.style.setProperty('--font', fontById(settings.font).stack);
    if (appWindow && appWindow.setTheme) {
      Promise.resolve(appWindow.setTheme(settings.theme === 'system' ? null : settings.theme)).catch(() => {});
    }
  }

  return {
    PALETTE, FONTS, DEFAULT_SEED, apply, fontById,
    onSystemChange(cb) { mq.addEventListener('change', cb); }
  };
})();
