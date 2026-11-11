// The app logo (a document with a Fluent table badge). `small` is a simplified mark for tiny sizes.
export function Logo({ size = 40, className = '', small = false }: { size?: number; className?: string; small?: boolean }) {
  return <img src={small ? '/logo-small.svg' : '/favicon.svg'} width={size} height={size} alt="" draggable={false} className={className} />;
}
