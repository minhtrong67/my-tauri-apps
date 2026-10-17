<div align="center">

<img src="src-tauri/icons/128x128@2x.png" alt="Material Readme" width="128" height="128">

# Material Readme

**Trình soạn thảo và xem Markdown theo phong cách Material Design 3 cho máy tính.**

Viết, xem trước và hoàn thiện file `README.md` với giao diện hiện đại, xem trước trực tiếp và giao diện đủ mọi màu Material.

[![License: MIT](https://img.shields.io/badge/License-MIT-6750A4.svg)](LICENSE)
[![Built with Tauri 2](https://img.shields.io/badge/Tauri-2-24C8DB.svg)](https://tauri.app)

[English](README.md) · [Tiếng Việt](README.vi.md)

</div>

---

## Giới thiệu

Material Readme ban đầu chỉ là trình xem Markdown, nay đã trở thành một trình soạn thảo đầy đủ. Ứng dụng mở file `.md` tức thì, cho phép chỉnh sửa bằng thanh định dạng và phím tắt, đồng thời hiển thị kết quả ngay bên cạnh. Toàn bộ giao diện theo **Material Design 3**, lấy màu từ các file xuất của Material Theme Builder trong `src/theme/`.

Ứng dụng xây dựng bằng [Tauri 2](https://tauri.app) nên nhẹ, nhanh và tiết kiệm bộ nhớ. Mọi thứ hoạt động ngoại tuyến.

## Ảnh chụp màn hình

| | |
| :---: | :---: |
| ![Chia đôi, giao diện sáng](screenshots/image01.png) | ![Chia đôi, giao diện tối màu tím](screenshots/image02.png) |
| Chia đôi với xem trước trực tiếp | Giao diện tối từ file theme màu tím |
| ![Chế độ đọc](screenshots/image03.png) | ![Cài đặt tiếng Việt](screenshots/image04.png) |
| Chế độ đọc với màu chủ đề xanh mòng két | Bảng cài đặt (giao diện tiếng Việt) |
| ![Tìm và thay thế](screenshots/image05.png) | ![Cửa sổ hẹp](screenshots/image06.png) |
| Tìm và thay thế | Bố cục responsive khi cửa sổ hẹp |

## Tính năng

**Soạn thảo**
- Trình soạn thảo CodeMirror 6, tô màu cú pháp Markdown và khối mã, lịch sử hoàn tác riêng cho từng tệp, tự nối danh sách khi nhấn Enter.
- Thanh định dạng: đậm, nghiêng, gạch ngang, tiêu đề, trích dẫn, mã dòng, khối mã, liên kết, hình ảnh, danh sách chấm / số / việc cần làm, bảng, đường kẻ ngang cùng các phím tắt `Ctrl+B`, `Ctrl+I`, `Ctrl+K`.
- Tìm và thay thế, phân biệt hoa thường, biểu thức chính quy, ngay trong trình soạn thảo hoặc bản xem trước.
- Nhiều tài liệu trong các thẻ, báo hiệu chưa lưu và hỏi lại trước khi mất dữ liệu.
- Tự động lưu (tùy chọn), ghi tệp an toàn, giữ nguyên CRLF / LF, tự tải lại khi tệp thay đổi trên đĩa.

**Đọc**
- Ba bố cục: **Soạn**, **Chia đôi** (cuộn đồng bộ) và **Xem**.
- GitHub Flavoured Markdown: bảng, danh sách việc cần làm, gạch ngang, hộp cảnh báo (`> [!NOTE]`), front matter, khối mã tô màu có nút sao chép.
- Ảnh cục bộ theo đường dẫn tương đối, liên kết tới các file `.md` khác, neo trong trang và liên kết ngoài mở bằng trình duyệt.
- Mục lục với tiêu đề hiện tại được làm nổi bật khi cuộn.
- Thu phóng từ 60% đến 220%.

**Cá nhân hóa**
- Chế độ sáng, tối hoặc theo hệ thống, kèm hiệu ứng lan tròn.
- Ba theme dựng sẵn từ Material Theme Builder (xanh da trời là mặc định, cùng xanh dương và tím), 17 màu Material, màu hex tùy chỉnh và ba mức tương phản.
- Tiếng Anh và tiếng Việt, tự nhận diện ngôn ngữ hệ thống khi mở lần đầu, có thể đổi trong **Cài đặt**.
- Cửa sổ khi mở app: **ghi nhớ kích thước lần trước** hoặc **luôn phóng to tối đa**.

**Khác**
- Mở file bằng cách nhấp đúp (liên kết loại tệp), kéo thả, `Ctrl+O` hoặc danh sách tệp gần đây.
- Xuất HTML độc lập, in hoặc lưu PDF.
- Hiệu ứng Material mượt mà: ripple, thẻ, hộp thoại, menu, side sheet; tôn trọng chế độ giảm chuyển động.
- Icon ứng dụng, trình cài đặt và gỡ cài đặt cùng phong cách Material.

## Cài đặt

1. Tải `Material Readme_2.0.0_x64-setup.exe` trong thư mục [`downloads`](downloads).
2. Chạy file cài đặt (cài cho người dùng hiện tại, không cần quyền quản trị).
3. Mở **Material Readme** từ Start menu. Để mở file Markdown bằng app, chọn *Open with → Material Readme*.

> Windows 10 và 11 (64-bit), cần Microsoft Edge WebView2 (đã có sẵn trên Windows 11 và Windows 10 cập nhật gần đây).

`index.html` ở thư mục gốc là landing page giới thiệu app. Trước khi đăng lên GitHub Pages, hãy thay `https://minhtrong67.github.io/material-readme/` trong thẻ `<head>` bằng địa chỉ thật của bạn.

## Công nghệ

Tauri 2 (Rust), CodeMirror 6, marked, DOMPurify, highlight.js, Material Design 3 (material-color-utilities, Material Symbols), Roboto và Roboto Mono. Giao diện viết bằng HTML, CSS và ES modules thuần, không cần bundler.

## Phát triển

Yêu cầu: Node.js 18+, Rust stable (MSVC), Microsoft C++ Build Tools và WebView2.

Dự án nằm trong thư mục Cargo workspace chung chứa file `Cargo.toml`:

```text
tauri-apps/
├─ Cargo.toml            # members = ["*/src-tauri"], dùng chung ./target
└─ material-readme/      # dự án này
```

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

File cài đặt nằm ở `target/release/bundle/nsis/Material Readme_2.0.0_x64-setup.exe` (trong thư mục workspace). Hãy chép vào [`downloads`](downloads) để landing page tải được.

## Cấu trúc dự án

```text
material-readme/
├─ index.html        # landing page
├─ downloads/        # đặt file setup vào đây
├─ screenshots/      # image01.png … image06.png
├─ src/              # giao diện (css, js, theme, fonts, vendor)
├─ src-tauri/        # Rust, cấu hình Tauri, icon
└─ tools/            # công cụ tùy chọn (build vendor, nguồn icon)
```

## Giấy phép

Dự án công khai và mã nguồn mở, phát hành theo [giấy phép MIT](LICENSE).

---

<div align="center">

Thiết kế và phát triển bởi **minhtrong67** với sự hỗ trợ của AI **Claude** (Anthropic).

</div>
