export type Lang = 'en' | 'vi';
export type LangSetting = Lang | 'auto';

const en = {
  appName: 'Material JSON',
  'nav.editor': 'Editor', 'nav.query': 'Query', 'nav.compare': 'Compare', 'nav.convert': 'Convert', 'nav.schema': 'Schema', 'nav.settings': 'Settings',
  'act.new': 'New', 'act.open': 'Open', 'act.recent': 'Recent files', 'act.save': 'Save', 'act.saveAs': 'Save as…', 'act.close': 'Close',
  'act.copy': 'Copy', 'act.paste': 'Paste', 'act.format': 'Format', 'act.minify': 'Minify', 'act.sort': 'Sort keys', 'act.sortAsc': 'Sort A → Z', 'act.sortDesc': 'Sort Z → A',
  'act.repair': 'Repair', 'act.escape': 'Escape as string', 'act.unescape': 'Unescape string', 'act.wrap': 'Word wrap', 'act.undo': 'Undo', 'act.redo': 'Redo',
  'act.find': 'Find & replace', 'act.foldAll': 'Fold all', 'act.unfoldAll': 'Unfold all', 'act.stats': 'Statistics', 'act.cancel': 'Cancel', 'act.ok': 'OK',
  'act.swap': 'Swap sides', 'act.clear': 'Clear', 'act.more': 'More',
  'view.code': 'Code', 'view.split': 'Split', 'view.tree': 'Tree',
  'tab.untitled': 'Untitled', 'tab.close': 'Close tab', 'tab.new': 'New tab',
  'st.valid': 'Valid JSON', 'st.invalid': 'Invalid JSON', 'st.empty': 'Empty', 'st.fix': 'Repair', 'st.ln': 'Ln {n}', 'st.col': 'Col {n}', 'st.sel': '{n} selected',
  'st.lines': '{n} lines', 'st.unsaved': 'Unsaved', 'st.web': 'Browser mode',
  'err.unexpectedChar': 'Unexpected character {c}', 'err.unexpectedEnd': 'Unexpected end of data', 'err.expectedColon': 'Expected “:” after the key',
  'err.expectedCommaOrBrace': 'Expected “,” or “}” here', 'err.expectedCommaOrBracket': 'Expected “,” or “]” here', 'err.expectedKey': 'Expected a property name in double quotes',
  'err.badNumber': 'Invalid number', 'err.unterminatedString': 'Unterminated string', 'err.badEscape': 'Invalid escape sequence', 'err.controlChar': 'Control character {c} must be escaped',
  'err.trailingComma': 'Trailing comma is not allowed', 'err.trailingContent': 'Unexpected content after the JSON value', 'err.tooDeep': 'Nesting is too deep', 'err.unterminatedComment': 'Unterminated comment',
  'tree.search': 'Search keys & values', 'tree.expandAll': 'Expand all', 'tree.collapseAll': 'Collapse all', 'tree.copyPath': 'Copy path', 'tree.copyValue': 'Copy value',
  'tree.edit': 'Edit value', 'tree.delete': 'Delete', 'tree.empty': 'Nothing to show yet', 'tree.emptySub': 'Type or open some JSON to explore it as a tree.', 'tree.invalid': 'Fix the JSON to see the tree',
  'tree.items': '{n} items', 'tree.item': '1 item', 'tree.keys': '{n} keys', 'tree.key': '1 key', 'tree.more': 'Show {n} more', 'tree.matches': '{n} matches', 'tree.sync': 'Select in editor',
  'q.title': 'JSONPath query', 'q.placeholder': '$.store.book[?(@.price < 10)].title', 'q.run': 'Run', 'q.results': '{n} results', 'q.result': '1 result', 'q.none': 'No matches',
  'q.copyAll': 'Copy results', 'q.history': 'Recent queries', 'q.examples': 'Try an example', 'q.invalidDoc': 'The active document is not valid JSON.', 'q.hint': 'Supports $, ., .., [*], [0], [-1], [0:3], [“a”,“b”], and filters like [?(@.age > 18 && @.name =~ /^A/)].',
  'q.openInEditor': 'Show in editor', 'q.emptyTitle': 'Query your data', 'q.emptySub': 'Write a JSONPath expression to filter and extract values.',
  'cmp.title': 'Compare documents', 'cmp.with': 'Compare with', 'cmp.ignoreOrder': 'Ignore key order', 'cmp.identical': 'Both documents are identical', 'cmp.summary': '{a} added · {r} removed · {c} changed',
  'cmp.structure': 'Changes', 'cmp.text': 'Side by side', 'cmp.tooLarge': 'Too large for a side-by-side view — use the change list.', 'cmp.pick': 'Choose another tab', 'cmp.noOther': 'Open a second document to compare.',
  'cmp.invalid': 'Cannot compare: “{name}” is not valid JSON.', 'cmp.added': 'Added', 'cmp.removed': 'Removed', 'cmp.changed': 'Changed', 'cmp.openFile': 'Open file…', 'cmp.current': 'Current tab',
  'cv.title': 'Convert', 'cv.fromJson': 'JSON to…', 'cv.toJson': '… to JSON', 'cv.format': 'Format', 'cv.delimiter': 'Delimiter', 'cv.infer': 'Detect numbers & booleans', 'cv.input': 'Input', 'cv.output': 'Output',
  'cv.copy': 'Copy output', 'cv.save': 'Save as file', 'cv.openTab': 'Open in new tab', 'cv.paste': 'Paste or type {fmt} here…', 'cv.openFile': 'Open file', 'cv.auto': 'Auto', 'cv.comma': 'Comma', 'cv.semicolon': 'Semicolon',
  'cv.tab': 'Tab', 'cv.pipe': 'Pipe', 'cv.rootName': 'Root name', 'cv.fromTab': 'Source: active tab', 'cv.error': 'Conversion failed: {msg}', 'cv.idle': 'The result appears here.',
  'sc.title': 'JSON Schema validation', 'sc.schema': 'Schema', 'sc.pick': 'Choose a schema tab', 'sc.generate': 'Generate schema from current JSON', 'sc.validate': 'Validate', 'sc.valid': 'The document matches the schema',
  'sc.errors': '{n} problems found', 'sc.error': '1 problem found', 'sc.noSchema': 'Open your schema in another tab, or generate one from the current document.', 'sc.badSchema': 'The schema is not valid: {msg}', 'sc.invalidDoc': 'The active document is not valid JSON.',
  'sc.root': '(root)',
  'set.title': 'Settings', 'set.appearance': 'Appearance', 'set.theme': 'Theme', 'set.light': 'Light', 'set.dark': 'Dark', 'set.system': 'System', 'set.color': 'Theme color', 'set.custom': 'Custom color',
  'set.fontSize': 'Font size', 'set.font': 'Font', 'set.fontSystem': 'System default', 'set.small': 'Small', 'set.medium': 'Medium', 'set.large': 'Large', 'set.language': 'Language', 'set.auto': 'Auto', 'set.motion': 'Animations', 'set.motionDesc': 'Smooth transitions and visual effects',
  'set.window': 'Window', 'set.windowOpen': 'When the app starts', 'set.remember': 'Remember size', 'set.rememberDesc': 'Reopen with the size and position you left it', 'set.maximized': 'Always maximized', 'set.maximizedDesc': 'Always start in a maximized window', 'set.desktopOnly': 'Available in the desktop app',
  'set.editor': 'Editor', 'set.indent': 'Indentation', 'set.tab': 'Tab', 'set.spaces': '{n} spaces', 'set.wrap': 'Word wrap', 'set.wrapDesc': 'Wrap long lines in the editor', 'set.restore': 'Restore previous session', 'set.restoreDesc': 'Reopen your tabs and unsaved work on start',
  'set.shortcuts': 'Keyboard shortcuts', 'set.about': 'About', 'set.version': 'Version {v}', 'set.author': 'Author', 'set.madeWith': 'Made with support from', 'set.license': 'Open source · MIT License', 'set.reset': 'Reset settings',
  'set.resetDone': 'Settings reset', 'set.aboutDesc': 'A full-featured JSON editor and toolbox, built with Tauri and Material Design 3.',
  'sc.k.new': 'New tab', 'sc.k.open': 'Open file', 'sc.k.save': 'Save', 'sc.k.saveAs': 'Save as', 'sc.k.close': 'Close tab', 'sc.k.format': 'Format', 'sc.k.minify': 'Minify', 'sc.k.find': 'Find & replace', 'sc.k.next': 'Next tab', 'sc.k.settings': 'Settings', 'sc.k.palette': 'Switch view',
  'dlg.unsavedTitle': 'Save changes?', 'dlg.unsavedBody': '“{name}” has unsaved changes. Do you want to save them before closing?', 'dlg.save': 'Save', 'dlg.dontSave': 'Don’t save', 'dlg.cancel': 'Cancel',
  'dlg.quitTitle': 'Quit with unsaved work?', 'dlg.quitBody': '{n} tab(s) have unsaved changes that will be lost.', 'dlg.quit': 'Quit anyway', 'dlg.stats': 'Document statistics',
  'stat.size': 'Size', 'stat.lines': 'Lines', 'stat.depth': 'Max depth', 'stat.values': 'Values', 'stat.keys': 'Keys', 'stat.objects': 'Objects', 'stat.arrays': 'Arrays', 'stat.strings': 'Strings', 'stat.numbers': 'Numbers', 'stat.booleans': 'Booleans', 'stat.nulls': 'Nulls',
  'toast.saved': 'Saved “{name}”', 'toast.copied': 'Copied to clipboard', 'toast.formatted': 'Formatted', 'toast.minified': 'Minified', 'toast.sorted': 'Keys sorted', 'toast.repaired': 'Repaired', 'toast.escaped': 'Escaped', 'toast.unescaped': 'Unescaped',
  'toast.opened': 'Opened {n} file(s)', 'toast.readError': 'Could not read the file', 'toast.writeError': 'Could not save the file', 'toast.nothingToCopy': 'Nothing to copy', 'toast.invalid': 'Fix the JSON errors first', 'toast.cantUnescape': 'This text is not an escaped string',
  'toast.cantRepair': 'This JSON cannot be repaired automatically', 'toast.pathCopied': 'Path copied', 'toast.valueCopied': 'Value copied', 'toast.edited': 'Value updated', 'toast.deleted': 'Deleted', 'toast.alreadyOpen': 'Already open', 'toast.pickOther': 'Choose another tab',
  'toast.pasteFail': 'Clipboard is not available', 'toast.nothingToUndo': 'Nothing to do',
  'drop.title': 'Drop to open', 'drop.sub': 'Release JSON files anywhere in the window', 'editor.placeholder': 'Paste, type or drop JSON here…',
  'recent.empty': 'No recent files yet', 'recent.clear': 'Clear list', 'tree.editPrompt': 'New value', 'tree.editHint': 'Enter any JSON value, or plain text for a string.',
  'cv.web': 'Browser mode', 'win.title': 'Material JSON',
  'cmd.title': 'Command palette', 'cmd.placeholder': 'Type a command…', 'cmd.none': 'No matching command', 'cmd.group.file': 'File', 'cmd.group.edit': 'Edit', 'cmd.group.view': 'View', 'cmd.group.app': 'App',
  'tip.top': 'Scroll to top', 'act.palette': 'Command palette', 'st.path': 'Copy path of the cursor position',
  'tree.add': 'Add child', 'tree.addKey': 'Key name', 'tree.addValue': 'Value (JSON or plain text)', 'dlg.add': 'Add', 'tree.added': 'Added', 'tree.keyExists': 'That key already exists',
  'toast.runtime': 'Something went wrong — your work is safe', 'cmd.theme': 'Switch theme', 'cmd.color': 'Theme colour',
} as const;

export type Key = keyof typeof en;

const vi: Record<Key, string> = {
  appName: 'Material JSON',
  'nav.editor': 'Soạn thảo', 'nav.query': 'Truy vấn', 'nav.compare': 'So sánh', 'nav.convert': 'Chuyển đổi', 'nav.schema': 'Schema', 'nav.settings': 'Cài đặt',
  'act.new': 'Mới', 'act.open': 'Mở', 'act.recent': 'Tệp gần đây', 'act.save': 'Lưu', 'act.saveAs': 'Lưu thành…', 'act.close': 'Đóng',
  'act.copy': 'Sao chép', 'act.paste': 'Dán', 'act.format': 'Định dạng', 'act.minify': 'Thu gọn', 'act.sort': 'Sắp xếp khóa', 'act.sortAsc': 'Sắp xếp A → Z', 'act.sortDesc': 'Sắp xếp Z → A',
  'act.repair': 'Sửa lỗi', 'act.escape': 'Thoát thành chuỗi', 'act.unescape': 'Bỏ thoát chuỗi', 'act.wrap': 'Ngắt dòng', 'act.undo': 'Hoàn tác', 'act.redo': 'Làm lại',
  'act.find': 'Tìm & thay thế', 'act.foldAll': 'Thu gọn tất cả', 'act.unfoldAll': 'Mở rộng tất cả', 'act.stats': 'Thống kê', 'act.cancel': 'Hủy', 'act.ok': 'OK',
  'act.swap': 'Đổi hai bên', 'act.clear': 'Xóa', 'act.more': 'Thêm',
  'view.code': 'Mã', 'view.split': 'Chia đôi', 'view.tree': 'Cây',
  'tab.untitled': 'Chưa đặt tên', 'tab.close': 'Đóng tab', 'tab.new': 'Tab mới',
  'st.valid': 'JSON hợp lệ', 'st.invalid': 'JSON không hợp lệ', 'st.empty': 'Trống', 'st.fix': 'Sửa lỗi', 'st.ln': 'Dòng {n}', 'st.col': 'Cột {n}', 'st.sel': 'Đã chọn {n}',
  'st.lines': '{n} dòng', 'st.unsaved': 'Chưa lưu', 'st.web': 'Chế độ trình duyệt',
  'err.unexpectedChar': 'Ký tự không mong đợi {c}', 'err.unexpectedEnd': 'Dữ liệu kết thúc đột ngột', 'err.expectedColon': 'Cần dấu “:” sau khóa',
  'err.expectedCommaOrBrace': 'Cần dấu “,” hoặc “}” tại đây', 'err.expectedCommaOrBracket': 'Cần dấu “,” hoặc “]” tại đây', 'err.expectedKey': 'Cần tên thuộc tính đặt trong dấu nháy kép',
  'err.badNumber': 'Số không hợp lệ', 'err.unterminatedString': 'Chuỗi chưa được đóng', 'err.badEscape': 'Chuỗi thoát không hợp lệ', 'err.controlChar': 'Ký tự điều khiển {c} phải được thoát',
  'err.trailingComma': 'Không được phép có dấu phẩy thừa', 'err.trailingContent': 'Có nội dung thừa phía sau giá trị JSON', 'err.tooDeep': 'Lồng nhau quá sâu', 'err.unterminatedComment': 'Chú thích chưa được đóng',
  'tree.search': 'Tìm khóa & giá trị', 'tree.expandAll': 'Mở rộng tất cả', 'tree.collapseAll': 'Thu gọn tất cả', 'tree.copyPath': 'Sao chép đường dẫn', 'tree.copyValue': 'Sao chép giá trị',
  'tree.edit': 'Sửa giá trị', 'tree.delete': 'Xóa', 'tree.empty': 'Chưa có gì để hiển thị', 'tree.emptySub': 'Nhập hoặc mở JSON để xem dạng cây.', 'tree.invalid': 'Hãy sửa lỗi JSON để xem dạng cây',
  'tree.items': '{n} phần tử', 'tree.item': '1 phần tử', 'tree.keys': '{n} khóa', 'tree.key': '1 khóa', 'tree.more': 'Hiện thêm {n}', 'tree.matches': '{n} kết quả', 'tree.sync': 'Chọn trong trình soạn thảo',
  'q.title': 'Truy vấn JSONPath', 'q.placeholder': '$.store.book[?(@.price < 10)].title', 'q.run': 'Chạy', 'q.results': '{n} kết quả', 'q.result': '1 kết quả', 'q.none': 'Không có kết quả',
  'q.copyAll': 'Sao chép kết quả', 'q.history': 'Truy vấn gần đây', 'q.examples': 'Thử ví dụ', 'q.invalidDoc': 'Tài liệu đang mở không phải JSON hợp lệ.', 'q.hint': 'Hỗ trợ $, ., .., [*], [0], [-1], [0:3], [“a”,“b”] và bộ lọc như [?(@.age > 18 && @.name =~ /^A/)].',
  'q.openInEditor': 'Hiện trong trình soạn thảo', 'q.emptyTitle': 'Truy vấn dữ liệu', 'q.emptySub': 'Viết biểu thức JSONPath để lọc và trích xuất giá trị.',
  'cmp.title': 'So sánh tài liệu', 'cmp.with': 'So sánh với', 'cmp.ignoreOrder': 'Bỏ qua thứ tự khóa', 'cmp.identical': 'Hai tài liệu giống hệt nhau', 'cmp.summary': 'Thêm {a} · Xóa {r} · Đổi {c}',
  'cmp.structure': 'Thay đổi', 'cmp.text': 'Song song', 'cmp.tooLarge': 'Quá lớn để xem song song — hãy dùng danh sách thay đổi.', 'cmp.pick': 'Chọn tab khác', 'cmp.noOther': 'Hãy mở thêm một tài liệu để so sánh.',
  'cmp.invalid': 'Không thể so sánh: “{name}” không phải JSON hợp lệ.', 'cmp.added': 'Thêm', 'cmp.removed': 'Xóa', 'cmp.changed': 'Đổi', 'cmp.openFile': 'Mở tệp…', 'cmp.current': 'Tab hiện tại',
  'cv.title': 'Chuyển đổi', 'cv.fromJson': 'JSON sang…', 'cv.toJson': '… sang JSON', 'cv.format': 'Định dạng', 'cv.delimiter': 'Dấu phân tách', 'cv.infer': 'Nhận diện số & boolean', 'cv.input': 'Đầu vào', 'cv.output': 'Đầu ra',
  'cv.copy': 'Sao chép kết quả', 'cv.save': 'Lưu thành tệp', 'cv.openTab': 'Mở trong tab mới', 'cv.paste': 'Dán hoặc nhập {fmt} tại đây…', 'cv.openFile': 'Mở tệp', 'cv.auto': 'Tự động', 'cv.comma': 'Dấu phẩy', 'cv.semicolon': 'Chấm phẩy',
  'cv.tab': 'Tab', 'cv.pipe': 'Gạch đứng', 'cv.rootName': 'Tên gốc', 'cv.fromTab': 'Nguồn: tab đang mở', 'cv.error': 'Chuyển đổi thất bại: {msg}', 'cv.idle': 'Kết quả sẽ hiện ở đây.',
  'sc.title': 'Kiểm tra JSON Schema', 'sc.schema': 'Schema', 'sc.pick': 'Chọn tab chứa schema', 'sc.generate': 'Tạo schema từ JSON hiện tại', 'sc.validate': 'Kiểm tra', 'sc.valid': 'Tài liệu khớp với schema',
  'sc.errors': 'Tìm thấy {n} vấn đề', 'sc.error': 'Tìm thấy 1 vấn đề', 'sc.noSchema': 'Hãy mở schema ở tab khác, hoặc tạo schema từ tài liệu hiện tại.', 'sc.badSchema': 'Schema không hợp lệ: {msg}', 'sc.invalidDoc': 'Tài liệu đang mở không phải JSON hợp lệ.',
  'sc.root': '(gốc)',
  'set.title': 'Cài đặt', 'set.appearance': 'Giao diện', 'set.theme': 'Chủ đề', 'set.light': 'Sáng', 'set.dark': 'Tối', 'set.system': 'Hệ thống', 'set.color': 'Màu chủ đề', 'set.custom': 'Màu tùy chỉnh',
  'set.fontSize': 'Cỡ chữ', 'set.font': 'Phông chữ', 'set.fontSystem': 'Mặc định hệ thống', 'set.small': 'Nhỏ', 'set.medium': 'Vừa', 'set.large': 'Lớn', 'set.language': 'Ngôn ngữ', 'set.auto': 'Tự động', 'set.motion': 'Hiệu ứng chuyển động', 'set.motionDesc': 'Chuyển cảnh mượt mà và hiệu ứng trực quan',
  'set.window': 'Cửa sổ', 'set.windowOpen': 'Khi mở ứng dụng', 'set.remember': 'Ghi nhớ kích thước', 'set.rememberDesc': 'Mở lại với đúng kích thước và vị trí lần trước', 'set.maximized': 'Luôn phóng to tối đa', 'set.maximizedDesc': 'Luôn mở ở chế độ phóng to tối đa', 'set.desktopOnly': 'Chỉ có trong ứng dụng máy tính',
  'set.editor': 'Trình soạn thảo', 'set.indent': 'Thụt lề', 'set.tab': 'Tab', 'set.spaces': '{n} dấu cách', 'set.wrap': 'Ngắt dòng', 'set.wrapDesc': 'Tự ngắt các dòng dài trong trình soạn thảo', 'set.restore': 'Khôi phục phiên trước', 'set.restoreDesc': 'Mở lại các tab và nội dung chưa lưu khi khởi động',
  'set.shortcuts': 'Phím tắt', 'set.about': 'Giới thiệu', 'set.version': 'Phiên bản {v}', 'set.author': 'Tác giả', 'set.madeWith': 'Được hỗ trợ bởi', 'set.license': 'Mã nguồn mở · Giấy phép MIT', 'set.reset': 'Đặt lại cài đặt',
  'set.resetDone': 'Đã đặt lại cài đặt', 'set.aboutDesc': 'Trình soạn thảo và bộ công cụ JSON đầy đủ chức năng, xây dựng bằng Tauri và Material Design 3.',
  'sc.k.new': 'Tab mới', 'sc.k.open': 'Mở tệp', 'sc.k.save': 'Lưu', 'sc.k.saveAs': 'Lưu thành', 'sc.k.close': 'Đóng tab', 'sc.k.format': 'Định dạng', 'sc.k.minify': 'Thu gọn', 'sc.k.find': 'Tìm & thay thế', 'sc.k.next': 'Tab kế tiếp', 'sc.k.settings': 'Cài đặt', 'sc.k.palette': 'Chuyển màn hình',
  'dlg.unsavedTitle': 'Lưu thay đổi?', 'dlg.unsavedBody': '“{name}” có thay đổi chưa lưu. Bạn có muốn lưu trước khi đóng không?', 'dlg.save': 'Lưu', 'dlg.dontSave': 'Không lưu', 'dlg.cancel': 'Hủy',
  'dlg.quitTitle': 'Thoát khi còn nội dung chưa lưu?', 'dlg.quitBody': '{n} tab có thay đổi chưa lưu sẽ bị mất.', 'dlg.quit': 'Vẫn thoát', 'dlg.stats': 'Thống kê tài liệu',
  'stat.size': 'Dung lượng', 'stat.lines': 'Số dòng', 'stat.depth': 'Độ sâu tối đa', 'stat.values': 'Giá trị', 'stat.keys': 'Khóa', 'stat.objects': 'Đối tượng', 'stat.arrays': 'Mảng', 'stat.strings': 'Chuỗi', 'stat.numbers': 'Số', 'stat.booleans': 'Boolean', 'stat.nulls': 'Null',
  'toast.saved': 'Đã lưu “{name}”', 'toast.copied': 'Đã sao chép vào bộ nhớ tạm', 'toast.formatted': 'Đã định dạng', 'toast.minified': 'Đã thu gọn', 'toast.sorted': 'Đã sắp xếp khóa', 'toast.repaired': 'Đã sửa lỗi', 'toast.escaped': 'Đã thoát chuỗi', 'toast.unescaped': 'Đã bỏ thoát chuỗi',
  'toast.opened': 'Đã mở {n} tệp', 'toast.readError': 'Không thể đọc tệp', 'toast.writeError': 'Không thể lưu tệp', 'toast.nothingToCopy': 'Không có gì để sao chép', 'toast.invalid': 'Hãy sửa lỗi JSON trước', 'toast.cantUnescape': 'Văn bản này không phải chuỗi đã thoát',
  'toast.cantRepair': 'JSON này không thể tự động sửa', 'toast.pathCopied': 'Đã sao chép đường dẫn', 'toast.valueCopied': 'Đã sao chép giá trị', 'toast.edited': 'Đã cập nhật giá trị', 'toast.deleted': 'Đã xóa', 'toast.alreadyOpen': 'Tệp đã được mở', 'toast.pickOther': 'Hãy chọn tab khác',
  'toast.pasteFail': 'Không truy cập được bộ nhớ tạm', 'toast.nothingToUndo': 'Không có gì để thực hiện',
  'drop.title': 'Thả để mở', 'drop.sub': 'Thả tệp JSON vào bất kỳ đâu trong cửa sổ', 'editor.placeholder': 'Dán, nhập hoặc thả JSON vào đây…',
  'recent.empty': 'Chưa có tệp gần đây', 'recent.clear': 'Xóa danh sách', 'tree.editPrompt': 'Giá trị mới', 'tree.editHint': 'Nhập giá trị JSON bất kỳ, hoặc văn bản thường cho chuỗi.',
  'cv.web': 'Chế độ trình duyệt', 'win.title': 'Material JSON',
  'cmd.title': 'Bảng lệnh', 'cmd.placeholder': 'Nhập lệnh…', 'cmd.none': 'Không có lệnh phù hợp', 'cmd.group.file': 'Tệp', 'cmd.group.edit': 'Chỉnh sửa', 'cmd.group.view': 'Hiển thị', 'cmd.group.app': 'Ứng dụng',
  'tip.top': 'Cuộn lên đầu trang', 'act.palette': 'Bảng lệnh', 'st.path': 'Sao chép đường dẫn tại vị trí con trỏ',
  'tree.add': 'Thêm phần tử con', 'tree.addKey': 'Tên khóa', 'tree.addValue': 'Giá trị (JSON hoặc văn bản)', 'dlg.add': 'Thêm', 'tree.added': 'Đã thêm', 'tree.keyExists': 'Khóa này đã tồn tại',
  'toast.runtime': 'Đã xảy ra lỗi — dữ liệu của bạn vẫn an toàn', 'cmd.theme': 'Đổi giao diện', 'cmd.color': 'Màu chủ đề',
};

const dicts = { en, vi } as Record<Lang, Record<string, string>>;

let current: Lang = 'en';
const listeners = new Set<() => void>();

export function detectLang(): Lang {
  const l = (navigator.languages?.[0] || navigator.language || 'en').toLowerCase();
  return l.startsWith('vi') ? 'vi' : 'en';
}

export function setLang(s: LangSetting) {
  current = s === 'auto' ? detectLang() : s;
  document.documentElement.lang = current;
  applyI18n(document);
  listeners.forEach((f) => f());
}
export const lang = () => current;
export const onLang = (f: () => void) => { listeners.add(f); };

export function t(key: Key, p?: Record<string, string | number>): string {
  let s = dicts[current][key] ?? en[key] ?? key;
  if (p) for (const k in p) s = s.split(`{${k}}`).join(String(p[k]));
  return s;
}

export function applyI18n(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((e) => { e.textContent = t(e.dataset.i18n as Key); });
  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((e) => {
    const s = t(e.dataset.i18nTitle as Key);
    e.setAttribute('title', s); e.setAttribute('aria-label', s);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-placeholder]').forEach((e) => e.setAttribute('placeholder', t(e.dataset.i18nPlaceholder as Key)));
}
