import { useMemo } from "react";
import { cookiePath } from "../../lib/theme";

const WAVE = `url("data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='24' height='10' viewBox='0 0 24 10'><path d='M-2 5 Q4 -1.5 12 5 T26 5' fill='none' stroke='black' stroke-width='3' stroke-linecap='round'/></svg>")}")`;

/** Thanh tiến độ gợn sóng (Expressive). value: 0–100; indeterminate: chạy liên tục. */
export function WavyProgress({ value = 0, indeterminate, className = "" }: { value?: number; indeterminate?: boolean; className?: string }) {
  const w = indeterminate ? 100 : Math.max(2, Math.min(100, value));
  return (
    <div role="progressbar" aria-valuenow={indeterminate ? undefined : Math.round(value)} aria-valuemin={0} aria-valuemax={100} className={`relative h-[10px] w-full ${className}`}>
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-secondary-container" />
      <div className="absolute inset-y-0 left-0 overflow-hidden transition-[width] duration-500 ease-emph" style={{ width: `${w}%` }}>
        <div className="wavy w-full" style={{ ["--wave" as string]: WAVE, opacity: indeterminate ? 0.85 : 1 }} />
      </div>
    </div>
  );
}

let cached = "";
export const Cookie = ({ className = "", size = 24, style }: { className?: string; size?: number; style?: React.CSSProperties }) => {
  const d = useMemo(() => cached || (cached = cookiePath(100, 10, 0.05)), []);
  return <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={style} aria-hidden="true"><path d={d} fill="currentColor" /></svg>;
};

/** Loading indicator Expressive: hình cookie xoay và co giãn. */
export function LoadingIndicator({ size = 28, className = "" }: { size?: number; className?: string }) {
  return <Cookie size={size} className={`flex-none text-primary ${className}`} style={{ animation: "cookie-spin 1.6s cubic-bezier(.4,0,.2,1) infinite" }} />;
}
