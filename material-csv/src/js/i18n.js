// Tiny i18n layer: English + Vietnamese. t('key', {var}) and data-i18n* attributes in the markup.
import { app } from './state.js';

const en = {
  ok: 'OK', cancel: 'Cancel', close: 'Close', save: 'Save', dontSave: "Don't save", remove: 'Remove',
  rows: 'rows', cols: 'columns', row: 'Row', untitled: 'Untitled.csv', sampleName: 'Sample.csv', colN: 'Column {n}', copySuffix: ' (copy)',
  min: 'Min', max: 'Max', sum: 'Sum', avg: 'Avg', noMatch: 'No rows match the current filters', noRows: 'This table has no rows yet',
  selectAll: 'Select all', sortToggle: 'Sort (click to cycle)', colMenu: 'Column options', filterPh: 'Filter…',
  sHead1: 'ID', sHead2: 'Name', sHead3: 'City', sHead4: 'Department', sHead5: 'Age', sHead6: 'Score', sHead7: 'Status',

  pasted: 'Pasted {n} cells', deletedRows: 'Deleted {n} rows', deletedCols: 'Deleted {n} columns',
  clearViewFirst: 'Clear sorting and filters before moving rows', keepOneCol: 'A table needs at least one column',
  sortedBy: 'Sorted by {c}', cellsChanged: '{n} cells changed', nothingToDo: 'Nothing to change', removedRows: 'Removed {n} rows',
  replacedN: 'Replaced in {n} cells', openFailed: 'Could not open', saveFailed: 'Could not save the file', saved: 'Saved {name}',
  exported: 'Exported {n} rows', exportFailed: 'Export failed', encFailTitle: 'Encoding cannot represent this data',
  encFailBody: 'Some characters cannot be stored in {enc}. Save as UTF-8 instead?', saveUtf8: 'Save as UTF-8',
  chooseSheet: 'Choose a sheet to open', selCells: '{n} cells selected', cut: 'Cut', copied: 'Copied', clipDenied: 'Clipboard access was denied',
  reopened: 'Reopened as {enc}', 'delim.saveOnly': 'The delimiter will be used when saving', applyOnSave: 'Applies the next time you save',
  'goto.label': 'Row number (1 – {n})', 'goto.hidden': 'That row is hidden by a filter', 'rename.label': 'Column name',
  'unsaved.title': 'Save changes?', 'unsaved.body': '“{name}” has unsaved changes. Do you want to save them?',

  h_edit: 'Edit cell', h_clear: 'Clear cells', h_filldown: 'Fill down', h_fillright: 'Fill right', h_paste: 'Paste', h_insrow: 'Insert rows',
  h_delrow: 'Delete rows', h_duprow: 'Duplicate rows', h_moverow: 'Move rows', h_inscol: 'Insert columns', h_delcol: 'Delete columns',
  h_rename: 'Rename column', h_dupcol: 'Duplicate column', h_movecol: 'Move columns', h_sort: 'Sort data', h_dedupe: 'Remove duplicates',
  h_rmempty: 'Remove empty rows', h_header: 'Toggle header row', h_replace: 'Replace',

  'menu.export': 'Export', 'menu.rows': 'Rows', 'menu.cols': 'Columns', 'menu.sort': 'Sort', 'menu.filter': 'Filter', 'menu.find': 'Find',
  'menu.tools': 'Data tools', 'menu.columns': 'Columns', 'sort.apply': 'Apply to the data (undoable)',
  'view.table': 'Table', 'view.cards': 'Cards', 'view.list': 'List',

  'c.file.new': 'New', 'c.file.open': 'Open', 'c.file.save': 'Save', 'c.file.saveAs': 'Save as…', 'c.file.close': 'Close tab', 'c.file.reveal': 'Show in folder',
  'c.export.csv': 'Export as CSV', 'c.export.tsv': 'Export as TSV', 'c.export.json': 'Export as JSON', 'c.export.xlsx': 'Export as Excel',
  'c.export.md': 'Export as Markdown', 'c.export.html': 'Export as HTML table',
  'c.app.settings': 'Settings', 'c.app.about': 'About', 'c.app.shortcuts': 'Keyboard shortcuts', 'c.app.palette': 'Command palette',
  'c.app.fullscreen': 'Toggle full screen', 'c.app.theme': 'Switch theme', 'c.app.language': 'Switch language', 'c.tab.next': 'Next tab', 'c.tab.prev': 'Previous tab',
  'c.edit.undo': 'Undo', 'c.edit.redo': 'Redo', 'c.edit.cut': 'Cut', 'c.edit.copy': 'Copy', 'c.edit.copyHeaders': 'Copy with headers', 'c.edit.paste': 'Paste',
  'c.edit.clear': 'Clear cells', 'c.edit.edit': 'Edit cell', 'c.edit.fillDown': 'Fill down', 'c.edit.fillRight': 'Fill right', 'c.edit.selectAll': 'Select all',
  'c.rows.insertAbove': 'Insert row above', 'c.rows.insertBelow': 'Insert row below', 'c.rows.delete': 'Delete rows', 'c.rows.duplicate': 'Duplicate rows',
  'c.rows.moveUp': 'Move rows up', 'c.rows.moveDown': 'Move rows down',
  'c.cols.insertLeft': 'Insert column left', 'c.cols.insertRight': 'Insert column right', 'c.cols.delete': 'Delete columns', 'c.cols.rename': 'Rename column',
  'c.cols.duplicate': 'Duplicate column', 'c.cols.moveLeft': 'Move columns left', 'c.cols.moveRight': 'Move columns right', 'c.cols.hide': 'Hide columns',
  'c.cols.showAll': 'Show all columns', 'c.cols.autoFit': 'Auto-fit column width',
  'c.data.sortAsc': 'Sort A → Z (view)', 'c.data.sortDesc': 'Sort Z → A (view)', 'c.data.sortClear': 'Clear sorting',
  'c.data.sortApplyAsc': 'Sort data A → Z', 'c.data.sortApplyDesc': 'Sort data Z → A', 'c.data.find': 'Find', 'c.data.replace': 'Find and replace',
  'c.data.goto': 'Go to row…', 'c.data.filterRow': 'Filter row', 'c.data.advFilter': 'Advanced filter', 'c.data.clearFilters': 'Clear filters and sorting',
  'c.data.header': 'First row is header', 'c.data.dedupe': 'Remove duplicate rows', 'c.data.rmEmpty': 'Remove empty rows', 'c.data.trim': 'Trim spaces',
  'c.data.upper': 'UPPERCASE', 'c.data.lower': 'lowercase', 'c.data.title': 'Title Case', 'c.data.stats': 'Column statistics',
  'c.view.table': 'Table view', 'c.view.cards': 'Cards view', 'c.view.list': 'List view', 'c.view.details': 'Row details', 'c.view.zoomIn': 'Zoom in',
  'c.view.zoomOut': 'Zoom out', 'c.view.zoomReset': 'Reset zoom',

  'find.ph': 'Find', 'find.case': 'Match case', 'find.whole': 'Whole cell', 'find.regex': 'Regular expression', 'find.prev': 'Previous (Shift+Enter)',
  'find.next': 'Next (Enter)', 'find.filter': 'Show only matching rows', 'find.replacePh': 'Replace with', 'find.replace': 'Replace', 'find.replaceAll': 'Replace all',
  'find.inSelection': 'In selection', 'find.invalid': 'Invalid expression', 'find.none': 'No results', 'find.of': '{i} of {n}', 'find.results': '{n} results',
  'adv.add': 'Add condition', 'adv.clear': 'Clear', 'adv.value': 'Value',
  'op.ct': 'contains', 'op.nc': 'does not contain', 'op.=': 'equals', 'op.≠': 'not equal', 'op.>': 'greater than', 'op.<': 'less than',
  'op.≥': 'at least', 'op.≤': 'at most', 'op.sw': 'starts with', 'op.ew': 'ends with', 'op.em': 'is empty', 'op.ne': 'is not empty',
  'fx.ph': 'Select a cell to see and edit its value', 'details.title': 'Row details', 'details.empty': 'Select a row to edit all of its fields here.',
  'welcome.sub': 'A fast, friendly CSV editor.', 'welcome.sample': 'Try a sample', 'welcome.drop': 'Drop a CSV, TSV or Excel file anywhere', 'welcome.recent': 'Recent files',
  'credit.by': 'Crafted by', 'credit.with': 'with the help of AI',
  'status.delim': 'Delimiter', 'status.enc': 'Encoding', 'status.eol': 'Line endings', 'status.headerOn': 'Header row', 'status.headerOff': 'No header', 'status.zoom': 'Zoom',
  'delim.comma': 'Comma ( , )', 'delim.semicolon': 'Semicolon ( ; )', 'delim.tab': 'Tab', 'delim.pipe': 'Pipe ( | )',
  'enc.save': 'Save with encoding', 'enc.reopen': 'Reopen with encoding', 'enc.bom': 'Write byte order mark (BOM)',

  'set.appearance': 'Appearance', 'set.theme': 'App theme', 'set.themeDesc': 'Choose light, dark or follow Windows', 'theme.system': 'System', 'theme.light': 'Light', 'theme.dark': 'Dark',
  'set.accent': 'Theme color', 'set.accentDesc': 'Pick a seed color: the whole Material 3 palette is generated from it', 'set.custom': 'Custom color', 'set.reset': 'Reset',
  'set.density': 'Row density', 'set.densityDesc': 'How tall each table row is', 'density.compact': 'Compact', 'density.normal': 'Standard', 'density.comfy': 'Comfortable',
  'set.anim': 'Animations', 'set.animDesc': 'Smooth transitions and effects', 'set.zebra': 'Alternating rows', 'set.zebraDesc': 'Shade every other row',
  'set.lines': 'Grid lines', 'set.linesDesc': 'Show lines between cells',
  'set.general': 'General', 'set.language': 'Language', 'set.languageDesc': 'Display language of the app', 'lang.system': 'Follow system',
  'set.details': 'Row details panel', 'set.detailsDesc': 'Edit the selected row as a form on the right', 'app.shortcuts': 'Keyboard shortcuts', 'set.shortcutsDesc': 'See every shortcut', 'set.open': 'Open',
  'set.files': 'Files and data', 'set.quoteAll': 'Quote every field', 'set.quoteAllDesc': 'Wrap all values in quotes when saving',
  'set.newBom': 'UTF-8 BOM for new files', 'set.newBomDesc': 'Helps Excel read accented characters', 'set.newEol': 'Line endings for new files', 'set.newEolDesc': 'Windows (CRLF) or Unix (LF)',
  'set.recent': 'Recent files', 'set.recentDesc': '{n} files remembered', 'set.clear': 'Clear',
  'set.window': 'Window', 'set.windowDesc': 'Choose how the window opens. F11 toggles full screen at any time.', 'win.remember': 'Remember window size', 'win.rememberDesc': 'Resize the window and it reopens exactly that size and position next time',
  'win.maximized': 'Always open maximized', 'win.maximizedDesc': 'Material CSV always starts in a maximized window', 'set.contrast': 'Contrast', 'set.contrastDesc': 'Material 3 contrast level for text and surfaces', 'contrast.standard': 'Standard', 'contrast.medium': 'Medium', 'contrast.high': 'High',
  'set.resetSize': 'Reset window size', 'set.resetSizeDesc': 'Go back to the default 1280 × 800 window', 'set.resetDone': 'Window size reset',
  'set.p.appearance': 'Appearance', 'set.p.general': 'General', 'set.p.files': 'Files and data', 'set.p.window': 'Window', 'set.p.about': 'About',
  'about.version': 'Version', 'about.desc': 'A modern CSV editor with a Material Design 3 interface: edit, sort, filter, find and replace, undo and export.',
  'about.author': 'Author', 'about.ai': 'Built with the help of AI', 'about.license': 'MIT License',
  'sc.file': 'Files and tabs', 'sc.edit': 'Editing', 'sc.structure': 'Rows and columns', 'sc.data': 'Data', 'sc.app': 'App and view', 'sc.nav': 'Navigation',
  'sc.move': 'Move the active cell', 'sc.extend': 'Extend the selection', 'sc.jump': 'Jump to the edge of data', 'sc.confirm': 'Confirm edit and move', 'sc.cancel': 'Cancel edit',
  'sc.newline': 'New line inside a cell', 'sc.selcol': 'Select column / row',
  'palette.ph': 'Type a command…', 'palette.none': 'No matching command',
  'stats.title': 'Statistics', 'stats.rows': 'Rows', 'stats.filled': 'Filled', 'stats.empty': 'Empty', 'stats.unique': 'Unique', 'stats.minLen': 'Shortest', 'stats.maxLen': 'Longest', 'stats.top': 'Most frequent values',
};

const vi = {
  ok: 'OK', cancel: 'Hủy', close: 'Đóng', save: 'Lưu', dontSave: 'Không lưu', remove: 'Xóa',
  rows: 'dòng', cols: 'cột', row: 'Dòng', untitled: 'Chưa đặt tên.csv', sampleName: 'Mẫu.csv', colN: 'Cột {n}', copySuffix: ' (bản sao)',
  min: 'Nhỏ nhất', max: 'Lớn nhất', sum: 'Tổng', avg: 'Trung bình', noMatch: 'Không có dòng nào khớp bộ lọc', noRows: 'Bảng này chưa có dòng nào',
  selectAll: 'Chọn tất cả', sortToggle: 'Sắp xếp (bấm để đổi chiều)', colMenu: 'Tùy chọn cột', filterPh: 'Lọc…',
  sHead1: 'Mã', sHead2: 'Họ tên', sHead3: 'Thành phố', sHead4: 'Phòng ban', sHead5: 'Tuổi', sHead6: 'Điểm', sHead7: 'Trạng thái',

  pasted: 'Đã dán {n} ô', deletedRows: 'Đã xóa {n} dòng', deletedCols: 'Đã xóa {n} cột',
  clearViewFirst: 'Hãy bỏ sắp xếp và bộ lọc trước khi di chuyển dòng', keepOneCol: 'Bảng cần có ít nhất một cột',
  sortedBy: 'Đã sắp xếp theo {c}', cellsChanged: 'Đã thay đổi {n} ô', nothingToDo: 'Không có gì để thay đổi', removedRows: 'Đã xóa {n} dòng',
  replacedN: 'Đã thay thế trong {n} ô', openFailed: 'Không thể mở', saveFailed: 'Không thể lưu tệp', saved: 'Đã lưu {name}',
  exported: 'Đã xuất {n} dòng', exportFailed: 'Xuất tệp thất bại', encFailTitle: 'Bảng mã không lưu được dữ liệu này',
  encFailBody: 'Một số ký tự không thể lưu trong {enc}. Lưu bằng UTF-8?', saveUtf8: 'Lưu bằng UTF-8',
  chooseSheet: 'Chọn trang tính để mở', selCells: 'Đã chọn {n} ô', cut: 'Đã cắt', copied: 'Đã sao chép', clipDenied: 'Không có quyền truy cập bộ nhớ tạm',
  reopened: 'Đã mở lại bằng {enc}', 'delim.saveOnly': 'Dấu phân cách sẽ được dùng khi lưu', applyOnSave: 'Áp dụng ở lần lưu tiếp theo',
  'goto.label': 'Số dòng (1 – {n})', 'goto.hidden': 'Dòng này đang bị ẩn bởi bộ lọc', 'rename.label': 'Tên cột',
  'unsaved.title': 'Lưu thay đổi?', 'unsaved.body': '“{name}” có thay đổi chưa lưu. Bạn có muốn lưu không?',

  h_edit: 'Sửa ô', h_clear: 'Xóa nội dung ô', h_filldown: 'Điền xuống', h_fillright: 'Điền sang phải', h_paste: 'Dán', h_insrow: 'Chèn dòng',
  h_delrow: 'Xóa dòng', h_duprow: 'Nhân đôi dòng', h_moverow: 'Di chuyển dòng', h_inscol: 'Chèn cột', h_delcol: 'Xóa cột',
  h_rename: 'Đổi tên cột', h_dupcol: 'Nhân đôi cột', h_movecol: 'Di chuyển cột', h_sort: 'Sắp xếp dữ liệu', h_dedupe: 'Xóa dòng trùng',
  h_rmempty: 'Xóa dòng trống', h_header: 'Bật/tắt dòng tiêu đề', h_replace: 'Thay thế',

  'menu.export': 'Xuất', 'menu.rows': 'Dòng', 'menu.cols': 'Cột', 'menu.sort': 'Sắp xếp', 'menu.filter': 'Lọc', 'menu.find': 'Tìm',
  'menu.tools': 'Công cụ dữ liệu', 'menu.columns': 'Cột', 'sort.apply': 'Áp dụng vào dữ liệu (hoàn tác được)',
  'view.table': 'Bảng', 'view.cards': 'Thẻ', 'view.list': 'Danh sách',

  'c.file.new': 'Mới', 'c.file.open': 'Mở', 'c.file.save': 'Lưu', 'c.file.saveAs': 'Lưu thành…', 'c.file.close': 'Đóng tab', 'c.file.reveal': 'Mở thư mục chứa tệp',
  'c.export.csv': 'Xuất CSV', 'c.export.tsv': 'Xuất TSV', 'c.export.json': 'Xuất JSON', 'c.export.xlsx': 'Xuất Excel',
  'c.export.md': 'Xuất Markdown', 'c.export.html': 'Xuất bảng HTML',
  'c.app.settings': 'Cài đặt', 'c.app.about': 'Giới thiệu', 'c.app.shortcuts': 'Phím tắt', 'c.app.palette': 'Bảng lệnh',
  'c.app.fullscreen': 'Bật/tắt toàn màn hình', 'c.app.theme': 'Đổi giao diện', 'c.app.language': 'Đổi ngôn ngữ', 'c.tab.next': 'Tab kế tiếp', 'c.tab.prev': 'Tab trước',
  'c.edit.undo': 'Hoàn tác', 'c.edit.redo': 'Làm lại', 'c.edit.cut': 'Cắt', 'c.edit.copy': 'Sao chép', 'c.edit.copyHeaders': 'Sao chép kèm tiêu đề', 'c.edit.paste': 'Dán',
  'c.edit.clear': 'Xóa nội dung ô', 'c.edit.edit': 'Sửa ô', 'c.edit.fillDown': 'Điền xuống', 'c.edit.fillRight': 'Điền sang phải', 'c.edit.selectAll': 'Chọn tất cả',
  'c.rows.insertAbove': 'Chèn dòng phía trên', 'c.rows.insertBelow': 'Chèn dòng phía dưới', 'c.rows.delete': 'Xóa dòng', 'c.rows.duplicate': 'Nhân đôi dòng',
  'c.rows.moveUp': 'Chuyển dòng lên', 'c.rows.moveDown': 'Chuyển dòng xuống',
  'c.cols.insertLeft': 'Chèn cột bên trái', 'c.cols.insertRight': 'Chèn cột bên phải', 'c.cols.delete': 'Xóa cột', 'c.cols.rename': 'Đổi tên cột',
  'c.cols.duplicate': 'Nhân đôi cột', 'c.cols.moveLeft': 'Chuyển cột sang trái', 'c.cols.moveRight': 'Chuyển cột sang phải', 'c.cols.hide': 'Ẩn cột',
  'c.cols.showAll': 'Hiện tất cả cột', 'c.cols.autoFit': 'Tự điều chỉnh độ rộng cột',
  'c.data.sortAsc': 'Sắp xếp A → Z (chế độ xem)', 'c.data.sortDesc': 'Sắp xếp Z → A (chế độ xem)', 'c.data.sortClear': 'Bỏ sắp xếp',
  'c.data.sortApplyAsc': 'Sắp xếp dữ liệu A → Z', 'c.data.sortApplyDesc': 'Sắp xếp dữ liệu Z → A', 'c.data.find': 'Tìm kiếm', 'c.data.replace': 'Tìm và thay thế',
  'c.data.goto': 'Đi tới dòng…', 'c.data.filterRow': 'Hàng lọc nhanh', 'c.data.advFilter': 'Bộ lọc nâng cao', 'c.data.clearFilters': 'Xóa bộ lọc và sắp xếp',
  'c.data.header': 'Dòng đầu là tiêu đề', 'c.data.dedupe': 'Xóa dòng trùng lặp', 'c.data.rmEmpty': 'Xóa dòng trống', 'c.data.trim': 'Cắt khoảng trắng thừa',
  'c.data.upper': 'IN HOA', 'c.data.lower': 'in thường', 'c.data.title': 'Viết Hoa Chữ Đầu', 'c.data.stats': 'Thống kê cột',
  'c.view.table': 'Dạng bảng', 'c.view.cards': 'Dạng thẻ', 'c.view.list': 'Dạng danh sách', 'c.view.details': 'Chi tiết dòng', 'c.view.zoomIn': 'Phóng to',
  'c.view.zoomOut': 'Thu nhỏ', 'c.view.zoomReset': 'Đặt lại thu phóng',

  'find.ph': 'Tìm', 'find.case': 'Phân biệt hoa thường', 'find.whole': 'Khớp cả ô', 'find.regex': 'Biểu thức chính quy', 'find.prev': 'Trước (Shift+Enter)',
  'find.next': 'Tiếp (Enter)', 'find.filter': 'Chỉ hiện dòng khớp', 'find.replacePh': 'Thay bằng', 'find.replace': 'Thay thế', 'find.replaceAll': 'Thay tất cả',
  'find.inSelection': 'Trong vùng chọn', 'find.invalid': 'Biểu thức không hợp lệ', 'find.none': 'Không có kết quả', 'find.of': '{i} / {n}', 'find.results': '{n} kết quả',
  'adv.add': 'Thêm điều kiện', 'adv.clear': 'Xóa hết', 'adv.value': 'Giá trị',
  'op.ct': 'chứa', 'op.nc': 'không chứa', 'op.=': 'bằng', 'op.≠': 'khác', 'op.>': 'lớn hơn', 'op.<': 'nhỏ hơn',
  'op.≥': 'ít nhất', 'op.≤': 'nhiều nhất', 'op.sw': 'bắt đầu bằng', 'op.ew': 'kết thúc bằng', 'op.em': 'để trống', 'op.ne': 'không trống',
  'fx.ph': 'Chọn một ô để xem và sửa giá trị', 'details.title': 'Chi tiết dòng', 'details.empty': 'Chọn một dòng để sửa tất cả các trường tại đây.',
  'welcome.sub': 'Trình chỉnh sửa CSV nhanh và dễ dùng.', 'welcome.sample': 'Thử dữ liệu mẫu', 'welcome.drop': 'Kéo thả tệp CSV, TSV hoặc Excel vào bất kỳ đâu', 'welcome.recent': 'Tệp gần đây',
  'credit.by': 'Thực hiện bởi', 'credit.with': 'với sự hỗ trợ của AI',
  'status.delim': 'Dấu phân cách', 'status.enc': 'Bảng mã', 'status.eol': 'Kết thúc dòng', 'status.headerOn': 'Có tiêu đề', 'status.headerOff': 'Không tiêu đề', 'status.zoom': 'Thu phóng',
  'delim.comma': 'Dấu phẩy ( , )', 'delim.semicolon': 'Chấm phẩy ( ; )', 'delim.tab': 'Tab', 'delim.pipe': 'Gạch đứng ( | )',
  'enc.save': 'Lưu bằng bảng mã', 'enc.reopen': 'Mở lại bằng bảng mã', 'enc.bom': 'Ghi dấu thứ tự byte (BOM)',

  'set.appearance': 'Giao diện', 'set.theme': 'Chủ đề ứng dụng', 'set.themeDesc': 'Chọn sáng, tối hoặc theo Windows', 'theme.system': 'Hệ thống', 'theme.light': 'Sáng', 'theme.dark': 'Tối',
  'set.accent': 'Màu chủ đề', 'set.accentDesc': 'Chọn màu gốc: toàn bộ bảng màu Material 3 được tạo từ màu này', 'set.custom': 'Màu tùy chỉnh', 'set.reset': 'Đặt lại',
  'set.density': 'Mật độ dòng', 'set.densityDesc': 'Chiều cao của mỗi dòng trong bảng', 'density.compact': 'Gọn', 'density.normal': 'Tiêu chuẩn', 'density.comfy': 'Thoải mái',
  'set.anim': 'Hiệu ứng chuyển động', 'set.animDesc': 'Chuyển cảnh và hiệu ứng mượt mà', 'set.zebra': 'Dòng xen kẽ', 'set.zebraDesc': 'Tô bóng các dòng chẵn',
  'set.lines': 'Đường lưới', 'set.linesDesc': 'Hiện đường kẻ giữa các ô',
  'set.general': 'Chung', 'set.language': 'Ngôn ngữ', 'set.languageDesc': 'Ngôn ngữ hiển thị của ứng dụng', 'lang.system': 'Theo hệ thống',
  'set.details': 'Khung chi tiết dòng', 'set.detailsDesc': 'Sửa dòng đang chọn dưới dạng biểu mẫu ở bên phải', 'app.shortcuts': 'Phím tắt', 'set.shortcutsDesc': 'Xem tất cả phím tắt', 'set.open': 'Mở',
  'set.files': 'Tệp và dữ liệu', 'set.quoteAll': 'Đặt mọi trường trong dấu nháy', 'set.quoteAllDesc': 'Bọc tất cả giá trị trong dấu nháy kép khi lưu',
  'set.newBom': 'UTF-8 BOM cho tệp mới', 'set.newBomDesc': 'Giúp Excel đọc đúng tiếng Việt có dấu', 'set.newEol': 'Kết thúc dòng cho tệp mới', 'set.newEolDesc': 'Windows (CRLF) hoặc Unix (LF)',
  'set.recent': 'Tệp gần đây', 'set.recentDesc': 'Đang nhớ {n} tệp', 'set.clear': 'Xóa',
  'set.window': 'Cửa sổ', 'set.windowDesc': 'Chọn cách cửa sổ mở ra. F11 bật/tắt toàn màn hình bất cứ lúc nào.', 'win.remember': 'Ghi nhớ kích thước cửa sổ', 'win.rememberDesc': 'Thay đổi kích thước cửa sổ, lần sau mở lại đúng kích thước và vị trí đó',
  'win.maximized': 'Luôn mở phóng to tối đa', 'win.maximizedDesc': 'Material CSV luôn khởi động với cửa sổ phóng to tối đa', 'set.contrast': 'Độ tương phản', 'set.contrastDesc': 'Mức tương phản Material 3 cho chữ và bề mặt', 'contrast.standard': 'Tiêu chuẩn', 'contrast.medium': 'Trung bình', 'contrast.high': 'Cao',
  'set.resetSize': 'Đặt lại kích thước cửa sổ', 'set.resetSizeDesc': 'Quay về cửa sổ mặc định 1280 × 800', 'set.resetDone': 'Đã đặt lại kích thước cửa sổ',
  'set.p.appearance': 'Giao diện', 'set.p.general': 'Chung', 'set.p.files': 'Tệp và dữ liệu', 'set.p.window': 'Cửa sổ', 'set.p.about': 'Giới thiệu',
  'about.version': 'Phiên bản', 'about.desc': 'Trình chỉnh sửa CSV hiện đại với giao diện Material Design 3: sửa, sắp xếp, lọc, tìm và thay thế, hoàn tác và xuất tệp.',
  'about.author': 'Tác giả', 'about.ai': 'Thực hiện với sự hỗ trợ của AI', 'about.license': 'Giấy phép MIT',
  'sc.file': 'Tệp và tab', 'sc.edit': 'Chỉnh sửa', 'sc.structure': 'Dòng và cột', 'sc.data': 'Dữ liệu', 'sc.app': 'Ứng dụng và hiển thị', 'sc.nav': 'Di chuyển',
  'sc.move': 'Di chuyển ô đang chọn', 'sc.extend': 'Mở rộng vùng chọn', 'sc.jump': 'Nhảy tới mép dữ liệu', 'sc.confirm': 'Xác nhận và di chuyển', 'sc.cancel': 'Hủy chỉnh sửa',
  'sc.newline': 'Xuống dòng trong ô', 'sc.selcol': 'Chọn cột / dòng',
  'palette.ph': 'Nhập tên lệnh…', 'palette.none': 'Không có lệnh phù hợp',
  'stats.title': 'Thống kê', 'stats.rows': 'Số dòng', 'stats.filled': 'Có dữ liệu', 'stats.empty': 'Để trống', 'stats.unique': 'Giá trị khác nhau', 'stats.minLen': 'Ngắn nhất', 'stats.maxLen': 'Dài nhất', 'stats.top': 'Giá trị xuất hiện nhiều nhất',
};

export const DICT = { en, vi };

export function resolveLang(pref) {
  if (pref === 'en' || pref === 'vi') return pref;
  return /^vi\b/i.test(navigator.language || '') ? 'vi' : 'en';
}

export function setLang(pref) { app.lang = resolveLang(pref); }

export function t(key, vars) {
  let s = DICT[app.lang]?.[key] ?? en[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return s;
}

export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  root.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
}
