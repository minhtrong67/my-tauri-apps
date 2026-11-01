// The app logo (cookie-shaped table with a pencil), inlined so it follows no external asset.
export function Logo({ size = 40, className = '', small = false }: { size?: number; className?: string; small?: boolean }) {
  return <img src={small ? '/logo-small.svg' : '/favicon.svg'} width={size} height={size} alt="" draggable={false} className={className} />;
}
