import { forwardRef, useEffect, type ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import type { Tone } from "../../store/ui";

/* One delegated listener adds the Material ripple to every `.ripple` element. */
export function useRipple() {
  useEffect(() => {
    const down = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.(".ripple") as HTMLElement | null;
      if (!el || e.button !== 0) return;
      const r = el.getBoundingClientRect();
      const size = Math.hypot(Math.max(e.clientX - r.left, r.right - e.clientX), Math.max(e.clientY - r.top, r.bottom - e.clientY)) * 2;
      const wave = document.createElement("span");
      wave.className = "ripple-wave";
      wave.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      el.appendChild(wave);
      wave.addEventListener("animationend", () => wave.remove(), { once: true });
    };
    document.addEventListener("pointerdown", down, { passive: true });
    return () => document.removeEventListener("pointerdown", down);
  }, []);
}

const toneClass: Record<Tone, string> = {
  primary: "btn-filled",
  tonal: "btn-tonal",
  danger: "btn-danger",
  success: "btn-success",
  neutral: "btn-neutral",
  text: "btn-text",
};

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone | "outlined";
  icon?: LucideIcon;
  small?: boolean;
}

/** Action button: always a label, usually an icon, and a colour that says what it does. */
export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { tone = "primary", icon: Icon, small, className, children, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn("btn ripple", tone === "outlined" ? "btn-outlined" : toneClass[tone], small && "btn-sm", className)}
      {...rest}
    >
      {Icon && <Icon size={small ? 16 : 18} strokeWidth={2.2} aria-hidden />}
      <span>{children}</span>
    </button>
  );
});

interface IconBtnProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  icon: LucideIcon;
  label: string;
  kbd?: string;
  small?: boolean;
  tonal?: boolean;
  pressed?: boolean;
  tipPos?: "top" | "bottom";
  iconSize?: number;
}

/** Icon-only button. Always carries a tooltip (and an aria-label) through `label`. */
export const IconButton = forwardRef<HTMLButtonElement, IconBtnProps>(function IconButton(
  { icon: Icon, label, kbd, small, tonal, pressed, tipPos, iconSize, className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      aria-pressed={pressed}
      data-tip={label}
      data-kbd={kbd}
      data-tip-pos={tipPos}
      className={cn("icon-btn ripple", small && "icon-btn-sm", tonal && "icon-btn-tonal", className)}
      {...rest}
    >
      <Icon size={iconSize ?? (small ? 17 : 20)} strokeWidth={2.1} aria-hidden />
    </button>
  );
});
