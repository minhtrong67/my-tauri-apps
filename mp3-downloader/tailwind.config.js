/** Màu lấy từ biến CSS (dạng "r g b") do lib/theme.ts gán theo màu chủ đề Material 3 Expressive. */
const c = (n) => `rgb(var(--c-${n}) / <alpha-value>)`;
const names = ["primary","on-primary","primary-container","on-primary-container","secondary","on-secondary","secondary-container","on-secondary-container","tertiary","on-tertiary","tertiary-container","on-tertiary-container","error","on-error","error-container","on-error-container","surface","on-surface","on-surface-variant","outline","outline-variant","inverse-surface","inverse-on-surface","inverse-primary","surface-dim","surface-bright","surface-lowest","surface-low","surface-container","surface-high","surface-highest","success","on-success","success-container","on-success-container","warning","on-warning","warning-container","on-warning-container","info","on-info","info-container","on-info-container"];
export default {
  content: ["./app/index.html", "./app/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: Object.fromEntries(names.map((n) => [n, c(n)])),
      fontFamily: { sans: ["var(--font)"] },
      borderRadius: { "m3-sm": "10px", "m3-md": "16px", "m3-lg": "24px", "m3-xl": "32px", "m3-2xl": "44px" },
      transitionTimingFunction: { spring: "cubic-bezier(.34,1.56,.64,1)", emph: "cubic-bezier(.2,0,0,1)" },
      boxShadow: {
        e1: "0 1px 2px rgb(0 0 0 / .3), 0 1px 3px 1px rgb(0 0 0 / .15)",
        e2: "0 1px 2px rgb(0 0 0 / .3), 0 2px 6px 2px rgb(0 0 0 / .15)",
        e3: "0 4px 8px 3px rgb(0 0 0 / .15), 0 1px 3px rgb(0 0 0 / .3)",
      },
    },
  },
  plugins: [],
};
