/** Material 3 Expressive wavy progress bar (determinate when `value` is given, otherwise full wave). */
export function WavyProgress({ value, className = '' }: { value?: number; className?: string }) {
  const pct = value === undefined ? 100 : Math.max(2, Math.min(100, value));
  return (
    <div className={`wavy ${className}`} role="progressbar" aria-valuenow={value === undefined ? undefined : Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="track" />
      <div className="fill" style={{ width: pct + '%' }}>
        <svg aria-hidden preserveAspectRatio="none"><defs><pattern id="wv" width="28" height="14" patternUnits="userSpaceOnUse"><path d="M0 7 Q7 0.5 14 7 T28 7" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></pattern></defs><rect width="100%" height="14" fill="url(#wv)" /></svg>
      </div>
    </div>
  );
}
export const Loader = ({ small }: { small?: boolean }) => <span className={`m3-loader ${small ? 'sm' : ''}`} role="status" aria-label="Loading" />;
