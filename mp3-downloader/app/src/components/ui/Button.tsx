import type { ButtonHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";
import { ripple } from "./ripple";
import { Tooltip } from "./Tooltip";

export type Variant = "filled" | "tonal" | "outlined" | "text" | "error" | "errorTonal" | "success";
const V: Record<Variant, string> = {
  filled: "bg-primary text-on-primary hover:shadow-e1",
  tonal: "bg-secondary-container text-on-secondary-container",
  outlined: "border border-outline text-primary",
  text: "text-primary",
  error: "bg-error text-on-error hover:shadow-e1",
  errorTonal: "bg-error-container text-on-error-container",
  success: "bg-success text-on-success hover:shadow-e1",
};
const SZ = { sm: "h-9 px-4 text-sm gap-1.5", md: "h-10 px-6 text-sm gap-2", lg: "h-14 px-8 text-base gap-2.5" };

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: keyof typeof SZ; icon?: LucideIcon }
/** Nút Expressive: hình dạng "biến hình" (pill → bo vuông) khi nhấn, luôn có icon + nhãn. */
export function Button({ variant = "filled", size = "md", icon: Icon, children, className = "", ...p }: Props) {
  return (
    <button type="button" onPointerDown={ripple} {...p}
      className={`state-layer inline-flex flex-none select-none items-center justify-center whitespace-nowrap rounded-full font-semibold transition-[border-radius,transform,box-shadow,background-color,color] duration-300 ease-spring active:scale-[.96] active:rounded-m3-md disabled:pointer-events-none disabled:bg-on-surface/10 disabled:text-on-surface/40 disabled:shadow-none ${SZ[size]} ${V[variant]} ${className}`}>
      {Icon && <Icon className={size === "lg" ? "h-6 w-6" : "h-[18px] w-[18px]"} strokeWidth={2.2} />}
      {children}
    </button>
  );
}

interface IProps extends ButtonHTMLAttributes<HTMLButtonElement> { icon: LucideIcon; label: string; tone?: "standard" | "tonal" | "filled" | "danger"; active?: boolean; small?: boolean }
const IT = {
  standard: "text-on-surface-variant", tonal: "bg-secondary-container text-on-secondary-container",
  filled: "bg-primary text-on-primary", danger: "text-error",
};
/** Nút icon có tooltip tuỳ chỉnh + aria-label. */
export function IconButton({ icon: Icon, label, tone = "standard", active, small, className = "", ...p }: IProps) {
  return (
    <Tooltip label={label}>
      <button type="button" aria-label={label} onPointerDown={ripple} {...p}
        className={`state-layer grid flex-none place-items-center rounded-full transition-[border-radius,transform,background-color] duration-300 ease-spring active:scale-90 active:rounded-m3-sm disabled:opacity-40 ${small ? "h-8 w-8" : "h-10 w-10"} ${active ? "bg-secondary-container text-on-secondary-container" : IT[tone]} ${className}`}>
        <Icon className={small ? "h-4 w-4" : "h-5 w-5"} strokeWidth={2.2} />
      </button>
    </Tooltip>
  );
}
