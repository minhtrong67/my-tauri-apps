// Hình học logo dùng chung: "cookie" 12 cánh (hình khối đặc trưng của Material 3 Expressive) + 3 cột mức dùng.
// Màu Claude: #D97757 (cam), #FAF9F5 (kem).
export const CLAUDE = "#D97757";
export const CREAM = "#FAF9F5";
export const COOKIE_PATH = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 360; i += 2) {
    const a = (i * Math.PI) / 180;
    const r = (488 * (1 + 0.04 * Math.cos(12 * a))) / 1.04;
    pts.push(`${(512 + r * Math.cos(a)).toFixed(1)} ${(512 + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
})();
