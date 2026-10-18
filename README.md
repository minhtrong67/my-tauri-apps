<div align="center">

# 🚀 My Tauri Apps Collection

**A modern, lightweight suite of 17+ desktop applications built with Tauri 2, Rust, and Material Design 3.**

[![Tauri 2](https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri&logoColor=white)](https://tauri.app)
[![Rust](https://img.shields.io/badge/Rust-1.77%2B-DEA584?logo=rust&logoColor=white)](https://www.rust-lang.org)
[![Design](https://img.shields.io/badge/Design-Material%20Design%203-6750A4)](https://m3.material.io)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078D4?logo=windows&logoColor=white)](https://github.com/minhtrong67/my-tauri-apps/releases)
[![i18n](https://img.shields.io/badge/i18n-English%20%7C%20Ti%E1%BA%BFng%20Vi%E1%BB%87t-2E7D32)](#-applications-catalog)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Apps Count](https://img.shields.io/badge/Applications-17%20Apps-orange)](#-applications-catalog)

<p align="center">
  <a href="#-applications-catalog"><strong>Browse Apps</strong></a> •
  <a href="https://github.com/minhtrong67/my-tauri-apps/releases"><strong>Download Releases</strong></a> •
  <a href="#-cargo-workspace-architecture"><strong>Architecture</strong></a> •
  <a href="#%EF%B8%8F-getting-started--development"><strong>Build & Run</strong></a> •
  <a href="#-ti%E1%BA%BFng-vi%E1%BB%87t"><strong>Tiếng Việt</strong></a>
</p>

</div>

---

## 🌟 Overview

Welcome to **My Tauri Apps Collection** — a centralized monorepo containing **17 high-performance desktop applications**. Every app in this suite is crafted with a focus on speed, low resource consumption, clean native UX, and Google's **Material Design 3** design system.

### Why this Monorepo?
Developing 17 separate Tauri desktop applications normally means maintaining 17 independent `target/` build directories in Rust. In standard development, each target folder easily occupies 2–5 GB, quickly eating up **50–80 GB+ of disk space**.

By structuring this project as a **unified Cargo Workspace**:
- ⚡ **Shared Build Cache**: All 17 apps compile into a single root `./target` folder, saving tens of gigabytes of storage.
- 🔄 **Dependency Reuse**: Common Rust crates (`tauri`, `serde`, `tokio`, etc.) are compiled once and shared.
- 📦 **Consistent Optimization**: Global release profiles enforce Link-Time Optimization (`lto`), symbol stripping, and size optimization (`opt-level = "s"`) across all apps.

---

## 📱 Applications Catalog

| Icon | Application | Category | Description | Tech & UI |
| :---: | :--- | :--- | :--- | :--- |
| <img src="material-calculator/src-tauri/icons/128x128@2x.png" width="36" height="36" alt="Calculator" /> | [**Material Calculator**](./material-calculator) | Productivity | Standard, Scientific, Programmer (64-bit BigInt), Unit Converter & Date calculator. | Vanilla JS • M3 Dynamic Color |
| <img src="material-calendar/src-tauri/icons/128x128.png" width="36" height="36" alt="Calendar" /> | [**Material Calendar**](./material-calendar) | Productivity | Desktop calendar with event tracking, schedules, reminders, and custom theme presets. | Vite • Vanilla JS • M3 |
| <img src="material-note/src/assets/logo.svg" width="36" height="36" alt="Note" /> | [**Material Note**](./material-note) | Productivity | Ultra-fast tabbed notepad with syntax highlighting, auto-saving, and Markdown support. | Vanilla JS • M3 |
| <img src="material-file/src/assets/logo.svg" width="36" height="36" alt="File" /> | [**Material File**](./material-file) | System & File | Tabbed file explorer inspired by Windows 11 with quick search and split navigation. | Vanilla JS • M3 |
| <img src="case-converter/src/assets/logo.svg" width="36" height="36" alt="Case Converter" /> | [**Case Converter**](./case-converter) | Utility | Convert text between 19 letter cases (camelCase, snake_case, etc.) with text sorting & cleanup. | Vanilla JS • M3 |
| <img src="chrome-launcher/src-tauri/icons/icon.png" width="36" height="36" alt="Chrome Launcher" /> | [**Chrome Launcher**](./chrome-launcher) | Utility | One-click Chrome profile manager to open/close profiles with designated sets of tabs. | React 18 • TypeScript • M3 |
| <img src="material-docx/src-tauri/icons/128x128@2x.png" width="36" height="36" alt="Docx" /> | [**Material Docx**](./material-docx) | Document | Word-style rich text processor with real `.docx` import, export, and editing. | Vanilla JS • M3 |
| <img src="material-xlsx/src-tauri/icons/128x128@2x.png" width="36" height="36" alt="Xlsx" /> | [**Material Xlsx**](./material-xlsx) | Document | Fast spreadsheet editor for `.xlsx` workbooks, formula calculation, and formatting. | Rust backend • Vanilla JS • M3 |
| <img src="material-csv/src-tauri/icons/128x128@2x.png" width="36" height="36" alt="CSV" /> | [**Material CSV**](./material-csv) | Data Tool | Spreadsheet-style CSV/TSV editor with sort, filter, and export to Excel, JSON, Markdown, HTML. | Vanilla JS • M3 |
| <img src="material-readme/src-tauri/icons/128x128@2x.png" width="36" height="36" alt="Readme" /> | [**Material Readme**](./material-readme) | Document | Dedicated Markdown editor & viewer with live split preview, made for crafting READMEs. | Vanilla JS • M3 |
| <img src="material-music-player/src-tauri/icons/icon.png" width="36" height="36" alt="Music" /> | [**Material Music Player**](./material-music-player) | Multimedia | Local audio player with playlist management, synced lyrics, album artwork, and equalizer. | React 18 • TypeScript • M3 |
| <img src="material-video-player/src-tauri/icons/icon.png" width="36" height="36" alt="Video" /> | [**Material Video Player**](./material-video-player) | Multimedia | Hardware-accelerated media player supporting all major codecs, subtitle sync, and playlists. | React 18 • TypeScript • M3 |
| <img src="material-edit/src-tauri/icons/128x128@2x.png" width="36" height="36" alt="Video Editor" /> | [**Material Edit**](./material-edit) | Multimedia | CapCut-inspired lightweight video editor with timeline, clips trimming, transitions, and audio. | Vanilla JS • M3 |
| <img src="material-photo/src-tauri/icons/png/128.png" width="36" height="36" alt="Photo" /> | [**Material Photo**](./material-photo) | Multimedia | Photo viewer and editor with automatic gallery scanning, filters, crop, and adjustments. | Vanilla JS • Lucide • M3 |
| <img src="material-screenshot/assets/icon.svg" width="36" height="36" alt="Screenshot" /> | [**Material Screenshot**](./material-screenshot) | Graphics | Turn plain screenshots into stylish mockups with gradients, rounded corners, shadows & frames. | Vanilla JS • M3 |
| <img src="mp3-downloader/src/app-icon.png" width="36" height="36" alt="MP3 Downloader" /> | [**MP3 Downloader**](./mp3-downloader) | Media Tool | High-quality audio extractor for YouTube, TikTok, and Spotify links with ID3 tagging. | Vanilla JS • M3 |
| <img src="material-weather/src-tauri/icons/128x128@2x.png" width="36" height="36" alt="Weather" /> | [**Material Weather**](./material-weather) | Information | Real-time weather forecasting with hourly/daily predictions, animated visuals & multi-city tracking. | Vite • Vanilla JS • M3 |

---

## 🗂️ App Categories

### 💼 Productivity & Utilities
- **[Material Calculator](./material-calculator)**: Full expression evaluation without `eval`, 64-bit programmer mode with bit toggling grid, 12 unit conversion categories, and date difference calculator.
- **[Material Calendar](./material-calendar)**: Intuitive calendar management with smooth date navigation, agenda overview, and dynamic theme tints.
- **[Material Note](./material-note)**: Tabbed plain text and markdown notepad. Auto-saves content, fast search, line counting, and zero bloat.
- **[Material File](./material-file)**: Clean alternative to native file managers with tabs, breadcrumbs, bookmarks, and responsive dual views.
- **[Case Converter](./case-converter)**: Transform text across 19 casing formats (camelCase, PascalCase, kebab-case, snake_case, CONSTANT_CASE, Title Case, etc.) plus text utilities.
- **[Chrome Launcher](./chrome-launcher)**: Control multiple Chrome profiles with preset tab groups in one click.

### 📄 Documents & Data Processing
- **[Material Docx](./material-docx)**: Word-style desktop document processor supporting `.docx` reading, rich styling, paragraphs, and printing.
- **[Material Xlsx](./material-xlsx)**: Clean and snappy spreadsheet editor for `.xlsx` spreadsheets with multi-sheet support and formulas.
- **[Material CSV](./material-csv)**: High-speed tabular CSV/TSV manager with multi-cell selection, sorting, filtering, and export to CSV, TSV, JSON, Excel, Markdown, and HTML.
- **[Material Readme](./material-readme)**: Real-time Markdown editor tailored for polishing GitHub `README.md` files with theme presets and instant preview.

### 🎨 Multimedia & Creativity
- **[Material Music Player](./material-music-player)**: Clean local music player with library organization, audio equalizer, lyrics, and media controls.
- **[Material Video Player](./material-video-player)**: Hardware-accelerated desktop media player with subtitle support (.srt, .vtt), playback speed adjustment, and playlists.
- **[Material Edit](./material-edit)**: CapCut-inspired lightweight video editor with multi-track timeline, video trimming, text overlays, and audio tools.
- **[Material Photo](./material-photo)**: Modern photo gallery and image editor with crop, rotate, color adjustments, and instant filter presets.
- **[Material Screenshot](./material-screenshot)**: Convert plain screenshots into professional showcase graphics with customizable gradients, mockups, and drop shadows.
- **[MP3 Downloader](./mp3-downloader)**: Convert online links from YouTube, TikTok, and Spotify into MP3 files with automatic ID3 tags and album art.

### 🌤️ Weather & Life
- **[Material Weather](./material-weather)**: Weather dashboard with live condition telemetry, 7-day outlook, air quality ratings, and interactive temperature curves.

---

## ⚡ Cargo Workspace Architecture

All applications in this repository are managed through a unified Cargo Workspace defined in the root [`Cargo.toml`](./Cargo.toml):

```toml
[workspace]
resolver = "2"
members = ["*/src-tauri"]

[profile.dev]
debug = 0

[profile.release]
opt-level = "s"      # Optimize for size
lto = true            # Link-Time Optimization across crates
codegen-units = 1     # Maximize LTO optimization efficiency
strip = true          # Strip all debug symbols from binaries
panic = "abort"       # Remove panic unwinding overhead
```

### Directory Structure

```text
my-tauri-apps/
├── Cargo.toml                  # Shared Cargo workspace config
├── Cargo.lock                  # Unified dependency lockfile
├── target/                     # Shared build cache across all 17 apps
│
├── material-calculator/        # App 1
│   ├── package.json
│   ├── vite.config.js
│   ├── src/                    # Frontend UI (HTML / CSS / JS)
│   └── src-tauri/              # Rust Tauri backend
│       └── Cargo.toml
│
├── material-music-player/      # App 2
│   ├── package.json
│   ├── src/                    # React 18 / TypeScript
│   └── src-tauri/
│
├── ... (15 more applications)
└── README.md                   # Workspace documentation
```

---

## 🛠️ Getting Started & Development

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v18.0.0` or higher (`v20+` recommended)
- **Rust & Cargo**: `v1.77` or higher ([rustup.rs](https://rustup.rs))
- **C++ Build Tools**: Visual Studio C++ Build Tools (on Windows) or equivalent OS build essentials
- **WebView2**: Built into Windows 10/11

### Clone the Repository

```bash
git clone https://github.com/minhtrong67/my-tauri-apps.git
cd my-tauri-apps
```

### Running an Application in Development

Navigate into any application's directory, install frontend dependencies, and launch the Tauri dev server:

```bash
# Example: Launching Material Calculator
cd material-calculator

# Install dependencies
npm install

# Start development with hot-reload
npm run tauri dev
```

### Building a Production Installer

To produce a production installer (`.exe` / `.msi` on Windows):

```bash
cd material-calculator
npm run tauri build
```

The resulting optimized installer will be available inside:
`target/release/bundle/nsis/` or `target/release/bundle/msi/`.

---

## 📥 Downloading Pre-built Apps

You do not need to compile the code if you just want to use the applications!

1. Head over to the **[GitHub Releases](https://github.com/minhtrong67/my-tauri-apps/releases)** tab.
2. Select the latest release version.
3. Download the standalone installer (`.exe`) for any application you want.
4. Run the installer and enjoy!

---

## 🇻🇳 Tiếng Việt

### Giới thiệu
**My Tauri Apps Collection** là bộ sưu tập **17 ứng dụng desktop** gọn nhẹ, hiện đại được phát triển bằng **Tauri 2**, **Rust** và ngôn ngữ thiết kế **Material Design 3**.

### Điểm nổi bật
- 🚀 **Hiệu năng vượt trội**: Tiết kiệm RAM và CPU hơn nhiều lần so với các ứng dụng Electron truyền thống.
- 🎨 **Giao diện Material Design 3**: Hỗ trợ màu động (Dynamic Color), giao diện Sáng / Tối (Light / Dark mode), hiệu ứng Ripple và chuyển cảnh mượt mà.
- 🌐 **Hỗ trợ Song ngữ**: Đa số ứng dụng hỗ trợ cả tiếng Anh và tiếng Việt.
- ⚡ **Kiến trúc Cargo Workspace**: Gom 17 dự án vào chung một workspace giúp tái sử dụng cache biên dịch của Rust (`target/`), tiết kiệm hàng chục GB ổ cứng.

### Danh sách ứng dụng chính
1. **Material Calculator**: Máy tính đa năng (Cơ bản, Khoa học, Lập trình viên 64-bit, Đổi đơn vị, Tính ngày).
2. **Material Calendar**: Lịch để bàn thanh lịch, nhắc việc và sự kiện.
3. **Material Note**: Sổ tay ghi chú nhiều tab, hỗ trợ Markdown và tự động lưu.
4. **Material File**: Trình quản lý tệp tin dạng tab phong cách Windows 11.
5. **Case Converter**: Chuyển đổi qua lại giữa 19 định dạng chữ (camelCase, snake_case, PascalCase,...) và công cụ văn bản.
6. **Chrome Launcher**: Quản lý và mở nhanh nhiều hồ sơ (profile) Google Chrome kèm bộ tab định trước.
7. **Material Docx**: Trình soạn thảo văn bản hỗ trợ đọc, ghi và chỉnh sửa file Word `.docx`.
8. **Material Xlsx**: Bảng tính nhanh nhẹn cho file `.xlsx`.
9. **Material CSV**: Trình chỉnh sửa dữ liệu CSV/TSV dạng bảng tính, lọc, tìm kiếm và xuất sang Excel/JSON/Markdown/HTML.
10. **Material Readme**: Trình soạn thảo Markdown chuyên biệt để viết file `README.md` với chế độ xem trước trực tiếp.
11. **Material Music Player**: Trình phát nhạc offline với lời bài hát, bìa album và equalizer.
12. **Material Video Player**: Trình phát video tăng tốc phần cứng, hỗ trợ phụ đề và danh sách phát.
13. **Material Edit**: Trình biên tập video nhẹ nhàng phong cách CapCut với dòng thời gian (timeline).
14. **Material Photo**: Trình xem và chỉnh sửa ảnh (cắt, xoay, bộ lọc màu, tinh chỉnh thông số).
15. **Material Screenshot**: Biến ảnh chụp màn hình thô thành ảnh mockup chuyên nghiệp với nền gradient và đổ bóng.
16. **MP3 Downloader**: Tải và trích xuất âm thanh chất lượng cao từ link YouTube, TikTok, Spotify kèm thẻ ID3 tag.
17. **Material Weather**: Ứng dụng xem dự báo thời tiết theo thời gian thực và 7 ngày tới.

### Hướng dẫn tải ứng dụng
Tất cả các bản cài đặt sẵn cho Windows (`.exe`) đều được phát hành tại mục **[Releases](https://github.com/minhtrong67/my-tauri-apps/releases)**. Bạn chỉ cần tải về và mở file để cài đặt.

---

## 🤝 Contributing

Contributions, feedback, and suggestions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License & Credits

- **Author**: [`minhtrong67`](https://github.com/minhtrong67)
- **AI Assistance**: Built with the collaborative assistance of **Claude** (Anthropic)
- **License**: Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for more details.

<div align="center">
  <sub>Built with ❤️ using Tauri 2 and Material Design 3</sub>
</div>
