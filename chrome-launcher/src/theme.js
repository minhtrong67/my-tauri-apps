import theme from "../material-theme.json";

// primaryContainer -> --md-primary-container
const kebab = (k) => k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
const block = (sel, scheme) =>
  `${sel}{${Object.entries(scheme)
    .map(([k, v]) => `--md-${kebab(k)}:${v}`)
    .join(";")}}`;

// Sinh biến màu cho sáng/tối và các mức tương phản từ file Material Theme Builder
export default function themeCss() {
  const out = [];
  for (const [name, scheme] of Object.entries(theme.schemes)) {
    const m = name.match(/^(light|dark)(?:-(medium|high)-contrast)?$/);
    if (!m) continue;
    const contrast = m[2] ? `[data-contrast="${m[2]}"]` : "";
    out.push(block(`:root[data-theme="${m[1]}"]${contrast}`, scheme));
  }
  return out.join("\n");
}
