import { hostOf, hueOf, letterOf } from "../sites.js";

// Ô chữ cái theo màu container của theme (3 tông xoay vòng)
export default function Fav({ url, size = 26 }) {
  const tone = hueOf(hostOf(url)) % 3;
  return (
    <span className={`fav t${tone}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.46) }}>
      {letterOf(url)}
    </span>
  );
}
