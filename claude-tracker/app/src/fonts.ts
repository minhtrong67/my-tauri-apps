import type { FontFamilyId } from "./prefs";

/** Phông chữ lựa chọn được. "system" dùng phông hệ thống (mặc định); các phông còn lại được đóng gói sẵn (hỗ trợ tiếng Việt). */
export const FONT_FAMILIES: { id: FontFamilyId; name: string; css: string }[] = [
  { id: "system", name: "System UI", css: '"Segoe UI Variable Text","Segoe UI",system-ui,-apple-system,sans-serif' },
  { id: "roboto", name: "Roboto", css: '"Roboto",system-ui,sans-serif' },
  { id: "inter", name: "Inter", css: '"Inter Variable",system-ui,sans-serif' },
  { id: "vietnam", name: "Be Vietnam Pro", css: '"Be Vietnam Pro",system-ui,sans-serif' },
  { id: "noto", name: "Noto Sans", css: '"Noto Sans Variable",system-ui,sans-serif' },
  { id: "opensans", name: "Open Sans", css: '"Open Sans Variable",system-ui,sans-serif' },
];
