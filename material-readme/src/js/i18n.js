// English and Vietnamese strings. The language follows the system unless the user picks one in Settings.
const T = {
  en: {
    // toolbar
    open: 'Open', new: 'New file', save: 'Save', save_as: 'Save as…', recent: 'Recent files', more: 'More', find: 'Find', outline: 'Outline', outline_show: 'Show outline', outline_hide: 'Hide outline', settings: 'Settings',
    m_edit: 'Edit', m_split: 'Split', m_preview: 'Preview', close: 'Close', w_min: 'Minimize', w_max: 'Maximize', w_restore: 'Restore', w_close: 'Close',
    // formatting
    c_undo: 'Undo', c_redo: 'Redo', c_bold: 'Bold', c_italic: 'Italic', c_strike: 'Strikethrough', c_heading: 'Heading', c_quote: 'Quote', c_code: 'Inline code',
    c_codeblock: 'Code block', c_link: 'Link', c_image: 'Image', c_ul: 'Bulleted list', c_ol: 'Numbered list', c_task: 'Task list', c_table: 'Table', c_hr: 'Horizontal rule',
    h_para: 'Paragraph', h_n: 'Heading',
    // find
    find_ph: 'Find in document', replace_ph: 'Replace with', f_case: 'Match case', f_regex: 'Regular expression', f_prev: 'Previous match', f_next: 'Next match',
    f_replace: 'Replace', replace_one: 'Replace', replace_all: 'Replace all', no_match: 'No results', bad_regex: 'Invalid pattern', replaced: 'Replaced {n} matches', find_replace: 'Find and replace',
    // empty
    empty_t: 'Write, preview and polish Markdown', empty_h: 'Create a new file, open an existing one, or drop a .md file anywhere in this window.', sample: 'Sample document', drop: 'Drop Markdown files to open them',
    drop_bad: 'Only Markdown or text files can be opened',
    // status
    ln: 'Ln', col: 'Col', selected: 'selected', words: 'words', chars: 'chars', min: 'min read', unsaved: 'Unsaved changes', saved_s: 'Saved', new_file: 'New file',
    eol: 'Line endings (click to switch)', zoom_in: 'Zoom in', zoom_out: 'Zoom out', zoom_reset: 'Reset zoom', untitled: 'Untitled', no_toc: 'No headings in this document',
    // messages
    saved: 'Saved', save_fail: 'Could not save the file', read_fail: 'Could not read the file', reloaded: 'Reloaded because the file changed on disk', ext_changed: 'This file changed on disk',
    reload: 'Reload', copied: 'Copied', copy: 'Copy', copy_fail: 'Could not copy', lossy: '{n} is not valid UTF-8, some characters were replaced', exported: 'HTML exported', show: 'Show',
    // dialogs
    save_q_title: 'Save changes?', save_q: 'Do you want to save the changes you made to {n}?', cancel: 'Cancel', dont_save: "Don't save", close_tab: 'Close tab', next_tab: 'Next tab', prev_tab: 'Previous tab',
    // menu
    export_html: 'Export as HTML', print: 'Print / PDF', copy_path: 'Copy file path', reveal: 'Show in folder', shortcuts: 'Keyboard shortcuts', about: 'About', no_recent: 'No recent files', clear_recent: 'Clear list',
    // settings
    s_appearance: 'Appearance', s_theme: 'Theme', theme_system: 'System', theme_light: 'Light', theme_dark: 'Dark', s_color: 'Theme colour', s_color_d: 'Pick a Material colour. The whole palette is generated from it.',
    preset_sky: 'Sky blue (theme file, default)', preset_blue: 'Blue (theme file)', preset_purple: 'Purple (theme file)', s_custom: 'Custom colour (hex)', s_contrast: 'Contrast', contrast_std: 'Standard', contrast_med: 'Medium', contrast_high: 'High',
    s_language: 'Language', lang_auto: 'Auto', s_window: 'Window on startup', win_remember: 'Remember window size', win_remember_d: 'Open at the size you last used.',
    win_max: 'Always maximized', win_max_d: 'Always open the window maximized.', s_editor: 'Editor', opt_wrap: 'Word wrap', opt_wrap_d: 'Wrap long lines in the editor.',
    opt_nums: 'Line numbers', opt_nums_d: 'Show line numbers next to the text.', opt_sync: 'Synchronized scrolling', opt_sync_d: 'Keep editor and preview aligned in split view.',
    opt_auto: 'Autosave', opt_auto_d: 'Save files automatically a moment after you stop typing.', opt_zoom: 'Text size', reset: 'Reset settings', reset_done: 'Settings restored',
    // theme toasts
    // about
    version: 'Version', tagline: 'A Material Design 3 Markdown editor and viewer.', made_by: 'Designed and developed by', with_ai: 'with the assistance of AI',
    // alerts
    alert_note: 'Note', alert_tip: 'Tip', alert_important: 'Important', alert_warning: 'Warning', alert_caution: 'Caution',
  },
  vi: {
    open: 'Mở', new: 'Tệp mới', save: 'Lưu', save_as: 'Lưu thành…', recent: 'Tệp gần đây', more: 'Thêm', find: 'Tìm kiếm', outline: 'Mục lục', outline_show: 'Hiện mục lục', outline_hide: 'Ẩn mục lục', settings: 'Cài đặt',
    m_edit: 'Soạn', m_split: 'Chia đôi', m_preview: 'Xem', close: 'Đóng', w_min: 'Thu nhỏ', w_max: 'Phóng to', w_restore: 'Khôi phục', w_close: 'Đóng',
    c_undo: 'Hoàn tác', c_redo: 'Làm lại', c_bold: 'In đậm', c_italic: 'In nghiêng', c_strike: 'Gạch ngang', c_heading: 'Tiêu đề', c_quote: 'Trích dẫn', c_code: 'Mã dòng',
    c_codeblock: 'Khối mã', c_link: 'Liên kết', c_image: 'Hình ảnh', c_ul: 'Danh sách chấm', c_ol: 'Danh sách số', c_task: 'Danh sách việc cần làm', c_table: 'Bảng', c_hr: 'Đường kẻ ngang',
    h_para: 'Đoạn văn', h_n: 'Tiêu đề',
    find_ph: 'Tìm trong tài liệu', replace_ph: 'Thay bằng', f_case: 'Phân biệt hoa thường', f_regex: 'Biểu thức chính quy', f_prev: 'Kết quả trước', f_next: 'Kết quả sau',
    f_replace: 'Thay thế', replace_one: 'Thay thế', replace_all: 'Thay tất cả', no_match: 'Không có kết quả', bad_regex: 'Mẫu không hợp lệ', replaced: 'Đã thay {n} kết quả', find_replace: 'Tìm và thay thế',
    empty_t: 'Viết, xem trước và hoàn thiện Markdown', empty_h: 'Tạo tệp mới, mở tệp có sẵn hoặc kéo thả tệp .md vào bất kỳ đâu trong cửa sổ này.', sample: 'Tài liệu mẫu', drop: 'Thả tệp Markdown để mở',
    drop_bad: 'Chỉ mở được tệp Markdown hoặc văn bản',
    ln: 'Dòng', col: 'Cột', selected: 'đã chọn', words: 'từ', chars: 'ký tự', min: 'phút đọc', unsaved: 'Chưa lưu thay đổi', saved_s: 'Đã lưu', new_file: 'Tệp mới',
    eol: 'Kiểu xuống dòng (bấm để đổi)', zoom_in: 'Phóng to', zoom_out: 'Thu nhỏ', zoom_reset: 'Đặt lại thu phóng', untitled: 'Chưa đặt tên', no_toc: 'Tài liệu không có tiêu đề',
    saved: 'Đã lưu', save_fail: 'Không lưu được tệp', read_fail: 'Không đọc được tệp', reloaded: 'Đã tải lại vì tệp thay đổi trên đĩa', ext_changed: 'Tệp này đã thay đổi trên đĩa',
    reload: 'Tải lại', copied: 'Đã sao chép', copy: 'Sao chép', copy_fail: 'Không sao chép được', lossy: '{n} không phải UTF-8 hợp lệ, một số ký tự đã bị thay thế', exported: 'Đã xuất HTML', show: 'Hiện',
    save_q_title: 'Lưu thay đổi?', save_q: 'Bạn có muốn lưu các thay đổi đã thực hiện với {n} không?', cancel: 'Hủy', dont_save: 'Không lưu', close_tab: 'Đóng thẻ', next_tab: 'Thẻ kế tiếp', prev_tab: 'Thẻ trước',
    export_html: 'Xuất ra HTML', print: 'In / PDF', copy_path: 'Sao chép đường dẫn', reveal: 'Mở thư mục chứa tệp', shortcuts: 'Phím tắt', about: 'Giới thiệu', no_recent: 'Chưa có tệp gần đây', clear_recent: 'Xóa danh sách',
    s_appearance: 'Giao diện', s_theme: 'Chế độ', theme_system: 'Hệ thống', theme_light: 'Sáng', theme_dark: 'Tối', s_color: 'Màu chủ đề', s_color_d: 'Chọn một màu Material. Toàn bộ bảng màu sẽ được tạo từ màu này.',
    preset_sky: 'Xanh da trời (tệp theme, mặc định)', preset_blue: 'Xanh dương (tệp theme)', preset_purple: 'Tím (tệp theme)', s_custom: 'Màu tùy chỉnh (hex)', s_contrast: 'Độ tương phản', contrast_std: 'Chuẩn', contrast_med: 'Vừa', contrast_high: 'Cao',
    s_language: 'Ngôn ngữ', lang_auto: 'Tự động', s_window: 'Cửa sổ khi mở app', win_remember: 'Ghi nhớ kích thước cửa sổ', win_remember_d: 'Mở lên đúng kích thước lần trước bạn dùng.',
    win_max: 'Luôn phóng to tối đa', win_max_d: 'Luôn mở cửa sổ ở chế độ phóng to tối đa.', s_editor: 'Trình soạn thảo', opt_wrap: 'Tự xuống dòng', opt_wrap_d: 'Ngắt dòng dài trong trình soạn thảo.',
    opt_nums: 'Số dòng', opt_nums_d: 'Hiện số dòng bên cạnh văn bản.', opt_sync: 'Cuộn đồng bộ', opt_sync_d: 'Giữ trình soạn thảo và bản xem trước cùng vị trí khi chia đôi.',
    opt_auto: 'Tự động lưu', opt_auto_d: 'Tự lưu tệp sau khi bạn ngừng gõ một lúc.', opt_zoom: 'Cỡ chữ', reset: 'Đặt lại cài đặt', reset_done: 'Đã khôi phục cài đặt',
    version: 'Phiên bản', tagline: 'Trình soạn thảo và xem Markdown theo phong cách Material Design 3.', made_by: 'Thiết kế và phát triển bởi', with_ai: 'với sự hỗ trợ của AI',
    alert_note: 'Ghi chú', alert_tip: 'Mẹo', alert_important: 'Quan trọng', alert_warning: 'Cảnh báo', alert_caution: 'Lưu ý',
  },
};
export const PALETTE_VI = ['', 'Đỏ', 'Hồng', 'Tím', 'Tím than', 'Chàm', 'Xanh dương', 'Xanh lơ', 'Xanh mòng két', 'Xanh lá', 'Xanh lá nhạt', 'Chanh', 'Vàng', 'Hổ phách', 'Cam', 'Cam đậm', 'Nâu', 'Xám xanh'];

let pref = 'auto', lang = 'en';
export function detect() {
  const list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];
  for (const l of list) { if (/^vi\b/i.test(l)) return 'vi'; if (/^en\b/i.test(l)) return 'en'; }
  return 'en';
}
export function setLang(p) { pref = p === 'en' || p === 'vi' ? p : 'auto'; lang = pref === 'auto' ? detect() : pref; }
export const getLang = () => lang;
export const getPref = () => pref;
export function t(k, vars) {
  let s = T[lang][k] ?? T.en[k] ?? k;
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.replaceAll(`{${a}}`, b);
  return s;
}
export const _dict = T;
