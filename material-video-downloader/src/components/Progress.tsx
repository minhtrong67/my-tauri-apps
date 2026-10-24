import { cx } from "./ui";
import type { Status } from "../lib/types";

/** Wavy while data is flowing, a calm straight line otherwise. */
export function Progress({ value, status }: { value: number; status: Status }) {
  const pct = Math.max(0, Math.min(100, value));
  const active = status === "downloading";
  const merging = status === "merging";
  const color = status === "failed" ? "bg-error" : status === "paused" || status === "queued" ? "bg-outline" : "bg-primary";

  return (
    <div className="relative h-3 w-full" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-secondary-container">
        {merging && <div className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-primary" style={{ animation: "indeterminate 1.3s var(--ease-emphasized) infinite" }} />}
      </div>
      {!merging && (
        <div
          className={cx("absolute left-0 transition-[width] duration-500 ease-emphasized", color, active ? "wavy top-0 h-3" : "top-1/2 h-1 -translate-y-1/2 rounded-full")}
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  );
}
