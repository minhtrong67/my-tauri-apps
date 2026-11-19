/** Fluent ProgressBar: determinate when `value` is given, otherwise indeterminate. */
export function ProgressBar({ value, className = '' }: { value?: number; className?: string }) {
  const pct = value === undefined ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className={`f-bar ${value === undefined ? 'indet' : ''} ${className}`} role="progressbar" aria-valuenow={value === undefined ? undefined : Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      {value !== undefined && <i style={{ width: pct + '%' }} />}
    </div>
  );
}
/** Fluent ProgressRing (indeterminate). */
export const Loader = ({ small }: { small?: boolean }) => (
  <svg className={`f-ring ${small ? 'sm' : ''}`} viewBox="0 0 48 48" role="status" aria-label="Loading"><circle cx="24" cy="24" r="20" pathLength="100" /></svg>
);
