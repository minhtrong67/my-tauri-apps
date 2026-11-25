import { hostOf, hueOf, letterOf } from "../sites.js";

// Ô chữ cái cho từng trang web (3 tông màu xoay vòng)
export default function Fav({ url, size = 24 }) {
  const tone = hueOf(hostOf(url)) % 3;
  return (
    <span className={`fav t${tone}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}>
      {letterOf(url)}
    </span>
  );
}
