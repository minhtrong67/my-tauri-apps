/** Token Fluent Design 2 (WinUI 3): màu trung tính theo chủ đề sáng/tối + màu nhấn do lib/theme.ts gán. */
const rgb = (n) => `rgb(var(--${n}) / <alpha-value>)`;
const v = (n) => `var(--${n})`;
export default {
  content: ["./app/index.html", "./app/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        acc: rgb("acc"), "acc-text": rgb("acc-text"), "on-acc": rgb("on-acc"),
        ok: rgb("ok"), warn: rgb("warn"), err: rgb("err"),
        fg: v("t1"), "fg-2": v("t2"), "fg-3": v("t3"), "fg-d": v("td"),
        ctl: v("ctl"), "ctl-h": v("ctl-h"), "ctl-p": v("ctl-p"), "ctl-d": v("ctl-d"),
        hov: v("hov"), prs: v("prs"),
        card: v("card"), "card-h": v("card-h"), "card-line": v("card-line"),
        layer: v("layer"), solid: v("solid"), flyout: v("flyout"), "flyout-line": v("flyout-line"),
        line: v("line"), stroke: v("stroke"), "stroke-b": v("stroke-b"), strong: v("strong"), track: v("track"),
        "ok-bg": v("ok-bg"), "warn-bg": v("warn-bg"), "err-bg": v("err-bg"), "info-bg": v("info-bg"), smoke: v("smoke"),
      },
      fontFamily: { sans: ["var(--font)"] },
      fontSize: {
        cap: ["0.75rem", "1rem"], body: ["0.875rem", "1.25rem"], lead: ["1rem", "1.5rem"],
        subtitle: ["1.25rem", "1.75rem"], title: ["1.75rem", "2.25rem"],
      },
      borderRadius: { ctl: "4px", ovl: "8px" },
      boxShadow: {
        fly: "0 8px 16px rgb(0 0 0 / .14), 0 0 2px rgb(0 0 0 / .12)",
        dlg: "0 32px 64px rgb(0 0 0 / .24), 0 0 8px rgb(0 0 0 / .12)",
        knob: "0 1px 2px rgb(0 0 0 / .18)",
      },
      transitionTimingFunction: { out: "cubic-bezier(0,0,0,1)", std: "cubic-bezier(.55,.55,0,1)" },
    },
  },
  plugins: [],
};
