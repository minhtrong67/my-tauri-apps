import { cn } from './cn';

/** Material 3 Expressive loading indicator: a shape that morphs (cookie → burst → flower → circle) while it spins. */
export function LoadingIndicator({ size = 48, className }: { size?: number; className?: string }) {
  return <span role="progressbar" aria-busy="true" style={{ width: size, height: size }} className={cn('loader-morph inline-block', className)} />;
}

/** Wavy indeterminate progress bar (Material 3 Expressive). */
export function WavyProgress({ className }: { className?: string }) {
  const d = 'M0 4 q6 -5 12 0' + ' t12 0'.repeat(80);
  return (
    <div role="progressbar" aria-busy="true" className={cn('h-2 w-full overflow-hidden', className)}>
      <svg width="2000" height="8" className="wavy block" aria-hidden="true">
        <path d={d} fill="none" stroke="var(--md-primary)" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}
