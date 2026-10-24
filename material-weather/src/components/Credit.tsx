import { cn } from './ui/cn';

/** Author credit: `minhtrong67` x `Claude` (highlighted). */
export function Credit({ big = false, className }: { big?: boolean; className?: string }) {
  const pill = cn('rounded-full font-bold', big ? 'px-4 py-1 text-lg' : 'px-2 py-px');
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn(pill, 'bg-primary-container text-on-primary-container')}>minhtrong67</span>
      <span className="text-on-surface-variant">×</span>
      <span className={cn(pill, 'bg-gradient-to-r from-[#d97757] to-[#c15f3c] text-white')}>Claude</span>
    </span>
  );
}
