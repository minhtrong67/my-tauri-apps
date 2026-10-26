import { LOGO_INNER } from "../lib/logo-art";

/** The app icon (same artwork as the generated desktop icons), usable at any size. */
export function AppLogo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      className={className}
      role="img"
      aria-label="Material Theme Builder"
      dangerouslySetInnerHTML={{ __html: LOGO_INNER }}
    />
  );
}
