const en = {
  appName: "Material PDF",
  // common
  open: "Open", save: "Save", saveAs: "Save as", cancel: "Cancel", close: "Close", apply: "Apply", done: "Done",
  delete: "Delete", add: "Add", remove: "Remove", moveUp: "Move up", moveDown: "Move down", reset: "Reset",
  rotateLeft: "Rotate left", rotateRight: "Rotate right", ok: "OK", back: "Back", discard: "Discard", quit: "Quit",
  // welcome
  welcomeTitle: "Read and edit PDFs beautifully",
  welcomeSub: "Open a document, annotate it, merge, split and reorganize pages — all offline, all on your device.",
  openPdf: "Open PDF", dropHere: "Drop a PDF anywhere to open it", recent: "Recent files", noRecent: "No recent files yet",
  clearRecent: "Clear list", removeFromList: "Remove from list",
  // toolbar
  sidebar: "Sidebar", thumbnails: "Pages", outline: "Outline", search: "Search", zoomIn: "Zoom in", zoomOut: "Zoom out",
  fitWidth: "Fit width", fitPage: "Fit page", actualSize: "Actual size", page: "Page", of: "of", print: "Print",
  present: "Presentation", nightPages: "Night mode for pages", tools: "Tools", settings: "Settings", about: "About",
  annotate: "Annotate", undo: "Undo", redo: "Redo", newTab: "Open another PDF", closeTab: "Close tab",
  continuous: "Continuous scroll", singlePage: "Single page", prevPage: "Previous page", nextPage: "Next page",
  toggleTheme: "Toggle theme", exitPresent: "Press Esc to exit presentation",
  // tools
  merge: "Merge PDFs", split: "Split / extract pages", organize: "Organize pages", imagesToPdf: "Images to PDF",
  exportImages: "Export pages as images", properties: "Document properties",
  mergeDesc: "Combine several PDF files into one.", splitDesc: "Cut a PDF by page ranges or one file per page.",
  organizeDesc: "Reorder, rotate or delete pages with drag and drop.", imagesDesc: "Turn JPG, PNG or WebP images into a PDF.",
  // annotate
  tool_none: "Select / read", tool_highlight: "Highlight text", tool_pen: "Pen", tool_text: "Text", tool_rect: "Rectangle",
  tool_eraser: "Eraser", color: "Color", thickness: "Thickness", textSize: "Text size", typeHere: "Type here…",
  annotHint: "Annotations are embedded into the PDF when you save.", noAnnots: "No annotations",
  // settings
  appearance: "Appearance", theme: "Theme", light: "Light", dark: "Dark", system: "System", themeColor: "Theme color",
  fontSize: "Font size", small: "Small", medium: "Medium", large: "Large", language: "Language", auto: "Auto (system)",
  english: "English", vietnamese: "Tiếng Việt", window: "Window", startup: "When the app starts",
  startupRemember: "Remember window size", startupRememberDesc: "Restore the size and position you left it in.",
  startupMax: "Always maximized", startupMaxDesc: "Always open the window maximized.",
  viewing: "Reading", defaultZoom: "Default zoom", zoomFitWidth: "Fit width", zoomFitPage: "Fit page", zoom100: "100%",
  nightDefault: "Night mode for pages", nightDefaultDesc: "Invert page colors in dark theme for comfortable reading.",
  resetSettings: "Reset to defaults", animations: "Animations", animationsDesc: "Smooth transitions and effects.",
  // about
  version: "Version", author: "Author", aiSupport: "Supported by AI", license: "License", aboutDesc:
    "A fast, beautiful and open-source PDF reader & editor built with Tauri and Material Design 3.",
  madeWith: "Made with", openSource: "Free & open source",
  // dialogs
  files: "Files", addFiles: "Add files", addImages: "Add images", pageSize: "Page size", fitImage: "Fit to image", a4: "A4",
  margin: "Margin", createPdf: "Create PDF", mergeNow: "Merge", needTwo: "Add at least two PDF files.", needOne: "Add at least one file.",
  mode: "Mode", oneFileRanges: "One file from the ranges", filePerRange: "One file per range", everyPage: "Every page as a file",
  ranges: "Page ranges", rangesHint: "e.g. 1-3, 5, 8-", extract: "Extract", chooseFolder: "Choose output folder",
  organizeHint: "Drag pages to reorder. Use the buttons to rotate or delete.", restorePage: "Restore",
  title: "Title", authorField: "Author", subject: "Subject", keywords: "Keywords", creator: "Creator", producer: "Producer",
  created: "Created", modified: "Modified", pdfVersion: "PDF version", pages: "Pages", fileSize: "File size", location: "Location",
  pageDims: "Page size", saveMetadata: "Save properties", password: "Password", passwordNeeded: "This document is password protected.",
  wrongPassword: "Wrong password, try again.", unlock: "Unlock",
  unsavedTitle: "Unsaved changes", unsavedBody: "“{name}” has changes that are not saved. What would you like to do?",
  quitTitle: "Quit Material PDF?", quitBody: "Some documents have unsaved changes that will be lost.",
  // messages
  openFailed: "Could not open this file.", saved: "Saved “{name}”", exported: "Exported {n} files", merged: "Merged {n} files",
  splitDone: "Created {n} files", imagesDone: "PDF created from {n} images", printPrep: "Preparing print…",
  invalidRange: "Invalid page range.", noResults: "No results", results: "{n} results", searching: "Searching…",
  noOutline: "This document has no outline.", saveFailed: "Could not save the file.", working: "Working…",
  encryptedEdit: "Encrypted documents cannot be edited.", metaSaved: "Properties updated", pagesApplied: "Pages updated",
  copied: "Copied", keepOne: "A document needs at least one page.", unsupportedBrowser: "Not supported here.",
  drop: "Drop to open",
};
export type Key = keyof typeof en;
const vi: Record<Key, string> = {
  appName: "Material PDF",
  open: "Mở", save: "Lưu", saveAs: "Lưu thành", cancel: "Hủy", close: "Đóng", apply: "Áp dụng", done: "Xong",
  delete: "Xóa", add: "Thêm", remove: "Bỏ", moveUp: "Lên", moveDown: "Xuống", reset: "Đặt lại",
  rotateLeft: "Xoay trái", rotateRight: "Xoay phải", ok: "OK", back: "Quay lại", discard: "Không lưu", quit: "Thoát",
  welcomeTitle: "Đọc và chỉnh sửa PDF thật đẹp",
  welcomeSub: "Mở tài liệu, chú thích, gộp, tách và sắp xếp lại trang — hoàn toàn ngoại tuyến, ngay trên máy của bạn.",
  openPdf: "Mở PDF", dropHere: "Thả file PDF vào bất kỳ đâu để mở", recent: "Tệp gần đây", noRecent: "Chưa có tệp gần đây",
  clearRecent: "Xóa danh sách", removeFromList: "Xóa khỏi danh sách",
  sidebar: "Thanh bên", thumbnails: "Trang", outline: "Mục lục", search: "Tìm kiếm", zoomIn: "Phóng to", zoomOut: "Thu nhỏ",
  fitWidth: "Vừa chiều rộng", fitPage: "Vừa trang", actualSize: "Kích thước thật", page: "Trang", of: "/", print: "In",
  present: "Trình chiếu", nightPages: "Chế độ đọc đêm", tools: "Công cụ", settings: "Cài đặt", about: "Giới thiệu",
  annotate: "Chú thích", undo: "Hoàn tác", redo: "Làm lại", newTab: "Mở PDF khác", closeTab: "Đóng thẻ",
  continuous: "Cuộn liên tục", singlePage: "Từng trang", prevPage: "Trang trước", nextPage: "Trang sau",
  toggleTheme: "Đổi giao diện", exitPresent: "Nhấn Esc để thoát trình chiếu",
  merge: "Gộp PDF", split: "Tách / trích xuất trang", organize: "Sắp xếp trang", imagesToPdf: "Ảnh sang PDF",
  exportImages: "Xuất trang thành ảnh", properties: "Thuộc tính tài liệu",
  mergeDesc: "Ghép nhiều file PDF thành một.", splitDesc: "Cắt PDF theo khoảng trang hoặc mỗi trang một file.",
  organizeDesc: "Đổi thứ tự, xoay hoặc xóa trang bằng kéo thả.", imagesDesc: "Chuyển ảnh JPG, PNG, WebP thành PDF.",
  tool_none: "Chọn / đọc", tool_highlight: "Tô sáng chữ", tool_pen: "Bút vẽ", tool_text: "Văn bản", tool_rect: "Hình chữ nhật",
  tool_eraser: "Tẩy", color: "Màu", thickness: "Độ dày", textSize: "Cỡ chữ", typeHere: "Nhập nội dung…",
  annotHint: "Chú thích sẽ được ghi vào PDF khi bạn lưu.", noAnnots: "Chưa có chú thích",
  appearance: "Giao diện", theme: "Chủ đề", light: "Sáng", dark: "Tối", system: "Hệ thống", themeColor: "Màu chủ đề",
  fontSize: "Cỡ chữ", small: "Nhỏ", medium: "Vừa", large: "Lớn", language: "Ngôn ngữ", auto: "Tự động (hệ thống)",
  english: "English", vietnamese: "Tiếng Việt", window: "Cửa sổ", startup: "Khi mở ứng dụng",
  startupRemember: "Ghi nhớ kích thước cửa sổ", startupRememberDesc: "Lần sau mở lại đúng kích thước và vị trí đã chỉnh.",
  startupMax: "Luôn phóng to tối đa", startupMaxDesc: "Luôn mở cửa sổ ở chế độ phóng to tối đa.",
  viewing: "Đọc tài liệu", defaultZoom: "Thu phóng mặc định", zoomFitWidth: "Vừa chiều rộng", zoomFitPage: "Vừa trang", zoom100: "100%",
  nightDefault: "Chế độ đọc đêm", nightDefaultDesc: "Đảo màu trang khi dùng giao diện tối để đọc dễ chịu hơn.",
  resetSettings: "Khôi phục mặc định", animations: "Hiệu ứng chuyển động", animationsDesc: "Chuyển cảnh và hiệu ứng mượt mà.",
  version: "Phiên bản", author: "Tác giả", aiSupport: "Hỗ trợ bởi AI", license: "Giấy phép", aboutDesc:
    "Trình đọc & chỉnh sửa PDF nhanh, đẹp, mã nguồn mở, xây dựng bằng Tauri và Material Design 3.",
  madeWith: "Thực hiện bởi", openSource: "Miễn phí & mã nguồn mở",
  files: "Tệp", addFiles: "Thêm tệp", addImages: "Thêm ảnh", pageSize: "Kích thước trang", fitImage: "Vừa theo ảnh", a4: "A4",
  margin: "Lề", createPdf: "Tạo PDF", mergeNow: "Gộp", needTwo: "Hãy thêm ít nhất hai file PDF.", needOne: "Hãy thêm ít nhất một tệp.",
  mode: "Chế độ", oneFileRanges: "Một file từ các khoảng trang", filePerRange: "Mỗi khoảng một file", everyPage: "Mỗi trang một file",
  ranges: "Khoảng trang", rangesHint: "ví dụ 1-3, 5, 8-", extract: "Trích xuất", chooseFolder: "Chọn thư mục đầu ra",
  organizeHint: "Kéo trang để đổi thứ tự. Dùng nút để xoay hoặc xóa.", restorePage: "Khôi phục",
  title: "Tiêu đề", authorField: "Tác giả", subject: "Chủ đề", keywords: "Từ khóa", creator: "Ứng dụng tạo", producer: "Trình xuất",
  created: "Ngày tạo", modified: "Ngày sửa", pdfVersion: "Phiên bản PDF", pages: "Số trang", fileSize: "Dung lượng", location: "Vị trí",
  pageDims: "Kích thước trang", saveMetadata: "Lưu thuộc tính", password: "Mật khẩu", passwordNeeded: "Tài liệu này được bảo vệ bằng mật khẩu.",
  wrongPassword: "Sai mật khẩu, thử lại.", unlock: "Mở khóa",
  unsavedTitle: "Thay đổi chưa lưu", unsavedBody: "“{name}” có thay đổi chưa được lưu. Bạn muốn làm gì?",
  quitTitle: "Thoát Material PDF?", quitBody: "Một số tài liệu có thay đổi chưa lưu và sẽ bị mất.",
  openFailed: "Không thể mở tệp này.", saved: "Đã lưu “{name}”", exported: "Đã xuất {n} tệp", merged: "Đã gộp {n} tệp",
  splitDone: "Đã tạo {n} tệp", imagesDone: "Đã tạo PDF từ {n} ảnh", printPrep: "Đang chuẩn bị in…",
  invalidRange: "Khoảng trang không hợp lệ.", noResults: "Không có kết quả", results: "{n} kết quả", searching: "Đang tìm…",
  noOutline: "Tài liệu này không có mục lục.", saveFailed: "Không thể lưu tệp.", working: "Đang xử lý…",
  encryptedEdit: "Không thể chỉnh sửa tài liệu đã mã hóa.", metaSaved: "Đã cập nhật thuộc tính", pagesApplied: "Đã cập nhật các trang",
  copied: "Đã sao chép", keepOne: "Tài liệu cần ít nhất một trang.", unsupportedBrowser: "Không hỗ trợ ở đây.",
  drop: "Thả để mở",
};
export const dict = { en, vi };
export type Lang = "en" | "vi";

export function detectLang(): Lang {
  return (navigator.languages?.[0] ?? navigator.language ?? "en").toLowerCase().startsWith("vi") ? "vi" : "en";
}

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  let s = dict[lang][key] ?? dict.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}
