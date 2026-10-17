<div align="center">

<img src="src/app-icon.png" width="112" height="112" alt="Icon MP3 Downloader" />

# MP3 Downloader

**Biến link YouTube, TikTok và Spotify thành tệp MP3 đầy đủ thông tin.**

Miễn phí · Mã nguồn mở · Material Design 3 · English & Tiếng Việt

[![License: MIT](https://img.shields.io/badge/license-MIT-8BC34A.svg)](LICENSE)
![Tauri 2](https://img.shields.io/badge/Tauri-2-24C8DB)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

[English](README.md) · [Tiếng Việt](README.vi.md)

</div>

## Giới thiệu

MP3 Downloader là ứng dụng desktop nhẹ xây dựng bằng [Tauri 2](https://tauri.app). Dán link, chọn chất lượng và nhận về tệp MP3 đã gắn sẵn **ảnh bìa, tên bài, nghệ sĩ, album và năm phát hành** — dùng ngay trong Windows Explorer, điện thoại hay bất kỳ trình phát nhạc nào.

Giao diện theo **Material Design 3**: sáng / tối / theo hệ thống, 16 màu chủ đề Material cùng màu tuỳ chỉnh, nhiều phông chữ phổ biến và hiệu ứng mượt mà. App hỗ trợ **tiếng Anh và tiếng Việt**, tự nhận diện ngôn ngữ của thiết bị.

> Chỉ tải nội dung bạn có quyền sử dụng.

## Ảnh chụp màn hình

| | | |
|:--:|:--:|:--:|
| ![Trang tải về](screenshots/image01.png) | ![Cài đặt](screenshots/image02.png) | ![Giao diện tối](screenshots/image03.png) |
| Trang tải về | Cài đặt | Giao diện tối |

## Tính năng

- **Ba nguồn** — YouTube, TikTok và bài hát Spotify (`open.spotify.com/track/…`).
  Spotify có DRM nên app đọc thông tin bài hát từ Spotify rồi tìm bản âm thanh khớp trên YouTube Music / YouTube (khớp theo thời lượng).
- **Thẻ tag & ảnh bìa** — tên bài, nghệ sĩ, album, năm và ảnh bìa (có thể cắt vuông). Tên tệp dạng `Nghệ sĩ - Tên bài.mp3`.
- **Chất lượng** — Tốt nhất (VBR V0), 320, 256, 192 hoặc 128 kbps.
- **Hàng đợi thông minh** — dán nhiều link cùng lúc; tải song song 2 bài với tốc độ, thời gian còn lại, thử lại và huỷ.
- **Tải bền bỉ** — gặp HTTP 403 app tự thử các client/cách tải khác của YouTube. Lỗi gắn thẻ không làm mất tệp MP3.
- **Cài công cụ một chạm** — tự cài `yt-dlp`, `ffmpeg` và `Deno` trên Windows.
- **Material Design 3** — sáng / tối / hệ thống, 16 màu Material + màu tuỳ chỉnh, phông chữ (Roboto, Inter, Open Sans, Be Vietnam Pro, Nunito, hệ thống, có chân, đơn cách).
- **English & Tiếng Việt** — tự nhận theo thiết bị, đổi được trong Cài đặt.
- **Cửa sổ khi mở app** — *ghi nhớ kích thước* hoặc *luôn phóng to tối đa*.
- **Cài đặt gọn gàng** — chia nhóm Giao diện, Tải xuống, Cửa sổ và Công cụ.

## Tải về

Lấy bộ cài đặt Windows trong thư mục [`download/`](download/) (hoặc trang Releases của dự án):

```
download/MP3 Downloader_0.4.0_x64-setup.exe
```

Trang giới thiệu (landing page) nằm ở [`index.html`](index.html) — mở bằng trình duyệt hoặc đưa lên GitHub Pages.

## Cài đặt

1. Chạy bộ cài đặt và làm theo hướng dẫn (setup và uninstall dùng icon riêng của app).
2. Mở **MP3 Downloader**.
3. Lần đầu bấm **Cài đặt tự động** để cài `yt-dlp`, `ffmpeg` và `Deno` (Windows).
   Trên macOS / Linux hãy cài `ffmpeg` (và tuỳ chọn `deno`) bằng trình quản lý gói:

   ```bash
   brew install ffmpeg deno          # macOS
   sudo apt install ffmpeg           # Debian / Ubuntu
   ```

## Công nghệ

| Phần | Công nghệ |
|---|---|
| Khung ứng dụng | [Tauri 2](https://tauri.app) (Rust) |
| Backend | Rust, `tokio`, `reqwest` (rustls), `regex`, `zip`, `arboard` |
| Frontend | HTML / CSS / JavaScript thuần — không cần bundler |
| Thiết kế | Material Design 3, [material-color-utilities](https://github.com/material-foundation/material-color-utilities) |
| Icon | [Lucide](https://lucide.dev) |
| Phông chữ | [Fontsource](https://fontsource.org) (Roboto, Inter, Open Sans, Be Vietnam Pro, Nunito) — nhúng sẵn, chạy offline |
| Công cụ tải | [yt-dlp](https://github.com/yt-dlp/yt-dlp), [FFmpeg](https://ffmpeg.org), [Deno](https://deno.com) |

## Phát triển

Yêu cầu: [Node.js](https://nodejs.org) 18+, [Rust](https://rustup.rs) (stable) và [các thành phần phụ thuộc của Tauri](https://tauri.app/start/prerequisites/) cho hệ điều hành của bạn.

Dự án nằm trong một Cargo workspace có `Cargo.toml` gốc chứa `members = ["*/src-tauri"]`, nên mọi thư mục con có `src-tauri/Cargo.toml` đều được nhận tự động và dùng chung một bộ nhớ đệm `target`. Không cần cấu hình thêm.

```bash
cd mp3-downloader
npm install
npm run dev
```

## Đóng gói

```bash
npm run build
```

Bộ cài đặt nằm trong thư mục `target` dùng chung của workspace, ví dụ `target/release/bundle/nsis/MP3 Downloader_0.4.0_x64-setup.exe`. Chép bộ cài vào [`download/`](download/) để nút **Tải về** của landing page hoạt động.

## Cấu trúc project

```
mp3-downloader/
├─ index.html                landing page (1 file, Material Design)
├─ og-image.png              ảnh chia sẻ mạng xã hội
├─ download/                 đặt file cài đặt vào đây
├─ screenshots/              image01.png, image02.png, …
├─ LICENSE
├─ package.json
├─ src/                      giao diện app (không cần bundler)
│  ├─ index.html
│  ├─ styles.css
│  ├─ app.js                 logic giao diện
│  ├─ i18n.js                chuỗi tiếng Anh / tiếng Việt
│  ├─ app-icon.png
│  ├─ fonts/                 phông chữ nhúng sẵn
│  └─ vendor/mcu.js          material-color-utilities
└─ src-tauri/
   ├─ Cargo.toml
   ├─ tauri.conf.json
   ├─ capabilities/
   ├─ icons/                 icon app, installer.ico, uninstaller.ico
   └─ src/
      ├─ main.rs
      └─ lib.rs              backend: tải nhạc, công cụ, trạng thái cửa sổ
```

## Giấy phép

Phát hành theo [Giấy phép MIT](LICENSE) © 2026 **minhtrong67**.

Tác giả **minhtrong67**, với sự hỗ trợ phát triển của **Claude** (Anthropic).

Bên thứ ba: Lucide (ISC), phông Fontsource (OFL / Apache-2.0), material-color-utilities (Apache-2.0). `yt-dlp`, `ffmpeg`, `Deno` được tải riêng và giữ giấy phép của chúng.
