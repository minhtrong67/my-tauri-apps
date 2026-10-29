const c = (n) => `rgb(var(--md-${n}) / <alpha-value>)`;
const names = [
  'primary', 'on-primary', 'primary-container', 'on-primary-container',
  'secondary', 'on-secondary', 'secondary-container', 'on-secondary-container',
  'tertiary', 'on-tertiary', 'tertiary-container', 'on-tertiary-container',
  'error', 'on-error', 'error-container', 'on-error-container',
  'surface', 'on-surface', 'surface-variant', 'on-surface-variant',
  'outline', 'outline-variant', 'inverse-surface', 'inverse-on-surface', 'inverse-primary',
  'scrim', 'panel', 'card',
  'success', 'on-success', 'success-container', 'on-success-container',
  'warning', 'on-warning', 'warning-container', 'on-warning-container',
];
const colors = Object.fromEntries(names.map((n) => [n, c(n)]));
Object.assign(colors, {
  'sc-lowest': c('surface-container-lowest'),
  'sc-low': c('surface-container-low'),
  sc: c('surface-container'),
  'sc-high': c('surface-container-high'),
  'sc-highest': c('surface-container-highest'),
});

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors,
      fontFamily: { sans: ['var(--app-font)'] },
      transitionTimingFunction: {
        spring: 'cubic-bezier(.34,1.56,.64,1)',
        emph: 'cubic-bezier(.2,0,0,1)',
      },
    },
  },
  plugins: [],
};
