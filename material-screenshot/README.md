<div align="center">

<img src="assets/icon.svg" width="112" alt="Material Screenshot">

# Material Screenshot

**Biến ảnh chụp màn hình thành hình ảnh đẹp mắt chỉ trong vài giây.**

Ứng dụng desktop nhẹ, ngoại tuyến, thiết kế theo Material Design 3.

![Tauri 2](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white)
![Platform](https://img.shields.io/badge/Windows-10%20%7C%2011-0078D4)
![License](https://img.shields.io/badge/License-MIT-green)
![Open Source](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-red)

[English](README.en.md) · **Tiếng Việt**

</div>

## Giới thiệu

**Material Screenshot** giúp bạn làm đẹp ảnh chụp màn hình cho tài liệu, bài viết blog, mạng xã hội và bài thuyết trình: thêm nền gradient, khung cửa sổ, đổ bóng, chú thích rồi xuất ảnh hoặc sao chép thẳng vào clipboard. Ứng dụng chạy hoàn toàn ngoại tuyến, nhẹ nhờ Tauri 2 và có giao diện **Material Design 3**.

Dự án công khai và mã nguồn mở (MIT).

> Tác giả: **minhtrong67** · Phát triển với sự hỗ trợ của AI **Claude** (Anthropic).

## Screenshot

| | |
|---|---|
| ![Màn hình chào](screenshots/image01.png) | ![Trình chỉnh sửa sáng](screenshots/image02.png) |
| ![Trình chỉnh sửa tối](screenshots/image03.png) | ![Cài đặt](screenshots/image04.png) |
| ![Màu chủ đề](screenshots/image05.png) | ![Giới thiệu](screenshots/image06.png) |

## Tính năng

**Thêm ảnh**
- Dán bằng `Ctrl` + `V` (chụp bằng `Win` + `Shift` + `S`), kéo thả tệp hoặc mở bằng hộp thoại (PNG, JPEG, WebP, GIF, BMP); có sẵn ảnh mẫu.

**Làm đẹp**
- Nền: gradient (2–3 màu, 14 mẫu, chỉnh góc), màu đặc, ảnh nền làm mờ hoặc trong suốt.
- Bố cục: khoảng đệm, bo góc, tỉ lệ khung (1:1, 4:3, 3:2, 16:9, 9:16, 4:5, 2:1, tuỳ chỉnh), viền, đổ bóng.
- Khung cửa sổ: Windows 11, macOS, trình duyệt, kính mờ; sáng hoặc tối; tiêu đề tuỳ chỉnh.
- 7 kiểu dựng sẵn: Clean, Ocean, Sunset, Night, Aurora, Glass, Flat.

**Chỉnh sửa**
- Cắt ảnh, hoàn tác / làm lại tối đa 60 bước.
- Chú thích: khung, mũi tên, chữ, tô sáng, làm mờ pixel (che thông tin nhạy cảm); chú thích chữ trên hoặc dưới ảnh.

**Xuất ảnh**
- PNG, JPEG, WebP, tỉ lệ 1x–3x, chỉnh chất lượng; sao chép vào clipboard hoặc lưu thẳng vào thư mục mặc định (**Downloads** của Windows, đổi được trong Cài đặt; có thể bật "hỏi vị trí mỗi lần lưu"). Tự giảm tỉ lệ khi ảnh vượt 8192 px.

**Trải nghiệm**
- Giao diện sáng / tối / theo hệ thống, 19 màu chủ đề Material và màu tuỳ chỉnh, 3 mức tương phản.
- Tiếng Việt và English, **tự nhận ngôn ngữ của thiết bị**.
- Tuỳ chọn cửa sổ khi mở ứng dụng: **ghi nhớ kích thước** hoặc **luôn mở phóng to tối đa**.
- Animation mượt (ripple, chuyển màu, hộp thoại), responsive, tôn trọng `prefers-reduced-motion`; phông chữ mặc định **Roboto** (đóng gói sẵn, chạy ngoại tuyến).

| Phím tắt | Chức năng |
|---|---|
| `Ctrl` + `V` | Dán ảnh |
| `Ctrl` + `O` | Mở ảnh |
| `Ctrl` + `S` | Lưu ảnh |
| `Ctrl` + `Shift` + `C` | Sao chép kết quả |
| `Ctrl` + `Z` / `Ctrl` + `Y` | Hoàn tác / làm lại |
| `Ctrl` + `,` | Mở cài đặt |
| `Enter` / `Esc` | Áp dụng / hủy cắt |

## Cài đặt

**Người dùng:** tải file `Material-Screenshot_1.1.0_x64-setup.exe` trong thư mục [`download/`](download) (hoặc từ landing page [`index.html`](index.html)), chạy và làm theo hướng dẫn. Cài cho riêng người dùng hiện tại, không cần quyền quản trị.

**Lập trình viên:** cần Windows 10/11 cùng:
- [Node.js](https://nodejs.org) 18 trở lên
- [Rust](https://rustup.rs) (toolchain stable)
- Microsoft C++ Build Tools (workload "Desktop development with C++")
- Microsoft Edge WebView2 Runtime (có sẵn trên Windows 11)

## Tech stack

- [Tauri 2](https://tauri.app): lõi Rust nhỏ gọn, dùng WebView2 của Windows
- HTML, CSS, JavaScript thuần với Canvas 2D, không framework
- [Material Color Utilities](https://github.com/material-foundation/material-color-utilities) (bản gói sẵn trong `src/js/mcu.js`) để sinh bảng màu Material 3
- [Roboto](https://fonts.google.com/specimen/Roboto) (phông chữ mặc định của Material Design, giấy phép Apache 2.0, đóng gói trong `src/fonts/`)
- `tauri-plugin-dialog`, `serde_json`, `base64`

## Development

Đặt dự án trong thư mục workspace Cargo dùng chung (ví dụ `D:\tauri-apps\`) để các dự án Tauri chia sẻ một bộ nhớ đệm build `target`.

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Bộ cài đặt nằm ở `<workspace>\target\release\bundle\nsis\`. Đổi tên thành `Material-Screenshot_1.1.0_x64-setup.exe` và đặt vào thư mục `download/` để nút tải trên landing page hoạt động.

**Landing page:** khi đưa lên hosting, thay `https://your-domain.com/` trong `index.html`, `robots.txt` và `sitemap.xml` bằng tên miền thật để thẻ canonical, Open Graph và dữ liệu có cấu trúc đúng.

Tạo lại toàn bộ icon (app, setup, uninstall, ảnh NSIS) từ `assets/icon.svg`:

```bash
pip install cairosvg pillow
python scripts/generate-icons.py
```

Sau khi thay icon, chạy `cargo clean -p material-screenshot` rồi build lại.

## Cấu trúc project

```
material-screenshot/
├─ index.html              Landing page Material Design 3 (một file, có SEO + Open Graph)
├─ robots.txt, sitemap.xml  SEO (thay your-domain.com bằng tên miền thật)
├─ download/               Đặt file setup .exe tại đây
├─ screenshots/            image01.png … image06.png
├─ assets/                 icon.svg, og-image.png, favicon, manifest, fonts/
├─ scripts/generate-icons.py
├─ src/                    Giao diện ứng dụng
│  ├─ index.html
│  ├─ css/app.css          Material Design 3
│  ├─ fonts/               Roboto (woff2)
│  └─ js/                  app.js, theme.js, i18n.js, mcu.js
├─ src-tauri/
│  ├─ src/lib.rs           Lõi Rust: đọc/lưu ảnh, nhớ kích thước cửa sổ
│  ├─ tauri.conf.json
│  ├─ capabilities/
│  ├─ icons/               icon app, setup, uninstall
│  └─ installer/           ảnh header, sidebar cho trình cài NSIS
├─ package.json
├─ LICENSE
└─ README.md
```

## License

Phát hành theo giấy phép [MIT](LICENSE). Bạn được tự do sử dụng, sao chép, chỉnh sửa và phân phối.

Thiết kế và phát triển bởi **minhtrong67** với sự hỗ trợ của **Claude** (Anthropic).
