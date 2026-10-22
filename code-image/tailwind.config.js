const c = (n) => `rgb(var(--md-${n}) / <alpha-value>)`;
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', '-apple-system', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      colors: {
        primary: c("primary"), "on-primary": c("on-primary"),
        "primary-container": c("primary-container"), "on-primary-container": c("on-primary-container"),
        secondary: c("secondary"), "on-secondary": c("on-secondary"),
        "secondary-container": c("secondary-container"), "on-secondary-container": c("on-secondary-container"),
        tertiary: c("tertiary"), "tertiary-container": c("tertiary-container"), "on-tertiary-container": c("on-tertiary-container"),
        error: c("error"), "error-container": c("error-container"), "on-error-container": c("on-error-container"),
        surface: c("surface"), "on-surface": c("on-surface"), "on-surface-variant": c("on-surface-variant"),
        "surface-dim": c("surface-dim"),
        "surface-low": c("surface-low"), "surface-container": c("surface-container"),
        "surface-high": c("surface-high"), "surface-highest": c("surface-highest"),
        outline: c("outline"), "outline-variant": c("outline-variant"),
        "inverse-surface": c("inverse-surface"), "inverse-on-surface": c("inverse-on-surface"),
      },
      borderRadius: { m3: "12px", m3l: "16px", m3xl: "28px" },
      boxShadow: {
        e1: "0 1px 2px rgb(0 0 0 / .18), 0 1px 3px 1px rgb(0 0 0 / .1)",
        e2: "0 1px 2px rgb(0 0 0 / .18), 0 2px 6px 2px rgb(0 0 0 / .1)",
        e3: "0 4px 8px 3px rgb(0 0 0 / .12), 0 1px 3px rgb(0 0 0 / .2)",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        rise: { from: { opacity: 0, transform: "translateY(10px) scale(.98)" }, to: { opacity: 1, transform: "none" } },
        slideIn: { from: { opacity: 0, transform: "translateX(24px)" }, to: { opacity: 1, transform: "none" } },
        toast: { from: { opacity: 0, transform: "translateY(16px)" }, to: { opacity: 1, transform: "none" } },
        spin360: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        fadeIn: "fadeIn .2s ease-out both",
        rise: "rise .32s cubic-bezier(.2,0,0,1) both",
        slideIn: "slideIn .3s cubic-bezier(.2,0,0,1) both",
        toast: "toast .25s cubic-bezier(.2,0,0,1) both",
        gear: "spin360 .6s cubic-bezier(.2,0,0,1)",
      },
    },
  },
  plugins: [],
};
