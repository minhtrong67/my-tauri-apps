<div align="center">

# 🚀 My Tauri Apps

**A monorepo of lightweight desktop apps built with Tauri 2, Rust and React, styled with Material Design 3 and Fluent Design.**

[![Tauri 2](https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri&logoColor=white)](https://tauri.app)
[![Rust](https://img.shields.io/badge/Rust-1.77%2B-DEA584?logo=rust&logoColor=white)](https://www.rust-lang.org)
[![React](https://img.shields.io/badge/React-TypeScript-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078D4?logo=windows&logoColor=white)](https://github.com/minhtrong67/my-tauri-apps/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Download on MEGA](https://img.shields.io/badge/Download-Installers%20on%20MEGA-D9272E?logo=mega&logoColor=white)](https://mega.nz/folder/gQhygbSR#U1sZ5eMceyMRiswi_D58-A)

[Website](https://minhtrong67.github.io/my-tauri-apps/) •
[Apps](#-apps) •
[Architecture](#-architecture) •
[Getting Started](#%EF%B8%8F-getting-started) •
[Download](#-download) •
[Tiếng Việt](#-tiếng-việt)

</div>

---

## 🌟 Overview

**My Tauri Apps** is a collection of small, fast desktop applications. Each app is a separate [Tauri 2](https://tauri.app) project with a Rust backend and a web frontend rendered by the system **WebView2**, so installers are small and memory use stays low compared with Electron-based apps.

The apps come in two design families:

- 🎨 **Material** apps follow [Material Design 3](https://m3.material.io/) with dynamic color and light/dark themes.
- 🪟 **Fluent** apps follow Windows Fluent Design for a native Windows 11 look.

### Highlights

- ⚡ **Lightweight**: Rust backend, system WebView, size-optimized release builds.
- 🧩 **Single-purpose apps**: calculator, notes, file explorer, document and data editors, media players and more.
- 🌐 **Bilingual**: most apps support English and Vietnamese.
- 📦 **One workspace**: all apps share one Cargo workspace and one build cache.

---

## 📱 Apps

### Material Design 3

| App | Folder | Description |
| --- | ------ | ----------- |
| 🧮 **Material Calculator** | [`material-calculator`](./material-calculator) | Standard, scientific and 64-bit programmer modes, unit converter and date calculator. |
| 📅 **Material Calendar** | [`material-calendar`](./material-calendar) | Desktop calendar with events, schedules, reminders and theme presets. |
| 📝 **Material Note** | [`material-note`](./material-note) | Tabbed notepad with autosave and Markdown support. |
| 📁 **Material File** | [`material-file`](./material-file) | Tabbed file explorer inspired by Windows 11, with quick search. |
| 📄 **Material Docx** | [`material-docx`](./material-docx) | Word-style rich text editor with real `.docx` import and export. |
| 📊 **Material Xlsx** | [`material-xlsx`](./material-xlsx) | Spreadsheet editor for `.xlsx` workbooks with formulas and formatting. |
| 🗃️ **Material CSV** | [`material-csv`](./material-csv) | CSV/TSV editor with sort, filter and export to Excel, JSON, Markdown and HTML. |
| 🧾 **Material JSON** | [`material-json`](./material-json) | JSON viewer and editor. |
| 📕 **Material PDF** | [`material-pdf`](./material-pdf) | PDF viewer and tools. |
| 📘 **Material Readme** | [`material-readme`](./material-readme) | Markdown editor with live split preview, made for writing READMEs. |
| 🎵 **Material Music** | [`material-music`](./material-music) | Local audio player with playlists, synced lyrics, album art and equalizer. |
| 🎬 **Material Video** | [`material-video`](./material-video) | Media player with subtitle support and playlists. |
| ✂️ **Material Edit** | [`material-edit`](./material-edit) | Lightweight video editor with timeline, trimming, transitions and audio. |
| 🖼️ **Material Photo** | [`material-photo`](./material-photo) | Photo viewer and editor with gallery scanning, filters, crop and adjustments. |
| 📸 **Material Screenshot** | [`material-screenshot`](./material-screenshot) | Turn screenshots into styled mockups with gradients, rounded corners, shadows and frames. |
| 🌤️ **Material Weather** | [`material-weather`](./material-weather) | Weather forecast with hourly and daily views, animated visuals and multiple cities. |
| 🎨 **Material Theme Builder** | [`material-theme-builder`](./material-theme-builder) | Build Material 3 color themes. |
| 🔷 **Material ICO** | [`material-ico`](./material-ico) | Create and convert `.ico` icons. |
| 📋 **Material Menu** | [`material-menu`](./material-menu) | Menu / launcher utility. |

### Fluent Design

| App | Folder | Description |
| --- | ------ | ----------- |
| 📝 **Fluent Note** | [`fluent-note`](./fluent-note) | Notepad in Fluent style. |
| 📁 **Fluent File** | [`fluent-file`](./fluent-file) | File explorer in Fluent style. |
| 🗃️ **Fluent CSV** | [`fluent-csv`](./fluent-csv) | CSV editor in Fluent style. |
| 🧾 **Fluent JSON** | [`fluent-json`](./fluent-json) | JSON viewer and editor in Fluent style. |
| 📘 **Fluent MD** | [`fluent-md`](./fluent-md) | Markdown editor in Fluent style. |
| 🎵 **Fluent Music** | [`fluent-music`](./fluent-music) | Music player in Fluent style. |
| 🎧 **Fluent MP3** | [`fluent-mp3`](./fluent-mp3) | MP3 tool in Fluent style. |
| 🎬 **Fluent Video** | [`fluent-video`](./fluent-video) | Video player in Fluent style. |
| 🖼️ **Fluent Photos** | [`fluent-photos`](./fluent-photos) | Photo viewer in Fluent style. |
| ✂️ **Fluent Edits** | [`fluent-edits`](./fluent-edits) | Editing tool in Fluent style. |
| 🗂️ **Fluent Folder Icon** | [`fluent-folder-icon`](./fluent-folder-icon) | Folder icon customizer in Fluent style. |
| 🤖 **Fluent Claude** | [`fluent-claude`](./fluent-claude) | Claude desktop client in Fluent style. |

### Utilities

| App | Folder | Description |
| --- | ------ | ----------- |
| 🔤 **Case Converter** | [`case-converter`](./case-converter) | Convert text between 19 letter cases with sorting and cleanup tools. |
| 🌐 **Chrome Launcher** | [`chrome-launcher`](./chrome-launcher) | Open and close Chrome profiles with preset sets of tabs. |
| 🔗 **Site Launcher** | [`site-launcher`](./site-launcher) | Quickly open favorite websites. |
| 🎧 **MP3 Downloader** | [`mp3-downloader`](./mp3-downloader) | Extract audio from supported links with ID3 tagging. |
| 🖼️ **Code Image** | [`code-image`](./code-image) | Turn code snippets into shareable images. |
| 📂 **Custom Folder Icon** | [`custom-folder-icon`](./custom-folder-icon) | Change Windows folder icons. |
| 📈 **Claude Tracker** | [`claude-tracker`](./claude-tracker) | Track Claude usage. |

> 📝 Rows describing an app only by name or style (for example the Fluent apps, Material JSON/PDF/Theme Builder/ICO/Menu, Code Image, Site Launcher and Claude Tracker) are short placeholders. Replace them with accurate descriptions.

---

## ⚡ Architecture

All apps are members of one **Cargo workspace** defined in the root [`Cargo.toml`](./Cargo.toml):

```toml
[workspace]
resolver = "2"
members = ["*/src-tauri"]

[profile.dev]
debug = 0

[profile.release]
opt-level = "s"       # optimize for size
lto = true            # link-time optimization
codegen-units = 1     # better LTO results
strip = true          # strip debug symbols
panic = "abort"       # remove unwinding overhead
```

### Why a workspace?

A separate `target/` folder per Tauri app can take several GB each. With a workspace:

- **Shared build cache**: every app compiles into one root `target/` folder.
- **Dependency reuse**: common crates such as `tauri`, `serde` and `tokio` are built once.
- **Consistent release profile**: every app gets the same size and performance settings.

### Project layout

```text
my-tauri-apps/
├── Cargo.toml              # workspace configuration
├── Cargo.lock              # shared lockfile
├── index.html              # project website
├── <app-name>/
│   ├── package.json
│   ├── src/                # frontend (React / TypeScript or vanilla JS)
│   └── src-tauri/          # Rust backend and Tauri config
│       └── Cargo.toml
└── ...
```

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js** 18 or newer (20+ recommended)
- **Rust** 1.77 or newer ([rustup.rs](https://rustup.rs))
- **Visual Studio C++ Build Tools** on Windows
- **WebView2** (included in Windows 10/11)

### Clone

```bash
git clone https://github.com/minhtrong67/my-tauri-apps.git
cd my-tauri-apps
```

### Run an app in development

```bash
cd material-calculator   # any app folder
npm install
npm run tauri dev
```

### Build an installer

```bash
cd material-calculator
npm run tauri build
```

Installers are written to `target/release/bundle/` (`nsis/` for `.exe`, `msi/` for `.msi`).

---

## 📥 Download

Prebuilt Windows installers for all apps are available on MEGA:

<div align="center">

[![Download from MEGA](https://img.shields.io/badge/⬇%20Download%20all%20apps-MEGA-D9272E?style=for-the-badge&logo=mega&logoColor=white)](https://mega.nz/folder/gQhygbSR#U1sZ5eMceyMRiswi_D58-A)

</div>

**How to install**

1. Open the MEGA folder above and download the installer of the app you want.
2. Run the installer (`.exe` or `.msi`).
3. If Windows SmartScreen shows a warning, click **More info → Run anyway**. The installers are not code-signed.

Installers may also be published on the [Releases](https://github.com/minhtrong67/my-tauri-apps/releases) page.

---

## 🇻🇳 Tiếng Việt

**My Tauri Apps** là bộ sưu tập ứng dụng desktop gọn nhẹ viết bằng **Tauri 2**, **Rust** và **React**, thiết kế theo **Material Design 3** và **Fluent Design**.

- 🚀 Tiết kiệm RAM và dung lượng hơn so với ứng dụng Electron.
- 🧩 Mỗi ứng dụng làm tốt một việc: máy tính, ghi chú, quản lý tệp, soạn thảo văn bản/bảng tính/CSV, trình phát nhạc và video, chỉnh sửa ảnh, v.v.
- 🌐 Hỗ trợ song ngữ Anh - Việt ở đa số ứng dụng.
- ⚡ Toàn bộ dự án dùng chung một **Cargo Workspace**, chia sẻ bộ nhớ đệm biên dịch và tiết kiệm hàng chục GB ổ cứng.

Tải bản cài đặt Windows (`.exe`) của toàn bộ ứng dụng tại [MEGA](https://mega.nz/folder/gQhygbSR#U1sZ5eMceyMRiswi_D58-A).

---

## 🤝 Contributing

Issues and pull requests are welcome.

1. Fork the repository
2. Create a branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -m "feat: add my feature"`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

## 📜 License & Credits

- **Author**: [minhtrong67](https://github.com/minhtrong67)
- **AI assistance**: built with the help of Claude (Anthropic)
- **License**: [MIT](./LICENSE)

<div align="center">

Built with ❤️ using Tauri 2, Rust and React

</div>
