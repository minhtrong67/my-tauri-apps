export function Logo({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" aria-hidden="true" className="logo">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FF6F60" /><stop offset="1" stopColor="#D32F2F" /></linearGradient>
      </defs>
      <rect width="1024" height="1024" rx="230" fill="url(#lg)" />
      <path d="M292 180H612L732 300V844H292Z" fill="#fff" />
      <path d="M612 180V300H732Z" fill="#FFCDD2" />
      <rect x="350" y="380" width="320" height="28" rx="14" fill="#FFCDD2" />
      <rect x="350" y="440" width="260" height="28" rx="14" fill="#FFCDD2" />
      <rect x="350" y="500" width="300" height="28" rx="14" fill="#FFCDD2" />
      <rect x="212" y="620" width="420" height="170" rx="40" fill="#B71C1C" />
      <g fill="none" stroke="#fff" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round">
        <path d="M262 760V650H300a29 29 0 0 1 0 58H262" />
        <path d="M372 650V760H398a55 55 0 0 0 0-110Z" />
        <path d="M580 650H510V760M510 705H568" />
      </g>
    </svg>
  );
}
