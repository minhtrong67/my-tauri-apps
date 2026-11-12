<div align="center">

<img src="assets/icon-512.png" width="120" alt="Biểu tượng Fluent MP3">

# Fluent MP3

**Tìm theo tên hoặc dán link — nhận file MP3 đầy đủ thông tin từ YouTube, TikTok và Spotify.**
Ứng dụng desktop miễn phí, mã nguồn mở, xây dựng bằng Tauri, React và **Microsoft Fluent Design**.

[English](README.md)

![License](https://img.shields.io/badge/license-MIT-0078D4) ![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB) ![React](https://img.shields.io/badge/React-18-61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)

</div>

## Giới thiệu

Fluent MP3 biến link (hoặc chỉ một tên bài hát) thành file MP3 có sẵn ảnh bìa, tên bài, nghệ sĩ, album và năm. Ứng dụng bọc [yt-dlp](https://github.com/yt-dlp/yt-dlp) và [ffmpeg](https://ffmpeg.org) trong giao diện giống hệt app Windows 11: phông Segoe UI Variable, thanh điều hướng NavigationView, control kiểu WinUI, InfoBar, hộp thoại và màu nhấn của Windows.

## Fluent Design

- **Chất liệu cửa sổ (Cài đặt → Giao diện)** — chọn **Mica** (mặc định), **Acrylic** hoặc **Mica Alt**. Hiệu ứng do Windows (DWM) áp dụng lên chính cửa sổ: thanh tiêu đề và thanh điều hướng nằm trực tiếp trên chất liệu, vùng nội dung là một "lớp" trong mờ.
  - Mica / Mica Alt cần Windows 11. Trên Windows 10 hoặc khi hệ thống từ chối, app tự chuyển sang nền đặc (và báo trong Cài đặt).
  - Acrylic có thể hơi chậm khi kéo cửa sổ — đây là giới hạn của Windows.
- **Màu nhấn** — 16 màu nhấn của Windows + màu tuỳ chỉnh; chế độ sáng/tối/hệ thống theo quy tắc của Windows, chữ tự chọn đen/trắng để đủ tương phản.
- **Icon, control và chuyển động Fluent** — Fluent System Icons, bo góc 4 px / 8 px, viền đáy đậm hơn, gạch chân nhấn khi focus, ToggleSwitch, ComboBox, ProgressBar / ProgressRing, hiệu ứng xuất hiện (tôn trọng *giảm chuyển động*).
- **Điều hướng thích ứng** — pane tự thu gọn thành icon khi cửa sổ hẹp hoặc khi bấm nút menu.
- **App icon** — ô vuông bo góc kiểu Windows 11 (gradient xanh, viền sáng, bóng mềm) với nốt nhạc và huy hiệu tải xuống; sinh bằng `scripts/generate-icons.py` (app, trình cài đặt, gỡ cài đặt, ảnh NSIS).

## Tính năng

- **Ba nguồn** — YouTube, TikTok và Spotify (Spotify được ghép với bản âm thanh tốt nhất trên YouTube và gắn thông tin từ Spotify). Dán nhiều link cùng lúc.
- **Tìm theo tên** — gõ tên bài, chọn kết quả.
- **Playlist** — mở playlist, tick các bài, đưa vào hàng đợi.
- **Sửa thông tin** trước khi tải (tên bài, nghệ sĩ, album, năm).
- **Hàng đợi thông minh** — tải song song (1–4), giới hạn tốc độ, tự thử lại khi gặp HTTP 403, tiến độ trực tiếp, dừng tất cả, **tiến độ trên thanh tác vụ** Windows.
- **Lịch sử** — gom theo ngày, tìm kiếm, phát, mở thư mục, tải lại, xoá tệp.
- **Đặt tên tệp** — bốn mẫu, thư mục theo nghệ sĩ, xử lý tệp trùng (giữ cả hai / bỏ qua / ghi đè).
- **Chất lượng** — tốt nhất hoặc 320 / 256 / 192 / 128 kbps, cắt ảnh bìa vuông.
- **Mạng** — cookie trình duyệt (khi YouTube yêu cầu đăng nhập) và proxy.
- **An toàn** — yt-dlp / ffmpeg / Deno được kiểm tra SHA-256, CSP nghiêm ngặt, chỉ chạy một cửa sổ.
- **Luôn mới** — cảnh báo khi yt-dlp cũ và cập nhật một chạm; thông báo trên màn hình.
- **Cá nhân hoá** — sáng / tối / hệ thống, màu nhấn, 3 phông chữ (Segoe UI Variable, Inter, Be Vietnam Pro), 3 cỡ chữ, tiếng Anh & tiếng Việt, chế độ cửa sổ (nhớ kích thước / luôn phóng to).
- **Thao tác nhanh** — kéo-thả link vào cửa sổ, gợi ý link từ clipboard, phím tắt (`Ctrl+K`, `Ctrl+V`, `Ctrl+1/2/3`, `?`), hoàn tác khi gỡ mục, lọc hàng đợi.
- **Nâng cấp mượt** — công cụ (yt-dlp, ffmpeg, Deno) và tuỳ chọn cửa sổ của bản *MP3 Downloader* cũ được chuyển sang tự động.

## Cài đặt

Build trình cài đặt (xem bên dưới) rồi chạy `Fluent MP3_<phiên bản>_x64-setup.exe` (Windows 10/11, 64-bit). Nếu SmartScreen cảnh báo, chọn **More info → Run anyway** (trình cài đặt chưa ký số). Lần đầu mở app sẽ đề nghị tải **yt-dlp**, **ffmpeg** và (khuyên dùng) **Deno** giúp bạn.

macOS / Linux: build từ mã nguồn và tự cài `yt-dlp`, `ffmpeg`. Mica / Acrylic chỉ có trên Windows; hệ khác dùng giao diện Fluent nền đặc.

## Công nghệ

| Lớp | Công nghệ |
|---|---|
| Vỏ | Tauri 2 (Rust) + plugin: dialog, opener, notification, single-instance; `window-vibrancy` cho Mica / Acrylic / Mica Alt |
| Giao diện | React 18, TypeScript, Vite 5, Tailwind CSS 3 |
| Thiết kế | Microsoft Fluent Design 2 (token WinUI 3), Segoe UI Variable |
| Icon | [Fluent System Icons](https://github.com/microsoft/fluentui-system-icons) (`@fluentui/react-icons`) |
| State | Zustand (lưu cài đặt & lịch sử) |
| Engine | yt-dlp, ffmpeg, Deno (tuỳ chọn) |

## Phát triển

Yêu cầu: [Node.js 18+](https://nodejs.org), [Rust](https://rustup.rs) và [điều kiện cần của Tauri](https://tauri.app/start/prerequisites/).

Dự án nằm trong một **Cargo workspace** (`Cargo.toml` ở thư mục gốc có `members = ["*/src-tauri"]`), nên mọi dự án Tauri trong thư mục dùng chung một bộ nhớ đệm `target/`.

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Trình cài đặt nằm trong thư mục dùng chung `target/release/bundle/nsis/` của workspace.

Sinh lại toàn bộ icon bằng `pip install pillow numpy && python scripts/generate-icons.py`.

## Cấu trúc dự án

```
fluent-mp3/
├─ assets/                 # Icon cho README
├─ scripts/generate-icons.py
├─ app/                    # Root Vite của giao diện desktop
│  ├─ index.html
│  ├─ public/
│  └─ src/
│     ├─ components/       # Control Fluent (Button, Select, Overlay, InfoBar…) + component tính năng
│     ├─ layout/           # TitleBar, NavPane
│     ├─ pages/            # Tải xuống, Lịch sử, Cài đặt
│     └─ lib/              # theme (màu nhấn), effect (Mica/Acrylic/Mica Alt), i18n, stores, queue, tools
└─ src-tauri/              # Backend Rust, cấu hình, capabilities, icon
```

## Giấy phép

[MIT](LICENSE) © 2026 **minhtrong67** — phát triển với sự hỗ trợ của **Claude** (Anthropic).
Chỉ tải nội dung bạn sở hữu hoặc được phép sử dụng.
