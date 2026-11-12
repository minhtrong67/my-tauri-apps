import type { ButtonHTMLAttributes } from "react";
import type { FluentIcon } from "@fluentui/react-icons";
import { Tooltip } from "./Tooltip";

export type Variant = "standard" | "accent" | "subtle" | "danger" | "link";
const V: Record<Variant, string> = {
  standard: "border border-stroke border-b-stroke-b bg-ctl text-fg hover:bg-ctl-h active:bg-ctl-p active:text-fg-2 disabled:border-stroke disabled:bg-ctl-d disabled:text-fg-d",
  accent: "border border-white/10 border-b-black/30 bg-acc text-on-acc hover:bg-acc/90 active:bg-acc/80 active:text-on-acc/70 disabled:border-stroke disabled:bg-ctl-d disabled:text-fg-d",
  subtle: "border border-transparent bg-transparent text-fg hover:bg-hov active:bg-prs active:text-fg-2 disabled:text-fg-d",
  danger: "border border-white/10 border-b-black/30 bg-err text-white hover:bg-err/90 active:bg-err/80 active:text-white/70 disabled:border-stroke disabled:bg-ctl-d disabled:text-fg-d",
  link: "border border-transparent bg-transparent text-acc-text hover:bg-hov active:bg-prs active:text-acc-text/70 disabled:text-fg-d",
};
const SZ = { sm: "h-7 gap-1.5 px-3 text-cap", md: "h-8 gap-2 px-4 text-body", lg: "h-10 gap-2 px-6 text-body" };

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: keyof typeof SZ; icon?: FluentIcon }
/** Button của Fluent: viền mảnh, đáy viền đậm hơn, hover/pressed bằng độ trong suốt. */
export function Button({ variant = "standard", size = "md", icon: Icon, children, className = "", ...p }: Props) {
  return (
    <button type="button" {...p}
      className={`inline-flex flex-none select-none items-center justify-center whitespace-nowrap rounded-ctl transition-colors duration-100 disabled:pointer-events-none ${SZ[size]} ${V[variant]} ${className}`}>
      {Icon && <Icon className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />}
      {children}
    </button>
  );
}

interface IProps extends ButtonHTMLAttributes<HTMLButtonElement> { icon: FluentIcon; label: string; tone?: "subtle" | "standard" | "accent" | "danger"; active?: boolean; small?: boolean }
const IT = {
  subtle: "border-transparent text-fg hover:bg-hov active:bg-prs active:text-fg-2",
  standard: "border-stroke border-b-stroke-b bg-ctl text-fg hover:bg-ctl-h active:bg-ctl-p",
  accent: "border-white/10 border-b-black/30 bg-acc text-on-acc hover:bg-acc/90 active:bg-acc/80",
  danger: "border-transparent text-err hover:bg-hov active:bg-prs",
};
/** Nút icon vuông có tooltip + aria-label. */
export function IconButton({ icon: Icon, label, tone = "subtle", active, small, className = "", ...p }: IProps) {
  return (
    <Tooltip label={label}>
      <button type="button" aria-label={label} aria-pressed={active} {...p}
        className={`grid flex-none place-items-center rounded-ctl border transition-colors duration-100 disabled:pointer-events-none disabled:opacity-40 ${small ? "h-7 w-7" : "h-8 w-8"} ${active ? "border-transparent bg-hov text-acc-text" : IT[tone]} ${className}`}>
        <Icon className={small ? "h-4 w-4" : "h-5 w-5"} />
      </button>
    </Tooltip>
  );
}
