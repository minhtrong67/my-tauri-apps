<div align="center">

<img src="assets/icon.svg" alt="Material Screenshot" width="128" height="128">

# Material Screenshot

**Biến ảnh chụp màn hình thành hình ảnh đẹp mắt chỉ trong vài giây.**

Ứng dụng desktop miễn phí, mã nguồn mở cho Windows, xây dựng bằng Tauri 2 và thiết kế theo Material 3 Expressive.

[![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](#license)

[English](README.en.md) · [Landing page](index.html) · [GitHub](https://github.com/minhtrong67/my-tauri-apps)

</div>

---

## Giới thiệu

**Material Screenshot** giúp bạn chụp màn hình (hoặc mở, dán, kéo thả một ảnh có sẵn) rồi làm đẹp nó: thêm nền gradient, khung thiết bị, đổ bóng, chú thích và watermark, sau đó lưu hoặc sao chép ảnh hoàn chỉnh cho tài liệu, bài viết blog hay mạng xã hội.

Mọi thao tác xử lý đều diễn ra ngay trên máy của bạn, ứng dụng không tải ảnh lên bất kỳ máy chủ nào.

## Screenshot

<table>
  <tr>
    <td><img src="screenshots/image01.png" alt="Trình chỉnh sửa với kiểu Aurora"></td>
    <td><img src="screenshots/image02.png" alt="Chú thích trực tiếp trên ảnh"></td>
  </tr>
  <tr>
    <td><img src="screenshots/image03.png" alt="Giao diện tối và xuất nhiều kích thước"></td>
    <td><img src="screenshots/image04.png" alt="Hộp thoại cài đặt"></td>
  </tr>
</table>

## Tính năng

**Lấy ảnh**
- Chụp màn hình bằng phím tắt toàn cục `Ctrl + Alt + S` (toàn màn hình hoặc chọn vùng rồi cắt), có hẹn giờ 3 hoặc 5 giây
- Mở ảnh, dán từ clipboard (`Ctrl + V`), kéo thả một hoặc nhiều tệp, mở bằng "Open with", danh sách tệp gần đây

**Làm đẹp**
- 10 kiểu dựng sẵn có ảnh xem trước thật, lưu kiểu riêng của bạn, nhập và xuất kiểu dưới dạng văn bản
- Nền gradient, lưới màu (mesh), màu đặc, ảnh nền, trong suốt; họa tiết chấm, lưới, hạt; tự lấy màu nền từ ảnh
- Khung Windows, macOS, trình duyệt, kính, điện thoại, máy tính bảng, laptop; xoay và vát nhẹ cho nổi bật
- Bo góc, khoảng đệm, đổ bóng, viền, tỉ lệ khung (1:1, 4:3, 16:9, 9:16, tùy chỉnh…), chú thích chữ và watermark (chữ hoặc logo)

**Chú thích**
- Mũi tên, đường thẳng, hình chữ nhật, elip, chữ, số thứ tự, tô sáng, làm mờ ô vuông (che thông tin nhạy cảm) và tiêu điểm
- Chọn, kéo, đổi kích thước, xóa; hoàn tác và làm lại; thu phóng, kéo ảnh; giữ nút mắt (hoặc phím `X`) để xem ảnh gốc

**Xuất ảnh**
- PNG, JPEG, WebP, tỉ lệ 1x / 2x / 3x, lưu thẳng vào thư mục mặc định (Downloads) hoặc hỏi vị trí lưu
- Tùy chỉnh đường dẫn lưu trong Cài đặt: duyệt chọn thư mục, gõ hoặc dán đường dẫn (tự tạo nếu chưa có), mở nhanh thư mục đã chọn
- Xuất cùng lúc nhiều kích thước mạng xã hội (Open Graph, X, LinkedIn, Instagram, Story, Product Hunt, YouTube) và xuất hàng loạt nhiều ảnh

**Cá nhân hóa (Cài đặt)**
- Giao diện sáng / tối / theo hệ thống, 18 màu chủ đề Material (kèm màu tùy chỉnh), kiểu màu cân bằng hoặc rực rỡ, độ tương phản
- Cỡ chữ nhỏ / vừa / lớn, 5 phông chữ (Roboto, System UI, Inter, Nunito, Be Vietnam Pro), tiếng Việt và tiếng Anh
- Cửa sổ khi mở ứng dụng: ghi nhớ kích thước lần trước hoặc luôn phóng to tối đa
- Tooltip, dropdown, toast (info / success / warning / error), dialog và nút cuộn lên đầu đều được thiết kế riêng, hỗ trợ cả giao diện sáng và tối

### Phím tắt

| Phím | Chức năng | Phím | Chức năng |
| --- | --- | --- | --- |
| `Ctrl + O` | Mở ảnh | `Ctrl + Z` / `Ctrl + Y` | Hoàn tác / Làm lại |
| `Ctrl + V` | Dán ảnh | `C` | Cắt ảnh |
| `Ctrl + Alt + S` | Chụp màn hình | `V R O A L T N H B S` | Công cụ chú thích |
| `Ctrl + C` | Sao chép ảnh | `Delete` | Xóa chú thích đã chọn |
| `Ctrl + S` | Lưu ảnh | `Ctrl + lăn chuột` | Thu phóng |
| `Ctrl + /` | Xem tất cả phím tắt | `0` / `1` | Vừa khung / 100% |

## Download

Tải bản cài đặt Windows (`Material-Screenshot_2.0.0_x64-setup.exe`) trong thư mục [`download`](download) hoặc ở trang [Releases](https://github.com/minhtrong67/my-tauri-apps/releases).

## Cài đặt

1. Tải tệp `.exe` ở trên và chạy.
2. Bộ cài NSIS cài cho người dùng hiện tại, không cần quyền quản trị.
3. Yêu cầu Windows 10 / 11 (64-bit) và Microsoft Edge WebView2 (thường có sẵn trên Windows 11, bộ cài sẽ tự tải nếu thiếu).

## Tech stack

| Lớp | Công nghệ |
| --- | --- |
| Khung ứng dụng | [Tauri 2](https://tauri.app) (Rust) |
| Giao diện | React 19, TypeScript, Vite 6, Tailwind CSS 4 |
| Thiết kế | Material 3 Expressive, `@material/material-color-utilities` |
| Biểu tượng | [Lucide](https://lucide.dev) |
| Vẽ ảnh | Canvas 2D |
| Chụp màn hình | [`xcap`](https://crates.io/crates/xcap) (Rust) |
| Bộ cài | NSIS |

## Development

Yêu cầu: [Node.js](https://nodejs.org) 18+, [Rust](https://rustup.rs) (stable), Microsoft C++ Build Tools và WebView2 (xem [Tauri prerequisites](https://tauri.app/start/prerequisites/)).

```bash
npm install      # cài thư viện
npm run dev      # chạy ứng dụng ở chế độ phát triển (Tauri + Vite, có hot reload)
```

Dự án nằm trong Cargo workspace `my-tauri-apps` (xem `Cargo.toml` ở thư mục gốc), nên mọi ứng dụng dùng chung một thư mục build `./target`.

Chỉ muốn xem giao diện trên trình duyệt (không có chụp màn hình và lưu tệp trực tiếp)? Chạy `npm run web`.

Các lệnh khác: `npm run typecheck` (kiểm tra TypeScript), `npm run icons` (tạo lại toàn bộ bộ icon, cần `pip install cairosvg pillow`).

## Build

```bash
npm run build
```

Bộ cài được tạo trong `target/release/bundle/nsis/` của workspace. Đổi tên thành `Material-Screenshot_2.0.0_x64-setup.exe` rồi chép vào thư mục `download` để nút tải trên landing page hoạt động.

## Cấu trúc project

```
material-screenshot/
├── index.html               # Landing page (một tệp, Material 3 Expressive)
├── app/                     # Giao diện ứng dụng (Vite root)
│   ├── index.html
│   ├── public/icon.svg
│   └── src/
│       ├── main.tsx · App.tsx · index.css
│       ├── components/      # Stage, Panel, Toolbar, Dialogs, Settings, ui/ (Button, Select, Tooltip, Toast…)
│       ├── lib/             # editor, render (canvas), theme, settings, i18n (dict), tauri…
│       └── hooks/
├── src-tauri/               # Backend Rust
│   ├── src/lib.rs           # Lệnh: lưu/đọc ảnh, chụp màn hình, trạng thái cửa sổ
│   ├── tauri.conf.json · capabilities/
│   ├── icons/               # icon ứng dụng, setup (installer.ico), gỡ cài đặt (uninstaller.ico)
│   └── installer/           # ảnh header, sidebar cho NSIS
├── assets/                  # Icon web, ảnh chia sẻ (og-image), phông chữ cho landing page
├── screenshots/             # image01 … image04
├── download/                # Đặt tệp setup .exe vào đây
├── scripts/generate-icons.py
├── package.json · vite.config.ts · tsconfig.json
└── LICENSE
```

## License

Phát hành theo giấy phép [MIT](LICENSE). Dự án mở công khai tại [github.com/minhtrong67/my-tauri-apps](https://github.com/minhtrong67/my-tauri-apps).

---

<div align="center">

**Tác giả: [minhtrong67](https://github.com/minhtrong67)** · Được xây dựng với sự hỗ trợ của AI **Claude** (Anthropic)

</div>
