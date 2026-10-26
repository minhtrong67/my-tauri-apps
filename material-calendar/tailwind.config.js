const v = (n) => `var(--${n})`;
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/index.html', './app/src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: { sans: ['var(--font)'] },
      colors: {
        primary: v('primary'), onp: v('on-primary'), pc: v('primary-container'), onpc: v('on-primary-container'),
        sc: v('secondary-container'), onsc: v('on-secondary-container'), surface: v('surface'), card: v('card'),
        low: v('surface-low'), cont: v('surface-container'), high: v('surface-container-high'),
        on: v('on-surface'), variant: v('on-surface-variant'), outline: v('outline'), ov: v('outline-variant'),
        inv: v('inverse'), invon: v('inverse-on'),
      },
    },
  },
};
