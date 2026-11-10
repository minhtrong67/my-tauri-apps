import { forwardRef, type ButtonHTMLAttributes } from "react";
import type { IconType } from "./icons";
import { cn } from "../../lib/utils";
import type { Tone } from "../../store/ui";

/* Fluent button appearances:
 *   primary  -> accent (the one main action)      tonal / neutral -> standard
 *   danger / success -> status fills             text -> hyperlink-style subtle        outlined -> outline */
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
  icon?: IconType;
  small?: boolean;
}

/** Action button: always a label, usually an icon, and an appearance that says how important it is. */
export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { tone = "primary", icon: Icon, small, className, children, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn("btn", tone === "outlined" ? "btn-outlined" : toneClass[tone], small && "btn-sm", className)}
      {...rest}
    >
      {Icon && <Icon size={small ? 15 : 16} strokeWidth={1.75} aria-hidden />}
      <span>{children}</span>
    </button>
  );
});

interface IconBtnProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  icon: IconType;
  label: string;
  kbd?: string;
  small?: boolean;
  pressed?: boolean;
  tipPos?: "top" | "bottom";
  iconSize?: number;
}

/** Icon-only subtle button. Always carries a tooltip (and an aria-label) through `label`. */
export const IconButton = forwardRef<HTMLButtonElement, IconBtnProps>(function IconButton(
  { icon: Icon, label, kbd, small, pressed, tipPos, iconSize, className, type = "button", ...rest },
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
      className={cn("icon-btn", small && "icon-btn-sm", className)}
      {...rest}
    >
      <Icon size={iconSize ?? (small ? 16 : 20)} aria-hidden />
    </button>
  );
});
