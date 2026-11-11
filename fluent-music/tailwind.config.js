const names = [
  'primary', 'on-primary', 'primary-container', 'on-primary-container',
  'secondary', 'on-secondary', 'secondary-container', 'on-secondary-container',
  'tertiary', 'on-tertiary', 'tertiary-container', 'on-tertiary-container',
  'error', 'on-error', 'error-container', 'on-error-container',
  'success', 'success-container', 'warning', 'warning-container',
  'surface', 'surface-dim', 'surface-bright', 'surface-variant',
  'surface-container-lowest', 'surface-container-low', 'surface-container',
  'surface-container-high', 'surface-container-highest',
  'on-surface', 'on-surface-variant', 'outline', 'outline-variant',
  'inverse-surface', 'inverse-on-surface', 'inverse-primary',
];
const colors = Object.fromEntries(names.map((n) => [n, `rgb(var(--fl-${n}) / <alpha-value>)`]));
// translucent Fluent fills (already carry their own alpha)
Object.assign(colors, {
  subtle: 'var(--fl-subtle-hover)',
  'subtle-2': 'var(--fl-subtle-active)',
  ctl: 'var(--fl-ctl)',
  'ctl-hover': 'var(--fl-ctl-hover)',
  card: 'var(--fl-card)',
  'card-hover': 'var(--fl-card-hover)',
  'card-stroke': 'var(--fl-card-stroke)',
  divider: 'var(--fl-divider)',
  layer: 'var(--fl-layer)',
  smoke: 'var(--fl-smoke)',
});

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors,
      fontFamily: { sans: ['var(--app-font)'] },
      // Windows 11 type ramp: Caption 12 · Body 14 · Body strong 14/600 · Subtitle 20 · Title 28 · Title large 40
      fontSize: {
        'display-sm': ['40px', { lineHeight: '52px', fontWeight: '600' }],
        'headline-lg': ['28px', { lineHeight: '36px', fontWeight: '600' }],
        'headline-md': ['28px', { lineHeight: '36px', fontWeight: '600' }],
        'headline-sm': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'title-lg': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'title-md': ['16px', { lineHeight: '22px', fontWeight: '600' }],
        'title-sm': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'body-lg': ['14px', { lineHeight: '20px' }],
        'body-md': ['13px', { lineHeight: '18px' }],
        'body-sm': ['12px', { lineHeight: '16px' }],
        'label-lg': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'label-md': ['12px', { lineHeight: '16px', fontWeight: '600' }],
      },
      // Fluent 2: 4px controls, 8px cards / overlays. Larger legacy steps collapse onto 8px.
      borderRadius: { lg: '4px', xl: '6px', '2xl': '8px', '3xl': '8px', 'm3-xl': '8px' },
      transitionDuration: { fast: '83ms', normal: '167ms', slow: '250ms', slower: '333ms' },
      transitionTimingFunction: { emphasized: 'var(--ease-decel)', decel: 'var(--ease-decel)', fluent: 'var(--ease-std)' },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.97) translateY(-4px)' }, to: { opacity: '1', transform: 'none' } },
        'dialog-in': { from: { opacity: '0', transform: 'scale(1.05)' }, to: { opacity: '1', transform: 'none' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(24px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-left': { from: { transform: 'translateX(32px)', opacity: '0' }, to: { transform: 'translateX(0)', opacity: '1' } },
        rise: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'card-in': { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pop: { from: { transform: 'scale(0.6)', opacity: '0' }, to: { transform: 'scale(1)', opacity: '1' } },
      },
      animation: {
        'fade-in': 'fade-in var(--dur-slow) linear',
        'scale-in': 'scale-in var(--dur-normal) var(--ease-decel)',
        'dialog-in': 'dialog-in var(--dur-slow) var(--ease-decel)',
        'slide-up': 'slide-up var(--dur-slower) var(--ease-decel)',
        'slide-left': 'slide-left var(--dur-slower) var(--ease-decel)',
        rise: 'rise var(--dur-slower) var(--ease-decel) both',
        'card-in': 'card-in var(--dur-slower) var(--ease-decel) both',
        pop: 'pop var(--dur-slow) var(--ease-decel) both',
      },
    },
  },
  plugins: [],
};
