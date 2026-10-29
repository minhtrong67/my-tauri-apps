/** English + Vietnamese UI strings. Vietnamese must define every English key (checked by TypeScript). */
export const en = {
  // window / chrome
  minimize: 'Minimize', maximize: 'Maximize', restore: 'Restore', close: 'Close', ready: 'Ready',
  // toolbar
  open: 'Open image', paste: 'Paste', capture: 'Capture', captureMore: 'More capture options', capFull: 'Full screen', capRegion: 'Select region', capRegionHint: 'then crop',
  crop: 'Crop', undo: 'Undo', redo: 'Redo', copy: 'Copy', save: 'Save', saveMore: 'More save options', savePng: 'Save as PNG', saveJpg: 'Save as JPEG', saveWebp: 'Save as WebP', saveAs: 'Save as…',
  compare: 'Compare', compareHint: 'Hold to see the original', settings: 'Settings', about: 'About', options: 'Options', shortcuts: 'Keyboard shortcuts',
  // empty / drop
  emptyT: 'Make your screenshots look great', emptyH: 'Capture the screen, paste an image, drop a file or open one to start.', sample: 'Try a sample image',
  tipDrop: 'or drop files onto the window', dropHere: 'Drop images here', recent: 'Recent files',
  // zoom / status
  zoom: 'Zoom', pan: 'Pan', zoomIn: 'Zoom in', zoomOut: 'Zoom out', zoomFit: 'Fit to window', zoomActual: 'Actual size (100%)', fitActual: 'Fit / 100%', original: 'Original',
  // crop
  cropHint: 'Drag on the image to select the area to keep', apply: 'Apply', reset: 'Reset', cancel: 'Cancel',
  // panel tabs
  tabLooks: 'Styles', tabBg: 'Background', tabLayout: 'Layout', tabFrame: 'Frame', tabText: 'Text', tabAnnotate: 'Annotate', tabExport: 'Export',
  // looks
  resetStyle: 'Reset style', styleReset: 'Style reset', myStyles: 'My styles', noPresets: 'Save your favourite look to reuse it with one click.', saveStyle: 'Save current style', styleName: 'Style name',
  styleSaved: 'Style saved', styleDeleted: 'Style deleted', deleteStyle: 'Delete style', deleteStyleMsg: 'Delete the style "{name}"? This cannot be undone.', delete: 'Delete',
  importExport: 'Import / export', copyAll: 'Copy all styles', import: 'Import', imported: '{n} style(s) imported', importFail: 'The pasted text is not a valid style list', ioHint: 'Copy your styles as text to back them up or share them, or paste a list here to import it.',
  // background
  bgGradient: 'Gradient', bgMesh: 'Mesh', bgSolid: 'Solid', bgImage: 'Image', bgNone: 'Transparent', angle: 'Angle', color: 'Color', color1: 'Color 1', color2: 'Color 2', color3: 'Color 3', use3: 'Use 3 colors',
  pickBg: 'Choose background image…', blur: 'Blur', autoBg: 'Auto colors from image', overlay: 'Texture', ovNone: 'None', ovDots: 'Dots', ovGrid: 'Grid', ovGrain: 'Grain', opacity: 'Opacity',
  // layout
  secLayout: 'Layout', pad: 'Padding', radius: 'Corner radius', ratio: 'Aspect ratio', auto: 'Auto', custom: 'Custom', width: 'Width (px)', height: 'Height (px)',
  shadow: 'Shadow', shBlur: 'Softness', shY: 'Vertical offset', border: 'Border', bdColor: 'Border color', tilt: 'Tilt', rotate: 'Rotate', skew: 'Skew',
  // frame
  fNone: 'None', fWin: 'Windows', fMac: 'macOS', fBrowser: 'Browser', fGlass: 'Glass', fPhone: 'Phone', fTablet: 'Tablet', fLaptop: 'Laptop', fLight: 'Light', fDark: 'Dark', fTitle: 'Frame title',
  // text
  secCap: 'Caption', capText: 'Text', capTop: 'Top', capBottom: 'Bottom', size: 'Size', secWm: 'Watermark', wmText: 'Text', wmLogo: 'Logo', pickLogo: 'Choose logo…', position: 'Position',
  posTL: 'Top left', posTR: 'Top right', posBL: 'Bottom left', posBR: 'Bottom right', posC: 'Center',
  // annotate
  toolSelect: 'Select', toolRect: 'Rectangle', toolEllipse: 'Ellipse', toolArrow: 'Arrow', toolLine: 'Line', toolText: 'Text', toolStep: 'Step number', toolHl: 'Highlight', toolBlur: 'Pixelate', toolSpot: 'Spotlight',
  annHint: 'Pick a tool and drag on the image. Select tool: click to move, drag the handles to resize, press Delete to remove.', stroke: 'Stroke width', pixel: 'Pixel size', textBg: 'Text background', deleteSel: 'Delete selected', clearAnn: 'Clear all',
  // export
  secExp: 'Export', quality: 'Quality', scale: 'Export scale', outSize: 'Output size', socialPack: 'Social media sizes', socialHint: 'Export the same design at several ready-made sizes in one go.',
  exportSelected: 'Export {n} size(s)', packDone: '{n} image(s) exported', soc_og: 'Open Graph', soc_x: 'X / Twitter', soc_linkedin: 'LinkedIn', soc_igsq: 'Instagram', soc_igst: 'Story', soc_ph: 'Product Hunt', soc_yt: 'YouTube',
  batch: 'Batch export', batchOpen: 'Choose images…', batchHint: 'Apply the current style to many images and export them all at once.', batchEmpty: 'No images yet. Add some to begin.', addImages: 'Add images', startBatch: 'Start export',
  batchDone: 'Exported {n} image(s)', batchPartial: 'Exported {n} of {m} images', batchSaveTo: 'Saving to',
  // messages
  copied: 'Image copied', copyFail: 'Could not copy the image', savedTo: 'Saved to', saveFail: 'Could not save the image', pasteFail: 'Could not read the clipboard. Press Ctrl+V instead', noClipImage: 'There is no image in the clipboard',
  readFail: 'Could not read the image', notImage: 'Please choose image files (PNG, JPG, WebP, GIF, BMP)', noImage: 'Open or paste an image first', limited: 'Export scale reduced because the image is large',
  captured: 'Screenshot captured', captureFail: 'Could not capture the screen', captureDesktop: 'Screen capture is available in the desktop app', hotkeyFail: 'Could not register the global shortcut',
  // settings
  sTheme: 'Appearance', system: 'System', light: 'Light', dark: 'Dark', sColor: 'Theme color', customColor: 'Custom color', sVariant: 'Color style', vTonal: 'Balanced', vVibrant: 'Vibrant',
  sContrast: 'Contrast', cStd: 'Standard', cMed: 'Medium', cHigh: 'High', sType: 'Typography', sFontSize: 'Text size', fsSm: 'Small', fsMd: 'Medium', fsLg: 'Large', sFont: 'Font', default: 'Default',
  sLang: 'Language', sWin: 'Window on startup', winRemember: 'Remember window size', winRememberD: 'Reopen at the size you last resized it to', winMax: 'Always open maximized', winMaxD: 'Start maximized every time (not full screen)',
  sSave: 'Save location', savePath: 'Folder path', browse: 'Browse…', openFolder: 'Open folder', changeFolder: 'Change folder', saveCustomHint: 'Images are saved here. You can type or paste a path; it is created if it does not exist.', saveDefaultHint: 'Using the Downloads folder. Choose another folder or paste a path to change it.', folderChanged: 'Save folder updated', desktopOnly: 'This option is available in the desktop app', saveDefault: 'Downloads folder (default)', chooseFolder: 'Choose folder', resetFolder: 'Use Downloads', askSave: 'Ask where to save each time',
  sCapture: 'Screen capture', hotkey: 'Global shortcut', hotkeyHint: 'Ctrl + Alt + S captures the screen from anywhere', delay: 'Capture delay', noDelay: 'None',
  sMore: 'Other', reduceMotion: 'Reduce animations', resetAll: 'Reset settings', resetAllMsg: 'Restore every setting to its default value? Your saved styles are kept.', settingsReset: 'Settings restored', done: 'Done',
  author: 'Author', aiBy: 'Built with the support of AI', version: 'Version', tagline: 'Turn plain screenshots into polished images for docs, posts and social media.', license: 'Open source · MIT License', releases: 'Releases',
  scrollTop: 'Scroll to top',
  c_red: 'Red', c_pink: 'Pink', c_purple: 'Purple', c_dpurple: 'Deep purple', c_indigo: 'Indigo', c_blue: 'Blue', c_lblue: 'Light blue', c_cyan: 'Cyan', c_teal: 'Teal', c_green: 'Green',
  c_lgreen: 'Light green', c_lime: 'Lime', c_yellow: 'Yellow', c_amber: 'Amber', c_orange: 'Orange', c_dorange: 'Deep orange', c_brown: 'Brown', c_grey: 'Blue grey',
} as const

export type K = keyof typeof en

const vi: Record<K, string> = {
  minimize: 'Thu nhỏ', maximize: 'Phóng to', restore: 'Khôi phục', close: 'Đóng', ready: 'Sẵn sàng',
  open: 'Mở ảnh', paste: 'Dán', capture: 'Chụp màn hình', captureMore: 'Thêm tùy chọn chụp', capFull: 'Toàn màn hình', capRegion: 'Chọn vùng', capRegionHint: 'rồi cắt',
  crop: 'Cắt', undo: 'Hoàn tác', redo: 'Làm lại', copy: 'Sao chép', save: 'Lưu', saveMore: 'Thêm tùy chọn lưu', savePng: 'Lưu dạng PNG', saveJpg: 'Lưu dạng JPEG', saveWebp: 'Lưu dạng WebP', saveAs: 'Lưu thành…',
  compare: 'So sánh', compareHint: 'Giữ để xem ảnh gốc', settings: 'Cài đặt', about: 'Giới thiệu', options: 'Tùy chọn', shortcuts: 'Phím tắt',
  emptyT: 'Làm đẹp ảnh chụp màn hình', emptyH: 'Chụp màn hình, dán ảnh, kéo thả tệp hoặc mở ảnh để bắt đầu.', sample: 'Dùng thử với ảnh mẫu',
  tipDrop: 'hoặc kéo thả tệp vào cửa sổ', dropHere: 'Thả ảnh vào đây', recent: 'Tệp gần đây',
  zoom: 'Thu phóng', pan: 'Kéo ảnh', zoomIn: 'Phóng to', zoomOut: 'Thu nhỏ', zoomFit: 'Vừa khung nhìn', zoomActual: 'Kích thước thật (100%)', fitActual: 'Vừa khung / 100%', original: 'Ảnh gốc',
  cropHint: 'Kéo trên ảnh để chọn vùng cần giữ', apply: 'Áp dụng', reset: 'Đặt lại', cancel: 'Hủy',
  tabLooks: 'Kiểu có sẵn', tabBg: 'Nền', tabLayout: 'Bố cục', tabFrame: 'Khung', tabText: 'Chữ', tabAnnotate: 'Chú thích', tabExport: 'Xuất ảnh',
  resetStyle: 'Đặt lại kiểu', styleReset: 'Đã đặt lại kiểu', myStyles: 'Kiểu của tôi', noPresets: 'Lưu kiểu yêu thích để dùng lại chỉ với một cú nhấp.', saveStyle: 'Lưu kiểu hiện tại', styleName: 'Tên kiểu',
  styleSaved: 'Đã lưu kiểu', styleDeleted: 'Đã xóa kiểu', deleteStyle: 'Xóa kiểu', deleteStyleMsg: 'Xóa kiểu "{name}"? Thao tác này không thể hoàn tác.', delete: 'Xóa',
  importExport: 'Nhập / xuất', copyAll: 'Sao chép tất cả kiểu', import: 'Nhập', imported: 'Đã nhập {n} kiểu', importFail: 'Nội dung dán vào không phải danh sách kiểu hợp lệ', ioHint: 'Sao chép các kiểu dưới dạng văn bản để sao lưu hoặc chia sẻ, hoặc dán danh sách vào đây để nhập.',
  bgGradient: 'Gradient', bgMesh: 'Lưới màu', bgSolid: 'Màu đặc', bgImage: 'Ảnh', bgNone: 'Trong suốt', angle: 'Góc', color: 'Màu', color1: 'Màu 1', color2: 'Màu 2', color3: 'Màu 3', use3: 'Dùng 3 màu',
  pickBg: 'Chọn ảnh nền…', blur: 'Làm mờ', autoBg: 'Tự lấy màu từ ảnh', overlay: 'Họa tiết', ovNone: 'Không', ovDots: 'Chấm', ovGrid: 'Lưới', ovGrain: 'Hạt', opacity: 'Độ đậm',
  secLayout: 'Bố cục', pad: 'Khoảng đệm', radius: 'Bo góc', ratio: 'Tỉ lệ khung', auto: 'Tự động', custom: 'Tùy chỉnh', width: 'Rộng (px)', height: 'Cao (px)',
  shadow: 'Đổ bóng', shBlur: 'Độ nhòe', shY: 'Lệch dọc', border: 'Viền', bdColor: 'Màu viền', tilt: 'Nghiêng', rotate: 'Xoay', skew: 'Vát',
  fNone: 'Không', fWin: 'Windows', fMac: 'macOS', fBrowser: 'Trình duyệt', fGlass: 'Kính', fPhone: 'Điện thoại', fTablet: 'Máy tính bảng', fLaptop: 'Laptop', fLight: 'Sáng', fDark: 'Tối', fTitle: 'Tiêu đề khung',
  secCap: 'Chú thích chữ', capText: 'Nội dung', capTop: 'Trên', capBottom: 'Dưới', size: 'Cỡ chữ', secWm: 'Watermark', wmText: 'Chữ', wmLogo: 'Logo', pickLogo: 'Chọn logo…', position: 'Vị trí',
  posTL: 'Trên trái', posTR: 'Trên phải', posBL: 'Dưới trái', posBR: 'Dưới phải', posC: 'Giữa',
  toolSelect: 'Chọn', toolRect: 'Hình chữ nhật', toolEllipse: 'Hình elip', toolArrow: 'Mũi tên', toolLine: 'Đường thẳng', toolText: 'Chữ', toolStep: 'Số thứ tự', toolHl: 'Tô sáng', toolBlur: 'Làm mờ ô vuông', toolSpot: 'Tiêu điểm',
  annHint: 'Chọn công cụ rồi kéo trên ảnh. Công cụ Chọn: bấm để di chuyển, kéo các điểm để đổi kích thước, nhấn Delete để xóa.', stroke: 'Độ dày nét', pixel: 'Cỡ điểm ảnh', textBg: 'Nền cho chữ', deleteSel: 'Xóa mục đã chọn', clearAnn: 'Xóa tất cả',
  secExp: 'Xuất ảnh', quality: 'Chất lượng', scale: 'Tỉ lệ xuất', outSize: 'Kích thước ảnh xuất', socialPack: 'Kích thước mạng xã hội', socialHint: 'Xuất cùng một thiết kế ở nhiều kích thước dựng sẵn chỉ trong một lần.',
  exportSelected: 'Xuất {n} kích thước', packDone: 'Đã xuất {n} ảnh', soc_og: 'Open Graph', soc_x: 'X / Twitter', soc_linkedin: 'LinkedIn', soc_igsq: 'Instagram', soc_igst: 'Story', soc_ph: 'Product Hunt', soc_yt: 'YouTube',
  batch: 'Xuất hàng loạt', batchOpen: 'Chọn nhiều ảnh…', batchHint: 'Áp dụng kiểu hiện tại cho nhiều ảnh và xuất tất cả cùng lúc.', batchEmpty: 'Chưa có ảnh nào. Hãy thêm ảnh để bắt đầu.', addImages: 'Thêm ảnh', startBatch: 'Bắt đầu xuất',
  batchDone: 'Đã xuất {n} ảnh', batchPartial: 'Đã xuất {n} trên {m} ảnh', batchSaveTo: 'Lưu vào',
  copied: 'Đã sao chép ảnh', copyFail: 'Không sao chép được ảnh', savedTo: 'Đã lưu vào', saveFail: 'Không lưu được ảnh', pasteFail: 'Không đọc được clipboard. Hãy nhấn Ctrl+V', noClipImage: 'Clipboard không có ảnh',
  readFail: 'Không đọc được ảnh', notImage: 'Hãy chọn tệp ảnh (PNG, JPG, WebP, GIF, BMP)', noImage: 'Hãy mở hoặc dán ảnh trước', limited: 'Đã giảm tỉ lệ xuất vì ảnh quá lớn',
  captured: 'Đã chụp màn hình', captureFail: 'Không chụp được màn hình', captureDesktop: 'Chụp màn hình chỉ có trong ứng dụng desktop', hotkeyFail: 'Không đăng ký được phím tắt toàn cục',
  sTheme: 'Giao diện', system: 'Hệ thống', light: 'Sáng', dark: 'Tối', sColor: 'Màu chủ đề', customColor: 'Màu tùy chỉnh', sVariant: 'Kiểu màu', vTonal: 'Cân bằng', vVibrant: 'Rực rỡ',
  sContrast: 'Độ tương phản', cStd: 'Chuẩn', cMed: 'Vừa', cHigh: 'Cao', sType: 'Chữ', sFontSize: 'Cỡ chữ', fsSm: 'Nhỏ', fsMd: 'Vừa', fsLg: 'Lớn', sFont: 'Phông chữ', default: 'Mặc định',
  sLang: 'Ngôn ngữ', sWin: 'Cửa sổ khi mở ứng dụng', winRemember: 'Ghi nhớ kích thước cửa sổ', winRememberD: 'Lần sau mở lại đúng kích thước bạn đã chỉnh', winMax: 'Luôn mở phóng to tối đa', winMaxD: 'Mỗi lần mở đều phóng to hết cỡ (không phải toàn màn hình)',
  sSave: 'Vị trí lưu ảnh', savePath: 'Đường dẫn thư mục', browse: 'Duyệt…', openFolder: 'Mở thư mục', changeFolder: 'Đổi thư mục', saveCustomHint: 'Ảnh sẽ được lưu vào đây. Bạn có thể gõ hoặc dán đường dẫn, thư mục sẽ được tạo nếu chưa có.', saveDefaultHint: 'Đang dùng thư mục Downloads. Hãy chọn thư mục khác hoặc dán đường dẫn để thay đổi.', folderChanged: 'Đã cập nhật thư mục lưu', desktopOnly: 'Tùy chọn này chỉ có trong ứng dụng desktop', saveDefault: 'Thư mục Downloads (mặc định)', chooseFolder: 'Chọn thư mục', resetFolder: 'Dùng Downloads', askSave: 'Hỏi vị trí mỗi lần lưu',
  sCapture: 'Chụp màn hình', hotkey: 'Phím tắt toàn cục', hotkeyHint: 'Nhấn Ctrl + Alt + S để chụp màn hình từ bất cứ đâu', delay: 'Độ trễ khi chụp', noDelay: 'Không',
  sMore: 'Khác', reduceMotion: 'Giảm hiệu ứng chuyển động', resetAll: 'Đặt lại cài đặt', resetAllMsg: 'Khôi phục mọi cài đặt về mặc định? Các kiểu bạn đã lưu vẫn được giữ lại.', settingsReset: 'Đã khôi phục cài đặt', done: 'Xong',
  author: 'Tác giả', aiBy: 'Được xây dựng với sự hỗ trợ của AI', version: 'Phiên bản', tagline: 'Biến ảnh chụp màn hình thành hình ảnh đẹp mắt cho tài liệu, bài viết và mạng xã hội.', license: 'Mã nguồn mở · Giấy phép MIT', releases: 'Bản phát hành',
  scrollTop: 'Cuộn lên đầu',
  c_red: 'Đỏ', c_pink: 'Hồng', c_purple: 'Tím', c_dpurple: 'Tím đậm', c_indigo: 'Chàm', c_blue: 'Xanh dương', c_lblue: 'Xanh da trời', c_cyan: 'Lơ', c_teal: 'Xanh mòng két', c_green: 'Xanh lá',
  c_lgreen: 'Xanh lá nhạt', c_lime: 'Chanh', c_yellow: 'Vàng', c_amber: 'Hổ phách', c_orange: 'Cam', c_dorange: 'Cam đậm', c_brown: 'Nâu', c_grey: 'Xám xanh',
}

export const dict: Record<'en' | 'vi', Record<K, string>> = { en, vi }
