const vi = {
  tagline: "Mở profile của nhiều trình duyệt cùng các trang web bạn chọn, chỉ với một cú click.",
  by: "Tác giả",
  withAi: "với sự hỗ trợ của AI",

  sitesTitle: "Trang web sẽ mở",
  sitesHint: ({ max }) => `Nhập địa chỉ hoặc chọn từ danh sách đã lưu. Tối đa ${max} trang, mỗi trang một tab.`,
  noSites: "Chưa chọn trang nào, chỉ mở profile.",
  placeholder: "Nhập địa chỉ hoặc chọn trang đã lưu",
  placeholderMore: "Thêm trang web",
  addSite: ({ url }) => `Thêm “${url}”`,
  savedSites: "Trang đã lưu",
  noSaved: "Chưa có trang nào được lưu. Nhập địa chỉ rồi nhấn Enter.",
  maxReached: ({ max }) => `Đã chọn tối đa ${max} trang. Bỏ chọn một trang để thêm trang khác.`,
  removeSite: "Bỏ chọn trang này",
  forget: "Xóa khỏi danh sách đã lưu",
  toggleList: "Hiện danh sách trang đã lưu",
  invalidUrl: "Địa chỉ không hợp lệ. Ví dụ: github.com hoặc https://example.com",
  clearSites: "Xóa hết",
  sitesCount: ({ n }) => `${n} trang`,

  browser: "Trình duyệt",
  noBrowsers: "Không tìm thấy trình duyệt nào được hỗ trợ.",
  noBrowsersHint: "Hãy cài Chrome, Edge, Brave, Vivaldi, Cốc Cốc hoặc Firefox.",
  firefoxNote: "Firefox không hiện tên profile trên cửa sổ, nên trạng thái “Đang mở” chỉ nhận diện cửa sổ do Site Launcher mở.",

  sitesOf: ({ name, n }) => `Các trang của ${name}: ${n}`,
  profileSitesTitle: ({ name }) => `Trang web cho ${name}`,
  useDefault: "Dùng các trang mặc định",
  useDefaultHint: ({ n }) => `Mở ${n} trang như thiết lập chung.`,
  customSites: "Trang riêng cho profile này",
  customHint: "Chỉ profile này dùng, không ảnh hưởng profile khác.",
  done: "Xong",

  search: "Tìm theo tên hoặc email",
  selectAll: "Chọn tất cả",
  clearSel: "Bỏ chọn",
  reload: "Tải lại",
  open: "Mở",
  close: "Đóng",
  running: "Đang mở",
  opening: "Đang khởi động",
  selectProfile: ({ name }) => `Chọn ${name}`,
  profiles: ({ n }) => `${n} profile`,
  selectedCount: ({ n, total }) => `Đã chọn ${n} / ${total}`,
  openSelected: ({ n }) => `Mở ${n} đã chọn`,
  openAll: ({ n }) => `Mở tất cả (${n})`,
  closeSelected: ({ n }) => `Đóng ${n} đã chọn`,
  closeAll: ({ n }) => `Đóng tất cả (${n})`,
  openedN: ({ n }) => `Đang mở ${n} profile`,
  closedN: ({ n }) => `Đã đóng ${n} cửa sổ`,
  nothingToClose: "Không có cửa sổ nào để đóng",
  loadError: "Không đọc được danh sách profile.",
  retry: "Thử lại",
  noMatch: "Không có profile nào khớp.",
  noProfiles: "Chưa có profile nào.",
  noProfilesHint: ({ browser }) => `Mở ${browser} ít nhất một lần để tạo profile.`,

  settings: "Cài đặt",
  language: "Ngôn ngữ",
  theme: "Giao diện",
  light: "Sáng",
  dark: "Tối",
  system: "Hệ thống",
  effect: "Hiệu ứng nền",
  effectMica: "Mica",
  effectTabbed: "Mica Alt",
  effectAcrylic: "Acrylic",
  effectNone: "Tắt",
  effectHint: "Hiệu ứng trong suốt của Windows. Mica và Mica Alt cần Windows 11.",
  windowStart: "Cửa sổ khi mở app",
  remember: "Ghi nhớ kích thước",
  rememberHint: "Lần sau mở lại đúng kích thước bạn đã kéo.",
  maximized: "Luôn phóng to tối đa",
  maximizedHint: "Luôn mở app ở chế độ toàn màn hình làm việc.",
  appliesNext: "Áp dụng từ lần mở app sau.",

  err_browser_not_found: "Không tìm thấy trình duyệt này. Hãy cài đặt trình duyệt trước.",
  err_unknown_browser: "Trình duyệt không được hỗ trợ.",
  err_too_many: "Tối đa 5 trang cho mỗi lần mở.",
  err_invalid_url: "Địa chỉ phải bắt đầu bằng http:// hoặc https://",
  err_no_data_dir: "Không tìm thấy thư mục dữ liệu của trình duyệt.",
  err_bad_state: "File danh sách profile của trình duyệt không đúng định dạng.",
  err_read_failed: "Không đọc được danh sách profile:",
  err_unsupported: "Tính năng này hiện chỉ hỗ trợ Windows.",
};

const en = {
  tagline: "Open profiles from your browsers with the websites you choose, in one click.",
  by: "Created by",
  withAi: "with help from AI",

  sitesTitle: "Websites to open",
  sitesHint: ({ max }) => `Type an address or pick from your saved list. Up to ${max} sites, one tab each.`,
  noSites: "No sites selected. Only the profile opens.",
  placeholder: "Type an address or pick a saved site",
  placeholderMore: "Add another site",
  addSite: ({ url }) => `Add “${url}”`,
  savedSites: "Saved sites",
  noSaved: "No saved sites yet. Type an address and press Enter.",
  maxReached: ({ max }) => `You've selected the maximum of ${max} sites. Deselect one to add another.`,
  removeSite: "Deselect this site",
  forget: "Remove from saved sites",
  toggleList: "Show saved sites",
  invalidUrl: "That address isn't valid. For example: github.com or https://example.com",
  clearSites: "Clear all",
  sitesCount: ({ n }) => `${n} ${n === 1 ? "site" : "sites"}`,

  browser: "Browser",
  noBrowsers: "No supported browser was found.",
  noBrowsersHint: "Install Chrome, Edge, Brave, Vivaldi, Cốc Cốc or Firefox.",
  firefoxNote: "Firefox doesn't show the profile name on its windows, so “Running” only detects windows opened by Site Launcher.",

  sitesOf: ({ name, n }) => `Sites for ${name}: ${n}`,
  profileSitesTitle: ({ name }) => `Websites for ${name}`,
  useDefault: "Use the default sites",
  useDefaultHint: ({ n }) => `Opens ${n} ${n === 1 ? "site" : "sites"} like the shared setup.`,
  customSites: "Custom sites for this profile",
  customHint: "Only this profile uses them.",
  done: "Done",

  search: "Search by name or email",
  selectAll: "Select all",
  clearSel: "Clear",
  reload: "Reload",
  open: "Open",
  close: "Close",
  running: "Running",
  opening: "Starting",
  selectProfile: ({ name }) => `Select ${name}`,
  profiles: ({ n }) => `${n} ${n === 1 ? "profile" : "profiles"}`,
  selectedCount: ({ n, total }) => `${n} of ${total} selected`,
  openSelected: ({ n }) => `Open ${n} selected`,
  openAll: ({ n }) => `Open all (${n})`,
  closeSelected: ({ n }) => `Close ${n} selected`,
  closeAll: ({ n }) => `Close all (${n})`,
  openedN: ({ n }) => `Opening ${n} ${n === 1 ? "profile" : "profiles"}`,
  closedN: ({ n }) => `Closed ${n} ${n === 1 ? "window" : "windows"}`,
  nothingToClose: "No open windows to close",
  loadError: "Couldn't read the profile list.",
  retry: "Try again",
  noMatch: "No profiles match your search.",
  noProfiles: "No profiles yet.",
  noProfilesHint: ({ browser }) => `Open ${browser} at least once to create a profile.`,

  settings: "Settings",
  language: "Language",
  theme: "Appearance",
  light: "Light",
  dark: "Dark",
  system: "System",
  effect: "Backdrop effect",
  effectMica: "Mica",
  effectTabbed: "Mica Alt",
  effectAcrylic: "Acrylic",
  effectNone: "Off",
  effectHint: "Windows transparency effect. Mica and Mica Alt need Windows 11.",
  windowStart: "Window on startup",
  remember: "Remember size",
  rememberHint: "Reopens at the size you last dragged it to.",
  maximized: "Always maximized",
  maximizedHint: "Always opens filling the work area.",
  appliesNext: "Applies the next time you open the app.",

  err_browser_not_found: "This browser wasn't found. Please install it first.",
  err_unknown_browser: "This browser isn't supported.",
  err_too_many: "At most 5 sites per launch.",
  err_invalid_url: "The address must start with http:// or https://",
  err_no_data_dir: "Couldn't find the browser's data folder.",
  err_bad_state: "The browser's profile list file has an unexpected format.",
  err_read_failed: "Couldn't read the profile list:",
  err_unsupported: "This feature is only supported on Windows.",
};

const dict = { vi, en };

// t("key", { n: 2 }) — chuỗi hoặc hàm; thiếu khóa thì trả lại chính khóa
export const makeT = (lang) => {
  const d = dict[lang] || en;
  return (k, v) => {
    const s = d[k] ?? en[k];
    if (s === undefined) return k;
    return typeof s === "function" ? s(v || {}) : s;
  };
};

// Lỗi từ Rust có dạng "code" hoặc "code:chi tiết"
export const errText = (t, e) => {
  const raw = String(e);
  const i = raw.indexOf(":");
  const code = i < 0 ? raw : raw.slice(0, i);
  const msg = t(`err_${code}`);
  if (msg === `err_${code}`) return raw;
  return i < 0 ? msg : `${msg} ${raw.slice(i + 1)}`;
};
