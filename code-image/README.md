<div align="center">

<img src="src-tauri/icons/128x128@2x.png" width="96" alt="Code Image logo" />

# Code Image

**Turn your code into beautiful, shareable images.**

A free and open-source desktop app built with Tauri, React and Material Design 3.

![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

## Giới thiệu

**Code Image** biến đoạn code của bạn thành một hình ảnh đẹp mắt để chia sẻ trên mạng xã hội, bài viết, slide hay tài liệu.
Dán code, chọn theme, tinh chỉnh giao diện rồi xuất ảnh PNG sắc nét chỉ với một cú nhấp. Mọi thứ chạy hoàn toàn trên máy của bạn, không cần đăng ký hay tải code lên đâu cả.

> **Introduction:** paste your code, pick a theme and export a crisp image in one click. Everything runs locally on your computer.

## Screenshot

| | |
|---|---|
| ![Light](screenshots/image01.png) | ![Dark](screenshots/image02.png) |
| ![Settings](screenshots/image03.png) | ![Mobile](screenshots/image04.png) |

## Tính năng

**Code**
- Nhận diện ngôn ngữ tự động, hỗ trợ JavaScript, TypeScript, Python, HTML, CSS, SCSS, SQL, JSON, Bash, PowerShell, Java, Kotlin, Swift, C, C++, C#, Go, Rust, PHP, Ruby, Dart, YAML, TOML, Markdown, Dockerfile, GraphQL…
- Mở tệp từ máy hoặc kéo thả tệp vào cửa sổ.

**Giao diện ảnh**
- 14 theme dành cho lập trình viên: Dracula, Tokyo Night, One Dark, Nord, Catppuccin (Mocha/Latte), Monokai, GitHub (Dark/Light), Solarized Dark, Gruvbox, Night Owl, Material Palenight, Rosé Pine.
- Nền chuyển màu (12 mẫu + tuỳ chỉnh màu và góc), nền một màu hoặc trong suốt.
- Tỉ lệ ảnh: Auto, 16:9, 4:3, 1:1, 3:2, 2:1, 21:9, 4:5, 9:16, kèm chế độ "Vừa khít với ảnh".
- 10 font code (JetBrains Mono, Fira Code, Source Code Pro, Cascadia Code…), cỡ chữ, padding, độ bo góc.
- Số dòng, đánh dấu dòng (`2, 4-6`), khung cửa sổ macOS / Windows / không khung, đổ bóng, tên tệp.
- Watermark tuỳ chỉnh (nội dung, vị trí, độ mờ).

**Xuất ảnh**
- PNG, JPG, SVG ở độ phân giải 1×–4×, lưu bằng hộp thoại hoặc vào thư mục Downloads, hoặc sao chép ảnh thẳng vào clipboard.
- Phím tắt: `Ctrl+S` lưu, `Ctrl+Shift+C` sao chép.

**Ứng dụng**
- Material Design 3: giao diện sáng / tối / theo hệ thống, 18 màu chủ đề và màu tuỳ chỉnh.
- 3 cỡ chữ giao diện, tiếng Anh và tiếng Việt (tự nhận diện).
- Tuỳ chọn khi mở app: ghi nhớ kích thước cửa sổ hoặc luôn phóng to tối đa.
- Responsive, animation mượt, tôn trọng `prefers-reduced-motion`.

## Download

Tải bản cài đặt Windows trong thư mục [`download`](download/), hoặc mở trang giới thiệu [`index.html`](index.html).

## Cài đặt

Chạy file `Code Image_1.0.0_x64-setup.exe` và làm theo hướng dẫn. Gỡ cài đặt tại **Settings → Apps** của Windows.

## Tech stack

| Thành phần | Công nghệ |
|---|---|
| Desktop shell | [Tauri 2](https://tauri.app) (Rust) |
| UI | React 18, TypeScript, Vite |
| Style | Tailwind CSS, Material Design 3 (`@material/material-color-utilities`) |
| Icon | [Lucide](https://lucide.dev) |
| Highlight | highlight.js |
| Xuất ảnh | html-to-image |
| State | Zustand |

## Development

Yêu cầu: [Node.js](https://nodejs.org) 18+, [Rust](https://www.rust-lang.org/tools/install) và [Tauri prerequisites](https://tauri.app/start/prerequisites/) (WebView2 + Visual Studio Build Tools trên Windows).

```bash
npm install
npm run dev        # chạy app desktop (tauri dev)
```

Chỉ chạy giao diện web để debug nhanh: `npm run web:dev` (mở http://127.0.0.1:1420).

## Build

```bash
npm run build      # tauri build → bộ cài NSIS
```

Bộ cài nằm ở `target/release/bundle/nsis/` của workspace (copy vào thư mục `download/` để landing page tải về).

## Cấu trúc project

```
code-image/
├── index.html            # Landing page (1 file)
├── og-image.png          # Ảnh chia sẻ mạng xã hội
├── download/             # Đặt file setup .exe vào đây
├── screenshots/          # image01.png, image02.png, …
├── src/                  # Giao diện React
│   ├── components/       # AppBar, EditorPanel, StylePanel, Preview, CodeCanvas, SettingsDialog
│   ├── lib/              # store, i18n, themes, highlight, export, Tauri helpers
│   ├── index.html
│   └── main.tsx
├── src-tauri/            # Rust + cấu hình Tauri
│   ├── icons/            # Icon app, setup/uninstall, ảnh bộ cài
│   ├── capabilities/
│   └── tauri.conf.json
├── package.json
└── LICENSE
```

> Dự án nằm trong Cargo workspace chung (`members = ["*/src-tauri"]`), toàn bộ project dùng chung thư mục `target` ở ngoài.

## Tác giả

Phát triển bởi **minhtrong67** với sự hỗ trợ của AI **Claude** (Anthropic).

## License

Dự án public và mã nguồn mở theo giấy phép [MIT](LICENSE).
