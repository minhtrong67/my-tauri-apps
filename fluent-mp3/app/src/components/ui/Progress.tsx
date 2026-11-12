/** ProgressBar của Fluent: thanh mảnh 4px, đầy theo giá trị hoặc chạy liên tục (indeterminate). */
export function ProgressBar({ value = 0, indeterminate, className = "", error }: { value?: number; indeterminate?: boolean; className?: string; error?: boolean }) {
  const w = Math.max(0, Math.min(100, value));
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={indeterminate ? undefined : Math.round(w)}
      className={`relative h-1 w-full overflow-hidden rounded-full bg-track ${className}`}>
      {indeterminate ? (<>
        <div className="absolute inset-y-0 rounded-full bg-acc" style={{ animation: "indet1 2s cubic-bezier(.65,.815,.735,.395) infinite" }} />
        <div className="absolute inset-y-0 rounded-full bg-acc" style={{ animation: "indet2 2s cubic-bezier(.165,.84,.44,1) 1.05s infinite" }} />
      </>) : <div className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-200 ease-out ${error ? "bg-err" : "bg-acc"}`} style={{ width: `${w}%` }} />}
    </div>
  );
}

/** ProgressRing của Fluent: cung tròn co giãn và xoay. */
export function ProgressRing({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} role="progressbar" aria-label="Loading" className={`flex-none text-acc ${className}`}>
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" pathLength={100}
        style={{ transformOrigin: "50% 50%", animation: "ring 2s cubic-bezier(.4,0,.2,1) infinite" }} />
    </svg>
  );
}
