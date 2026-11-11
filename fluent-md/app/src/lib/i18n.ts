import { useSettings, getSettings } from './settings';

const EN = {
  // toolbar
  open: 'Open', new: 'New file', save: 'Save', save_as: 'Save as…', recent: 'Recent files', more: 'More', find: 'Find', outline: 'Outline',
  outline_show: 'Show outline', outline_hide: 'Hide outline', settings: 'Settings', commands: 'Command palette',
  m_edit: 'Edit', m_split: 'Split', m_preview: 'Preview', close: 'Close', w_min: 'Minimize', w_max: 'Maximize', w_restore: 'Restore', w_close: 'Close window',
  // formatting
  c_undo: 'Undo', c_redo: 'Redo', c_bold: 'Bold', c_italic: 'Italic', c_strike: 'Strikethrough', c_heading: 'Heading', c_quote: 'Quote', c_code: 'Inline code',
  c_codeblock: 'Code block', c_link: 'Link', c_image: 'Image', c_ul: 'Bulleted list', c_ol: 'Numbered list', c_task: 'Task list', c_table: 'Table', c_hr: 'Horizontal rule',
  c_insert: 'Insert', h_para: 'Paragraph', h_n: 'Heading', c_toc: 'Table of contents', c_badge: 'Badge',
  // find
  find_ph: 'Find in document', replace_ph: 'Replace with', f_case: 'Match case', f_regex: 'Regular expression', f_prev: 'Previous match', f_next: 'Next match',
  f_replace: 'Replace', replace_one: 'Replace', replace_all: 'Replace all', no_match: 'No results', bad_regex: 'Invalid pattern', replaced: 'Replaced {n} matches', find_replace: 'Find and replace',
  // empty
  empty_t: 'Write, preview and polish Markdown', empty_h: 'Create a file, open one you already have, or drop a .md file anywhere in this window.',
  sample: 'Sample document', templates: 'New from template', drop: 'Drop Markdown files to open them', drop_bad: 'Only Markdown or text files can be opened',
  // status
  ln: 'Ln', col: 'Col', selected: 'selected', words: 'words', chars: 'chars', min: 'min read', unsaved: 'Unsaved changes', saved_s: 'Saved', new_file: 'New file',
  eol: 'Line endings (click to switch)', zoom_in: 'Zoom in', zoom_out: 'Zoom out', zoom_reset: 'Reset zoom (100%)', untitled: 'Untitled', no_toc: 'No headings in this document',
  scroll_top: 'Scroll to top',
  // messages
  saved: 'Saved', save_fail: 'Could not save the file', read_fail: 'Could not read the file', reloaded: 'Reloaded because the file changed on disk', ext_changed: 'This file changed on disk',
  reload: 'Reload', copied: 'Copied', copy: 'Copy', copy_fail: 'Could not copy', lossy: '{n} is not valid UTF-8, some characters were replaced', exported: 'HTML exported', show: 'Show',
  img_need_save: 'Save the file first, then paste the image again', img_saved: 'Image saved to assets', img_fail: 'Could not save the image', restored: 'Restored your last session',
  // dialogs
  save_q_title: 'Save changes?', save_q: 'Do you want to save the changes you made to {n}?', cancel: 'Cancel', dont_save: "Don't save", close_tab: 'Close tab',
  next_tab: 'Next tab', prev_tab: 'Previous tab', apply: 'Apply', insert: 'Insert', create: 'Create', reset_q_title: 'Reset all settings?', reset_q: 'Theme, language, font and editor options go back to their defaults. Your files are not touched.',
  // menu
  export_html: 'Export as HTML', print: 'Print / PDF', copy_path: 'Copy file path', reveal: 'Show in folder', shortcuts: 'Keyboard shortcuts', no_recent: 'No recent files', clear_recent: 'Clear list',
  focus_mode: 'Focus mode',
  // templates and badges
  tpl_title: 'New from template', tpl_blank: 'Blank document', tpl_blank_d: 'Start with an empty page.', tpl_readme: 'Project README', tpl_readme_d: 'Title, features, install, license.',
  tpl_api: 'API reference', tpl_api_d: 'Endpoints, parameters and examples.', tpl_changelog: 'Changelog', tpl_changelog_d: 'Keep a Changelog layout.', tpl_notes: 'Meeting notes', tpl_notes_d: 'Agenda, decisions, action items.',
  badge_title: 'Insert badge', badge_label: 'Label', badge_message: 'Message', badge_color: 'Colour', badge_presets: 'Presets', badge_preview: 'Preview', badge_offline: 'Badges load from shields.io, so they need an internet connection to display.',
  // palette
  pal_ph: 'Type a command', pal_none: 'No matching command',
  // settings
  s_appearance: 'Appearance', s_theme: 'App mode', s_theme_d: 'Choose light, dark or follow Windows.', theme_system: 'Use system setting', theme_light: 'Light', theme_dark: 'Dark',
  s_color: 'Accent colour', s_color_d: 'Used for buttons, selection and links.', s_custom: 'Custom colour (hex)',
  s_material: 'Window material', s_material_d: 'Windows 11 backdrop that shows through the app.', mat_mica: 'Mica', mat_mica_d: 'Subtle, tinted by your wallpaper.', mat_alt: 'Mica Alt', mat_alt_d: 'Stronger tint, made for tabbed apps.',
  mat_acrylic: 'Acrylic', mat_acrylic_d: 'Translucent and blurred.', mat_need11: 'Mica needs Windows 11, and Mica Alt needs Windows 11 22H2 or later. Solid colours are used until then.', mat_browser: 'The material is applied in the desktop app on Windows.', mat_active: 'Active: {m}', mat_solid: 'Solid colours',
  s_type: 'Text', s_font: 'Font', s_size: 'Text size', size_sm: 'Small', size_md: 'Medium', size_lg: 'Large', opt_zoom: 'Zoom',
  s_language: 'Language', lang_auto: 'Auto',
  s_window: 'Window on startup', win_remember: 'Remember window size', win_remember_d: 'Open at the size you last used.', win_max: 'Always maximized', win_max_d: 'Always open the window maximized.',
  s_files: 'Files', save_dir: 'Default save folder', save_dir_d: 'Where Save as and Open start. Empty means the system default.', browse: 'Browse', clear: 'Clear', save_dir_none: 'System default',
  opt_auto: 'Autosave', opt_auto_d: 'Save files a moment after you stop typing.', opt_restore: 'Restore last session', opt_restore_d: 'Reopen your tabs and unsaved drafts at startup.',
  s_editor: 'Editor', opt_wrap: 'Word wrap', opt_wrap_d: 'Wrap long lines in the editor.', opt_nums: 'Line numbers', opt_nums_d: 'Show line numbers next to the text.',
  opt_sync: 'Synchronized scrolling', opt_sync_d: 'Keep editor and preview aligned in split view.', opt_spell: 'Spell check', opt_spell_d: 'Underline misspelled words while you type.',
  reset: 'Reset settings', reset_done: 'Settings restored', version: 'Version', made_by: 'Designed and developed by', with_ai: 'with the assistance of AI',
  // alerts
  alert_note: 'Note', alert_tip: 'Tip', alert_important: 'Important', alert_warning: 'Warning', alert_caution: 'Caution',
  // misc
  loading: 'Opening…', pick_color: 'Pick a colour',
  // new in Fluent MD
  on: 'On', off: 'Off',
  cut: 'Cut', paste: 'Paste', select_all: 'Select all', paste_fail: 'Press Ctrl+V to paste', save_all: 'Save all', close_others: 'Close other tabs', close_all: 'Close all tabs', close_right: 'Close tabs to the right',
  focus_hint: 'Focus mode. Press F11 or Esc to leave.', splitter: 'Drag to resize, double-click to reset', encoding: 'UTF-8', app_name: 'Fluent MD', task_toggled: 'Task updated', saved_n: 'Saved {n} files',
  zoom_slider: 'Zoom', command_bar: 'Command bar', view_mode: 'View', no_recent_hint: 'Files you open will appear here.',
};
export type Key = keyof typeof EN;

const VI: Record<Key, string> = {
  open: 'Mở', new: 'Tệp mới', save: 'Lưu', save_as: 'Lưu thành…', recent: 'Tệp gần đây', more: 'Thêm', find: 'Tìm kiếm', outline: 'Mục lục',
  outline_show: 'Hiện mục lục', outline_hide: 'Ẩn mục lục', settings: 'Cài đặt', commands: 'Bảng lệnh',
  m_edit: 'Soạn', m_split: 'Chia đôi', m_preview: 'Xem', close: 'Đóng', w_min: 'Thu nhỏ', w_max: 'Phóng to', w_restore: 'Khôi phục', w_close: 'Đóng cửa sổ',
  c_undo: 'Hoàn tác', c_redo: 'Làm lại', c_bold: 'In đậm', c_italic: 'In nghiêng', c_strike: 'Gạch ngang', c_heading: 'Tiêu đề', c_quote: 'Trích dẫn', c_code: 'Mã dòng',
  c_codeblock: 'Khối mã', c_link: 'Liên kết', c_image: 'Hình ảnh', c_ul: 'Danh sách chấm', c_ol: 'Danh sách số', c_task: 'Danh sách việc cần làm', c_table: 'Bảng', c_hr: 'Đường kẻ ngang',
  c_insert: 'Chèn', h_para: 'Đoạn văn', h_n: 'Tiêu đề', c_toc: 'Mục lục tài liệu', c_badge: 'Huy hiệu',
  find_ph: 'Tìm trong tài liệu', replace_ph: 'Thay bằng', f_case: 'Phân biệt hoa thường', f_regex: 'Biểu thức chính quy', f_prev: 'Kết quả trước', f_next: 'Kết quả sau',
  f_replace: 'Thay thế', replace_one: 'Thay thế', replace_all: 'Thay tất cả', no_match: 'Không có kết quả', bad_regex: 'Mẫu không hợp lệ', replaced: 'Đã thay {n} kết quả', find_replace: 'Tìm và thay thế',
  empty_t: 'Viết, xem trước và hoàn thiện Markdown', empty_h: 'Tạo tệp mới, mở tệp có sẵn hoặc kéo thả tệp .md vào bất kỳ đâu trong cửa sổ này.',
  sample: 'Tài liệu mẫu', templates: 'Tạo từ mẫu', drop: 'Thả tệp Markdown để mở', drop_bad: 'Chỉ mở được tệp Markdown hoặc văn bản',
  ln: 'Dòng', col: 'Cột', selected: 'đã chọn', words: 'từ', chars: 'ký tự', min: 'phút đọc', unsaved: 'Chưa lưu thay đổi', saved_s: 'Đã lưu', new_file: 'Tệp mới',
  eol: 'Kiểu xuống dòng (bấm để đổi)', zoom_in: 'Phóng to', zoom_out: 'Thu nhỏ', zoom_reset: 'Đặt lại thu phóng', untitled: 'Chưa đặt tên', no_toc: 'Tài liệu không có tiêu đề',
  scroll_top: 'Cuộn lên đầu trang',
  saved: 'Đã lưu', save_fail: 'Không lưu được tệp', read_fail: 'Không đọc được tệp', reloaded: 'Đã tải lại vì tệp thay đổi trên đĩa', ext_changed: 'Tệp này đã thay đổi trên đĩa',
  reload: 'Tải lại', copied: 'Đã sao chép', copy: 'Sao chép', copy_fail: 'Không sao chép được', lossy: '{n} không phải UTF-8 hợp lệ, một số ký tự đã bị thay thế', exported: 'Đã xuất HTML', show: 'Hiện',
  img_need_save: 'Hãy lưu tệp trước rồi dán lại ảnh', img_saved: 'Đã lưu ảnh vào thư mục assets', img_fail: 'Không lưu được ảnh', restored: 'Đã khôi phục phiên làm việc lần trước',
  save_q_title: 'Lưu thay đổi?', save_q: 'Bạn có muốn lưu các thay đổi đã thực hiện với {n} không?', cancel: 'Hủy', dont_save: 'Không lưu', close_tab: 'Đóng thẻ',
  next_tab: 'Thẻ kế tiếp', prev_tab: 'Thẻ trước', apply: 'Áp dụng', insert: 'Chèn', create: 'Tạo', reset_q_title: 'Đặt lại toàn bộ cài đặt?', reset_q: 'Giao diện, ngôn ngữ, font và tùy chọn trình soạn thảo sẽ về mặc định. Tệp của bạn không bị ảnh hưởng.',
  export_html: 'Xuất ra HTML', print: 'In / PDF', copy_path: 'Sao chép đường dẫn', reveal: 'Mở thư mục chứa tệp', shortcuts: 'Phím tắt', no_recent: 'Chưa có tệp gần đây', clear_recent: 'Xóa danh sách',
  focus_mode: 'Chế độ tập trung',
  tpl_title: 'Tạo từ mẫu', tpl_blank: 'Tài liệu trống', tpl_blank_d: 'Bắt đầu với trang trắng.', tpl_readme: 'README dự án', tpl_readme_d: 'Tiêu đề, tính năng, cài đặt, giấy phép.',
  tpl_api: 'Tài liệu API', tpl_api_d: 'Endpoint, tham số và ví dụ.', tpl_changelog: 'Nhật ký thay đổi', tpl_changelog_d: 'Bố cục Keep a Changelog.', tpl_notes: 'Biên bản họp', tpl_notes_d: 'Chương trình, quyết định, việc cần làm.',
  badge_title: 'Chèn huy hiệu', badge_label: 'Nhãn', badge_message: 'Nội dung', badge_color: 'Màu', badge_presets: 'Mẫu có sẵn', badge_preview: 'Xem trước', badge_offline: 'Huy hiệu được tải từ shields.io nên cần kết nối internet để hiển thị.',
  pal_ph: 'Nhập tên lệnh', pal_none: 'Không có lệnh phù hợp',
  s_appearance: 'Giao diện', s_theme: 'Chế độ ứng dụng', s_theme_d: 'Chọn sáng, tối hoặc theo Windows.', theme_system: 'Theo hệ thống', theme_light: 'Sáng', theme_dark: 'Tối',
  s_color: 'Màu nhấn', s_color_d: 'Dùng cho nút, vùng chọn và liên kết.', s_custom: 'Màu tùy chỉnh (hex)',
  s_material: 'Chất liệu cửa sổ', s_material_d: 'Hiệu ứng nền Windows 11 xuyên qua ứng dụng.', mat_mica: 'Mica', mat_mica_d: 'Tinh tế, ngả màu theo hình nền.', mat_alt: 'Mica Alt', mat_alt_d: 'Đậm hơn, dành cho ứng dụng nhiều thẻ.',
  mat_acrylic: 'Acrylic', mat_acrylic_d: 'Trong mờ và làm nhòe nền.', mat_need11: 'Mica cần Windows 11, Mica Alt cần Windows 11 22H2 trở lên. Khi chưa hỗ trợ, app dùng màu nền đặc.', mat_browser: 'Chất liệu chỉ áp dụng trong ứng dụng desktop trên Windows.', mat_active: 'Đang dùng: {m}', mat_solid: 'Màu nền đặc',
  s_type: 'Chữ', s_font: 'Font chữ', s_size: 'Cỡ chữ', size_sm: 'Nhỏ', size_md: 'Vừa', size_lg: 'Lớn', opt_zoom: 'Thu phóng',
  s_language: 'Ngôn ngữ', lang_auto: 'Tự động',
  s_window: 'Cửa sổ khi mở app', win_remember: 'Ghi nhớ kích thước cửa sổ', win_remember_d: 'Mở lên đúng kích thước lần trước bạn dùng.', win_max: 'Luôn phóng to tối đa', win_max_d: 'Luôn mở cửa sổ ở chế độ phóng to tối đa.',
  s_files: 'Tệp', save_dir: 'Thư mục lưu mặc định', save_dir_d: 'Nơi hộp thoại Lưu thành và Mở bắt đầu. Để trống là mặc định của hệ thống.', browse: 'Chọn', clear: 'Xóa', save_dir_none: 'Mặc định của hệ thống',
  opt_auto: 'Tự động lưu', opt_auto_d: 'Tự lưu tệp sau khi bạn ngừng gõ một lúc.', opt_restore: 'Khôi phục phiên trước', opt_restore_d: 'Mở lại các thẻ và bản nháp chưa lưu khi khởi động.',
  s_editor: 'Trình soạn thảo', opt_wrap: 'Tự xuống dòng', opt_wrap_d: 'Ngắt dòng dài trong trình soạn thảo.', opt_nums: 'Số dòng', opt_nums_d: 'Hiện số dòng bên cạnh văn bản.',
  opt_sync: 'Cuộn đồng bộ', opt_sync_d: 'Giữ trình soạn thảo và bản xem trước cùng vị trí khi chia đôi.', opt_spell: 'Kiểm tra chính tả', opt_spell_d: 'Gạch chân từ sai khi bạn gõ.',
  reset: 'Đặt lại cài đặt', reset_done: 'Đã khôi phục cài đặt', version: 'Phiên bản', made_by: 'Thiết kế và phát triển bởi', with_ai: 'với sự hỗ trợ của AI',
  alert_note: 'Ghi chú', alert_tip: 'Mẹo', alert_important: 'Quan trọng', alert_warning: 'Cảnh báo', alert_caution: 'Lưu ý',
  loading: 'Đang mở…', pick_color: 'Chọn màu',
  on: 'Bật', off: 'Tắt', cut: 'Cắt', paste: 'Dán', select_all: 'Chọn tất cả', paste_fail: 'Hãy nhấn Ctrl+V để dán', save_all: 'Lưu tất cả', close_others: 'Đóng các thẻ khác', close_all: 'Đóng tất cả thẻ', close_right: 'Đóng các thẻ bên phải',
  focus_hint: 'Chế độ tập trung. Nhấn F11 hoặc Esc để thoát.', splitter: 'Kéo để đổi kích thước, bấm đúp để đặt lại', encoding: 'UTF-8', app_name: 'Fluent MD', task_toggled: 'Đã cập nhật việc cần làm', saved_n: 'Đã lưu {n} tệp',
  zoom_slider: 'Thu phóng', command_bar: 'Thanh lệnh', view_mode: 'Chế độ xem', no_recent_hint: 'Các tệp bạn mở sẽ xuất hiện ở đây.',
};
const DICT = { en: EN, vi: VI };
export type Lang = 'en' | 'vi';

export function detect(): Lang {
  const list = navigator.languages?.length ? navigator.languages : [navigator.language || 'en'];
  for (const l of list) { if (/^vi\b/i.test(l)) return 'vi'; if (/^en\b/i.test(l)) return 'en'; }
  return 'en';
}
export const resolveLang = (pref: string): Lang => (pref === 'en' || pref === 'vi' ? pref : detect());
export const getLang = () => resolveLang(getSettings().lang);

function fmt(s: string, vars?: Record<string, string | number>) {
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.replaceAll(`{${a}}`, String(b));
  return s;
}
/** Non-reactive translation, for use outside React components. */
export function t(k: Key, vars?: Record<string, string | number>) { return fmt(DICT[getLang()][k] ?? EN[k] ?? k, vars); }
/** Reactive translation for components: re-renders when the language changes. */
export function useT() {
  const pref = useSettings((s) => s.lang);
  const lang = resolveLang(pref);
  return (k: Key, vars?: Record<string, string | number>) => fmt(DICT[lang][k] ?? EN[k] ?? k, vars);
}
export const PALETTE_VI: Record<string, string> = {
  blue: 'Xanh dương', navy: 'Xanh hải quân', 'cool-blue': 'Xanh lam mát', seafoam: 'Xanh bọt biển', mint: 'Xanh bạc hà', green: 'Xanh lá',
  meadow: 'Xanh đồng cỏ', gold: 'Vàng cam', orange: 'Cam', rust: 'Cam gỉ', brick: 'Đỏ gạch', red: 'Đỏ',
  rose: 'Hồng', plum: 'Mận', orchid: 'Lan', iris: 'Tím iris', purple: 'Tím', steel: 'Xám thép',
};
export const PALETTE_EN: Record<string, string> = {
  blue: 'Blue', navy: 'Navy blue', 'cool-blue': 'Cool blue', seafoam: 'Seafoam', mint: 'Mint', green: 'Green',
  meadow: 'Meadow green', gold: 'Gold', orange: 'Orange', rust: 'Rust', brick: 'Brick red', red: 'Red',
  rose: 'Rose', plum: 'Plum', orchid: 'Orchid', iris: 'Iris', purple: 'Purple', steel: 'Steel blue',
};
