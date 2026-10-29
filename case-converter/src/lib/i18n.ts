// English and Vietnamese strings. The language follows the device unless the user picks one.
import type { Lang } from './engine';

const EN = {
  appName: 'Case Converter',
  tConvert: 'Convert', tAll: 'All cases', tTools: 'Tools', navLabel: 'Sections',
  source: 'Source text', inPlaceholder: 'Type, paste or drop a text file here',
  result: 'Result', allTitle: 'All conversions', toolsTitle: 'Text tools',
  pickStyle: 'Choose a style', pickTool: 'Choose a tool',
  favorites: 'Favorites', gText: 'Text', gCode: 'Code', gOther: 'Other',
  tgLines: 'Lines', tgEdit: 'Edit', tgEncode: 'Encode', tgAnalyze: 'Analyze',
  lbOpen: 'Open', lbPaste: 'Paste', lbClear: 'Clear', lbSwap: 'Use as source', lbSave: 'Save',
  open: 'Open text file', paste: 'Paste from clipboard', clear: 'Clear text', swap: 'Use result as source text',
  save: 'Save result as .txt', copy: 'Copy', copied: 'Copied', copyTip: 'Copy the result',
  addFav: 'Add to favorites', removeFav: 'Remove from favorites',
  sample: 'Try a sample', sampleText: 'the quick brown fox jumps over the lazy dog\nHello World from Case Converter',
  copiedToast: 'Copied to clipboard', copyFail: 'Could not copy', saved: 'File saved', saveFail: 'Could not save the file',
  swapped: 'Result moved to source text', cleared: 'Text cleared', undo: 'Undo',
  pasteFail: 'Could not read the clipboard. Press Ctrl+V instead', readFail: 'Could not read the file',
  tooLarge: 'The file is larger than 10 MB', binaryFile: 'This does not look like a text file',
  fileOpened: 'File opened', favAdded: 'Added to favorites', favRemoved: 'Removed from favorites',
  dropHere: 'Drop a text file to open it', pasted: 'Pasted from clipboard', autoCopied: 'Result copied automatically',
  smart: 'Smart Title Case', smartHint: 'Keeps small words such as a, an and the in lowercase',
  keepAcr: 'Keep acronyms', keepAcrHint: 'Words written in capitals, such as NASA, stay as they are',
  emptyAll: 'Type some text to see every conversion', emptyResult: 'Your result appears here',
  chars: 'characters', wordsU: 'words', linesU: 'lines', converting: 'Converting',
  badInput: 'This text could not be processed',
  badRegex: 'This regular expression is not valid', badBase64: 'This text is not valid Base64',
  badUrlEnc: 'This text is not valid URL encoding', badJson: 'This text is not valid JSON',
  settings: 'Settings', settingsTitle: 'Settings', about: 'About', done: 'Done', cancel: 'Cancel', confirm: 'Confirm', delete: 'Delete',
  palette: 'Command palette', palPlaceholder: 'Search styles, tools and actions', palCases: 'Styles', palTools: 'Tools', palActions: 'Actions',
  palEmpty: 'Nothing matches your search', hintSelect: 'to select', hintMove: 'to move',
  actSettings: 'Open settings', actHistory: 'Open history', actAbout: 'About this app', actTheme: 'Switch light and dark mode',
  actOpen: 'Open a text file', actPaste: 'Paste from clipboard', actClear: 'Clear the source text', actCopy: 'Copy the result',
  history: 'History', histTitle: 'History', histEmpty: 'Nothing here yet', histEmptyHint: 'Results you copy or save appear here so you can reuse them',
  histClear: 'Clear all', histClearTitle: 'Clear the history?', histClearMsg: 'All saved results will be removed from this device. This cannot be undone.',
  histCleared: 'History cleared', histDeleted: 'Entry removed', restoreSrc: 'Use as source text', restored: 'Moved to source text', justNow: 'Just now',
  secAppearance: 'Appearance', sTheme: 'Theme', sThemeHint: 'Light, dark, or follow your device', system: 'System', light: 'Light', dark: 'Dark',
  sColor: 'Theme color', sColorHint: 'Material 3 builds a full palette from this color', custom: 'Custom color', cDefault: 'Default',
  sFontSize: 'Text size', sFontSizeHint: 'Makes everything in the app smaller or larger', fsSm: 'Small', fsMd: 'Medium', fsLg: 'Large',
  sFont: 'Font', sFontHint: 'Applies to the whole app', fSystem: 'System default', fontPreview: 'The quick brown fox',
  secLanguage: 'Language', sLang: 'Display language', langAuto: 'Auto', langAutoHint: 'Auto follows the language of your device',
  secWindow: 'Window', sWindow: 'When the app starts', wRemember: 'Remember size', wMaximized: 'Always maximized',
  wRememberHint: 'Opens with the size and state you left it in', wMaximizedHint: 'Always opens maximized, whatever size you used last time',
  secBehavior: 'Behavior', sAutoCopy: 'Copy results automatically', sAutoCopyHint: 'Copies the result every time you pick a new style',
  sHistory: 'Keep a history', sHistoryHint: 'Remembers the results you copy or save on this device',
  resetDefaults: 'Reset to defaults', resetTitle: 'Reset all settings?', resetMsg: 'Theme, color, font, text size, language and behavior go back to their defaults. Your text and history are kept.', resetDone: 'Settings reset to defaults',
  version: 'Version', author: 'Author', authorRole: 'Creator and maintainer', builtWith: 'Built with AI', aiRole: 'AI pair programmer by Anthropic',
  aiNote: 'Claude helped with the design, the code and the documentation.', license: 'Open source, MIT License', madeBy: 'Made by', withAi: 'with',
  shortcuts: 'Keyboard shortcuts', shCopy: 'Copy the result', shClear: 'Clear the source text', shOpen: 'Open a file', shSave: 'Save the result',
  shSettings: 'Open settings', shTabs: 'Switch section', shPalette: 'Command palette', shHistory: 'Open history',
  minimize: 'Minimize', maximize: 'Maximize', restore: 'Restore', close: 'Close', scrollTop: 'Back to top',
  c_default: 'Default', c_red: 'Red', c_pink: 'Pink', c_purple: 'Purple', c_deepPurple: 'Deep purple', c_indigo: 'Indigo', c_blue: 'Blue',
  c_lightBlue: 'Light blue', c_cyan: 'Cyan', c_teal: 'Teal', c_green: 'Green', c_lightGreen: 'Light green', c_lime: 'Lime',
  c_yellow: 'Yellow', c_amber: 'Amber', c_orange: 'Orange', c_deepOrange: 'Deep orange', c_brown: 'Brown', c_blueGrey: 'Blue grey',
} as const;

export type Key = keyof typeof EN;

const VI: Record<Key, string> = {
  appName: 'Case Converter',
  tConvert: 'Chuyển đổi', tAll: 'Tất cả kiểu', tTools: 'Công cụ', navLabel: 'Mục chính',
  source: 'Văn bản gốc', inPlaceholder: 'Nhập, dán văn bản hoặc kéo thả tệp văn bản vào đây',
  result: 'Kết quả', allTitle: 'Tất cả kiểu chuyển đổi', toolsTitle: 'Công cụ văn bản',
  pickStyle: 'Chọn kiểu chuyển đổi', pickTool: 'Chọn công cụ',
  favorites: 'Yêu thích', gText: 'Văn bản', gCode: 'Lập trình', gOther: 'Khác',
  tgLines: 'Dòng', tgEdit: 'Chỉnh sửa', tgEncode: 'Mã hóa', tgAnalyze: 'Phân tích',
  lbOpen: 'Mở tệp', lbPaste: 'Dán', lbClear: 'Xóa', lbSwap: 'Dùng làm gốc', lbSave: 'Lưu',
  open: 'Mở tệp văn bản', paste: 'Dán từ clipboard', clear: 'Xóa văn bản', swap: 'Dùng kết quả làm văn bản gốc',
  save: 'Lưu kết quả ra tệp .txt', copy: 'Sao chép', copied: 'Đã chép', copyTip: 'Sao chép kết quả',
  addFav: 'Thêm vào yêu thích', removeFav: 'Bỏ khỏi yêu thích',
  sample: 'Dùng văn bản mẫu', sampleText: 'chuyển đổi chữ hoa chữ thường thật dễ dàng\nXin chào Việt Nam từ Case Converter',
  copiedToast: 'Đã sao chép vào clipboard', copyFail: 'Không sao chép được', saved: 'Đã lưu tệp', saveFail: 'Không lưu được tệp',
  swapped: 'Đã chuyển kết quả sang văn bản gốc', cleared: 'Đã xóa văn bản', undo: 'Hoàn tác',
  pasteFail: 'Không đọc được clipboard. Hãy nhấn Ctrl+V', readFail: 'Không đọc được tệp',
  tooLarge: 'Tệp lớn hơn 10 MB', binaryFile: 'Tệp này có vẻ không phải tệp văn bản',
  fileOpened: 'Đã mở tệp', favAdded: 'Đã thêm vào yêu thích', favRemoved: 'Đã bỏ khỏi yêu thích',
  dropHere: 'Thả tệp văn bản để mở', pasted: 'Đã dán từ clipboard', autoCopied: 'Đã tự động sao chép kết quả',
  smart: 'Title Case thông minh', smartHint: 'Giữ chữ thường cho các từ nhỏ như a, an, the',
  keepAcr: 'Giữ từ viết tắt', keepAcrHint: 'Các từ viết hoa toàn bộ như NASA được giữ nguyên',
  emptyAll: 'Nhập văn bản để xem tất cả kết quả', emptyResult: 'Kết quả sẽ hiện ở đây',
  chars: 'ký tự', wordsU: 'từ', linesU: 'dòng', converting: 'Đang chuyển đổi',
  badInput: 'Không xử lý được văn bản này',
  badRegex: 'Biểu thức chính quy không hợp lệ', badBase64: 'Văn bản này không phải Base64 hợp lệ',
  badUrlEnc: 'Văn bản này không phải mã hóa URL hợp lệ', badJson: 'Văn bản này không phải JSON hợp lệ',
  settings: 'Cài đặt', settingsTitle: 'Cài đặt', about: 'Thông tin ứng dụng', done: 'Xong', cancel: 'Hủy', confirm: 'Xác nhận', delete: 'Xóa',
  palette: 'Bảng lệnh', palPlaceholder: 'Tìm kiểu chuyển đổi, công cụ và thao tác', palCases: 'Kiểu chuyển đổi', palTools: 'Công cụ', palActions: 'Thao tác',
  palEmpty: 'Không có kết quả phù hợp', hintSelect: 'để chọn', hintMove: 'để di chuyển',
  actSettings: 'Mở cài đặt', actHistory: 'Mở lịch sử', actAbout: 'Thông tin ứng dụng', actTheme: 'Đổi giao diện sáng và tối',
  actOpen: 'Mở tệp văn bản', actPaste: 'Dán từ clipboard', actClear: 'Xóa văn bản gốc', actCopy: 'Sao chép kết quả',
  history: 'Lịch sử', histTitle: 'Lịch sử', histEmpty: 'Chưa có gì ở đây', histEmptyHint: 'Kết quả bạn sao chép hoặc lưu sẽ hiện ở đây để dùng lại',
  histClear: 'Xóa tất cả', histClearTitle: 'Xóa toàn bộ lịch sử?', histClearMsg: 'Tất cả kết quả đã lưu sẽ bị xóa khỏi thiết bị này và không thể khôi phục.',
  histCleared: 'Đã xóa lịch sử', histDeleted: 'Đã xóa mục', restoreSrc: 'Dùng làm văn bản gốc', restored: 'Đã chuyển sang văn bản gốc', justNow: 'Vừa xong',
  secAppearance: 'Giao diện', sTheme: 'Chế độ', sThemeHint: 'Sáng, tối hoặc theo thiết bị', system: 'Hệ thống', light: 'Sáng', dark: 'Tối',
  sColor: 'Màu chủ đề', sColorHint: 'Material 3 tạo cả bảng màu từ màu bạn chọn', custom: 'Màu tùy chỉnh', cDefault: 'Mặc định',
  sFontSize: 'Cỡ chữ', sFontSizeHint: 'Làm mọi thứ trong ứng dụng nhỏ hơn hoặc lớn hơn', fsSm: 'Nhỏ', fsMd: 'Vừa', fsLg: 'Lớn',
  sFont: 'Phông chữ', sFontHint: 'Áp dụng cho toàn bộ ứng dụng', fSystem: 'Mặc định hệ thống', fontPreview: 'Chuyển đổi chữ thật dễ',
  secLanguage: 'Ngôn ngữ', sLang: 'Ngôn ngữ hiển thị', langAuto: 'Tự động', langAutoHint: 'Tự động theo ngôn ngữ của thiết bị',
  secWindow: 'Cửa sổ', sWindow: 'Khi mở ứng dụng', wRemember: 'Ghi nhớ kích thước', wMaximized: 'Luôn phóng to',
  wRememberHint: 'Mở lại với kích thước và trạng thái lần dùng trước', wMaximizedHint: 'Luôn mở ở chế độ phóng to tối đa, dù lần trước bạn dùng kích thước nào',
  secBehavior: 'Hành vi', sAutoCopy: 'Tự động sao chép kết quả', sAutoCopyHint: 'Sao chép kết quả mỗi khi bạn chọn một kiểu mới',
  sHistory: 'Lưu lịch sử', sHistoryHint: 'Ghi nhớ các kết quả bạn sao chép hoặc lưu trên thiết bị này',
  resetDefaults: 'Đặt lại mặc định', resetTitle: 'Đặt lại toàn bộ cài đặt?', resetMsg: 'Chế độ sáng tối, màu, phông chữ, cỡ chữ, ngôn ngữ và hành vi sẽ về mặc định. Văn bản và lịch sử của bạn được giữ nguyên.', resetDone: 'Đã đặt lại cài đặt mặc định',
  version: 'Phiên bản', author: 'Tác giả', authorRole: 'Người tạo và duy trì dự án', builtWith: 'Xây dựng cùng AI', aiRole: 'Trợ lý lập trình AI của Anthropic',
  aiNote: 'Claude hỗ trợ thiết kế, viết mã và tài liệu.', license: 'Mã nguồn mở, giấy phép MIT', madeBy: 'Tác giả', withAi: 'cùng',
  shortcuts: 'Phím tắt', shCopy: 'Sao chép kết quả', shClear: 'Xóa văn bản gốc', shOpen: 'Mở tệp', shSave: 'Lưu kết quả',
  shSettings: 'Mở cài đặt', shTabs: 'Chuyển mục', shPalette: 'Bảng lệnh', shHistory: 'Mở lịch sử',
  minimize: 'Thu nhỏ', maximize: 'Phóng to', restore: 'Khôi phục', close: 'Đóng', scrollTop: 'Lên đầu trang',
  c_default: 'Mặc định', c_red: 'Đỏ', c_pink: 'Hồng', c_purple: 'Tím', c_deepPurple: 'Tím đậm', c_indigo: 'Chàm', c_blue: 'Xanh dương',
  c_lightBlue: 'Xanh da trời', c_cyan: 'Xanh lơ', c_teal: 'Xanh ngọc', c_green: 'Xanh lá', c_lightGreen: 'Xanh lá nhạt', c_lime: 'Vàng chanh',
  c_yellow: 'Vàng', c_amber: 'Hổ phách', c_orange: 'Cam', c_deepOrange: 'Cam đậm', c_brown: 'Nâu', c_blueGrey: 'Xám xanh',
};

export const STRINGS: Record<Lang, Record<Key, string>> = { en: EN, vi: VI };

/** First preferred device language that we support; Vietnamese devices get Vietnamese, everything else English. */
export function detectLanguage(): Lang {
  const prefs = (navigator.languages?.length ? navigator.languages : [navigator.language]) || [];
  for (const l of prefs) {
    const code = String(l || '').toLowerCase();
    if (code.startsWith('vi')) return 'vi';
    if (code.startsWith('en')) return 'en';
  }
  return 'en';
}

export type TFn = (key: Key) => string;
export const makeT = (lang: Lang): TFn => (key) => STRINGS[lang][key] ?? EN[key] ?? key;
