<div align="center">

<img src="icon-512.png" width="112" alt="Fluent Photos">

# Fluent Photos

**Trình xem và chỉnh sửa ảnh nhanh, đẹp, mã nguồn mở cho Windows, thiết kế theo Microsoft Fluent Design.**

[![License: MIT](https://img.shields.io/badge/License-MIT-0078D4.svg)](LICENSE)
![Tauri](https://img.shields.io/badge/Tauri-2-FFC131?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

</div>

## Giới thiệu

Fluent Photos giúp bạn lướt xem, sắp xếp và chỉnh sửa ảnh trên Windows trong một ứng dụng nhẹ, mượt và có giao diện **Microsoft Fluent Design**: hình khối biến đổi, chuyển động bật nảy, màu sắc theo chủ đề của bạn và hỗ trợ sáng/tối. Ứng dụng hỗ trợ **tiếng Việt** và **tiếng Anh**.

## Screenshot

| | |
|---|---|
| ![Thư viện](screenshots/image01.png) | ![Trình xem](screenshots/image02.png) |
| **Thư viện** nhóm theo ngày | **Trình xem** với EXIF, histogram, dải ảnh |
| ![Trình chỉnh sửa](screenshots/image03.png) | ![Cài đặt](screenshots/image04.png) |
| **Trình chỉnh sửa** đầy đủ công cụ | **Cài đặt** gọn gàng, tùy chỉnh giao diện |

## Giao diện Fluent

- **Hiệu ứng nền cửa sổ** trong Cài đặt: *Mica*, *Mica Alt*, *Acrylic*, *Acrylic Alt* hoặc màu đặc. Mica cần Windows 11; trên máy không hỗ trợ ứng dụng tự dùng màu đặc.
- **Màu nhấn** theo bảng màu Windows (hoặc màu tùy chỉnh), chế độ sáng/tối/theo hệ thống.
- Font mặc định là **font hệ thống**; icon dùng **Lucide**.
- Khi xem ảnh, **không có thanh công cụ, nút, bản đồ thu nhỏ hay bảng thông tin nào đè lên ảnh**: mọi điều khiển nằm ở hàng/cột riêng quanh ảnh. Ở chế độ toàn màn hình, toàn bộ giao diện ẩn đi (nhấn Esc hoặc F để thoát).

## Tính năng

**Thư viện**
- Tự nạp thư mục *Pictures*, mở thư mục bất kỳ, kéo thả ảnh hoặc thư mục vào cửa sổ.
- Nhóm theo ngày với tiêu đề, lưới ảo hóa mượt với hàng chục nghìn ảnh, thumbnail cache (đúng chiều xoay EXIF).
- Tìm kiếm theo tên, lọc theo thư mục và định dạng, 6 kiểu sắp xếp, chỉnh kích thước ô ảnh.
- **Yêu thích** và **Album** tự tạo (ảnh có thể ở nhiều thư mục khác nhau).
- Chọn nhiều ảnh (Ctrl/Shift/ô chọn): yêu thích, thêm vào album, sao chép/di chuyển tới thư mục, **đổi tên hàng loạt**, xoá.
- **Tìm ảnh trùng** (so sánh nội dung) và chuyển bản thừa vào Thùng rác.

**Trình xem**
- Zoom theo con trỏ, kéo để di chuyển, pinch trên màn hình cảm ứng, bản đồ thu nhỏ, dải ảnh, vuốt chuyển ảnh.
- **Trình chiếu** có cài đặt: thời gian, hiệu ứng (mờ/trượt/thu phóng), ngẫu nhiên, lặp lại.
- Bảng **chi tiết EXIF** (máy ảnh, ống kính, ISO, khẩu độ, tốc độ, tiêu cự, ngày chụp, GPS) và **histogram**.
- Xoay nhanh, sao chép ảnh, in, đặt làm hình nền, hiện trong thư mục, đổi tên.
- Xoá vào Thùng rác kèm nút **Hoàn tác**.

**Trình chỉnh sửa**
- Cắt (tỉ lệ tự do/gốc/1:1/4:3/3:2/16:9...), xoay, lật, chỉnh thẳng.
- 11 mức điều chỉnh (sáng, tương phản, bão hòa, độ ấm, sắc thái, vùng sáng, vùng tối, độ nét, tối viền, sắc độ, làm mờ) và **tự động cải thiện**; lưu **bộ chỉnh** riêng.
- 12 bộ lọc có cường độ.
- Vẽ: bút, bút dạ, đường thẳng, mũi tên, chữ nhật, ô-van, tẩy; **chữ** xoay/đổi cỡ được; **emoji**, hình mờ; **làm mờ / vỡ hạt** vùng nhạy cảm.
- Lịch sử chỉnh sửa (nhảy về bước bất kỳ), hoàn tác/làm lại, giữ để so sánh với ảnh gốc.
- Xuất PNG/JPEG/WebP, đổi kích thước và chất lượng, giữ dữ liệu EXIF của JPEG, lưu bản sao, lưu đè (có xác nhận) hoặc sao chép vào clipboard.

**Cài đặt**
- Chế độ sáng / tối / theo hệ thống, 15 màu nhấn Windows hoặc màu tùy chọn, 3 cỡ chữ, tiếng Việt / English, font hệ thống (cùng 7 phông chữ đóng gói sẵn), giảm chuyển động.
- **Thư mục thư viện** tùy chọn (ví dụ `D:\Pictures`), tự quét cả thư mục con.
- Tùy chọn cửa sổ khi mở app: **ghi nhớ kích thước** hoặc **luôn phóng to tối đa**.
- Trang cài đặt chia nhóm (Giao diện, Cửa sổ, Thư viện, Trình xem, Phím tắt, Giới thiệu) và có ô tìm kiếm.

## Cài đặt

1. Build bộ cài (xem bên dưới) và lấy tệp `Fluent Photos_2.0.0_x64-setup.exe`.
2. Chạy tệp cài đặt và làm theo hướng dẫn (cài cho người dùng hiện tại, không cần quyền quản trị).
3. Mở **Fluent Photos** từ Start Menu.

Yêu cầu: Windows 10 / 11 (64-bit) với WebView2 Runtime (có sẵn trên Windows 11 và các bản Windows 10 mới).

## Tech stack

| Thành phần | Công nghệ |
|---|---|
| Khung ứng dụng | [Tauri 2](https://tauri.app) (Rust) |
| Giao diện | React 18, TypeScript, Vite 6, Tailwind CSS 4 |
| Thiết kế | Microsoft Fluent Design (Mica / Acrylic, màu nhấn Windows), Lucide icons |
| Icon | [Lucide](https://lucide.dev) |
| Xử lý ảnh | Canvas (trình chỉnh sửa), crate `image`, `kamadak-exif` (Rust) |

## Development

Yêu cầu: [Node.js](https://nodejs.org) 18+, [Rust](https://rustup.rs) và [điều kiện tiên quyết của Tauri](https://tauri.app/start/prerequisites/).

```bash
pnpm install    # cài thư viện
pnpm dev         # chạy ứng dụng ở chế độ phát triển (tauri dev + Vite)
pnpm build       # build bộ cài Windows
```

Các lệnh bổ sung: `pnpm web` (chỉ chạy giao diện Vite ở trình duyệt) và `pnpm typecheck`.

Dự án nằm trong Cargo workspace dùng chung (`members = ["*/src-tauri"]`) nên mọi project dùng chung thư mục `target`.

## Build

```bash
pnpm build
```

Bộ cài NSIS được tạo trong `target/release/bundle/nsis/` của workspace (hoặc `src-tauri/target/...` nếu chạy độc lập).

## Cấu trúc project

```
fluent-photos/
├── screenshots/          # image01.png ... image04.png
├── icon-512.png          # Icon dùng trong README
├── package.json, vite.config.ts, tsconfig.json
├── src/                  # Giao diện (Vite root)
│   ├── index.html, main.tsx, App.tsx, index.css
│   ├── components/       # ui, Overlays (tooltip, menu, toast, modal), Select
│   ├── features/         # Gallery, Viewer, Editor, EditorPanels, SettingsDialog, Dialogs
│   ├── lib/              # store, i18n, theme (accent + Mica/Acrylic), tauri, actions, editorEngine
│   ├── fonts/            # Phông chữ đóng gói sẵn (Roboto, Inter, ...)
│   └── public/           # Icon của app
└── src-tauri/            # Ứng dụng Tauri (Rust)
    ├── src/lib.rs        # Lệnh: thumbnail, EXIF, ghi ảnh, Thùng rác, quét thư mục...
    ├── src/exif_util.rs  # Đọc EXIF, giữ EXIF khi lưu JPEG
    ├── icons/, installer/  # Bộ icon app (ICO 16-256 px), setup, uninstall
    └── tauri.conf.json
```

## License

Dự án mã nguồn mở, phát hành theo giấy phép [MIT](LICENSE).

Kho mã chung của các ứng dụng: <https://github.com/minhtrong67/my-tauri-apps>

---

<div align="center">

**Tác giả: [minhtrong67](https://github.com/minhtrong67)** · Xây dựng với sự hỗ trợ của **Claude (Anthropic)**

</div>
