const c = (n) => `rgb(var(--c-${n}) / <alpha-value>)`
const names = ['primary','on-primary','primary-container','on-primary-container','secondary','on-secondary','secondary-container','on-secondary-container','tertiary','on-tertiary','tertiary-container','on-tertiary-container','error','on-error','error-container','on-error-container','background','on-background','surface','on-surface','surface-variant','on-surface-variant','outline','outline-variant','inverse-surface','inverse-on-surface','inverse-primary','surface-dim','surface-bright','surface-container-lowest','surface-container-low','surface-container','surface-container-high','surface-container-highest','scrim','success','on-success','success-container','on-success-container','warning','on-warning','warning-container','on-warning-container']
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: Object.fromEntries(names.map((n) => [n, c(n)])),
      fontFamily: { sans: ['var(--font-app)'], mono: ['"Cascadia Code"', 'Consolas', 'ui-monospace', 'monospace'] },
      borderRadius: { '4xl': '2rem', '5xl': '2.5rem' },
      transitionTimingFunction: { spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)', emph: 'cubic-bezier(0.2, 0, 0, 1)' },
      boxShadow: {
        e1: '0 1px 2px rgb(var(--c-shadow) / .22), 0 1px 3px 1px rgb(var(--c-shadow) / .12)',
        e2: '0 1px 2px rgb(var(--c-shadow) / .22), 0 2px 6px 2px rgb(var(--c-shadow) / .12)',
        e3: '0 4px 8px 3px rgb(var(--c-shadow) / .14), 0 1px 3px rgb(var(--c-shadow) / .24)',
      },
    },
  },
  plugins: [],
}
