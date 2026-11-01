// Prints CSS linear() easings that approximate the M3 Expressive spring motion tokens.
function spring(stiffness, damping, mass = 1) {
  const w0 = Math.sqrt(stiffness / mass), zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const wd = w0 * Math.sqrt(Math.max(0, 1 - zeta * zeta));
  const f = (t) => zeta < 1 ? 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + (zeta * w0 / wd) * Math.sin(wd * t)) : 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  let T = 0.01; for (let t = 0.01; t < 4; t += 0.005) if (Math.abs(1 - f(t)) > 0.004) T = t; T += 0.01;
  const pts = []; const N = 36;
  for (let i = 0; i <= N; i++) pts.push(+f((i / N) * T).toFixed(4));
  pts[N] = 1;
  return { ms: Math.round(T * 1000), css: `linear(${pts.join(', ')})` };
}
const tokens = { 'fast-spatial': [1400, 0.78], 'spatial': [700, 0.68], 'slow-spatial': [300, 0.62], 'fx': [3800, 1] };
for (const [k, [s, d]] of Object.entries(tokens)) {
  const damping = 2 * d * Math.sqrt(s);
  const r = spring(s, damping);
  console.log(`--sp-${k}: ${r.css}; --sp-${k}-d: ${r.ms}ms;`);
}
