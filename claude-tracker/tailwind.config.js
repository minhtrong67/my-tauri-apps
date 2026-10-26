/** Tailwind dùng chung token Material 3 từ CSS variables (xem app/src/styles.css). Preflight tắt để không đè style nền. */
export default {
  content: ["./app/index.html", "./app/src/**/*.{ts,tsx}"],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        "on-primary": "var(--on-primary)",
        "primary-c": "var(--primary-c)",
        "on-primary-c": "var(--on-primary-c)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        fg: "var(--text)",
        muted: "var(--muted)",
        ok: "var(--ok)",
        warn: "var(--warn)",
        danger: "var(--danger)",
      },
      borderRadius: { sm2: "var(--r-sm)", md2: "var(--r-md)", lg2: "var(--r-lg)", xl2: "var(--r-xl)" },
      transitionTimingFunction: { emph: "var(--ease)", spring: "var(--spring)" },
      boxShadow: { e1: "var(--shadow-1)", e2: "var(--shadow-2)" },
    },
  },
};
