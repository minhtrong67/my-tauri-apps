import { useApp } from "./store";

const en = {
  appName: "Code Image",
  tagline: "Turn code into beautiful images",
  tabCode: "Code", tabStyle: "Style", tabPreview: "Preview",
  code: "Code", codePlaceholder: "Paste or type your code here…",
  language: "Language", autoDetect: "Auto-detect", detected: "Detected",
  openFile: "Open file", clear: "Clear", sample: "Sample",
  fileName: "File name", untitled: "untitled",
  codeTheme: "Code theme", background: "Background", gradient: "Gradient", solid: "Solid", transparent: "Transparent",
  color: "Color", angle: "Angle", ratio: "Image ratio", auto: "Auto", fit: "Fit code to image",
  fitHint: "Shrinks the code window so nothing is cut off",
  font: "Font", fontSize: "Font size", padding: "Padding", radius: "Corner radius",
  lineNumbers: "Line numbers", highlightLines: "Highlight lines", highlightHint: "e.g. 2, 4-6",
  windowStyle: "Window style", mac: "macOS", windows: "Windows", none: "None",
  showTitle: "Show file name", shadow: "Drop shadow",
  watermark: "Watermark", watermarkText: "Watermark text", watermarkPos: "Position",
  left: "Left", center: "Center", right: "Right", opacity: "Opacity",
  design: "Design", windowSection: "Window", textSection: "Text", extras: "Extras",
  export: "Export", format: "Format", scale: "Resolution",
  download: "Download image", copy: "Copy image", copied: "Image copied to clipboard",
  saved: "Saved", savedTo: "Saved to", copyFail: "Could not copy the image", exportFail: "Could not create the image",
  resetDesign: "Reset design", settings: "Settings",
  appearance: "Appearance", themeMode: "Theme", light: "Light", dark: "Dark", system: "System",
  themeColor: "Theme color", customColor: "Custom color",
  fontScale: "Text size", small: "Small", medium: "Medium", large: "Large",
  uiLanguage: "Language", startup: "When the app opens", rememberSize: "Remember window size",
  rememberDesc: "Reopens with the size you last resized it to", alwaysMax: "Always maximized",
  maxDesc: "Always opens the window maximized",
  saving: "Saving", askSave: "Ask where to save", askSaveDesc: "Off: save straight to your Downloads folder",
  about: "About", version: "Version", author: "Author", license: "License",
  madeWith: "Built with the support of Claude AI", openSource: "Free and open source",
  close: "Close", dropHint: "Drop a code file to load it",
  lines: "lines", chars: "chars", cutOff: "Code is cut off. Turn on “Fit code to image” or pick Auto ratio.",
  shortcuts: "Ctrl+S save · Ctrl+Shift+C copy", exporting: "Rendering…",
  fullImage: "Output size",
};

const vi: typeof en = {
  appName: "Code Image",
  tagline: "Biến code thành hình ảnh đẹp mắt",
  tabCode: "Code", tabStyle: "Giao diện", tabPreview: "Xem trước",
  code: "Code", codePlaceholder: "Dán hoặc nhập code của bạn vào đây…",
  language: "Ngôn ngữ", autoDetect: "Tự động nhận diện", detected: "Đã nhận diện",
  openFile: "Mở tệp", clear: "Xoá", sample: "Mẫu",
  fileName: "Tên tệp", untitled: "chưa-đặt-tên",
  codeTheme: "Theme màu code", background: "Nền", gradient: "Chuyển màu", solid: "Một màu", transparent: "Trong suốt",
  color: "Màu", angle: "Góc", ratio: "Tỉ lệ ảnh", auto: "Tự động", fit: "Vừa khít với ảnh",
  fitHint: "Thu nhỏ khung code để không bị cắt mất",
  font: "Font chữ", fontSize: "Cỡ chữ", padding: "Lề (padding)", radius: "Độ bo góc",
  lineNumbers: "Số dòng", highlightLines: "Đánh dấu dòng", highlightHint: "vd: 2, 4-6",
  windowStyle: "Kiểu cửa sổ", mac: "macOS", windows: "Windows", none: "Không",
  showTitle: "Hiện tên tệp", shadow: "Đổ bóng",
  watermark: "Watermark", watermarkText: "Nội dung watermark", watermarkPos: "Vị trí",
  left: "Trái", center: "Giữa", right: "Phải", opacity: "Độ mờ",
  design: "Thiết kế", windowSection: "Cửa sổ", textSection: "Văn bản", extras: "Bổ sung",
  export: "Xuất ảnh", format: "Định dạng", scale: "Độ phân giải",
  download: "Tải ảnh về", copy: "Sao chép ảnh", copied: "Đã sao chép ảnh vào clipboard",
  saved: "Đã lưu", savedTo: "Đã lưu tại", copyFail: "Không thể sao chép ảnh", exportFail: "Không thể tạo ảnh",
  resetDesign: "Đặt lại thiết kế", settings: "Cài đặt",
  appearance: "Giao diện", themeMode: "Chế độ", light: "Sáng", dark: "Tối", system: "Hệ thống",
  themeColor: "Màu chủ đề", customColor: "Màu tuỳ chỉnh",
  fontScale: "Cỡ chữ", small: "Nhỏ", medium: "Vừa", large: "Lớn",
  uiLanguage: "Ngôn ngữ", startup: "Khi mở ứng dụng", rememberSize: "Ghi nhớ kích thước cửa sổ",
  rememberDesc: "Lần sau mở lại đúng kích thước bạn đã kéo", alwaysMax: "Luôn phóng to tối đa",
  maxDesc: "Luôn mở cửa sổ ở chế độ phóng to tối đa",
  saving: "Lưu ảnh", askSave: "Hỏi nơi lưu", askSaveDesc: "Tắt: lưu thẳng vào thư mục Downloads",
  about: "Giới thiệu", version: "Phiên bản", author: "Tác giả", license: "Giấy phép",
  madeWith: "Được xây dựng với sự hỗ trợ của Claude AI", openSource: "Miễn phí và mã nguồn mở",
  close: "Đóng", dropHint: "Thả tệp code vào đây để mở",
  lines: "dòng", chars: "ký tự", cutOff: "Code bị cắt mất. Hãy bật “Vừa khít với ảnh” hoặc chọn tỉ lệ Tự động.",
  shortcuts: "Ctrl+S lưu · Ctrl+Shift+C sao chép", exporting: "Đang tạo ảnh…",
  fullImage: "Kích thước ảnh",
};

export type Key = keyof typeof en;
const dict = { en, vi };

export function resolveLang(l: "system" | "en" | "vi"): "en" | "vi" {
  if (l !== "system") return l;
  return (navigator.language || "en").toLowerCase().startsWith("vi") ? "vi" : "en";
}

export function useT() {
  const lang = resolveLang(useApp((s) => s.lang));
  return (k: Key) => dict[lang][k];
}
