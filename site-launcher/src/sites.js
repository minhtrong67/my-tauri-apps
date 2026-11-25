// Mỗi lượt mở tối đa 5 trang web (mỗi trang một tab)
export const MAX_SITES = 5;
export const SEED_URL = "https://claude.ai/new";

// "" nếu rỗng, null nếu sai, còn lại trả về địa chỉ đầy đủ (tự thêm https://)
export function normalizeUrl(raw) {
  const s = (raw || "").trim();
  if (!s) return "";
  const full = /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(full);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".") && u.hostname !== "localhost") return null;
    return full;
  } catch {
    return null;
  }
}

const parse = (url) => {
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`);
  } catch {
    return null;
  }
};

export const hostOf = (url) => parse(url)?.hostname.replace(/^www\./, "") || url;

// "claude.ai/new": tên miền kèm đường dẫn ngắn
export const labelOf = (url) => {
  const u = parse(url);
  if (!u) return url;
  const path = u.pathname === "/" ? "" : u.pathname;
  return u.hostname.replace(/^www\./, "") + path;
};

// Băm FNV-1a: dùng để chọn tông màu ổn định theo tên
export const hueOf = (s) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};
export const letterOf = (url) => hostOf(url).charAt(0).toUpperCase();

// Danh sách hợp lệ: bỏ địa chỉ sai và trùng, tối đa MAX_SITES
export const cleanUrls = (list) => {
  const out = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const u = normalizeUrl(typeof raw === "string" ? raw : raw?.url);
    if (u && !out.includes(u)) out.push(u);
  }
  return out.slice(0, MAX_SITES);
};
