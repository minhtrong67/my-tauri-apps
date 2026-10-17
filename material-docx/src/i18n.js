// Tiny i18n layer: English + Vietnamese. Each entry is  key: [english, vietnamese].
const S = {
  // generic
  'btn.ok': ['OK', 'OK'], 'btn.cancel': ['Cancel', 'Hủy'], 'btn.close': ['Close', 'Đóng'], 'btn.done': ['Done', 'Xong'],
  'doc.untitled': ['Untitled document', 'Tài liệu chưa đặt tên'], 'doc.name': ['Document name', 'Tên tài liệu'],
  'search.placeholder': ['Search in document', 'Tìm trong tài liệu'],
  'state.saved': ['Saved', 'Đã lưu'], 'state.unsaved': ['Unsaved changes', 'Chưa lưu'],
  'drop.hint': ['Drop a document or picture here', 'Thả tài liệu hoặc hình ảnh vào đây'],
  // file
  'file.new': ['New', 'Mới'], 'file.open': ['Open…', 'Mở…'], 'file.save': ['Save', 'Lưu'], 'file.saveAs': ['Save as…', 'Lưu thành…'],
  'file.print': ['Print / Export PDF', 'In / Xuất PDF'], 'file.exit': ['Exit', 'Thoát'],
  'dlg.open': ['Open document', 'Mở tài liệu'], 'dlg.save': ['Save document', 'Lưu tài liệu'],
  'filter.docs': ['Documents', 'Tài liệu'], 'filter.docx': ['Word document (.docx)', 'Tài liệu Word (.docx)'], 'filter.html': ['Web page (.html)', 'Trang web (.html)'], 'filter.txt': ['Plain text (.txt)', 'Văn bản thuần (.txt)'],
  'confirm.title': ['Save changes?', 'Lưu thay đổi?'], 'confirm.msg': ['“{name}” has unsaved changes.', '“{name}” có thay đổi chưa lưu.'],
  'confirm.save': ['Save', 'Lưu'], 'confirm.discard': ["Don't save", 'Không lưu'],
  'recover.title': ['Recover unsaved document?', 'Khôi phục tài liệu chưa lưu?'], 'recover.msg': ['“{name}” was not saved when the app closed. Restore it?', '“{name}” chưa được lưu khi ứng dụng đóng. Khôi phục lại?'],
  'recover.yes': ['Restore', 'Khôi phục'], 'recover.no': ['Discard', 'Bỏ qua'],
  'toast.opened': ['Opened {name}', 'Đã mở {name}'], 'toast.saved': ['Saved {name}', 'Đã lưu {name}'], 'toast.error': ['Error: {msg}', 'Lỗi: {msg}'],
  'toast.unsupported': ['Unsupported file type', 'Không hỗ trợ loại tệp này'], 'toast.badImage': ['Could not read that picture', 'Không đọc được hình ảnh này'],
  'toast.pasteHint': ['Use Ctrl+V to paste', 'Hãy dùng Ctrl+V để dán'], 'toast.printHint': ['Choose “Save as PDF” in the print dialog to export a PDF.', 'Chọn “Lưu dưới dạng PDF” trong hộp thoại in để xuất PDF.'],
  'toast.emptyUrl': ['Please enter an address.', 'Vui lòng nhập địa chỉ.'], 'toast.replaced': ['Replaced {n} occurrence(s)', 'Đã thay {n} vị trí'],
  'toast.theme': ['Theme: {name}', 'Giao diện: {name}'], 'toast.noSpeech': ['Speech is not available on this system', 'Hệ thống không hỗ trợ đọc to'],
  'toast.spellOn': ['Spell check on', 'Đã bật kiểm tra chính tả'], 'toast.spellOff': ['Spell check off', 'Đã tắt kiểm tra chính tả'],
  // backstage
  'bs.home': ['Home', 'Trang chủ'], 'bs.back': ['Back', 'Quay lại'], 'bs.info': ['Info', 'Thông tin'], 'bs.about': ['About', 'Giới thiệu'],
  'bs.welcome': ['Good to see you', 'Chào mừng bạn'], 'bs.startNew': ['Start a new document', 'Tạo tài liệu mới'], 'bs.recent': ['Recent', 'Gần đây'],
  'bs.noRecent': ['No recent documents yet.', 'Chưa có tài liệu gần đây.'], 'bs.recentWeb': ['Recent files are available in the desktop app.', 'Danh sách gần đây có trong ứng dụng máy tính.'],
  'bs.browse': ['Browse…', 'Duyệt…'], 'bs.browseD': ['Open a .docx, .html or .txt file from your computer', 'Mở tệp .docx, .html hoặc .txt từ máy tính'],
  'bs.docxD': ['Best compatibility with Microsoft Word', 'Tương thích tốt nhất với Microsoft Word'], 'bs.htmlD': ['A single web page', 'Một trang web'], 'bs.txtD': ['Text only, no formatting', 'Chỉ văn bản, không định dạng'],
  'bs.pdfD': ['Use “Save as PDF” in the print dialog', 'Dùng “Lưu dưới dạng PDF” trong hộp thoại in'], 'bs.printNow': ['Print or export PDF', 'In hoặc xuất PDF'], 'bs.printD': ['Header, footer, margins and page size are applied', 'Áp dụng đầu/chân trang, lề và khổ giấy'],
  'tpl.blank': ['Blank document', 'Tài liệu trống'],
  'info.name': ['Name', 'Tên'], 'info.location': ['Location', 'Vị trí'], 'info.file': ['File', 'Tệp'], 'info.author': ['Author', 'Tác giả'], 'info.pages': ['Pages', 'Số trang'], 'info.paper': ['Paper', 'Giấy'], 'info.unsaved': ['Not saved yet', 'Chưa lưu'],
  // tabs & groups
  'tab.file': ['File', 'Tệp'], 'tab.home': ['Home', 'Trang đầu'], 'tab.insert': ['Insert', 'Chèn'], 'tab.design': ['Design', 'Thiết kế'], 'tab.layout': ['Layout', 'Bố cục'],
  'tab.references': ['References', 'Tham chiếu'], 'tab.review': ['Review', 'Xem lại'], 'tab.view': ['View', 'Xem'], 'tab.table': ['Table', 'Bảng'], 'tab.picture': ['Picture', 'Hình ảnh'],
  'g.clipboard': ['Clipboard', 'Bộ nhớ tạm'], 'g.font': ['Font', 'Phông chữ'], 'g.paragraph': ['Paragraph', 'Đoạn văn'], 'g.styles': ['Styles', 'Kiểu'], 'g.editing': ['Editing', 'Chỉnh sửa'],
  'g.pages': ['Pages', 'Trang'], 'g.tables': ['Tables', 'Bảng'], 'g.illustrations': ['Illustrations', 'Minh họa'], 'g.links': ['Links', 'Liên kết'], 'g.hf': ['Header & Footer', 'Đầu & chân trang'],
  'g.text': ['Text', 'Văn bản'], 'g.symbols': ['Symbols', 'Ký hiệu'], 'g.docfmt': ['Document formatting', 'Định dạng tài liệu'], 'g.pagebg': ['Page background', 'Nền trang'],
  'g.pagesetup': ['Page setup', 'Thiết lập trang'], 'g.para': ['Paragraph', 'Đoạn văn'], 'g.toc': ['Table of contents', 'Mục lục'], 'g.captions': ['Captions & navigation', 'Chú thích & điều hướng'],
  'g.proofing': ['Proofing', 'Soát lỗi'], 'g.speech': ['Speech', 'Giọng nói'], 'g.language': ['Language', 'Ngôn ngữ'], 'g.views': ['Views', 'Chế độ xem'], 'g.show': ['Show', 'Hiển thị'],
  'g.zoom': ['Zoom', 'Thu phóng'], 'g.window': ['Window', 'Cửa sổ'], 'g.tstyles': ['Table styles', 'Kiểu bảng'], 'g.tshade': ['Shading & borders', 'Tô nền & viền'], 'g.rowcol': ['Rows & columns', 'Hàng & cột'],
  'g.merge': ['Merge', 'Gộp'], 'g.cellsize': ['Cell size', 'Kích thước ô'], 'g.align': ['Alignment', 'Căn chỉnh'], 'g.size': ['Size', 'Kích thước'], 'g.arrange': ['Arrange', 'Sắp xếp'], 'g.rotate': ['Rotate', 'Xoay'], 'g.alt': ['Accessibility', 'Trợ năng'],
  // ribbon labels
  'rb.paste': ['Paste', 'Dán'], 'rb.pasteText': ['Keep text only', 'Chỉ giữ văn bản'], 'rb.cut': ['Cut', 'Cắt'], 'rb.copy': ['Copy', 'Sao chép'], 'rb.painter': ['Format painter', 'Sao chép định dạng'],
  'rb.find': ['Find', 'Tìm'], 'rb.replace': ['Replace', 'Thay thế'], 'rb.select': ['Select', 'Chọn'], 'rb.goto': ['Go to…', 'Đi đến…'],
  'rb.pageBreak': ['Page break', 'Ngắt trang'], 'rb.table': ['Table', 'Bảng'], 'rb.picture': ['Picture', 'Hình ảnh'], 'rb.link': ['Link', 'Liên kết'], 'rb.header': ['Header', 'Đầu trang'], 'rb.footer': ['Footer', 'Chân trang'],
  'rb.pageNum': ['Page number', 'Số trang'], 'rb.date': ['Date & time', 'Ngày & giờ'], 'rb.hr': ['Horizontal line', 'Đường kẻ ngang'], 'rb.symbol': ['Symbol', 'Ký hiệu'],
  'rb.fonts': ['Default font', 'Phông mặc định'], 'rb.theme': ['Theme', 'Giao diện'], 'rb.darkPage': ['Dark page', 'Trang tối'],
  'rb.margins': ['Margins', 'Lề'], 'rb.orientation': ['Orientation', 'Hướng giấy'], 'rb.size': ['Size', 'Khổ giấy'], 'rb.breaks': ['Breaks', 'Ngắt'],
  'rb.toc': ['Table of contents', 'Mục lục'], 'rb.updateToc': ['Update table', 'Cập nhật mục lục'], 'rb.caption': ['Caption', 'Chú thích'], 'rb.headings': ['Headings', 'Tiêu đề'],
  'rb.spelling': ['Spelling', 'Chính tả'], 'rb.wordCount': ['Word count', 'Đếm từ'], 'rb.readAloud': ['Read aloud', 'Đọc to'], 'rb.language': ['Language', 'Ngôn ngữ'],
  'rb.ruler': ['Ruler', 'Thước kẻ'], 'rb.navPane': ['Navigation', 'Điều hướng'], 'rb.marks': ['Formatting marks', 'Dấu định dạng'], 'rb.zoom100': ['100%', '100%'], 'rb.onePage': ['One page', 'Một trang'], 'rb.pageWidth': ['Page width', 'Vừa chiều rộng'],
  'rb.fullscreen': ['Full screen', 'Toàn màn hình'], 'rb.settings': ['Settings', 'Cài đặt'],
  // tooltips
  'tip.paste': ['Paste', 'Dán'], 'tip.cut': ['Cut', 'Cắt'], 'tip.copy': ['Copy', 'Sao chép'], 'tip.painter': ['Copy formatting from one place and apply it to another', 'Sao chép định dạng từ nơi này sang nơi khác'],
  'tip.fontFamily': ['Font', 'Phông chữ'], 'tip.fontSize': ['Font size', 'Cỡ chữ'], 'tip.grow': ['Increase font size', 'Tăng cỡ chữ'], 'tip.shrink': ['Decrease font size', 'Giảm cỡ chữ'],
  'tip.case': ['Change case', 'Đổi chữ hoa/thường'], 'tip.clear': ['Clear all formatting', 'Xóa mọi định dạng'], 'tip.bold': ['Bold (Ctrl+B)', 'In đậm (Ctrl+B)'], 'tip.italic': ['Italic (Ctrl+I)', 'In nghiêng (Ctrl+I)'],
  'tip.underline': ['Underline (Ctrl+U)', 'Gạch chân (Ctrl+U)'], 'tip.strike': ['Strikethrough', 'Gạch ngang'], 'tip.sub': ['Subscript', 'Chỉ số dưới'], 'tip.sup': ['Superscript', 'Chỉ số trên'],
  'tip.highlight': ['Text highlight color', 'Màu tô sáng'], 'tip.color': ['Font color', 'Màu chữ'], 'tip.ul': ['Bullets', 'Danh sách đầu dòng'], 'tip.ol': ['Numbering', 'Đánh số'],
  'tip.outdent': ['Decrease indent', 'Giảm thụt lề'], 'tip.indent': ['Increase indent', 'Tăng thụt lề'], 'tip.sort': ['Sort selected paragraphs A→Z', 'Sắp xếp các đoạn đã chọn A→Z'], 'tip.marks': ['Show / hide formatting marks', 'Hiện / ẩn dấu định dạng'],
  'tip.alignLeft': ['Align left', 'Căn trái'], 'tip.alignCenter': ['Center', 'Căn giữa'], 'tip.alignRight': ['Align right', 'Căn phải'], 'tip.alignJustify': ['Justify', 'Căn đều hai bên'],
  'tip.lineSpacing': ['Line and paragraph spacing', 'Giãn dòng và đoạn'], 'tip.shading': ['Paragraph shading', 'Tô nền đoạn'], 'tip.borders': ['Paragraph borders', 'Viền đoạn'],
  'tip.styles': ['More styles', 'Thêm kiểu'], 'tip.find': ['Find in document', 'Tìm trong tài liệu'], 'tip.replace': ['Find and replace', 'Tìm và thay thế'], 'tip.select': ['Select', 'Chọn'],
  'tip.pageBreak': ['Page break', 'Ngắt trang'], 'tip.table': ['Insert a table', 'Chèn bảng'], 'tip.image': ['Insert a picture', 'Chèn hình ảnh'], 'tip.link': ['Insert a link', 'Chèn liên kết'],
  'tip.header': ['Header', 'Đầu trang'], 'tip.footer': ['Footer', 'Chân trang'], 'tip.pageNum': ['Insert page number', 'Chèn số trang'], 'tip.date': ['Insert the date or time', 'Chèn ngày hoặc giờ'],
  'tip.hr': ['Insert a horizontal line', 'Chèn đường kẻ ngang'], 'tip.symbol': ['Insert a symbol', 'Chèn ký hiệu'], 'tip.defaultFont': ['Default font for new text', 'Phông mặc định cho văn bản mới'],
  'tip.theme': ['Switch theme', 'Đổi giao diện'], 'tip.pageColor': ['Page color', 'Màu trang'], 'tip.darkPage': ['Show the page dark in dark theme', 'Hiện trang tối khi dùng giao diện tối'],
  'tip.margins': ['Page margins', 'Lề trang'], 'tip.orientation': ['Page orientation', 'Hướng trang'], 'tip.size': ['Paper size', 'Khổ giấy'], 'tip.breaks': ['Breaks', 'Ngắt'],
  'tip.toc': ['Table of contents', 'Mục lục'], 'tip.updateToc': ['Update the table of contents', 'Cập nhật mục lục'], 'tip.caption': ['Apply the Caption style', 'Áp dụng kiểu Chú thích'],
  'tip.nav': ['Navigation pane', 'Ngăn điều hướng'], 'tip.spelling': ['Turn spell check on or off', 'Bật hoặc tắt kiểm tra chính tả'], 'tip.wordCount': ['Count words, characters and pages', 'Đếm từ, ký tự và trang'],
  'tip.readAloud': ['Read the selection or the document aloud', 'Đọc to phần đã chọn hoặc cả tài liệu'], 'tip.uiLanguage': ['Interface language', 'Ngôn ngữ giao diện'], 'tip.ruler': ['Show the ruler', 'Hiện thước kẻ'],
  'tip.zoom': ['Zoom', 'Thu phóng'], 'tip.zoom100': ['Zoom to 100%', 'Thu phóng về 100%'], 'tip.zoomIn': ['Zoom in', 'Phóng to'], 'tip.zoomOut': ['Zoom out', 'Thu nhỏ'],
  'tip.fitPage': ['Fit whole page', 'Vừa cả trang'], 'tip.fitWidth': ['Fit page width', 'Vừa chiều rộng trang'], 'tip.settings': ['Settings', 'Cài đặt'], 'tip.undo': ['Undo', 'Hoàn tác'], 'tip.redo': ['Redo', 'Làm lại'],
  'tip.collapseRibbon': ['Collapse / expand the ribbon', 'Thu gọn / mở rộng ruy-băng'],
  'rb.tableStyles': ['Table styles', 'Kiểu bảng'], 'tip.tableStyles': ['Table styles', 'Kiểu bảng'],
  'tip.cellShading': ['Cell shading', 'Tô nền ô'], 'tip.cellBorders': ['Cell borders', 'Viền ô'],
  // styles / lists / misc menus
  'style.normal': ['Normal', 'Thường'], 'style.nospace': ['No Spacing', 'Không giãn'], 'style.h1': ['Heading 1', 'Tiêu đề 1'], 'style.h2': ['Heading 2', 'Tiêu đề 2'], 'style.h3': ['Heading 3', 'Tiêu đề 3'],
  'style.title': ['Title', 'Tựa đề'], 'style.subtitle': ['Subtitle', 'Phụ đề'], 'style.quote': ['Quote', 'Trích dẫn'], 'style.intense': ['Intense Quote', 'Trích dẫn nổi bật'], 'style.caption': ['Caption', 'Chú thích'],
  'style.code': ['Code', 'Mã'], 'style.clear': ['Clear formatting', 'Xóa định dạng'], 'style.sample': ['AaBbCc', 'AaBbCc'],
  'list.disc': ['Round bullets', 'Chấm tròn'], 'list.circle': ['Hollow bullets', 'Vòng tròn'], 'list.square': ['Square bullets', 'Chấm vuông'],
  'lh.single': ['1.0 (single)', '1.0 (đơn)'], 'para.spaceBefore': ['Toggle space before paragraph', 'Bật/tắt khoảng cách trước đoạn'], 'para.spaceAfter': ['Toggle space after paragraph', 'Bật/tắt khoảng cách sau đoạn'], 'para.options': ['Paragraph options…', 'Tùy chọn đoạn văn…'],
  'bd.bottom': ['Bottom border', 'Viền dưới'], 'bd.top': ['Top border', 'Viền trên'], 'bd.left': ['Left border', 'Viền trái'], 'bd.right': ['Right border', 'Viền phải'], 'bd.box': ['All borders (box)', 'Viền bao quanh'],
  'bd.none': ['No border', 'Không viền'], 'bd.all': ['All borders', 'Mọi viền'], 'bd.reset': ['Reset borders', 'Đặt lại viền'],
  'case.sentence': ['Sentence case', 'Viết hoa đầu câu'], 'case.lower': ['lowercase', 'viết thường'], 'case.upper': ['UPPERCASE', 'VIẾT HOA'], 'case.title': ['Capitalize Each Word', 'Viết Hoa Mỗi Từ'], 'case.toggle': ['tOGGLE cASE', 'dẢO cHỮ'],
  'color.theme': ['Theme colors', 'Màu giao diện'], 'color.standard': ['Standard colors', 'Màu chuẩn'], 'color.recent': ['Recent colors', 'Màu gần đây'], 'color.more': ['More colors…', 'Thêm màu…'],
  'color.auto': ['Automatic', 'Tự động'], 'color.noHl': ['No color', 'Không tô'], 'color.noFill': ['No fill', 'Không tô nền'],
  'hf.title': ['Header & footer', 'Đầu & chân trang'], 'hf.header': ['Header', 'Đầu trang'], 'hf.footer': ['Footer', 'Chân trang'], 'hf.text': ['Text', 'Nội dung'], 'hf.align': ['Alignment', 'Căn lề'],
  'hf.insert': ['Insert field:', 'Chèn trường:'], 'hf.tokPage': ['Page number', 'Số trang'], 'hf.tokPages': ['Page count', 'Tổng số trang'], 'hf.tokDate': ['Date', 'Ngày'], 'hf.tokTitle': ['Title', 'Tiêu đề'],
  'hf.editHeader': ['Edit header…', 'Sửa đầu trang…'], 'hf.editFooter': ['Edit footer…', 'Sửa chân trang…'], 'hf.removeHeader': ['Remove header', 'Xóa đầu trang'], 'hf.removeFooter': ['Remove footer', 'Xóa chân trang'],
  'pn.top': ['Top of page', 'Đầu trang'], 'pn.bottom': ['Bottom of page', 'Cuối trang'], 'pn.remove': ['Remove page numbers', 'Xóa số trang'],
  'mg.normal': ['Normal', 'Bình thường'], 'mg.narrow': ['Narrow', 'Hẹp'], 'mg.moderate': ['Moderate', 'Vừa phải'], 'mg.wide': ['Wide', 'Rộng'], 'mg.custom': ['Custom margins…', 'Lề tùy chỉnh…'], 'mg.desc': ['Top/bottom {tb} · left/right {lr}', 'Trên/dưới {tb} · trái/phải {lr}'],
  'orient.portrait': ['Portrait', 'Dọc'], 'orient.landscape': ['Landscape', 'Ngang'],
  'toc.title': ['Contents', 'Mục lục'], 'toc.empty': ['Add headings (Heading 1–3) to build the table of contents.', 'Hãy thêm tiêu đề (Tiêu đề 1–3) để tạo mục lục.'], 'toc.insert': ['Insert table of contents', 'Chèn mục lục'],
  'toc.update': ['Update table', 'Cập nhật mục lục'], 'toc.remove': ['Remove table of contents', 'Xóa mục lục'], 'toc.none': ['There is no table of contents in this document.', 'Tài liệu chưa có mục lục.'],
  // tables
  'tbl.pick': ['Insert table', 'Chèn bảng'], 'tbl.insertDlg': ['Insert table…', 'Chèn bảng…'], 'tbl.insertTitle': ['Insert table', 'Chèn bảng'], 'tbl.cols': ['Columns', 'Số cột'], 'tbl.rows': ['Rows', 'Số hàng'],
  'tbl.style': ['Style', 'Kiểu'], 'tbl.headerRow': ['Header row', 'Hàng tiêu đề'], 'tbl.banded': ['Banded rows', 'Hàng xen kẽ'], 'tbl.firstCol': ['First column', 'Cột đầu'],
  'tbl.rowAbove': ['Insert above', 'Chèn hàng trên'], 'tbl.rowBelow': ['Insert below', 'Chèn hàng dưới'], 'tbl.colLeft': ['Insert left', 'Chèn cột trái'], 'tbl.colRight': ['Insert right', 'Chèn cột phải'],
  'tbl.delete': ['Delete', 'Xóa'], 'tbl.delRow': ['Delete row', 'Xóa hàng'], 'tbl.delCol': ['Delete column', 'Xóa cột'], 'tbl.delTable': ['Delete table', 'Xóa bảng'],
  'tbl.merge': ['Merge cells', 'Gộp ô'], 'tbl.split': ['Split cells', 'Tách ô'], 'tbl.splitTitle': ['Split cells', 'Tách ô'], 'tbl.distribute': ['Distribute columns', 'Chia đều cột'],
  'tbl.autofit': ['AutoFit', 'Tự vừa'], 'tbl.fitWindow': ['AutoFit to window', 'Vừa chiều rộng trang'], 'tbl.fitContent': ['AutoFit to contents', 'Vừa nội dung'], 'tbl.rowHeight': ['Row height', 'Chiều cao hàng'], 'tbl.rhAuto': ['Automatic', 'Tự động'],
  'tbl.vtop': ['Align top', 'Căn trên'], 'tbl.vmid': ['Align middle', 'Căn giữa'], 'tbl.vbot': ['Align bottom', 'Căn dưới'], 'tbl.alignTable': ['Table alignment', 'Căn bảng'], 'ctx.table': ['Table', 'Bảng'],
  'ts.grid': ['Grid', 'Lưới'], 'ts.plain': ['Plain', 'Không viền'], 'ts.lines': ['Horizontal lines', 'Đường ngang'], 'ts.blue': ['Blue header', 'Tiêu đề xanh'], 'ts.banded': ['Banded grey', 'Xám xen kẽ'],
  'ts.dark': ['Dark', 'Tối'], 'ts.soft': ['Soft blue', 'Xanh nhạt'], 'ts.minimal': ['Minimal', 'Tối giản'],
  // images
  'img.title': ['Picture size & alt text', 'Kích thước & văn bản thay thế'], 'img.width': ['Width', 'Rộng'], 'img.height': ['Height', 'Cao'], 'img.lock': ['Lock aspect ratio', 'Giữ tỉ lệ'],
  'img.alt': ['Alternative text', 'Văn bản thay thế'], 'img.altHint': ['Describes the picture for screen readers.', 'Mô tả hình ảnh cho trình đọc màn hình.'], 'img.size': ['Size…', 'Kích thước…'],
  'img.bigger': ['Larger', 'Lớn hơn'], 'img.smaller': ['Smaller', 'Nhỏ hơn'], 'img.reset': ['Original size', 'Kích thước gốc'], 'img.wrap': ['Wrap text', 'Bao quanh chữ'], 'img.altText': ['Alt text', 'Văn bản thay thế'],
  'img.remove': ['Remove picture', 'Xóa hình ảnh'], 'img.rotL': ['Rotate left 90°', 'Xoay trái 90°'], 'img.rotR': ['Rotate right 90°', 'Xoay phải 90°'], 'img.flipH': ['Flip horizontal', 'Lật ngang'], 'img.flipV': ['Flip vertical', 'Lật dọc'],
  'wrap.inline': ['In line with text', 'Cùng dòng với chữ'], 'wrap.left': ['Left, text wraps', 'Trái, chữ bao quanh'], 'wrap.right': ['Right, text wraps', 'Phải, chữ bao quanh'], 'wrap.center': ['Centered', 'Căn giữa'],
  // links
  'link.insert': ['Insert link', 'Chèn liên kết'], 'link.edit': ['Edit link', 'Sửa liên kết'], 'link.text': ['Text to display', 'Văn bản hiển thị'], 'link.address': ['Address', 'Địa chỉ'], 'link.remove': ['Remove link', 'Gỡ liên kết'], 'link.open': ['Open link', 'Mở liên kết'],
  'sym.common': ['Common', 'Thường dùng'], 'sym.arrows': ['Arrows & shapes', 'Mũi tên & hình'], 'sym.math': ['Math & Greek', 'Toán & Hy Lạp'], 'sym.latin': ['Latin', 'Latin'],
  // dialogs
  'ps.title': ['Page setup', 'Thiết lập trang'], 'ps.margins': ['Margins', 'Lề'], 'ps.top': ['Top', 'Trên'], 'ps.bottom': ['Bottom', 'Dưới'], 'ps.left': ['Left', 'Trái'], 'ps.right': ['Right', 'Phải'],
  'ps.paper': ['Paper', 'Giấy'], 'ps.size': ['Paper size', 'Khổ giấy'], 'ps.orientation': ['Orientation', 'Hướng'], 'ps.hf': ['Header & footer', 'Đầu & chân trang'], 'ps.headerDist': ['Header from top', 'Đầu trang cách mép trên'],
  'ps.footerDist': ['Footer from bottom', 'Chân trang cách mép dưới'], 'ps.diffFirst': ['Different first page', 'Trang đầu khác biệt'], 'ps.setDefault': ['Use for new documents', 'Dùng cho tài liệu mới'],
  'para.title': ['Paragraph', 'Đoạn văn'], 'para.align': ['Alignment', 'Căn lề'], 'para.line': ['Line spacing', 'Giãn dòng'], 'para.indent': ['Indentation', 'Thụt lề'], 'para.first': ['First line', 'Dòng đầu'],
  'para.spacing': ['Spacing', 'Khoảng cách'], 'para.before': ['Before', 'Trước'], 'para.after': ['After', 'Sau'], 'para.leftInd': ['Left', 'Trái'], 'para.rightInd': ['Right', 'Phải'],
  'font.title': ['Font', 'Phông chữ'], 'ctx.font': ['Font…', 'Phông chữ…'], 'ctx.paragraph': ['Paragraph…', 'Đoạn văn…'],
  'wc.title': ['Word count', 'Đếm từ'], 'wc.pages': ['Pages', 'Trang'], 'wc.words': ['Words', 'Từ'], 'wc.chars': ['Characters (with spaces)', 'Ký tự (có khoảng trắng)'], 'wc.charsNo': ['Characters (no spaces)', 'Ký tự (không khoảng trắng)'], 'wc.paras': ['Paragraphs', 'Đoạn văn'],
  'goto.title': ['Go to page', 'Đi đến trang'], 'goto.page': ['Page number (1–{total})', 'Số trang (1–{total})'],
  'find.find': ['Find', 'Tìm'], 'find.replaceWith': ['Replace with', 'Thay bằng'], 'find.prev': ['Previous (Shift+Enter)', 'Trước (Shift+Enter)'], 'find.next': ['Next (Enter)', 'Tiếp (Enter)'], 'find.toggleReplace': ['Toggle replace', 'Bật/tắt thay thế'],
  'find.replace': ['Replace', 'Thay'], 'find.replaceAll': ['Replace all', 'Thay tất cả'], 'find.matchCase': ['Match case', 'Phân biệt hoa/thường'], 'find.wholeWord': ['Whole word', 'Toàn từ'], 'find.count': ['{i} of {n}', '{i}/{n}'], 'find.none': ['No results', 'Không có kết quả'],
  'nav.headings': ['Headings', 'Tiêu đề'], 'nav.pages': ['Pages', 'Trang'], 'nav.noHeadings': ['No headings yet. Apply Heading 1–3 to see the outline.', 'Chưa có tiêu đề. Áp dụng Tiêu đề 1–3 để xem dàn ý.'],
  'view.read': ['Read mode', 'Chế độ đọc'], 'view.print': ['Print layout', 'Bố cục trang in'], 'view.web': ['Web layout', 'Bố cục web'],
  'sb.page': ['Page {n} of {total}', 'Trang {n}/{total}'], 'sb.pages': ['{total} page(s)', '{total} trang'], 'sb.words': ['{n} words', '{n} từ'], 'sb.wordsSel': ['{n} of {total} words', '{n}/{total} từ'],
  'sb.goto': ['Go to page', 'Đi đến trang'], 'sb.wordcount': ['Word count', 'Đếm từ'], 'sb.language': ['Interface language', 'Ngôn ngữ giao diện'],
  'ruler.left': ['Left margin', 'Lề trái'], 'ruler.right': ['Right margin', 'Lề phải'],
  'lang.auto': ['Automatic', 'Tự động'], 'lang.en': ['English', 'English'], 'lang.vi': ['Tiếng Việt', 'Tiếng Việt'], 'units.cm': ['Centimeters', 'Xăng-ti-mét'], 'units.in': ['Inches', 'Inch'],
  // shortcuts
  'sc.title': ['Keyboard shortcuts', 'Phím tắt'], 'sc.file': ['File', 'Tệp'], 'sc.edit': ['Edit', 'Chỉnh sửa'], 'sc.format': ['Format', 'Định dạng'], 'sc.view': ['View', 'Xem'],
  'sc.undoRedo': ['Undo / Redo', 'Hoàn tác / Làm lại'], 'sc.clipboard': ['Cut / Copy / Paste', 'Cắt / Chép / Dán'], 'sc.pasteText': ['Paste as plain text', 'Dán dạng văn bản thuần'], 'sc.selectAll': ['Select all', 'Chọn tất cả'],
  'sc.find': ['Find', 'Tìm'], 'sc.replace': ['Replace', 'Thay thế'], 'sc.goto': ['Go to page', 'Đi đến trang'], 'sc.bius': ['Bold / Italic / Underline', 'Đậm / Nghiêng / Gạch chân'],
  'sc.subsup': ['Subscript / Superscript', 'Chỉ số dưới / trên'], 'sc.size': ['Increase / decrease font size', 'Tăng / giảm cỡ chữ'], 'sc.align': ['Left / Center / Right / Justify', 'Trái / Giữa / Phải / Đều'],
  'sc.headings': ['Heading 1 / 2 / 3', 'Tiêu đề 1 / 2 / 3'], 'sc.indent': ['Indent / Outdent', 'Thụt / Giảm thụt lề'], 'sc.zoom': ['Zoom in / out', 'Phóng to / thu nhỏ'], 'sc.fullscreen': ['Full screen', 'Toàn màn hình'],
  // settings
  'settings.title': ['Settings', 'Cài đặt'], 'set.appearance': ['Appearance', 'Giao diện'], 'set.theme': ['Theme', 'Chế độ màu'], 'theme.light': ['Light', 'Sáng'], 'theme.dark': ['Dark', 'Tối'], 'theme.system': ['System', 'Hệ thống'],
  'set.accent': ['Accent color', 'Màu chủ đề'], 'set.accentD': ['Blue is the default. Every color in the app is generated from this one.', 'Mặc định là xanh dương. Mọi màu trong ứng dụng được tạo từ màu này.'],
  'set.customColor': ['Custom color', 'Màu tùy chỉnh'], 'set.resetColor': ['Reset to blue', 'Đặt lại màu xanh'], 'set.darkPage': ['Dark page in dark theme', 'Trang tối ở giao diện tối'], 'set.darkPageD': ['Shows the paper dark too, easier on the eyes at night.', 'Trang giấy cũng tối, dễ chịu cho mắt về đêm.'],
  'set.window': ['Window', 'Cửa sổ'], 'set.windowD': ['Choose how the window opens when you start the app.', 'Chọn cách cửa sổ mở ra khi khởi động ứng dụng.'],
  'set.startRemember': ['Remember window size', 'Ghi nhớ kích thước cửa sổ'], 'set.startRememberD': ['Open at the size and position you last used.', 'Mở lại đúng kích thước và vị trí lần trước.'],
  'set.startMax': ['Always open maximized', 'Luôn mở phóng to tối đa'], 'set.startMaxD': ['Fill the whole screen every time the app starts.', 'Luôn phóng to tối đa mỗi lần mở ứng dụng.'],
  'set.startNote': ['Saved — applies the next time the app starts', 'Đã lưu — áp dụng cho lần mở ứng dụng tiếp theo'],
  'set.language': ['Language', 'Ngôn ngữ'], 'set.uiLang': ['Interface language', 'Ngôn ngữ giao diện'], 'set.editing': ['Editing', 'Soạn thảo'], 'set.font': ['Default font', 'Phông chữ mặc định'], 'set.fontSize': ['Default font size', 'Cỡ chữ mặc định'],
  'set.units': ['Units', 'Đơn vị'], 'set.spell': ['Check spelling as you type', 'Kiểm tra chính tả khi gõ'], 'set.autocorrect': ['AutoCorrect', 'Tự động sửa'], 'set.autocorrectD': ['Smart quotes, (c) → ©, -- → –, “1. ” starts a list.', 'Dấu nháy cong, (c) → ©, -- → –, “1. ” tạo danh sách.'],
  'set.autosave': ['Auto-recover', 'Tự khôi phục'], 'set.autosaveD': ['Keeps a recovery copy so unsaved work survives a crash.', 'Giữ bản dự phòng để không mất nội dung chưa lưu khi gặp sự cố.'],
  'set.author': ['Author name', 'Tên tác giả'], 'set.authorPh': ['Written into .docx files', 'Được ghi vào tệp .docx'], 'set.authorD': ['Shown in the document properties.', 'Hiển thị trong thuộc tính tài liệu.'],
  'set.uiFont': ['Interface font', 'Phông chữ giao diện'], 'set.uiFontD': ['Used for menus, ribbon and dialogs. “System” follows your OS.', 'Dùng cho menu, ruy-băng và hộp thoại. “Hệ thống” theo hệ điều hành.'], 'set.fontSystem': ['System default', 'Mặc định hệ thống'],
  'set.docDefaults': ['Document defaults', 'Mặc định tài liệu'], 'set.behavior': ['Behavior', 'Hành vi'], 'set.preview': ['Preview', 'Xem trước'], 'set.previewText': ['The quick brown fox jumps over the lazy dog', 'Cáo nâu nhanh nhẹn nhảy qua con chó lười'],
  'set.palette': ['Material colors', 'Màu Material'], 'set.resetAll': ['Reset settings', 'Đặt lại cài đặt'], 'set.resetAllD': ['Restore every option to its default value.', 'Khôi phục mọi tùy chọn về mặc định.'], 'set.resetDone': ['Settings restored to defaults', 'Đã đặt lại cài đặt mặc định'],
  'set.themeD': ['Light, dark or follow your system.', 'Sáng, tối hoặc theo hệ thống.'], 'set.uiLangD': ['Automatic uses your device language.', 'Tự động dùng ngôn ngữ của thiết bị.'], 'set.unitsD': ['Used by the ruler and page setup.', 'Dùng cho thước kẻ và thiết lập trang.'],
  'set.shortcuts': ['Keyboard shortcuts', 'Phím tắt'], 'set.about': ['About', 'Giới thiệu'],
  'about.version': ['Version', 'Phiên bản'], 'about.desc': ['A Word-style word processor with Material Design 3 and real .docx support.', 'Trình soạn thảo kiểu Word với Material Design 3, hỗ trợ .docx thật.'], 'about.by': ['Created by', 'Tác giả'], 'about.with': ['with the help of AI', 'với sự hỗ trợ của AI'],
};

const en = {}, vi = {};
for (const [k, [a, b]] of Object.entries(S)) { en[k] = a; vi[k] = b; }
const dicts = { en, vi };
let current = 'en';

export function detectLang() {
  const l = (navigator.language || 'en').toLowerCase();
  return l.startsWith('vi') ? 'vi' : 'en';
}

/** pref: 'auto' | 'en' | 'vi' */
export function setLanguage(pref) {
  current = pref === 'auto' || !dicts[pref] ? detectLang() : pref;
  document.documentElement.lang = current;
  return current;
}
export const lang = () => current;

export function t(key, vars) {
  let s = (dicts[current] && dicts[current][key]) || en[key] || key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll('{' + k + '}', v);
  return s;
}

/** Translates every [data-i18n], [data-i18n-title] and [data-i18n-ph] under root. */
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll('[data-i18n-title]').forEach((el) => { const v = t(el.dataset.i18nTitle); el.title = v; el.setAttribute('aria-label', v); });
  root.querySelectorAll('[data-i18n-ph]').forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
}
