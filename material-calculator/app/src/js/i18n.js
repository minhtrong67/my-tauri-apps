import { settings, Emitter } from './store.js';

const en = {
  'set.font': 'Font', 'set.fontSize': 'Text size', 'size.sm': 'Small', 'size.md': 'Medium', 'size.lg': 'Large', 'font.system': 'System',
  'dlg.hist.t': 'Clear history?', 'dlg.hist.m': 'All saved calculations will be permanently removed.',
  'dlg.mem.t': 'Clear memory?', 'dlg.mem.m': 'All values stored in memory will be removed.', 'common.top': 'Back to top',
  'common.confirmClear': 'Clear', 'set.reset': 'Reset to defaults', 'dlg.reset.t': 'Reset all settings?', 'dlg.reset.m': 'Theme, font, language and window options return to their defaults.', 'common.reset': 'Reset',

  'app.name': 'Material Calculator',
  'nav.standard': 'Standard', 'nav.scientific': 'Scientific', 'nav.programmer': 'Programmer',
  'nav.converter': 'Converter', 'nav.date': 'Date', 'nav.settings': 'Settings',
  'common.copy': 'Copy', 'common.copied': 'Copied to clipboard', 'common.delete': 'Delete', 'common.clear': 'Clear',
  'common.cancel': 'Cancel', 'common.today': 'Today', 'common.close': 'Close', 'common.paste': 'Paste',
  'common.nothingToCopy': 'Nothing to copy', 'common.cleared': 'Cleared',
  'err.DIV0': 'Cannot divide by zero', 'err.DOMAIN': 'Invalid input', 'err.OVERFLOW': 'Result is too large', 'err.SYNTAX': 'Invalid expression',
  'calc.placeholder': '0', 'calc.backspace': 'Backspace', 'calc.clear': 'Clear all',
  'panel.history': 'History', 'panel.memory': 'Memory', 'panel.toggle': 'Show or hide history',
  'history.empty': 'No calculations yet', 'history.emptyHint': 'Results you calculate will appear here.',
  'history.clear': 'Clear history', 'history.useResult': 'Use result', 'history.cleared': 'History cleared',
  'memory.empty': 'Nothing stored in memory', 'memory.emptyHint': 'Use MS to store the displayed value.',
  'memory.clear': 'Clear memory', 'memory.cleared': 'Memory cleared', 'memory.stored': 'Stored in memory',
  'mem.mc': 'Clear memory', 'mem.mr': 'Recall memory', 'mem.mplus': 'Add to memory', 'mem.mminus': 'Subtract from memory', 'mem.ms': 'Store in memory',
  'sci.second': 'Second function', 'sci.hyp': 'Hyperbolic functions', 'sci.angle': 'Angle unit',
  'angle.deg': 'Degrees', 'angle.rad': 'Radians', 'angle.grad': 'Gradians',
  'prog.bits': 'Bit toggle', 'prog.word': 'Word size', 'prog.qword': 'QWORD (64-bit)', 'prog.dword': 'DWORD (32-bit)', 'prog.word16': 'WORD (16-bit)', 'prog.byte': 'BYTE (8-bit)',
  'conv.from': 'From', 'conv.to': 'To', 'conv.swap': 'Swap units', 'conv.all': 'All conversions', 'conv.unit': 'Unit', 'conv.value': 'Value',
  'cat.length': 'Length', 'cat.mass': 'Mass', 'cat.temperature': 'Temperature', 'cat.area': 'Area', 'cat.volume': 'Volume', 'cat.speed': 'Speed',
  'cat.time': 'Time', 'cat.data': 'Data', 'cat.energy': 'Energy', 'cat.power': 'Power', 'cat.pressure': 'Pressure', 'cat.angle': 'Angle',
  'date.diff': 'Difference', 'date.add': 'Add or subtract', 'date.from': 'From', 'date.to': 'To', 'date.start': 'Start date',
  'date.years': 'Years', 'date.months': 'Months', 'date.days': 'Days', 'date.plus': 'Add', 'date.minus': 'Subtract',
  'date.result': 'Result', 'date.totalDays': 'Total days', 'date.weeks': 'Weeks and days', 'date.same': 'Same day',
  'date.weekday': 'Day of week', 'date.diffTitle': 'Difference between two dates', 'date.addTitle': 'Add or subtract time',
  'unit.y': '{n} y', 'unit.m': '{n} mo', 'unit.d': '{n} d', 'unit.w': '{n} wk',
  'set.title': 'Settings',
  'set.appearance': 'Appearance', 'set.theme': 'Theme', 'theme.light': 'Light', 'theme.dark': 'Dark', 'theme.system': 'System',
  'set.color': 'Theme colour', 'set.colorCustom': 'Custom colour',
  'color.purple': 'Purple', 'color.indigo': 'Indigo', 'color.blue': 'Blue', 'color.teal': 'Teal', 'color.green': 'Green', 'color.amber': 'Amber', 'color.rose': 'Rose', 'color.red': 'Red',
  'set.language': 'Language', 'lang.system': 'System', 'lang.en': 'English', 'lang.vi': 'Tiếng Việt',
  'set.window': 'Window', 'set.windowOpen': 'When the app opens',
  'win.remember': 'Remember window size', 'win.rememberDesc': 'Reopens at the size you last resized it to.',
  'win.maximize': 'Always maximized', 'win.maximizeDesc': 'Always opens the window maximized.',
  'win.appliesNext': 'Applies the next time the app opens.',
  'set.onTop': 'Keep on top', 'set.onTopDesc': 'Keep the calculator above other windows.',
  'set.calculator': 'Calculator', 'set.angleDefault': 'Angle unit', 'set.grouping': 'Digit grouping', 'set.groupingDesc': 'Show thousands separators, for example 1,234,567.',
  'set.motion': 'Animations', 'motion.auto': 'Auto', 'motion.on': 'On', 'motion.off': 'Off', 'set.motionDesc': 'Auto follows your system reduced-motion setting.',
  'set.data': 'Data', 'set.clearHistory': 'Clear history', 'set.clearMemory': 'Clear memory',
  'set.about': 'About', 'about.version': 'Version {v}', 'about.tagline': 'A fast, full-featured calculator in Material Design 3.',
  'about.madeBy': 'Made by', 'about.withHelp': 'with help from', 'about.license': 'Released under the MIT License.',
  'set.shortcuts': 'Keyboard shortcuts',
  'sc.entry': 'Type with the keyboard: digits, + − * / ^ ( ) %', 'sc.equals': 'Enter or = to calculate', 'sc.clear': 'Esc to clear, Backspace to delete',
  'sc.copy': 'Ctrl+C copies the result, Ctrl+V pastes', 'sc.modes': 'Ctrl+1 to Ctrl+5 switch calculator', 'sc.history': 'Ctrl+H toggles history, Ctrl+, opens settings',
  'theme.toggle': 'Change theme',
};

const vi = {
  'set.font': 'Phông chữ', 'set.fontSize': 'Cỡ chữ', 'size.sm': 'Nhỏ', 'size.md': 'Vừa', 'size.lg': 'Lớn', 'font.system': 'Hệ thống',
  'dlg.hist.t': 'Xóa lịch sử?', 'dlg.hist.m': 'Toàn bộ phép tính đã lưu sẽ bị xóa vĩnh viễn.',
  'dlg.mem.t': 'Xóa bộ nhớ?', 'dlg.mem.m': 'Mọi giá trị đã lưu trong bộ nhớ sẽ bị xóa.', 'common.top': 'Lên đầu trang',
  'common.confirmClear': 'Xóa', 'set.reset': 'Khôi phục mặc định', 'dlg.reset.t': 'Khôi phục toàn bộ cài đặt?', 'dlg.reset.m': 'Giao diện, phông chữ, ngôn ngữ và cửa sổ sẽ về mặc định.', 'common.reset': 'Khôi phục',

  'app.name': 'Material Calculator',
  'nav.standard': 'Tiêu chuẩn', 'nav.scientific': 'Khoa học', 'nav.programmer': 'Lập trình',
  'nav.converter': 'Quy đổi', 'nav.date': 'Ngày tháng', 'nav.settings': 'Cài đặt',
  'common.copy': 'Sao chép', 'common.copied': 'Đã sao chép', 'common.delete': 'Xoá', 'common.clear': 'Xoá hết',
  'common.cancel': 'Huỷ', 'common.today': 'Hôm nay', 'common.close': 'Đóng', 'common.paste': 'Dán',
  'common.nothingToCopy': 'Không có gì để sao chép', 'common.cleared': 'Đã xoá',
  'err.DIV0': 'Không thể chia cho 0', 'err.DOMAIN': 'Giá trị không hợp lệ', 'err.OVERFLOW': 'Kết quả quá lớn', 'err.SYNTAX': 'Biểu thức không hợp lệ',
  'calc.placeholder': '0', 'calc.backspace': 'Xoá lùi', 'calc.clear': 'Xoá tất cả',
  'panel.history': 'Lịch sử', 'panel.memory': 'Bộ nhớ', 'panel.toggle': 'Hiện hoặc ẩn lịch sử',
  'history.empty': 'Chưa có phép tính nào', 'history.emptyHint': 'Kết quả bạn tính sẽ hiện ở đây.',
  'history.clear': 'Xoá lịch sử', 'history.useResult': 'Dùng kết quả', 'history.cleared': 'Đã xoá lịch sử',
  'memory.empty': 'Bộ nhớ đang trống', 'memory.emptyHint': 'Nhấn MS để lưu giá trị đang hiển thị.',
  'memory.clear': 'Xoá bộ nhớ', 'memory.cleared': 'Đã xoá bộ nhớ', 'memory.stored': 'Đã lưu vào bộ nhớ',
  'mem.mc': 'Xoá bộ nhớ', 'mem.mr': 'Gọi lại bộ nhớ', 'mem.mplus': 'Cộng vào bộ nhớ', 'mem.mminus': 'Trừ khỏi bộ nhớ', 'mem.ms': 'Lưu vào bộ nhớ',
  'sci.second': 'Hàm thứ hai', 'sci.hyp': 'Hàm hyperbolic', 'sci.angle': 'Đơn vị góc',
  'angle.deg': 'Độ', 'angle.rad': 'Radian', 'angle.grad': 'Grad',
  'prog.bits': 'Bật tắt bit', 'prog.word': 'Kích thước từ', 'prog.qword': 'QWORD (64-bit)', 'prog.dword': 'DWORD (32-bit)', 'prog.word16': 'WORD (16-bit)', 'prog.byte': 'BYTE (8-bit)',
  'conv.from': 'Từ', 'conv.to': 'Sang', 'conv.swap': 'Đổi chỗ đơn vị', 'conv.all': 'Tất cả quy đổi', 'conv.unit': 'Đơn vị', 'conv.value': 'Giá trị',
  'cat.length': 'Chiều dài', 'cat.mass': 'Khối lượng', 'cat.temperature': 'Nhiệt độ', 'cat.area': 'Diện tích', 'cat.volume': 'Thể tích', 'cat.speed': 'Tốc độ',
  'cat.time': 'Thời gian', 'cat.data': 'Dữ liệu', 'cat.energy': 'Năng lượng', 'cat.power': 'Công suất', 'cat.pressure': 'Áp suất', 'cat.angle': 'Góc',
  'date.diff': 'Chênh lệch', 'date.add': 'Cộng hoặc trừ', 'date.from': 'Từ ngày', 'date.to': 'Đến ngày', 'date.start': 'Ngày bắt đầu',
  'date.years': 'Năm', 'date.months': 'Tháng', 'date.days': 'Ngày', 'date.plus': 'Cộng', 'date.minus': 'Trừ',
  'date.result': 'Kết quả', 'date.totalDays': 'Tổng số ngày', 'date.weeks': 'Tuần và ngày', 'date.same': 'Cùng một ngày',
  'date.weekday': 'Thứ', 'date.diffTitle': 'Chênh lệch giữa hai ngày', 'date.addTitle': 'Cộng hoặc trừ thời gian',
  'unit.y': '{n} năm', 'unit.m': '{n} tháng', 'unit.d': '{n} ngày', 'unit.w': '{n} tuần',
  'set.title': 'Cài đặt',
  'set.appearance': 'Giao diện', 'set.theme': 'Chủ đề', 'theme.light': 'Sáng', 'theme.dark': 'Tối', 'theme.system': 'Theo hệ thống',
  'set.color': 'Màu chủ đề', 'set.colorCustom': 'Màu tuỳ chọn',
  'color.purple': 'Tím', 'color.indigo': 'Chàm', 'color.blue': 'Xanh dương', 'color.teal': 'Xanh ngọc', 'color.green': 'Xanh lá', 'color.amber': 'Hổ phách', 'color.rose': 'Hồng', 'color.red': 'Đỏ',
  'set.language': 'Ngôn ngữ', 'lang.system': 'Theo hệ thống', 'lang.en': 'English', 'lang.vi': 'Tiếng Việt',
  'set.window': 'Cửa sổ', 'set.windowOpen': 'Khi mở ứng dụng',
  'win.remember': 'Ghi nhớ kích thước cửa sổ', 'win.rememberDesc': 'Mở lại đúng kích thước bạn đã kéo lần trước.',
  'win.maximize': 'Luôn phóng to tối đa', 'win.maximizeDesc': 'Luôn mở cửa sổ ở chế độ phóng to tối đa.',
  'win.appliesNext': 'Áp dụng từ lần mở ứng dụng tiếp theo.',
  'set.onTop': 'Luôn nổi trên cùng', 'set.onTopDesc': 'Giữ máy tính phía trên các cửa sổ khác.',
  'set.calculator': 'Máy tính', 'set.angleDefault': 'Đơn vị góc', 'set.grouping': 'Phân tách hàng nghìn', 'set.groupingDesc': 'Hiện dấu phân cách hàng nghìn, ví dụ 1.234.567.',
  'set.motion': 'Hiệu ứng chuyển động', 'motion.auto': 'Tự động', 'motion.on': 'Bật', 'motion.off': 'Tắt', 'set.motionDesc': 'Tự động sẽ theo cài đặt giảm chuyển động của hệ thống.',
  'set.data': 'Dữ liệu', 'set.clearHistory': 'Xoá lịch sử', 'set.clearMemory': 'Xoá bộ nhớ',
  'set.about': 'Giới thiệu', 'about.version': 'Phiên bản {v}', 'about.tagline': 'Máy tính nhanh, đầy đủ chức năng theo phong cách Material Design 3.',
  'about.madeBy': 'Tác giả', 'about.withHelp': 'với sự hỗ trợ của', 'about.license': 'Phát hành theo giấy phép MIT.',
  'set.shortcuts': 'Phím tắt',
  'sc.entry': 'Gõ bằng bàn phím: chữ số, + − * / ^ ( ) %', 'sc.equals': 'Enter hoặc = để tính', 'sc.clear': 'Esc để xoá hết, Backspace để xoá lùi',
  'sc.copy': 'Ctrl+C sao chép kết quả, Ctrl+V để dán', 'sc.modes': 'Ctrl+1 đến Ctrl+5 để đổi loại máy tính', 'sc.history': 'Ctrl+H bật tắt lịch sử, Ctrl+, mở cài đặt',
  'theme.toggle': 'Đổi chủ đề',
};

const dicts = { en, vi };
export const i18n = new Emitter();
let lang = 'en';

export function resolveLang() {
  const s = settings.get('lang');
  if (s === 'en' || s === 'vi') return s;
  return (navigator.language || 'en').toLowerCase().startsWith('vi') ? 'vi' : 'en';
}
export function setLang() {
  lang = resolveLang();
  document.documentElement.lang = lang;
  i18n.emit('change', lang);
}
export const getLang = () => lang;
export function t(key, vars) {
  let s = dicts[lang][key] ?? en[key] ?? key;
  if (vars) for (const k in vars) s = s.replace(`{${k}}`, vars[k]);
  return s;
}

/** Locale-aware number grouping applied to numeric runs inside an expression string. */
export function formatDisplay(str, grouping = true) {
  const vi = lang === 'vi';
  const dec = vi ? ',' : '.', sep = vi ? '.' : ',';
  return str.replace(/\d+(?:\.\d*)?/g, (m) => {
    const [i, f] = m.split('.');
    const g = grouping && i.length > 3 ? i.replace(/\B(?=(\d{3})+(?!\d))/g, sep) : i;
    return f === undefined ? g : g + dec + f;
  }).replace(/-/g, '\u2212');
}
