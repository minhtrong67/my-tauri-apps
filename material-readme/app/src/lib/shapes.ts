/** Scalloped "cookie" shape: the signature rounded-burst of Material 3 Expressive. */
export function cookiePath(cx = 50, cy = 50, R = 46, lobes = 12, amp = 3.4, steps = 180) {
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2, r = R + amp * Math.cos(lobes * a);
    d += (i ? 'L' : 'M') + (cx + r * Math.cos(a)).toFixed(2) + ' ' + (cy + r * Math.sin(a)).toFixed(2);
  }
  return d + 'Z';
}
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');
