<div align="center">

<img src="src-tauri/icons/128x128@2x.png" width="112" alt="Logo Material Xlsx" />

# Material Xlsx

**Trình soạn thảo bảng tính `.xlsx` đơn giản, nhanh và đẹp — xây dựng bằng Tauri 2 và Material Design 3.**

[English](README.md) · Tiếng Việt

![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-backend-000000?logo=rust)
![Material Design 3](https://img.shields.io/badge/Material%20Design-3-1B6B3A)
![License](https://img.shields.io/badge/license-MIT-green)

Tác giả **`minhtrong67`** · Có sự hỗ trợ của AI **`Claude`** (Anthropic)

</div>

---

## Giới thiệu

Material Xlsx là phần mềm bảng tính gọn nhẹ thay thế Microsoft Excel cho công việc hằng ngày: mở, chỉnh sửa và lưu tệp `.xlsx` với công thức, định dạng, sắp xếp, bộ lọc và nhiều sheet — trong giao diện **Material Design 3** của Google, tự theo giao diện sáng/tối của hệ thống và màu chủ đề do bạn chọn.

Toàn bộ công cụ bảng tính (bộ phân tích công thức, bộ tính toán, lịch sử hoàn tác, lưới ảo hoá) viết bằng JavaScript thuần chạy trong WebView gốc của Tauri nên bộ cài nhỏ và khởi động nhanh. Rust đảm nhiệm việc đọc/ghi tệp, clipboard hệ thống và ghi nhớ trạng thái cửa sổ.

## Ảnh chụp màn hình

| | |
|---|---|
| ![Giao diện sáng](screenshots/image01.png) | ![Giao diện tối](screenshots/image02.png) |
| *Giao diện sáng: công thức, định dạng số, tiêu đề gộp ô, cố định hàng đầu* | *Giao diện tối với màu tuỳ chọn và gợi ý hàm* |
| ![Cài đặt](screenshots/image03.png) | ![Bộ lọc](screenshots/image04.png) |
| *Cài đặt bằng tiếng Việt: giao diện, màu, ngôn ngữ, chế độ cửa sổ* | *Bộ lọc cột có ô tìm kiếm* |
| ![Menu và tìm kiếm](screenshots/image05.png) | |
| *Menu Dữ liệu và bảng Tìm & Thay thế* | |

## Tính năng

**Bảng tính**
- Nhiều sheet: thêm, đổi tên (nhấp đúp), nhân bản, sắp xếp thứ tự, tô màu thẻ, xoá
- **Hơn 200 hàm** — toán học, thống kê, **tài chính** (`PMT`, `FV`, `PV`, `NPV`, `IRR`, `RATE`, …), logic, văn bản, ngày giờ, tra cứu (`SUM`, `IFS`, `SUMIFS`, `COUNTIFS`, `VLOOKUP`, `XLOOKUP`, `XMATCH`, `OFFSET`, `SUBTOTAL`, `WORKDAY`, `PERCENTILE`, `CORREL`, `NORM.DIST`, `INDEX/MATCH`, `TEXT`, `TEXTJOIN`, `DATE`, `EDATE`…), tham chiếu giữa các sheet, vùng cả cột (`A:A`), phát hiện tham chiếu vòng và các lỗi `#N/A`, `#DIV/0!`…
- Gợi ý hàm khi gõ (hàm phổ biến lên đầu); nhấp ô để chèn tham chiếu khi đang nhập công thức
- Định dạng ô: phông, cỡ chữ, đậm/nghiêng/gạch chân/gạch ngang, màu chữ và màu nền, đường viền, căn lề, xuống dòng, gộp ô
- Định dạng số: chung, số, hàng nghìn, tiền tệ (`$`, `₫`, `€`), phần trăm, khoa học, ngày giờ, văn bản và **mã tuỳ chỉnh**; tăng/giảm số thập phân
- **Font đi kèm** (Inter, Roboto, Be Vietnam Pro, Noto Sans / Serif, Open Sans, Lora, Roboto Mono — hỗ trợ tiếng Việt, dùng offline) cùng các font phổ biến có trên máy; **tự khớp** độ rộng nhiều cột / chiều cao hàng (nhấp đúp vào đường viền như Excel)
- Sắp xếp A→Z / Z→A và **sắp xếp nhiều cấp**, **bộ lọc** cột có tìm kiếm, **cố định hàng/cột**, ẩn / hiện hàng và cột, **định dạng bảng**, **kiểu ô**, **sao chép định dạng**
- Tay nắm tự điền: chuỗi số, ngày, `Mục 1, Mục 2…` và sao chép công thức tương đối, `Ctrl+D` / `Ctrl+R`
- Sao chép / cắt / dán (kể cả với Excel), dán chỉ giá trị, dán chỉ định dạng
- Chèn / xoá hàng và cột, công thức tự điều chỉnh
- Hoàn tác / làm lại, tìm và thay thế (phân biệt hoa thường, khớp toàn ô, mọi sheet), tính tổng tự động, hộp tên ô, thống kê ở thanh trạng thái
- Thu phóng 50–200 %, kéo đổi cỡ hàng/cột (nhấp đúp để tự khớp), in
- Lưới ảo hoá — hơn 100.000 hàng vẫn mượt

**Công cụ kiểu Excel (mới ở 1.1)**
- **Định dạng có điều kiện** — tô sáng ô (lớn hơn / nhỏ hơn / trong khoảng / bằng / chứa văn bản), giá trị trùng hoặc duy nhất, lớn / nhỏ nhất N, trên / dưới trung bình, quy tắc bằng công thức, **thang màu** và **thanh dữ liệu**; có trình quản lý quy tắc (thứ tự ưu tiên, sửa, xoá)
- **Kiểm tra dữ liệu** — danh sách thả xuống (gõ tay hoặc lấy từ vùng ô), số nguyên, số thập phân, ngày, độ dài văn bản và công thức tuỳ chỉnh; thông báo khi nhập và cảnh báo Dừng / Cảnh báo / Thông tin
- **Biểu đồ** — cột, thanh ngang, đường, vùng, tròn, vành khuyên và phân tán; xem trước trực tiếp, xếp chồng / nhãn dữ liệu / chú giải; kéo, đổi cỡ, sửa, xoá ngay trên sheet; có hiệu ứng chuyển động
- **Liên kết** (`Ctrl+K`, web / e-mail / nhảy tới ô) và **ghi chú** có chấm đỏ ở góc ô
- **Dán đặc biệt** (giá trị, công thức, định dạng, cộng / trừ / nhân / chia, bỏ qua ô trống, hoán vị), **xoá giá trị trùng**, **tách văn bản thành cột**, hiện công thức (``Ctrl+` ``), chèn ngày / giờ (`Ctrl+;`)

**Tệp**
- Mở / lưu **`.xlsx`** (style, gộp ô, độ rộng, cố định ngăn, bộ lọc, công thức kèm giá trị đã tính), mở và nhập **CSV / TSV**, xuất sheet hiện tại ra CSV
- Tệp gần đây, kéo thả tệp vào cửa sổ, nhắc lưu khi có thay đổi, hỗ trợ "Mở bằng"

**Thiết kế và trải nghiệm**
- Material Design 3 với phông mặc định **Roboto** (đi kèm, dùng offline); hộp thoại **Giới thiệu** (nút thông tin trên thanh trên cùng) ghi nhận tác giả và AI
- Giao diện **Sáng / Tối / Theo hệ thống** + **màu chủ đề tuỳ chỉnh**
- Hiệu ứng: gợn sóng khi bấm, menu và hộp thoại chuyển động, thanh trượt dưới thẻ sheet, chuyển theme dạng lan tròn, khung chọn di chuyển mượt, viền chạy khi sao chép, nháy sáng khi dán / điền / sắp xếp — có thể tắt trong Cài đặt (và tôn trọng thiết lập giảm chuyển động của hệ điều hành)
- Giao diện **tiếng Anh và tiếng Việt**, đổi tức thì
- **Tuỳ chọn cửa sổ trong Cài đặt:** *ghi nhớ kích thước cửa sổ* (mở lại đúng như lần trước) **hoặc** *luôn mở phóng to tối đa*; `F11` bật/tắt toàn màn hình bất cứ lúc nào
- Bộ icon đầy đủ: icon ứng dụng, icon file cài đặt (setup) và icon gỡ cài đặt (uninstall)

## Landing page

Đã triển khai tại **https://minhtrong67.github.io/material-xlsx/**. Trang có đầy đủ metadata SEO và chia sẻ mạng xã hội: title / description / keywords, canonical + `hreflang` (`?lang=en|vi`), robots, Open Graph và Twitter card với ảnh chia sẻ 1200×630 (`og-image.png`), JSON-LD (WebSite, SoftwareApplication, FAQPage), `sitemap.xml`, `robots.txt` và `site.webmanifest`.

`index.html` ở thư mục gốc là trang giới thiệu độc lập, responsive, có hiệu ứng (tiếng Anh / tiếng Việt, sáng / tối, demo đổi màu trực tiếp, thư viện ảnh và nút Tải về). Sau `npm run build`, chép `src-tauri/target/release/bundle/nsis/Material Xlsx_1.1.0_x64-setup.exe` vào thư mục `download/` — nút tải đã trỏ sẵn tới tệp này. Mở bằng trình duyệt hoặc đưa lên GitHub Pages.

## Tải về

Bộ cài dựng sẵn được đăng ở trang **[Releases](https://github.com/minhtrong67/material-xlsx/releases)**.

| Nền tảng | Tệp |
|---|---|
| Windows 10 / 11 | `Material Xlsx_1.1.0_x64-setup.exe` (NSIS) hoặc `.msi` |
| macOS | `.dmg` (build trên máy Mac) |
| Linux | `.deb` / `.AppImage` (build trên Linux) |

## Cài đặt

1. Tải bộ cài phù hợp ở trang Releases (hoặc từ landing page `index.html` → `download/`).
2. Chạy bộ cài và làm theo hướng dẫn (Windows cần WebView2, đã có sẵn trên Windows 10/11).
3. Mở **Material Xlsx** từ Start menu rồi mở hoặc kéo thả tệp `.xlsx`.

Gỡ cài đặt bằng *Settings → Apps* hoặc lối tắt **Uninstall Material Xlsx**.

## Công nghệ

| Lớp | Công nghệ |
|---|---|
| Khung ứng dụng | [Tauri 2](https://tauri.app) (Rust) + plugin `dialog`, `opener`, `window-state` |
| Crate Rust | `serde`, `base64`, `arboard` (clipboard) |
| Giao diện | HTML, CSS và JavaScript thuần (ES modules, không cần bundler) |
| Hệ thiết kế | Material Design 3, màu sinh bằng `@material/material-color-utilities` |
| Công cụ bảng tính | Bộ phân tích Pratt + bộ tính toán tự viết, mô hình ô bất biến với hoàn tác bằng snapshot |
| Đọc/ghi XLSX | [ExcelJS](https://github.com/exceljs/exceljs) |
| Hiển thị | Đường lưới bằng Canvas + ô DOM ảo hoá trong bốn khung (hỗ trợ cố định ngăn) |

## Phát triển

Yêu cầu: [Node.js 18+](https://nodejs.org), [Rust](https://rustup.rs) và [các thành phần cần thiết của Tauri](https://tauri.app/start/prerequisites/) cho hệ điều hành của bạn.

Dự án là thành viên của Cargo workspace (`members = ["*/src-tauri"]`) nên tự được nhận khi thư mục nằm cạnh các app Tauri khác và dùng chung một bộ nhớ đệm build `./target`.

```bash
cd material-xlsx
npm install        # cài Tauri CLI
npm run dev        # chạy app ở chế độ phát triển
npm test           # kiểm thử công thức, định dạng số và mô hình dữ liệu
```

## Build

```bash
npm run build
```

Bộ cài nằm trong `target/release/bundle/` của workspace (ví dụ `nsis/Material Xlsx_1.1.0_x64-setup.exe`). Icon setup và uninstall được cấu hình trong `src-tauri/tauri.conf.json` (`installerIcon`, `uninstallerIcon`).

## Cấu trúc dự án

```
material-xlsx/
├─ index.html              trang landing page (một tệp, song ngữ, Material Design 3)
├─ og-image.png, robots.txt, sitemap.xml, site.webmanifest   tài nguyên SEO / chia sẻ mạng xã hội
├─ download/               đặt bộ cài Windows vào đây (landing page liên kết tới thư mục này)
├─ package.json            lệnh npm: dev, build, test
├─ screenshots/            ảnh cho README (image01 … image05)
├─ tests/                  kiểm thử (công thức, hàm, định dạng, mô hình, tính năng, biểu đồ, xlsx, i18n)
├─ src/                    giao diện
│  ├─ index.html           khung trang + bộ icon SVG
│  ├─ styles.css           style Material Design 3 + chuyển động
│  ├─ vendor/              ExcelJS, Material colour utilities (đóng gói sẵn, chạy offline)
│  └─ js/                  main, app, app-ext, grid, model, formula, functions-ext, features, charts, refs, numfmt, io, i18n, theme, widgets, tauri
└─ src-tauri/              backend Rust
   ├─ Cargo.toml  tauri.conf.json  build.rs
   ├─ capabilities/        quyền cửa sổ / hộp thoại
   ├─ icons/               icon app, installer.ico, uninstaller.ico, logo Store
   └─ src/                 main.rs, lib.rs (đọc/ghi tệp, clipboard, trạng thái cửa sổ)
```

## Phím tắt

| Phím tắt | Chức năng | Phím tắt | Chức năng |
|---|---|---|---|
| `Ctrl+N / O / S` | Mới / Mở / Lưu | `Ctrl+Shift+S` | Lưu thành |
| `Ctrl+Z / Y` | Hoàn tác / Làm lại | `Ctrl+C / X / V` | Sao chép / Cắt / Dán |
| `Ctrl+F / H` | Tìm / Thay thế | `Ctrl+D / R` | Điền xuống / sang phải |
| `F2` | Sửa ô | `Alt+Enter` | Xuống dòng trong ô |
| `Ctrl+K` | Liên kết | `Shift+F2` | Ghi chú |
| `Ctrl+Alt+V` | Dán đặc biệt | `Ctrl+Shift+L` | Bật/tắt bộ lọc |
| `Ctrl+;` / `Ctrl+Shift+;` | Chèn ngày / giờ | ``Ctrl+` `` | Hiện công thức |
| `F11` | Toàn màn hình | `Ctrl+,` | Cài đặt |

## Hạn chế đã biết

Hình ảnh, pivot table, sparkline và các hàm mảng động (`FILTER`, `SORT`, `UNIQUE`) chưa được hỗ trợ. Định dạng có điều kiện, kiểm tra dữ liệu, ghi chú và liên kết được ghi thành tính năng Excel thật; **biểu đồ và thanh dữ liệu được lưu trong một sheet ẩn** để Material Xlsx khôi phục lại, nhưng Excel sẽ không hiển thị chúng. Hàm mà Material Xlsx chưa hỗ trợ sẽ dùng giá trị đã lưu sẵn trong tệp.

## Giấy phép

Phát hành theo [MIT License](LICENSE) © 2026 **minhtrong67**.

<div align="center">

Thực hiện bởi **minhtrong67** · Trợ lý AI **Claude**

</div>
