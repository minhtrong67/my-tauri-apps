import { useId } from "react";
import { COOKIE_PATH } from "../lib/logo-art";

/** The app icon (same artwork as the generated desktop icons), usable at any size. */
export function AppLogo({ size = 40, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" className={className} role="img" aria-label="Material Theme Builder">
      <defs>
        <linearGradient id={`bg${id}`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#9A82DB" />
          <stop offset="1" stopColor="#4F378B" />
        </linearGradient>
        <radialGradient id={`hl${id}`} cx="0.3" cy="0.2" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity="0.34" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={COOKIE_PATH} fill={`url(#bg${id})`} />
      <path d={COOKIE_PATH} fill={`url(#hl${id})`} />
      <rect x="262" y="262" width="232" height="232" rx="82" fill="#EADDFF" />
      <circle cx="640" cy="378" r="118" fill="#D0BCFF" />
      <g fill="#FFD8E4">
        <circle cx="324" cy="592" r="58" />
        <circle cx="432" cy="592" r="58" />
        <circle cx="324" cy="700" r="58" />
        <circle cx="432" cy="700" r="58" />
        <rect x="324" y="592" width="108" height="108" />
      </g>
      <rect x="534" y="534" width="212" height="212" rx="56" transform="rotate(45 640 640)" fill="#CCC2DC" />
    </svg>
  );
}
