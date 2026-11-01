import { cookiePath } from '../lib/shapes';

const COOKIE = cookiePath(50, 50, 45, 12, 3.6);
const COOKIE_SOFT = cookiePath(50, 50, 45, 8, 5);
export const Cookie = ({ className, soft = false }: { className?: string; soft?: boolean }) => (
  <svg className={className} viewBox="0 0 100 100" aria-hidden="true"><path d={soft ? COOKIE_SOFT : COOKIE} fill="currentColor" /></svg>
);

/** App mark, painted with the live theme colours. The icon files use the same drawing with fixed colours. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <path d={COOKIE} fill="var(--md-primary)" />
      <rect x="27" y="25" width="46" height="52" rx="13" fill="var(--md-primary-container)" />
      <path d="M33 62V40l9 11.5L51 40v22M64 40v21M58.5 55.5 64 61l5.5-5.5" fill="none" stroke="var(--md-on-primary-container)" strokeWidth="5.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="73" cy="27" r="7.5" fill="var(--md-tertiary)" />
    </svg>
  );
}
