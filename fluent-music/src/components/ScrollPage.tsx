import { useRef, type ReactNode } from 'react';
import { ScrollTop } from './ScrollTop';

/** A full-height scrolling page with the floating "back to top" button */
export function ScrollPage({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="h-full relative">
      <div ref={ref} className={`h-full overflow-y-auto ${className}`}>{children}</div>
      <ScrollTop target={ref} />
    </div>
  );
}
