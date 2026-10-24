import { useMemo, type ReactNode } from "react";

/** Material 3 Expressive-style organic shapes: r(θ) = 1 + a·cos(n·θ), drawn as a smooth polygon. */
const SHAPES = { cookie: [9, 0.07], flower: [6, 0.15], clover: [4, 0.2], sunny: [12, 0.05], gem: [5, 0.11] } as const;
export type ShapeKind = keyof typeof SHAPES;
const cache = new Map<ShapeKind, string>();
const points = (k: ShapeKind) => {
  let v = cache.get(k);
  if (!v) {
    const [n, a] = SHAPES[k], out: string[] = [];
    for (let i = 0; i < 180; i++) {
      const th = (i / 180) * Math.PI * 2, r = (48 * (1 + a * Math.cos(n * th))) / (1 + a);
      out.push(`${(50 + r * Math.cos(th)).toFixed(2)},${(50 + r * Math.sin(th)).toFixed(2)}`);
    }
    cache.set(k, (v = out.join(" ")));
  }
  return v;
};

export function Shape({ kind = "cookie", size = 56, tone = "primary", spin = false, children }: {
  kind?: ShapeKind; size?: number; tone?: "primary" | "secondary" | "tertiary" | "solid"; spin?: boolean; children?: ReactNode;
}) {
  const pts = useMemo(() => points(kind), [kind]);
  return (
    <span className={`shape t-${tone} ${spin ? "spin" : ""}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden="true"><polygon points={pts} /></svg>
      <span className="shape-in">{children}</span>
    </span>
  );
}
