/**
 * My Tauri Apps Collection - Interactive Logic & i18n Engine
 * Supports Light/Dark/System Themes, Real-time Search, Filters, Carousel & Modal
 */

// --- 1. APPS DATASET (17 Applications) ---
const APPS_DATA = [
  {
    id: 'material-calculator',
    name: 'Material Calculator',
    category: 'productivity',
    version: '1.0.0',
    tech: ['Tauri 2', 'Rust', 'Vanilla JS', 'Material You'],
    icon: 'material-calculator/src-tauri/icons/128x128@2x.png',
    screenshots: [
      'material-calculator/screenshots/image01.png',
      'material-calculator/screenshots/image02.png',
      'material-calculator/screenshots/image03.png',
      'material-calculator/screenshots/image04.png',
      'material-calculator/screenshots/image05.png',
      'material-calculator/screenshots/image06.png'
    ],
    desc: {
      en: 'A fast, full-featured Material Design 3 calculator with Standard, Scientific, 64-bit Programmer, Unit Converter, and Date calculation modes.',
      vi: 'Máy tính Material Design 3 đa năng siêu tốc: chế độ Tiêu chuẩn, Khoa học, Lập trình viên 64-bit BigInt, Đổi đơn vị và Tính chênh lệch ngày.'
    },
    features: {
      en: [
        'Full mathematical expression parsing engine without eval (precise & secure)',
        '64-bit BigInt programmer mode with interactive bit toggling grid (HEX, DEC, OCT, BIN)',
        '12 unit conversion categories (Length, Mass, Speed, Temperature, Currency, etc.)',
        'Date math: calculate days between dates and add/subtract time intervals',
        'Dynamic color scheme adapts to your preferred accent or wallpaper'
      ],
      vi: [
        'Bộ phân tích biểu thức toán học an toàn, không sử dụng eval (chính xác tuyệt đối)',
        'Chế độ lập trình viên 64-bit BigInt với lưới bật/tắt từng bit (HEX, DEC, OCT, BIN)',
        '12 danh mục chuyển đổi đơn vị đo lường (Độ dài, Khối lượng, Vận tốc, Nhiệt độ,...)',
        'Tính toán ngày: đếm khoảng cách giữa 2 ngày và cộng/trừ mốc thời gian',
        'Màu sắc động Material You thích ứng theo sở thích'
      ]
    },
    specs: {
      ui: 'Vanilla JS + Material 3 CSS',
      backend: 'Tauri 2 + Rust',
      license: 'MIT',
      platform: 'Windows 10 / 11',
      size: '~5.2 MB'
    }
  },
  {
    id: 'material-calendar',
    name: 'Material Calendar',
    category: 'productivity',
    version: '1.0.0',
    tech: ['Tauri 2', 'Rust', 'Vite', 'Vanilla JS', 'Material 3'],
    icon: 'material-calendar/src-tauri/icons/128x128@2x.png',
    screenshots: [],
    fallbackImg: 'material-calendar/app-icon.png',
    desc: {
      en: 'Modern desktop calendar with event tracking, schedules, reminders, and custom theme presets.',
      vi: 'Lịch để bàn phong cách Material You thanh lịch, quản lý lịch trình, nhắc hẹn và sự kiện với màu động.'
    },
    features: {
      en: [
        'Clean month, week, and agenda timeline views with smooth transitions',
        'Create, edit, and categorize events with priority tags and custom color coding',
        '100% offline-first local database, zero data collection or tracking',
        'Material Design 3 dynamic color palettes and fluid date navigation',
        'Export and import events via standard iCal format'
      ],
      vi: [
        'Chế độ xem theo tháng, tuần và danh sách sự kiện (agenda) trực quan',
        'Tạo, sửa và phân loại sự kiện với gắn nhãn ưu tiên và mã màu phong phú',
        'Lưu trữ offline an toàn 100% trên máy tính, bảo mật tuyệt đối',
        'Bảng màu động Material Design 3 chuyển cảnh ngày tháng siêu mượt',
        'Hỗ trợ xuất / nhập lịch định dạng chuẩn iCal'
      ]
    },
    specs: {
      ui: 'Vite + Vanilla JS + M3',
      backend: 'Tauri 2 + Rust',
      license: 'MIT',
      platform: 'Windows 10 / 11',
      size: '~4.8 MB'
    }
  },
  {
    id: 'material-note',
    name: 'Material Note',
    category: 'productivity',
    version: '1.1.0',
    tech: ['Tauri 2', 'Rust', 'Vanilla JS', 'Material 3'],
    icon: 'material-note/src-tauri/icons/128x128@2x.png',
    screenshots: [
      'material-note/screenshots/image01.png',
      'material-note/screenshots/image02.png',
      'material-note/screenshots/image03.png',
      'material-note/screenshots/image04.png'
    ],
    desc: {
      en: 'Ultra-fast tabbed notepad with syntax highlighting, automatic saving, and instant Markdown rendering.',
      vi: 'Sổ tay ghi chú đa tab siêu tốc với tô màu cú pháp mã nguồn, tự động lưu tức thì và định dạng Markdown.'
    },
    features: {
      en: [
        'Multi-tab interface to manage dozens of scratchpads effortlessly',
        'Live Markdown split preview with instant rendering',
        'Zero-loss background auto-saving and crash recovery',
        'Word count, line count, character metrics, and regex search/replace',
        'Lightweight memory footprint (< 25MB RAM)'
      ],
      vi: [
        'Giao diện nhiều thẻ tab quản lý hàng chục ghi chú dễ dàng',
        'Xem trước Markdown song song với tốc độ phản hồi tức thì',
        'Tự động lưu ngầm không bao giờ mất dữ liệu khi tắt đột ngột',
        'Thống kê số từ, số dòng, ký tự và tìm kiếm/thay thế bằng biểu thức Regex',
        'Chiếm dụng bộ nhớ siêu nhỏ gọn (< 25MB RAM)'
      ]
    },
    specs: {
      ui: 'Vanilla JS + M3',
      backend: 'Tauri 2 + Rust',
      license: 'MIT',
      platform: 'Windows 10 / 11',
      size: '~4.6 MB'
    }
  },
  {
    id: 'material-file',
    name: 'Material File',
    category: 'system',
    version: '1.0.0',
    tech: ['Tauri 2', 'Rust', 'Vanilla JS', 'Material 3'],
    icon: 'material-file/src-tauri/icons/128x128@2x.png',
    screenshots: [
      'material-file/assets/og-image.png'
    ],
    desc: {
      en: 'Tabbed file explorer inspired by Windows 11 with quick search, breadcrumbs, and split dual navigation.',
      vi: 'Trình quản lý tệp tin dạng tab phong cách Windows 11 hiện đại, tìm kiếm nhanh và chia ngăn kép tiện lợi.'
    },
    features: {
      en: [
        'Multi-tab navigation with quick-switch and breadcrumb path bar',
        'Dual-pane layout for effortless side-by-side drag & drop file operations',
        'Quick access favorites, pinned folders, and recent file history',
        'Native file operations powered by Rust for blazing transfer speeds',
        'Responsive grid and detailed list views with sorting & filtering'
      ],
      vi: [
        'Hỗ trợ mở nhiều tab tệp tin kèm thanh điều hướng breadcrumbs thuận tiện',
        'Giao diện chia ngăn song song (dual-pane) kéo thả tệp giữa 2 thư mục cực nhanh',
        'Ghim thư mục ưa thích, truy cập nhanh các tệp vừa mở gần đây',
        'Thao tác tệp xử lý bằng Rust đạt tốc độ đọc ghi đĩa tối đa',
        'Chế độ xem dạng lưới (grid) và danh sách chi tiết (list) kèm bộ lọc linh hoạt'
      ]
    },
    specs: {
      ui: 'Vanilla JS + Material 3 CSS',
      backend: 'Tauri 2 + Rust (Native IO)',
      license: 'MIT',
      platform: 'Windows 10 / 11',
      size: '~5.8 MB'
    }
  },
  {
    id: 'case-converter',
    name: 'Case Converter',
    category: 'productivity',
    version: '1.0.0',
    tech: ['Tauri 2', 'Rust', 'Vanilla JS', 'Material 3'],
    icon: 'case-converter/src-tauri/icons/128x128@2x.png',
    screenshots: [
      'case-converter/screenshots/image01.png',
      'case-converter/screenshots/image02.png',
      'case-converter/screenshots/image03.png',
      'case-converter/screenshots/image04.png',
      'case-converter/screenshots/image05.png',
      'case-converter/screenshots/image06.png'
    ],
    desc: {
      en: 'Convert text between 19 letter cases (camelCase, snake_case, PascalCase, CONSTANT_CASE, etc.) with sorting & deduplication tools.',
      vi: 'Chuyển đổi qua lại giữa 19 định dạng kiểu chữ lập trình và văn bản cùng các công cụ lọc trùng, sắp xếp dòng.'
    },
    features: {
      en: [
        '19 case formats: camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE, Title Case, etc.',
        'Line tools: deduplication, alphabetical sorting, reverse lines, trim whitespace',
        'String metrics: character count, word count, line count, byte length',
        'One-click instant clipboard copy with floating feedback toast',
        'Offline keyboard shortcuts for rapid developer workflow'
      ],
      vi: [
        '19 kiểu chuyển đổi chữ: camelCase, PascalCase, snake_case, kebab-case, CONSTANT_CASE, Title Case,...',
        'Tiện ích dòng: loại bỏ dòng trùng, sắp xếp A-Z, đảo ngược thứ tự, dọn dẹp khoảng trắng',
        'Bộ đếm chi tiết: ký tự, từ, số dòng và kích thước byte',
        'Sao chép vào clipboard chỉ với 1 click kèm thông báo trực quan',
        'Phím tắt tiện lợi cho quy trình làm việc của lập trình viên'
      ]
    },
    specs: {
      ui: 'Vanilla JS + Material 3',
      backend: 'Tauri 2 + Rust',
      license: 'MIT',
      platform: 'Windows 10 / 11',
      size: '~4.2 MB'
    }
  },
  {
    id: 'chrome-launcher',
    name: 'Chrome Launcher',
    category: 'productivity',
    version: '0.1.0',
    tech: ['Tauri 2', 'Rust', 'React 18', 'TypeScript', 'Material 3'],
    icon: 'chrome-launcher/src-tauri/icons/128x128@2x.png',
    screenshots: [
      'chrome-launcher/screenshots/image01.png',
      'chrome-launcher/screenshots/image02.png',
      'chrome-launcher/screenshots/image03.png',
      'chrome-launcher/screenshots/image04.png'
    ],
    desc: {
      en: 'Powerful Chrome profile manager to open and close designated browser profiles with pre-configured tab bundles in one click.',
      vi: 'Trình quản lý hồ sơ Google Chrome khởi chạy hàng loạt profile với danh sách tab định trước chỉ với 1 cú click.'
    },
    features: {
      en: [
        'Manage unlimited Chrome profile workspaces (Work, Personal, Dev, Client, etc.)',
        'Preset custom URL tab groups for automated daily morning workflows',
        'One-click launch, close, and restart commands',
        'System tray integration and quick hotkeys',
        'Clean React 18 + Material Design 3 dashboard'
      ],
      vi: [
        'Quản lý không giới hạn các workspace hồ sơ Chrome (Công việc, Cá nhân, Lập trình,...)',
        'Thiết lập trước các nhóm link website mở tự động mỗi ngày',
        'Khởi chạy, tắt và khởi động lại profile tức thì',
        'Tích hợp khay hệ thống (System tray) và phím tắt tiện ích',
        'Giao diện React 18 + Material Design 3 thanh lịch, hiện đại'
      ]
    },
    specs: {
      ui: 'React 18 + TypeScript + M3',
      backend: 'Tauri 2 + Rust',
      license: 'MIT',
      platform: 'Windows 10 / 11',
      size: '~5.5 MB'
    }
  },
  {
    id: 'material-docx',
    name: 'Material Docx',
    category: 'documents',
    version: '2.0.0',
    tech: ['Tauri 2', 'Rust Backend', 'Vanilla JS', 'Material 3'],
    icon: 'material-docx/src-tauri/icons/128x128@2x.png',
    screenshots: [
      'material-docx/screenshots/image01.png',
      'material-docx/screenshots/image02.png',
      'material-docx/screenshots/image03.png',
      'material-docx/screenshots/image04.png',
      'material-docx/screenshots/image05.png'
    ],
    desc: {
      en: 'Word-style desktop rich text processor with native .docx import, export, paginated layout, and formatting.',
      vi: 'Trình soạn thảo văn bản phong cách Word chuyên nghiệp, hỗ trợ đọc, ghi và xuất file Word .docx thực thụ.'
    },
    features: {
      en: [
        'True paginated print layout with custom margins, paper sizes (A4, Letter), orientation & page breaks',
        'Rich styling: headings, typography, text & highlight colors, format painter, multi-level lists',
        'Complete table tools: insert, merge/split cells, borders, shading, auto-fit columns',
        'Image insertion with resize handles, rotation, and text wrapping',
        'Native .docx format parsing and serialization powered by Rust'
      ],
      vi: [
        'Chế độ trang in thực tế với canh lề tuỳ biến, khổ giấy (A4, Letter), xoay ngang/dọc và ngắt trang',
        'Định dạng phong phú: tiêu đề, phông chữ, màu chữ & màu nền, chổi sao chép định dạng, danh sách đa cấp',
        'Công cụ bảng biểu đầy đủ: chèn bảng, gộp/tách ô, viền khung, tô màu nền, tự động co giãn cột',
        'Chèn hình ảnh với điểm neo thay đổi kích thước, xoay ảnh và tuỳ chọn bao văn bản',
        'Xử lý đọc và tạo file .docx nguyên bản bằng lõi Rust siêu tốc'
      ]
    },
    specs: {
      ui: 'Vanilla JS + Print Layout CSS',
      backend: 'Tauri 2 + Rust (docx-rs)',
      license: 'MIT',
      platform: 'Windows 10 / 11',
      size: '~6.4 MB'
    }
  },
  {
    id: 'material-xlsx',
    name: 'Material Xlsx',
    category: 'documents',
    version: '1.1.0',
    tech: ['Tauri 2', 'Rust Backend', 'Vanilla JS', 'Material 3'],
    icon: 'material-xlsx/src-tauri/icons/128x128@2x.png',
    screenshots: [
      'material-xlsx/screenshots/image01.png',
      'material-xlsx/screenshots/image02.png',
      'material-xlsx/screenshots/image03.png',
      'material-xlsx/screenshots/image04.png',
      'material-xlsx/screenshots/image05.png'
    ],
    desc: {
      en: 'High-performance spreadsheet editor for .xlsx workbooks with 200+ formulas, interactive charts, and conditional formatting.',
      vi: 'Bảng tính bảng biểu tốc độ cao cho file .xlsx với hơn 200 hàm tính toán, biểu đồ động và định dạng có điều kiện.'
    },
    features: {
      en: [
        '200+ Excel-compatible formulas (Math, Statistics, Financial, Logic, VLOOKUP, XLOOKUP, INDEX/MATCH)',
        'Dynamic interactive charts: Column, Bar, Line, Area, Pie, Doughnut, and Scatter',
        'Advanced conditional formatting: color scales, data bars, highlight rules, duplicate detection',
        'Multi-sheet workbook navigation, cell merging, auto-fit, and data validation dropdowns',
        'Bundled offline fonts (Inter, Roboto, Be Vietnam Pro) with Vietnamese diacritics support'
      ],
      vi: [
        'Hơn 200 hàm tương thích Excel (Toán học, Thống kê, Tài chính, Logic, VLOOKUP, XLOOKUP, INDEX/MATCH)',
        'Biểu đồ trực quan tương tác: Cột, Thanh, Đường, Miền, Tròn, Donut và Phân tán',
        'Định dạng có điều kiện chuyên sâu: thang màu (color scale), thanh dữ liệu (data bar), phát hiện trùng',
        'Hỗ trợ nhiều trang tính (multi-sheet), gộp ô, tự động chỉnh độ rộng cột và xác thực dữ liệu',
        'Tích hợp sẵn font tiếng Việt hiển thị sắc nét (Inter, Roboto, Be Vietnam Pro)'
      ]
    },
    specs: {
      ui: 'Vanilla JS Canvas + M3',
      backend: 'Tauri 2 + Rust (calamine/rust_xlsxwriter)',
      license: 'MIT',
      platform: 'Windows 10 / 11',
      size: '~7.1 MB'
    }
  },
  {
    id: 'material-csv',
    name: 'Material CSV',
    category: 'documents',
    version: '2.0.0',
    tech: ['Tauri 2', 'Rust', 'Vanilla JS', 'Material 3'],
    icon: 'material-csv/src-tauri/icons/128x128@2x.png',
    screenshots: [
      'material-csv/screenshots/image01.png',
      'material-csv/screenshots/image02.png',
      'material-csv/screenshots/image03.png',
      'material-csv/screenshots/image04.png',
      'material-csv/screenshots/image05.png',
      'material-csv/screenshots/image06.png',
      'material-csv/screenshots/image07.png'
    ],
    desc: {
      en: 'Snappy spreadsheet-style CSV/TSV table editor with instant search, multi-column filters, and multi-format exports.',
      vi: 'Trình chỉnh sửa bảng tính CSV/TSV tốc độ cực cao, tìm kiếm tức thì, lọc dữ liệu nhiều cột và xuất đa định dạng.'
    },
    features: {
      en: [
        'Handles large datasets with zero lag and virtualized rendering',
        'Multi-cell selection, sorting, regex filtering, and column drag-and-drop reordering',
        'Export to CSV, TSV, JSON, Excel (.xlsx), Markdown tables, and HTML tables',
        'Automatic delimiter detection (comma, semicolon, tab, pipe) and UTF-8 encoding support',
        'Clean Material Design 3 grid with dark and light themes'
      ],
      vi: [
        'Xử lý tập dữ liệu lớn mượt mà nhờ công nghệ dựng ảo hoá (virtualized rendering)',
        'Chọn nhiều ô, sắp xếp đa cấp, lọc biểu thức chính quy (regex) và kéo thả đổi thứ tự cột',
        'Xuất tệp sang CSV, TSV, JSON, Excel (.xlsx), bảng Markdown và bảng HTML',
        'Tự động nhận diện dấu phân tách (phẩy, chấm phẩy, tab, pipe) và bảng mã UTF-8',
        'Giao diện lưới Material Design 3 sắc nét, hỗ trợ Dark / Light mode'
      ]
    },
    specs: {
      ui: 'Virtual DOM + Vanilla JS + M3',
      backend: 'Tauri 2 + Rust (csv parser)',
      license: 'MIT',
      platform: 'Windows 10 / 11',
      size: '~5.0 MB'
    }
  },
  {
    id: 'material-readme',
    name: 'Material Readme',
    category: 'documents',
    version: '2.0.0',
    tech: ['Tauri 2', 'Rust', 'CodeMirror', 'Vanilla JS', 'Material 3'],
    icon: 'material-readme/src-tauri/icons/128x128@2x.png',
    screenshots: [
      'material-readme/screenshots/image01.png',
      'material-readme/screenshots/image02.png',
      'material-readme/screenshots/image03.png',
      'material-readme/screenshots/image04.png',
      'material-readme/screenshots/image05.png',
      'material-readme/screenshots/image06.png'
    ],
    desc: {
      en: 'Dedicated Markdown editor tailored for crafting GitHub READMEs with live preview, badge generators, and theme presets.',
      vi: 'Trình soạn thảo Markdown chuyên biệt để tạo file README.md cho GitHub với xem trước thời gian thực và tạo huy hiệu.'
    },
    features: {
      en: [
        'Split-screen editing with synchronized scrolling live GitHub-styled preview',
        'One-click badge insertion (Shields.io, technology badges, release badges)',
        'Mermaid diagram rendering, LaTeX math formulas, task lists, and syntax highlighting',
        'Export to GitHub-ready Markdown, HTML, or styled PDF',
        'Pre-built README templates for open source projects, libraries, and desktop apps'
      ],
      vi: [
        'Màn hình chia đôi với cuộn đồng bộ và chế độ xem trước chuẩn giao diện GitHub',
        'Chèn huy hiệu (badges Shields.io, huy hiệu công nghệ, phiên bản) chỉ bằng 1 cú click',
        'Dựng sơ đồ Mermaid, công thức toán học LaTeX, danh sách việc cần làm (tasklist) và tô màu cú pháp',
        'Xuất file sang Markdown chuẩn GitHub, mã HTML hoặc tệp PDF đẹp mắt',
        'Tích hợp sẵn nhiều mẫu README mẫu chuẩn cho dự án mã nguồn mở và ứng dụng'
      ]
    },
    specs: {
      ui: 'CodeMirror 6 + Marked + M3',
      backend: 'Tauri 2 + Rust',
      license: 'MIT',
      platform: 'Windows 10 / 11',
      size: '~6.8 MB'
    }
  },
  {
    id: 'material-music-player',
    name: 'Material Music Player',
    category: 'multimedia',
    version: '1.0.0',
    tech: ['Tauri 2', 'Rust', 'React 18', 'TypeScript', 'Material You'],
    icon: 'material-music-player/src-tauri/icons/128x128@2x.png',
    screenshots: [
      'material-music-player/screenshots/image01.png',
      'material-music-player/screenshots/image02.png',
      'material-music-player/screenshots/image03.png',
      'material-music-player/screenshots/image04.png',
      'material-music-player/screenshots/image05.png'
    ],
    desc: {
      en: 'Sleek local audio player with playlist management, synced lyrics, album artwork extraction, equalizer, and dynamic themes.',
      vi: 'Trình phát nhạc offline tuyệt đẹp với lời bài hát đồng bộ, trích xuất bìa đĩa, bộ lọc âm Equalizer và đổi màu theo bìa nhạc.'
    },
    features: {
      en: [
        'Dynamic Material You palette automatically generated from song cover art',
        'Real-time synchronized lyrics (.lrc support) with smooth karaoke scroll',
        'Multi-band audio equalizer with presets (Bass Boost, Vocal, Rock, Jazz, Flat)',
        'Automatic scan of music folders with instant search and playlist organization',
        'Full media keyboard shortcuts, mini player, and taskbar integration'
      ],
      vi: [
        'Bảng màu Material You tự động đổi sắc thái theo ảnh bìa của bài hát đang phát',
        'Lời bài hát đồng bộ thời gian thực (hỗ trợ file .lrc) cuộn mượt phong cách karaoke',
        'Bộ chỉnh âm Equalizer đa dải với các thiết lập sẵn (Tăng Bass, Giọng hát, Rock, Jazz,...)',
        'Tự động quét thư mục nhạc cục bộ, tìm kiếm bài hát tức thì và quản lý danh sách phát',
        'Phím tắt điều khiển nhạc toàn cục, chế độ thu nhỏ và tích hợp thanh tác vụ'
      ]
    },
    specs: {
      ui: 'React 18 + TypeScript + Web Audio API',
      backend: 'Tauri 2 + Rust (symphonia / id3)',
      license: 'MIT',
      platform: 'Windows 10 / 11',
      size: '~6.2 MB'
    }
  },
  {
    id: 'material-video-player',
    name: 'Material Video Player',
    category: 'multimedia',
    version: '1.0.0',
    tech: ['Tauri 2', 'Rust', 'React 18', 'TypeScript', 'Material 3'],
    icon: 'material-video-player/src-tauri/icons/128x128@2x.png',
    screenshots: [
      'material-video-player/screenshots/image01.png',
      'material-video-player/screenshots/image02.png',
      'material-video-player/screenshots/image03.png',
      'material-video-player/screenshots/image04.png',
      'material-video-player/screenshots/image05.png'
    ],
    desc: {
      en: 'Hardware-accelerated media player supporting all major codecs, subtitle synchronization (.srt, .vtt), playback speed, and playlists.',
      vi: 'Trình phát video tăng tốc phần cứng mượt mà, hỗ trợ tất cả codec phổ biến, đồng bộ phụ đề và danh sách phát thông minh.'
    },
    features: {
      en: [
        'GPU hardware-accelerated 4K/60FPS video playback with low CPU usage',
        'Subtitle support (.srt, .vtt) with custom fonts, sizes, and millisecond sync offset',
        'Variable playback speed (0.25x to 4x) with pitch correction',
        'Auto-scan of video directories, smart resume position, and loop modes',
        'Picture-in-Picture (PiP) and frameless distraction-free theater view'
      ],
      vi: [
        'Phát video 4K/60FPS tăng tốc phần cứng bằng GPU với mức tiêu thụ CPU siêu thấp',
        'Hỗ trợ phụ đề (.srt, .vtt) tuỳ chỉnh phông chữ, kích thước và bù trừ độ trễ mili-giây',
        'Điều chỉnh tốc độ phát linh hoạt (0.25x đến 4x) giữ nguyên tông giọng âm thanh',
        'Tự động quét thư mục video, ghi nhớ điểm dừng phát trước đó và chế độ lặp',
        'Chế độ hình-trong-hình (PiP) và xem toàn màn hình không viền hiện đại'
      ]
    },
    specs: {
      ui: 'React 18 + HTML5 Video API + M3',
      backend: 'Tauri 2 + Rust',
      license: 'MIT',
      platform: 'Windows 10 / 11',
      size: '~6.1 MB'
    }
  },
  {
    id: 'material-edit',
    name: 'Material Edit',
    category: 'multimedia',
    version: '1.0.0',
    tech: ['Tauri 2', 'Rust', 'Vanilla JS', 'Material 3'],
    icon: 'material-edit/src-tauri/icons/128x128@2x.png',
    screenshots: [
      'material-edit/screenshots/image01.png',
      'material-edit/screenshots/image02.png',
      'material-edit/screenshots/image03.png',
      'material-edit/screenshots/image04.png',
      'material-edit/screenshots/image05.png'
    ],
    desc: {
      en: 'CapCut-inspired lightweight video editor with multi-track timeline, clip trimming, transitions, text overlays, and audio tools.',
      vi: 'Trình biên tập video gọn nhẹ phong cách CapCut với dòng thời gian nhiều track, cắt ghép clip, hiệu ứng chuyển cảnh và âm thanh.'
    },
    features: {
      en: [
        'Multi-track timeline (Video, Overlay, Text, Audio) with magnetic snapping',
        'Precision split, trim, ripple delete, speed ramping, and clip reordering',
        'Overlay text styles, lower thirds, titles, and color grading filters',
        'Project library with persistent autosaving and fast export',
        'Resizable workspace panels with fullscreen preview mode'
      ],
      vi: [
        'Dòng thời gian đa rãnh (Video, Lớp phủ, Văn bản, Âm thanh) kèm tính năng hít từ tính',
        'Cắt tỉa chuẩn xác, xoá ripple, tăng giảm tốc độ và sắp xếp lại các phân đoạn',
        'Kiểu chữ phủ độc đáo, tiêu đề dưới (lower thirds), bộ lọc màu phong phú',
        'Quản lý thư viện dự án tự động lưu liên tục và xuất video nhanh',
        'Các bảng điều khiển có thể co giãn kích thước kèm chế độ xem trước toàn màn hình'
      ]
    },
    specs: {
      ui: 'Vanilla JS Canvas + Timeline UI + M3',
      backend: 'Tauri 2 + Rust (FFmpeg integration)',
      license: 'MIT',
      platform: 'Windows 10 / 11',
      size: '~7.8 MB'
    }
  },
  {
    id: 'material-photo',
    name: 'Material Photo',
    category: 'multimedia',
    version: '1.0.0',
    tech: ['Tauri 2', 'Rust', 'Vanilla JS', 'Lucide Icons', 'Material 3'],
    icon: 'material-photo/src-tauri/icons/128x128@2x.png',
    screenshots: [
      'material-photo/screenshots/image01.png',
      'material-photo/screenshots/image02.png',
      'material-photo/screenshots/image03.png',
      'material-photo/screenshots/image04.png',
      'material-photo/screenshots/image05.png',
      'material-photo/screenshots/image06.png',
      'material-photo/screenshots/image07.png',
      'material-photo/screenshots/image08.png'
    ],
    desc: {
      en: 'Modern photo viewer and image editor with automatic gallery scanning, filters, crop, rotate, and adjustment sliders.',
      vi: 'Trình xem và chỉnh sửa ảnh tinh tế với tính năng quét thư viện tự động, bộ lọc màu nghệ thuật, cắt xoay và hiệu chỉnh màu.'
    },
    features: {
      en: [
        'Lightning-fast image loading with smooth pan and zoom controls',
        'Full photo editing suite: Crop (arbitrary & preset aspect ratios), Rotate, Flip',
        'Image adjustments: Brightness, Contrast, Saturation, Vibrance, Warmth, Blur',
        'Curated artistic filters with instant one-click live preview',
        'Automatic gallery folder indexing and EXIF metadata viewer'
      ],
      vi: [
        'Tải ảnh siêu nhanh với khả năng phóng to thu nhỏ và kéo xem cực êm',
        'Bộ công cụ chỉnh ảnh toàn diện: Cắt xén (tỉ lệ tuỳ ý hoặc tỉ lệ chuẩn), Xoay, Lật ảnh',
        'Tinh chỉnh thông số: Độ sáng, Tương phản, Độ bão hoà, Độ rực, Nhiệt độ màu, Làm mờ',
        'Bộ sưu tập các hiệu ứng màu nghệ thuật xem trước tức thì',
        'Tự động quét ảnh trong thư mục và xem chi tiết siêu dữ liệu EXIF'
      ]
    },
    specs: {
      ui: 'Vanilla JS + Canvas 2D + M3',
      backend: 'Tauri 2 + Rust (image-rs)',
      license: 'MIT',
      platform: 'Windows 10 / 11',
      size: '~5.4 MB'
    }
  },
  {
    id: 'material-screenshot',
    name: 'Material Screenshot',
    category: 'multimedia',
    version: '1.1.0',
    tech: ['Tauri 2', 'Rust', 'Canvas API', 'Vanilla JS', 'Material 3'],
    icon: 'material-screenshot/src-tauri/icons/128x128@2x.png',
    screenshots: [
      'material-screenshot/screenshots/image01.png',
      'material-screenshot/screenshots/image02.png',
      'material-screenshot/screenshots/image03.png',
      'material-screenshot/screenshots/image04.png',
      'material-screenshot/screenshots/image05.png',
      'material-screenshot/screenshots/image06.png'
    ],
    desc: {
      en: 'Turn plain screenshots into stylish mockups with custom gradient backgrounds, rounded corners, shadows, and window frames.',
      vi: 'Biến ảnh chụp màn hình thô kệch thành hình ảnh mockup ấn tượng với nền gradient rực rỡ, đổ bóng và khung viền cửa sổ.'
    },
    features: {
      en: [
        'Beautiful mesh gradient backgrounds, solid colors, and dark/light backdrops',
        'Window frames (macOS style dots, Windows style, browser frame, or minimal)',
        'Customizable corner radius, elevation drop shadows, padding, and aspect ratios',
        'Annotation tools: arrows, rectangles, blur sensitive text, highlights',
        'Instant clipboard copy or high-resolution PNG/WebP download'
      ],
      vi: [
        'Bộ sưu tập hình nền dải màu gradient nghệ thuật, màu đơn sắc và nền tối sang trọng',
        'Khung viền cửa sổ đa dạng (phong cách chấm macOS, thanh tiêu đề Windows, viền trình duyệt)',
        'Tuỳ biến bo góc tròn, độ đổ bóng đa tầng, lề đệm và tỉ lệ khung hình (16:9, 1:1, Twitter,...)',
        'Công cụ chú thích trực quan: mũi tên, vẽ khung, làm mờ thông tin nhạy cảm, gạch chân nổi bật',
        'Sao chép ngay vào clipboard hoặc lưu tệp ảnh PNG/WebP độ nét cao'
      ]
    },
    specs: {
      ui: 'HTML5 Canvas API + Vanilla JS + M3',
      backend: 'Tauri 2 + Rust',
      license: 'MIT',
      platform: 'Windows 10 / 11',
      size: '~4.5 MB'
    }
  },
  {
    id: 'mp3-downloader',
    name: 'MP3 Downloader',
    category: 'multimedia',
    version: '0.4.0',
    tech: ['Tauri 2', 'Rust Backend', 'yt-dlp', 'Vanilla JS', 'Material 3'],
    icon: 'mp3-downloader/src-tauri/icons/128x128@2x.png',
    screenshots: [
      'mp3-downloader/og-image.png'
    ],
    desc: {
      en: 'High-quality audio extractor for YouTube, TikTok, and Spotify links with ID3 tagging and cover artwork embedding.',
      vi: 'Công cụ tải và chuyển đổi âm thanh chất lượng cao từ YouTube, TikTok và Spotify, tự động gắn thẻ ID3 và ảnh bìa.'
    },
    features: {
      en: [
        'Multi-source support: YouTube videos/playlists, TikTok clips, and Spotify track links',
        'Automatic ID3 metadata tagging (Title, Artist, Album, Year, Track number)',
        'High-res cover artwork extraction and embedding directly into the MP3 file',
        'Quality selector: Best VBR, 320 kbps, 256 kbps, 192 kbps, or 128 kbps',
        'Smart parallel queue with real-time download speed, ETA, and automatic retry on HTTP 403'
      ],
      vi: [
        'Hỗ trợ đa nền tảng: Video/playlist YouTube, clip TikTok và link bài hát Spotify',
        'Tự động nhận diện và gắn thẻ thông tin ID3 (Tên bài, Ca sĩ, Album, Năm phát hành)',
        'Trích xuất ảnh bìa chất lượng cao và nhúng trực tiếp vào tệp MP3',
        'Tuỳ chọn chất lượng âm thanh: Tốt nhất (VBR V0), 320 kbps, 256 kbps, 192 kbps, 128 kbps',
        'Hàng đợi tải thông minh xử lý song song, hiển thị tốc độ, thời gian dự kiến và tự phục hồi khi lỗi'
      ]
    },
    specs: {
      ui: 'Vanilla JS + M3',
      backend: 'Tauri 2 + Rust (yt-dlp sidecar)',
      license: 'MIT',
      platform: 'Windows 10 / 11',
      size: '~8.5 MB'
    }
  },
  {
    id: 'material-weather',
    name: 'Material Weather',
    category: 'weather',
    version: '1.0.0',
    tech: ['Tauri 2', 'Rust', 'Vite', 'Open-Meteo API', 'Vanilla JS', 'Material 3'],
    icon: 'material-weather/src-tauri/icons/128x128@2x.png',
    screenshots: [
      'material-weather/screenshots/image01.png',
      'material-weather/screenshots/image02.png',
      'material-weather/screenshots/image03.png',
      'material-weather/screenshots/image04.png'
    ],
    desc: {
      en: 'Real-time weather forecasting with hourly/daily predictions, animated visuals, air quality index, and multi-city tracking.',
      vi: 'Ứng dụng dự báo thời tiết trực quan theo thời gian thực, biểu đồ nhiệt độ 24h, dự báo 7 ngày, chỉ số chất lượng không khí (AQI).'
    },
    features: {
      en: [
        'Live weather metrics: Temperature, Feels-like, Humidity, Wind speed/gusts, Pressure, UV Index',
        'Interactive animated 24-hour hourly temperature curve with precipitation probability',
        '7-day extended forecast with high/low temperature range bars',
        'US AQI Air Quality index breakdown with PM2.5 and health advisories',
        'Dynamic sun arc tracking sunrise, sunset, and daylight progression in real time'
      ],
      vi: [
        'Thông số thời tiết trực tiếp: Nhiệt độ thực tế, Cảm giác như, Độ ẩm, Tốc độ gió, Áp suất khí quyển, Chỉ số UV',
        'Biểu đồ đường cong nhiệt độ 24 giờ chuyển động mượt kèm xác suất mưa',
        'Dự báo mở rộng 7 ngày với thanh hiển thị dải nhiệt độ cao nhất / thấp nhất',
        'Đo lường chất lượng không khí US AQI chi tiết với nồng độ bụi mịn PM2.5 và khuyến cáo sức khoẻ',
        'Vòng cung mặt trời mô phỏng thời gian thực giờ bình minh, hoàng hôn và độ dài ban ngày'
      ]
    },
    specs: {
      ui: 'Vite + Vanilla JS + Open-Meteo',
      backend: 'Tauri 2 + Rust',
      license: 'MIT',
      platform: 'Windows 10 / 11',
      size: '~4.9 MB'
    }
  }
];

// --- 2. I18N DICTIONARY (VIETNAMESE & ENGLISH) ---
const I18N = {
  vi: {
    pageTitle: 'My Tauri Apps Collection — 17 Ứng Dụng Desktop Siêu Nhẹ & Tinh Tế',
    metaDesc: 'Bộ sưu tập 17 ứng dụng desktop hiện đại, siêu nhẹ xây dựng với Tauri 2, Rust và Material Design 3. Khởi động tức thì, siêu tiết kiệm RAM và bảo mật dữ liệu tuyệt đối.',
    navExplore: 'Ứng Dụng',
    navBenchmark: 'So Sánh',
    navArchitecture: 'Kiến Trúc',
    navGuide: 'Tải Về',
    navFeatures: 'Tính Năng',
    starOnGitHub: 'Star trên GitHub',
    heroBadge: '⚡ PHÁT TRIỂN VỚI TAURI 2 & RUST • MATERIAL DESIGN 3',
    heroTitle: 'Bộ Sưu Tập 17 Ứng Dụng Desktop',
    heroTitleGradient: 'Siêu Nhẹ & Tinh Tế',
    heroDesc: 'Tuyển tập 17 phần mềm máy tính đa năng được tối ưu hoá hiệu năng với Rust và giao diện Material You. Tiết kiệm tới 90% dung lượng RAM so với Electron, khởi động tức thì và hoàn toàn miễn phí.',
    btnExplore: 'Khám phá 17 ứng dụng',
    btnDownload: 'Tải bản phát hành (.exe)',
    btnViewSource: 'Xem mã nguồn GitHub',
    stat1Number: '17',
    stat1Label: 'Ứng dụng hoàn thiện',
    stat2Number: '< 30 MB',
    stat2Label: 'RAM trung bình / App',
    stat3Number: '< 0.5s',
    stat3Label: 'Thời gian khởi động',
    stat4Number: '100%',
    stat4Label: 'Mã nguồn mở & An toàn',
    searchPlaceholder: 'Tìm kiếm ứng dụng theo tên, công nghệ hoặc tính năng...',
    shortcutKey: 'Ctrl + K',
    filterAll: 'Tất cả',
    filterProductivity: 'Năng suất & Tiện ích',
    filterDocuments: 'Tài liệu & Dữ liệu',
    filterMultimedia: 'Đa phương tiện',
    filterWeather: 'Thời tiết',
    filterSystem: 'Hệ thống',
    resultsShowing: 'Hiển thị',
    resultsOf: 'trên tổng số',
    resultsApps: 'ứng dụng',
    viewDetails: 'Chi tiết & Xem ảnh',
    downloadExe: 'Tải về (.exe)',
    noScreenshots: 'Giao diện đồ họa tối giản',
    screenshotCount: 'ảnh chụp',
    modalFeaturesTitle: 'Tính Năng Nổi Bật',
    modalSpecsTitle: 'Thông Số Kỹ Thuật',
    modalSpecUI: 'Giao diện (Frontend)',
    modalSpecBackend: 'Nhân xử lý (Backend)',
    modalSpecPlatform: 'Hệ điều hành hỗ trợ',
    modalSpecSize: 'Dung lượng bộ cài',
    modalSpecLicense: 'Bản quyền phần mềm',
    modalBtnClose: 'Đóng lại (Esc)',
    modalBtnFolder: 'Xem thư mục mã nguồn',
    benchmarkBadge: 'HIỆU NĂNG ĐỘT PHÁ',
    benchmarkTitle: 'Tại Sao Chọn Tauri 2 Thay Vì Electron?',
    benchmarkSubtitle: 'Nhờ tận dụng trực tiếp WebView2 bản địa của Windows và sức mạnh của Rust, Tauri mang lại trải nghiệm mượt mà không đối thủ.',
    colMetric: 'Tiêu chí so sánh',
    colTauri: 'Tauri 2 (Bộ ứng dụng này)',
    colElectron: 'Electron truyền thống',
    metricRam: 'Mức tiêu thụ bộ nhớ RAM',
    metricRamDesc: 'Đo lường khi ứng dụng mở ở trạng thái chờ và thực thi tác vụ cơ bản.',
    metricRamTauri: '15 – 35 MB (Cực nhẹ)',
    metricRamElectron: '180 – 350 MB+ (Nặng nề)',
    metricSize: 'Kích thước file cài đặt (.exe)',
    metricSizeDesc: 'Dung lượng tải về cho người dùng cuối.',
    metricSizeTauri: '4 – 8 MB',
    metricSizeElectron: '80 – 150 MB+',
    metricStartup: 'Thời gian khởi động',
    metricStartupDesc: 'Tốc độ phản hồi từ lúc click mở đến khi hiển thị giao diện.',
    metricStartupTauri: '< 0.5 giây (Tức thì)',
    metricStartupElectron: '2 – 4 giây',
    metricSafety: 'Độ an toàn bộ nhớ & Bảo mật',
    metricSafetyDesc: 'Kiến trúc bảo mật cấp hệ thống.',
    metricSafetyTauri: '100% Rust memory safety, không lỗ hổng tràn bộ đệm',
    metricSafetyElectron: 'Phụ thuộc sandbox Node.js & V8 engine cồng kềnh',
    archBadge: 'KIẾN TRÚC MONOREPO',
    archTitle: 'Cargo Workspace: Tiết Kiệm Hơn 60 GB Bộ Nhớ',
    archSubtitle: 'Thay vì 17 thư mục build Rust riêng biệt tốn kém hàng chục GB dung lượng đĩa, một Cargo Workspace duy nhất quản lý và chia sẻ toàn bộ cache biên dịch.',
    archPoint1Title: 'Bộ nhớ đệm biên dịch dùng chung (Shared target/)',
    archPoint1Desc: 'Tất cả 17 ứng dụng biên dịch chung vào một thư mục ./target duy nhất ở gốc dự án, giúp chia sẻ triệt để các crate nặng như tauri, serde, tokio.',
    archPoint2Title: 'Tối ưu hoá kích thước nhị phân toàn cục',
    archPoint2Desc: 'Cấu hình Link-Time Optimization (lto = true), strip debug symbols, và opt-level = "s" giúp tạo ra các tệp thực thi Windows nhỏ gọn đến khó tin.',
    archPoint3Title: 'Quy trình phát triển nhất quán',
    archPoint3Desc: 'Chỉ cần một lệnh npm install và npm run tauri dev trong từng thư mục là có thể phát triển và kiểm thử độc lập mà không bị xung đột.',
    copyCode: 'Sao chép',
    codeCopied: 'Đã chép!',
    guideBadge: 'HƯỚNG DẪN',
    guideTitle: 'Dễ Dàng Sử Dụng & Phát Triển',
    guideSubtitle: 'Dù bạn là người dùng cuối muốn trải nghiệm ứng dụng hay lập trình viên muốn tham gia đóng góp.',
    tabForUsers: 'Dành cho Người Dùng',
    tabForDevs: 'Dành cho Lập Trình Viên',
    userStep1Title: '1. Vào GitHub Releases',
    userStep1Desc: 'Truy cập trang Releases chính thức của kho mã nguồn trên GitHub để xem danh sách các phiên bản mới nhất.',
    userStep2Title: '2. Tải File Cài Đặt .exe',
    userStep2Desc: 'Lựa chọn ứng dụng bạn mong muốn và tải file cài đặt độc lập (.exe hoặc .msi) về máy tính của bạn.',
    userStep3Title: '3. Chạy Trực Tiếp & Trải Nghiệm',
    userStep3Desc: 'Mở file vừa tải để sử dụng ngay. Tương thích hoàn hảo với Windows 10 và Windows 11 mà không cần cấu hình phức tạp.',
    devStep1Title: '1. Clone Kho Mã Nguồn',
    devStep1Desc: 'Chạy lệnh: git clone https://github.com/minhtrong67/my-tauri-apps.git và chuyển vào thư mục dự án.',
    devStep2Title: '2. Cài Đặt Phụ Thuộc',
    devStep2Desc: 'Yêu cầu Node.js 18+ và Rust 1.77+. Chuyển vào thư mục ứng dụng bất kỳ (ví dụ: cd material-calculator) rồi chạy npm install.',
    devStep3Title: '3. Khởi Chạy Hot-Reload',
    devStep3Desc: 'Chạy npm run tauri dev để khởi động ứng dụng với chế độ tự động cập nhật mã nguồn (Hot Reload). Để build bản phát hành, chạy npm run tauri build.',
    whyBadge: 'ƯU ĐIỂM NỔI BẬT',
    whyTitle: 'Được Thiết Kế Cho Trải Nghiệm Tốt Nhất',
    whySubtitle: 'Từng ứng dụng trong bộ sưu tập đều được chau chuốt kỹ lưỡng từ giao diện đến từng dòng code backend.',
    feat1Title: 'Material Design 3 Chuẩn Google',
    feat1Desc: 'Áp dụng ngôn ngữ thiết kế Material You với màu động, hiệu ứng chuyển động mượt mà và giao diện thanh lịch.',
    feat2Title: 'Hiệu Năng Rust Đỉnh Cao',
    feat2Desc: 'Backend viết bằng Rust mang lại tốc độ xử lý nhanh như chớp, không giật lag và độ ổn định bền bỉ.',
    feat3Title: 'Offline 100% & Bảo Mật Dữ Liệu',
    feat3Desc: 'Hoạt động hoàn toàn không cần Internet. Không gửi dữ liệu người dùng, không theo dõi, không quảng cáo.',
    feat4Title: 'Hỗ Trợ Song Ngữ Hoàn Hảo',
    feat4Desc: 'Toàn bộ giao diện và ứng dụng hỗ trợ cả tiếng Việt và tiếng Anh, chuyển đổi linh hoạt bất cứ khi nào.',
    feat5Title: 'Gọn Nhẹ & Di Động',
    feat5Desc: 'Mỗi ứng dụng có dung lượng chỉ từ 4MB đến 8MB, dễ dàng chia sẻ, sao lưu hoặc mang theo trên USB.',
    feat6Title: '100% Miễn Phí & Mã Nguồn Mở',
    feat6Desc: 'Phát hành dưới giấy phép mã nguồn mở MIT License. Tự do sử dụng, chỉnh sửa và đóng góp phát triển.',
    ctaTitle: 'Sẵn Sàng Trải Nghiệm Bộ Ứng Dụng Thế Hệ Mới?',
    ctaDesc: 'Tải ngay các ứng dụng yêu thích hoặc khám phá toàn bộ mã nguồn trên GitHub để nâng cao hiệu suất làm việc của bạn.',
    ctaBtnDownload: 'Tải Bản Cài Đặt Mới Nhất',
    ctaBtnGitHub: 'Xem Trên GitHub',
    footerDesc: 'Bộ sưu tập 17 ứng dụng desktop đa năng, siêu nhẹ được phát triển bằng Tauri 2, Rust và Material Design 3.',
    footerColApps: 'Danh Mục',
    footerColLinks: 'Liên Kết',
    footerColAuthor: 'Tác Giả & Bản Quyền',
    footerAuthorInfo: 'Phát triển bởi minhtrong67 với sự hỗ trợ từ Claude & Google Antigravity.',
    footerLicense: 'Phát hành theo giấy phép mã nguồn mở MIT License.',
    themeLight: 'Sáng',
    themeDark: 'Tối',
    themeSystem: 'Hệ thống'
  },
  en: {
    pageTitle: 'My Tauri Apps Collection — 17 Modern & Lightweight Desktop Apps',
    metaDesc: 'A modern suite of 17 lightweight desktop applications built with Tauri 2, Rust, and Material Design 3. Instant startup, ultra-low memory usage, and offline privacy.',
    navExplore: 'Applications',
    navBenchmark: 'Benchmark',
    navArchitecture: 'Architecture',
    navGuide: 'Download',
    navFeatures: 'Features',
    starOnGitHub: 'Star on GitHub',
    heroBadge: '⚡ BUILT WITH TAURI 2 & RUST • MATERIAL DESIGN 3',
    heroTitle: 'A Modern Suite of 17',
    heroTitleGradient: 'Lightweight Desktop Apps',
    heroDesc: 'A centralized monorepo of 17 high-performance desktop tools crafted with Rust and Google’s Material You design system. Enjoy up to 90% RAM reduction vs Electron, instant launch, and 100% free open-source software.',
    btnExplore: 'Explore 17 Apps',
    btnDownload: 'Download Releases (.exe)',
    btnViewSource: 'View GitHub Repository',
    stat1Number: '17',
    stat1Label: 'Ready-to-use Apps',
    stat2Number: '< 30 MB',
    stat2Label: 'Avg RAM / Application',
    stat3Number: '< 0.5s',
    stat3Label: 'Instant Launch Time',
    stat4Number: '100%',
    stat4Label: 'Open Source & Safe',
    searchPlaceholder: 'Search applications by name, technology, or feature...',
    shortcutKey: 'Ctrl + K',
    filterAll: 'All',
    filterProductivity: 'Productivity & Utility',
    filterDocuments: 'Documents & Data',
    filterMultimedia: 'Multimedia',
    filterWeather: 'Weather & Life',
    filterSystem: 'System & File',
    resultsShowing: 'Showing',
    resultsOf: 'of',
    resultsApps: 'apps',
    viewDetails: 'Details & Gallery',
    downloadExe: 'Download (.exe)',
    noScreenshots: 'Clean Graphic UI',
    screenshotCount: 'screenshots',
    modalFeaturesTitle: 'Key Highlights',
    modalSpecsTitle: 'Technical Specifications',
    modalSpecUI: 'User Interface (Frontend)',
    modalSpecBackend: 'Core Backend',
    modalSpecPlatform: 'Supported Platform',
    modalSpecSize: 'Installer Size',
    modalSpecLicense: 'Software License',
    modalBtnClose: 'Close (Esc)',
    modalBtnFolder: 'View Source Directory',
    benchmarkBadge: 'BREAKTHROUGH PERFORMANCE',
    benchmarkTitle: 'Why Choose Tauri 2 Over Electron?',
    benchmarkSubtitle: 'By utilizing Windows native WebView2 and Rust zero-cost abstractions, Tauri applications deliver unmatched snappiness.',
    colMetric: 'Evaluation Metric',
    colTauri: 'Tauri 2 (This Suite)',
    colElectron: 'Traditional Electron',
    metricRam: 'Memory Consumption (RAM)',
    metricRamDesc: 'Idle and baseline runtime memory footprint.',
    metricRamTauri: '15 – 35 MB (Ultra light)',
    metricRamElectron: '180 – 350 MB+ (Heavy)',
    metricSize: 'Installer Binary Size (.exe)',
    metricSizeDesc: 'End-user download bandwidth and disk usage.',
    metricSizeTauri: '4 – 8 MB',
    metricSizeElectron: '80 – 150 MB+',
    metricStartup: 'Cold Startup Time',
    metricStartupDesc: 'Time from double-click to fully interactive window paint.',
    metricStartupTauri: '< 0.5 sec (Instant)',
    metricStartupElectron: '2 – 4 seconds',
    metricSafety: 'Memory Safety & Security',
    metricSafetyDesc: 'System architecture integrity.',
    metricSafetyTauri: '100% Rust memory safety, zero buffer overflows',
    metricSafetyElectron: 'Complex multi-process Node.js & V8 sandbox',
    archBadge: 'MONOREPO ARCHITECTURE',
    archTitle: 'Cargo Workspace: Saving 60+ GB of Storage',
    archSubtitle: 'Instead of maintaining 17 independent Rust build targets that eat up 50-80 GB, a unified Cargo Workspace shares compilation caches.',
    archPoint1Title: 'Shared Root Target Directory (./target)',
    archPoint1Desc: 'All 17 apps compile into a single root build directory, enabling instant reuse of heavy dependencies like tauri, serde, and tokio.',
    archPoint2Title: 'Global Link-Time Optimization (LTO)',
    archPoint2Desc: 'Release profile with lto = true, strip = true, and opt-level = "s" generates razor-thin, optimized Windows binaries.',
    archPoint3Title: 'Consistent Isolated Development',
    archPoint3Desc: 'Navigate to any app folder and run npm install && npm run tauri dev without conflicts or complicated scripts.',
    copyCode: 'Copy',
    codeCopied: 'Copied!',
    guideBadge: 'GETTING STARTED',
    guideTitle: 'Easy to Run & Develop',
    guideSubtitle: 'Whether you want pre-compiled binaries or want to modify the source code locally.',
    tabForUsers: 'For End Users',
    tabForDevs: 'For Developers',
    userStep1Title: '1. Visit GitHub Releases',
    userStep1Desc: 'Head over to the official GitHub releases page of the repository to view all pre-compiled assets.',
    userStep2Title: '2. Download Standalone .exe',
    userStep2Desc: 'Pick your desired desktop application and download the standalone installer (.exe or .msi).',
    userStep3Title: '3. Run Instantly',
    userStep3Desc: 'Launch the installer and start using the app. Works natively on Windows 10 and Windows 11 with no extra prerequisites.',
    devStep1Title: '1. Clone the Monorepo',
    devStep1Desc: 'Run: git clone https://github.com/minhtrong67/my-tauri-apps.git and navigate into the workspace.',
    devStep2Title: '2. Install Dependencies',
    devStep2Desc: 'Requires Node.js 18+ and Rust 1.77+. Switch to any app directory (e.g. cd material-calculator) and run npm install.',
    devStep3Title: '3. Run Dev with Hot-Reload',
    devStep3Desc: 'Execute npm run tauri dev for real-time frontend & backend development. To build an installer, run npm run tauri build.',
    whyBadge: 'WHY THIS SUITE',
    whyTitle: 'Engineered for the Modern Desktop',
    whySubtitle: 'Every single application has been meticulously polished from UI micro-interactions to robust Rust backend routines.',
    feat1Title: 'Material Design 3 & Material You',
    feat1Desc: 'True Material 3 design system with dynamic color harmony, fluid animations, and polished tactile surfaces.',
    feat2Title: 'Rust-Powered Velocity',
    feat2Desc: 'Backends written in safe Rust offer blistering execution speeds, near-zero crash rates, and efficient resource handling.',
    feat3Title: '100% Offline & Private',
    feat3Desc: 'Everything runs locally on your PC. No telemetry, no tracking, no cloud dependencies, and zero advertising.',
    feat4Title: 'Seamless Dual Language',
    feat4Desc: 'Native support for both English and Vietnamese across the entire user experience and documentation.',
    feat5Title: 'Ultra-Compact & Portable',
    feat5Desc: 'Weighing only 4MB to 8MB each, apps download in seconds and can easily run from a flash drive.',
    feat6Title: '100% Free & Open Source',
    feat6Desc: 'Distributed under the permissive MIT License. Completely free to use, inspect, fork, and contribute.',
    ctaTitle: 'Ready to Experience the Next-Gen Desktop Suite?',
    ctaDesc: 'Download your favorite apps or inspect the open-source repository on GitHub to boost your everyday productivity.',
    ctaBtnDownload: 'Download Latest Releases',
    ctaBtnGitHub: 'View on GitHub',
    footerDesc: 'A centralized monorepo of 17 modern, lightweight desktop applications built with Tauri 2, Rust, and Material Design 3.',
    footerColApps: 'Applications',
    footerColLinks: 'Quick Links',
    footerColAuthor: 'Credits & License',
    footerAuthorInfo: 'Created by minhtrong67 with collaborative assistance from Claude & Google Antigravity.',
    footerLicense: 'Distributed under the open-source MIT License.',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System'
  }
};

// --- 3. APPLICATION STATE ---
let currentLang = localStorage.getItem('tauri_apps_lang') || 'vi';
let currentTheme = localStorage.getItem('tauri_apps_theme') || 'system';
let currentCategory = 'all';
let searchQuery = '';
let currentViewMode = 'grid'; // 'grid' | 'list'
let activeModalApp = null;
let currentSlideIndex = 0;

// --- 4. THEME CONTROLLER ---
function initTheme() {
  applyTheme(currentTheme);
  
  // Listen to OS system color scheme changes if system mode is active
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (currentTheme === 'system') {
      applyTheme('system');
    }
  });

  // Setup theme button & dropdown
  const themeBtn = document.getElementById('themeBtn');
  const themeDropdown = document.getElementById('themeDropdown');
  
  if (themeBtn && themeDropdown) {
    themeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      themeDropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      themeDropdown.classList.remove('show');
    });

    document.querySelectorAll('.theme-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const selected = opt.getAttribute('data-theme-val');
        setTheme(selected);
        themeDropdown.classList.remove('show');
      });
    });
  }
}

function setTheme(theme) {
  currentTheme = theme;
  localStorage.setItem('tauri_apps_theme', theme);
  applyTheme(theme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  
  // Update dropdown active state
  document.querySelectorAll('.theme-option').forEach(opt => {
    if (opt.getAttribute('data-theme-val') === theme) {
      opt.classList.add('active');
    } else {
      opt.classList.remove('active');
    }
  });

  // Update theme button icon
  const themeIconWrap = document.getElementById('themeCurrentIcon');
  if (themeIconWrap) {
    if (theme === 'light') {
      themeIconWrap.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    } else if (theme === 'dark') {
      themeIconWrap.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    } else {
      themeIconWrap.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;
    }
  }
}

// --- 5. I18N CONTROLLER ---
function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('tauri_apps_lang', lang);
  updateDOMTexts();
  renderAppCards();
  if (activeModalApp) {
    updateModalContent(activeModalApp);
  }
}

function updateDOMTexts() {
  const dict = I18N[currentLang];
  document.documentElement.lang = currentLang;
  document.title = dict.pageTitle;

  // Update meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', dict.metaDesc);

  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });

  // Update all placeholders
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    if (dict[key]) {
      el.setAttribute('placeholder', dict[key]);
    }
  });

  // Update active state of language toggle button
  const langBtn = document.getElementById('langToggleBtn');
  if (langBtn) {
    const flag = currentLang === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN';
    langBtn.innerHTML = `<span>${flag}</span>`;
  }
}

// --- 6. RENDER APP CATALOG ---
function renderAppCards() {
  const gridContainer = document.getElementById('appsGrid');
  if (!gridContainer) return;

  const dict = I18N[currentLang];

  // Filter apps by category and search query
  const query = searchQuery.trim().toLowerCase();
  const filtered = APPS_DATA.filter(app => {
    const matchCategory = (currentCategory === 'all' || app.category === currentCategory);
    if (!matchCategory) return false;
    if (!query) return true;

    const nameMatch = app.name.toLowerCase().includes(query);
    const descMatch = (app.desc[currentLang] || '').toLowerCase().includes(query);
    const techMatch = app.tech.some(t => t.toLowerCase().includes(query));
    const featMatch = (app.features[currentLang] || []).some(f => f.toLowerCase().includes(query));

    return nameMatch || descMatch || techMatch || featMatch;
  });

  // Update count indicator
  const resultsCounter = document.getElementById('resultsCounter');
  if (resultsCounter) {
    resultsCounter.innerHTML = `<span>${dict.resultsShowing} <strong>${filtered.length}</strong> ${dict.resultsOf} <strong>${APPS_DATA.length}</strong> ${dict.resultsApps}</span>`;
  }

  if (filtered.length === 0) {
    gridContainer.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 1.5rem; opacity: 0.4;">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <h3 style="font-size: 1.3rem; margin-bottom: 0.5rem; color: var(--text-primary);">${currentLang === 'vi' ? 'Không tìm thấy ứng dụng phù hợp' : 'No applications found'}</h3>
        <p>${currentLang === 'vi' ? 'Thử tìm với từ khoá khác hoặc chọn bộ lọc "Tất cả".' : 'Try searching with different keywords or switch category filter to "All".'}</p>
      </div>
    `;
    return;
  }

  // Render cards
  gridContainer.innerHTML = filtered.map(app => {
    const hasScreenshots = app.screenshots && app.screenshots.length > 0;
    const primaryImg = hasScreenshots ? app.screenshots[0] : (app.fallbackImg || null);
    const screenshotCount = app.screenshots ? app.screenshots.length : 0;
    const categoryBadgeClass = getCategoryBadgeClass(app.category);
    const categoryName = getCategoryName(app.category, currentLang);
    const bullets = (app.features[currentLang] || []).slice(0, 3);

    return `
      <article class="app-card" data-app-id="${app.id}">
        <div class="card-media" onclick="openAppModal('${app.id}')">
          ${primaryImg ? `
            <img class="screenshot-thumb" src="${primaryImg}" alt="${app.name} preview" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'card-media-fallback\\'><svg viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\'><rect x=\\'2\\' y=\\'3\\' width=\\'20\\' height=\\'14\\' rx=\\'2\\'></rect></svg><span>${app.name}</span></div>'" />
          ` : `
            <div class="card-media-fallback">
              <img src="${app.icon}" width="64" height="64" alt="${app.name} icon" style="filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4)); margin-bottom: 0.5rem;" />
              <span>${dict.noScreenshots}</span>
            </div>
          `}
          <div class="media-badges">
            <span class="badge ${categoryBadgeClass}">${categoryName}</span>
          </div>
          ${screenshotCount > 0 ? `
            <div class="gallery-count-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span>${screenshotCount} ${dict.screenshotCount}</span>
            </div>
          ` : ''}
        </div>

        <div class="card-body">
          <div class="card-top">
            <img class="app-icon" src="${app.icon}" alt="${app.name} icon" loading="lazy" onerror="this.src='case-converter/src-tauri/icons/128x128@2x.png'" />
            <div class="card-title-wrap">
              <h3 class="card-title">${app.name}</h3>
              <div class="card-meta-row">
                <span class="version-pill">v${app.version}</span>
                <span>•</span>
                <span>${app.specs.platform}</span>
              </div>
            </div>
          </div>

          <p class="card-desc">${app.desc[currentLang] || app.desc.en}</p>

          <ul class="card-bullets">
            ${bullets.map(b => `
              <li class="card-bullet-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>${b}</span>
              </li>
            `).join('')}
          </ul>

          <div class="tech-tags">
            ${app.tech.map(t => `<span class="tech-tag">${t}</span>`).join('')}
          </div>

          <div class="card-actions">
            <button class="btn-card-detail" onclick="openAppModal('${app.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              <span>${dict.viewDetails}</span>
            </button>
            <a class="btn-card-dl" href="https://github.com/minhtrong67/my-tauri-apps/releases" target="_blank" rel="noopener noreferrer" title="${dict.downloadExe}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              <span>.exe</span>
            </a>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function getCategoryBadgeClass(cat) {
  switch (cat) {
    case 'productivity': return 'badge-cyan';
    case 'documents': return 'badge-purple';
    case 'multimedia': return 'badge-rust';
    case 'weather': return 'badge-success';
    case 'system': return 'badge-cyan';
    default: return 'badge-cyan';
  }
}

function getCategoryName(cat, lang) {
  const map = {
    productivity: { vi: 'Năng suất', en: 'Productivity' },
    documents: { vi: 'Tài liệu', en: 'Document' },
    multimedia: { vi: 'Đa phương tiện', en: 'Multimedia' },
    weather: { vi: 'Thời tiết', en: 'Weather' },
    system: { vi: 'Hệ thống', en: 'System' }
  };
  return map[cat] ? map[cat][lang] || map[cat].en : cat;
}

// --- 7. MODAL DIALOG & CAROUSEL ---
function openAppModal(appId) {
  const app = APPS_DATA.find(a => a.id === appId);
  if (!app) return;

  activeModalApp = app;
  currentSlideIndex = 0;

  const modal = document.getElementById('appModal');
  if (!modal) return;

  updateModalContent(app);
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAppModal() {
  const modal = document.getElementById('appModal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
  activeModalApp = null;
}

function updateModalContent(app) {
  const dict = I18N[currentLang];
  document.getElementById('modalTitle').textContent = app.name;
  document.getElementById('modalVersion').textContent = `v${app.version}`;
  document.getElementById('modalCategory').textContent = getCategoryName(app.category, currentLang);
  document.getElementById('modalCategory').className = `badge ${getCategoryBadgeClass(app.category)}`;
  document.getElementById('modalIcon').src = app.icon;

  // Render Carousel
  const carouselArea = document.getElementById('modalCarouselArea');
  const allImages = app.screenshots && app.screenshots.length > 0 ? app.screenshots : (app.fallbackImg ? [app.fallbackImg] : []);

  if (allImages.length > 0) {
    carouselArea.innerHTML = `
      <div class="gallery-carousel">
        <div class="carousel-slide-view">
          <img id="carouselMainImg" class="carousel-slide-img" src="${allImages[0]}" alt="${app.name} screenshot" />
          ${allImages.length > 1 ? `
            <button class="carousel-btn prev" onclick="changeSlide(-1)" aria-label="Previous image">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <button class="carousel-btn next" onclick="changeSlide(1)" aria-label="Next image">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          ` : ''}
        </div>
        ${allImages.length > 1 ? `
          <div class="carousel-indicators">
            ${allImages.map((img, idx) => `
              <img class="carousel-thumb ${idx === 0 ? 'active' : ''}" src="${img}" alt="Thumbnail ${idx + 1}" onclick="goToSlide(${idx})" />
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  } else {
    carouselArea.innerHTML = `
      <div style="background: var(--bg-surface-elevated); padding: 3rem 1.5rem; text-align: center; border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
        <img src="${app.icon}" width="80" height="80" style="margin: 0 auto 1rem; filter: drop-shadow(0 6px 16px rgba(0,0,0,0.3));" alt="${app.name}" />
        <h4 style="font-size: 1.15rem; margin-bottom: 0.4rem;">${app.name}</h4>
        <p style="color: var(--text-muted); font-size: 0.9rem;">${dict.noScreenshots}</p>
      </div>
    `;
  }

  // Description & Features
  document.getElementById('modalDesc').textContent = app.desc[currentLang] || app.desc.en;
  
  const featList = document.getElementById('modalFeaturesList');
  featList.innerHTML = (app.features[currentLang] || []).map(f => `
    <li>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      <span>${f}</span>
    </li>
  `).join('');

  // Specs
  document.getElementById('specUIVal').textContent = app.specs.ui;
  document.getElementById('specBackendVal').textContent = app.specs.backend;
  document.getElementById('specPlatformVal').textContent = app.specs.platform;
  document.getElementById('specSizeVal').textContent = app.specs.size;
  document.getElementById('specLicenseVal').textContent = app.specs.license;

  // Folder source link
  const folderLink = document.getElementById('modalFolderLink');
  if (folderLink) {
    folderLink.href = `https://github.com/minhtrong67/my-tauri-apps/tree/main/${app.id}`;
  }
}

function changeSlide(direction) {
  if (!activeModalApp) return;
  const images = activeModalApp.screenshots && activeModalApp.screenshots.length > 0 ? activeModalApp.screenshots : (activeModalApp.fallbackImg ? [activeModalApp.fallbackImg] : []);
  if (images.length <= 1) return;

  currentSlideIndex = (currentSlideIndex + direction + images.length) % images.length;
  updateSlideDisplay(images);
}

function goToSlide(index) {
  if (!activeModalApp) return;
  const images = activeModalApp.screenshots && activeModalApp.screenshots.length > 0 ? activeModalApp.screenshots : (activeModalApp.fallbackImg ? [activeModalApp.fallbackImg] : []);
  if (index < 0 || index >= images.length) return;

  currentSlideIndex = index;
  updateSlideDisplay(images);
}

function updateSlideDisplay(images) {
  const mainImg = document.getElementById('carouselMainImg');
  if (mainImg) {
    mainImg.src = images[currentSlideIndex];
  }

  const thumbs = document.querySelectorAll('.carousel-thumb');
  thumbs.forEach((th, idx) => {
    if (idx === currentSlideIndex) {
      th.classList.add('active');
    } else {
      th.classList.remove('active');
    }
  });
}

// --- 8. GLOBAL EVENTS & CONTROLS ---
function initControls() {
  // Search input with debounce
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (clearSearchBtn) {
        if (searchQuery.length > 0) clearSearchBtn.classList.add('show');
        else clearSearchBtn.classList.remove('show');
      }
      renderAppCards();
    });

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.classList.remove('show');
        renderAppCards();
        searchInput.focus();
      });
    }
  }

  // Category filter pills
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentCategory = pill.getAttribute('data-category');
      renderAppCards();
    });
  });

  // View mode toggle
  const viewGridBtn = document.getElementById('viewGridBtn');
  const viewListBtn = document.getElementById('viewListBtn');
  const gridContainer = document.getElementById('appsGrid');

  if (viewGridBtn && viewListBtn && gridContainer) {
    viewGridBtn.addEventListener('click', () => {
      currentViewMode = 'grid';
      viewGridBtn.classList.add('active');
      viewListBtn.classList.remove('active');
      gridContainer.classList.remove('list-view');
    });

    viewListBtn.addEventListener('click', () => {
      currentViewMode = 'list';
      viewListBtn.classList.add('active');
      viewGridBtn.classList.remove('active');
      gridContainer.classList.add('list-view');
    });
  }

  // Language toggle button
  const langToggleBtn = document.getElementById('langToggleBtn');
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
      const nextLang = currentLang === 'vi' ? 'en' : 'vi';
      setLanguage(nextLang);
      showToast(nextLang === 'vi' ? 'Đã đổi sang Tiếng Việt' : 'Switched to English');
    });
  }

  // Mobile menu toggle
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const navMenu = document.getElementById('navMenu');
  if (hamburgerBtn && navMenu) {
    hamburgerBtn.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });

    // Close menu when clicking link
    navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
      });
    });
  }

  // Modal close trigger
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalOverlay = document.getElementById('appModal');
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeAppModal);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeAppModal();
    });
  }

  // Keyboard Shortcuts: Ctrl+K, Escape, Left, Right
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const s = document.getElementById('searchInput');
      if (s) {
        s.focus();
        s.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else if (e.key === 'Escape') {
      closeAppModal();
    } else if (activeModalApp) {
      if (e.key === 'ArrowLeft') changeSlide(-1);
      else if (e.key === 'ArrowRight') changeSlide(1);
    }
  });

  // Guide Tabs (End Users vs Developers)
  document.querySelectorAll('.guide-tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.guide-tab-btn').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.guide-pane').forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetPane = document.getElementById(tab.getAttribute('data-target'));
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // Copy code button in Architecture section
  const copyCodeBtn = document.getElementById('copyCodeBtn');
  if (copyCodeBtn) {
    copyCodeBtn.addEventListener('click', () => {
      const codeSnippet = `[workspace]
resolver = "2"
members = ["*/src-tauri"]

[profile.release]
opt-level = "s"      # Optimize for size
lto = true            # Link-Time Optimization
codegen-units = 1     # Maximize LTO optimization
strip = true          # Strip all debug symbols
panic = "abort"       # Remove panic unwinding`;

      navigator.clipboard.writeText(codeSnippet).then(() => {
        const originalText = copyCodeBtn.innerHTML;
        copyCodeBtn.innerHTML = `<span>${I18N[currentLang].codeCopied}</span>`;
        showToast(I18N[currentLang].codeCopied);
        setTimeout(() => {
          copyCodeBtn.innerHTML = originalText;
        }, 2000);
      });
    });
  }

  // Back to top button
  const backToTopBtn = document.getElementById('backToTopBtn');
  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    });

    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

// --- 9. TOAST NOTIFICATION ---
function showToast(message) {
  let toast = document.getElementById('toastMsg');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastMsg';
    toast.className = 'toast-msg';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#24C8DB" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
    <span>${message}</span>
  `;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// --- 10. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  updateDOMTexts();
  initControls();
  renderAppCards();
});
