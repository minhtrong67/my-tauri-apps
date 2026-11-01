// Material 3 Expressive shape library (polar approximations) + a tiny morph helper.
// Every shape is sampled at N points so any two shapes can be interpolated smoothly.
const N = 96;
const TAU = Math.PI * 2;

const poly = (k, a) => (th) => 1 + a * Math.cos(k * th); // scalloped "cookie" / "burst" family
const squircle = (n) => (th) => Math.pow(Math.pow(Math.abs(Math.cos(th)), n) + Math.pow(Math.abs(Math.sin(th)), n), -1 / n);

export const SHAPES = {
  circle: () => 1,
  squircle: squircle(4.2),
  cookie9: poly(9, 0.075),
  cookie6: poly(6, 0.105),
  cookie4: (th) => 0.9 + 0.14 * Math.pow(Math.abs(Math.cos(2 * th)), 0.8),
  sunny: poly(8, 0.11),
  burst: poly(12, 0.06),
  clover: (th) => 0.78 + 0.22 * Math.abs(Math.cos(2 * th)),
  flower: poly(5, 0.13),
  pentagon: (th) => Math.cos(Math.PI / 5) / Math.cos(((th + Math.PI / 2) % (TAU / 5)) - Math.PI / 5) * 1.0,
};

const cache = new Map();
/** Radii (0..~1.2) for a named shape, N samples. */
export function radii(name) {
  if (!cache.has(name)) {
    const f = SHAPES[name] || SHAPES.circle;
    const r = [];
    for (let i = 0; i < N; i++) r.push(f((i / N) * TAU - Math.PI / 2));
    const m = Math.max(...r);
    cache.set(name, r.map((v) => v / m));
  }
  return cache.get(name);
}

/** SVG path data for radii `r`, centred at (c,c) with outer radius `rad`. Uses a smooth closed curve. */
export function pathFor(r, c = 50, rad = 48) {
  const pts = r.map((v, i) => {
    const th = (i / N) * TAU - Math.PI / 2;
    return [c + Math.cos(th) * v * rad, c + Math.sin(th) * v * rad];
  });
  // Catmull-Rom → cubic Bézier for a smooth outline
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(2)} ${c1[1].toFixed(2)} ${c2[0].toFixed(2)} ${c2[1].toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d + 'Z';
}

const lerpR = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Continuously morphs `path` (an SVG <path>) through `names`. Returns a stop() function.
 * Pass { hold, morph } in ms. With reduced motion the shape just stays still.
 */
export function morphLoop(path, names, { hold = 1400, morph = 900, spin = 0, svg = null } = {}) {
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let i = 0, raf = 0, stopped = false;
  path.setAttribute('d', pathFor(radii(names[0])));
  if (reduce || names.length < 2) return () => {};
  let t0 = performance.now();
  const step = (now) => {
    if (stopped) return;
    const from = radii(names[i % names.length]);
    const to = radii(names[(i + 1) % names.length]);
    const el = now - t0;
    if (el < hold) { /* resting */ } else if (el < hold + morph) {
      path.setAttribute('d', pathFor(lerpR(from, to, ease((el - hold) / morph))));
    } else { i++; t0 = now; path.setAttribute('d', pathFor(to)); }
    if (spin && svg) svg.style.transform = `rotate(${(now / 1000) * spin}deg)`;
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  const vis = () => { if (document.hidden) cancelAnimationFrame(raf); else if (!stopped) { t0 = performance.now(); raf = requestAnimationFrame(step); } };
  document.addEventListener('visibilitychange', vis);
  return () => { stopped = true; cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', vis); };
}

/** A ready-made <svg> element showing a (morphing) shape filled with currentColor. */
export function shapeSvg(names, opts = {}) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('fill', 'currentColor');
  svg.append(p);
  const stop = morphLoop(p, names, { ...opts, svg: opts.spin ? svg : null });
  return { svg, stop };
}
