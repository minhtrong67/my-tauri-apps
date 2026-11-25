<div align="center">

<img src="src-tauri/icons/icon.png" width="96" alt="Biểu tượng Site Launcher" />

# Site Launcher

**Mở profile trình duyệt chỉ với một cú click, kèm các trang web bạn chọn.**

![Author](https://img.shields.io/badge/author-minhtrong67-0078d4?style=for-the-badge)
![AI](https://img.shields.io/badge/built%20with%20AI-Claude-8764b8?style=for-the-badge)

![Tauri](https://img.shields.io/badge/Tauri-2-24c8db?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=black)
![Platform](https://img.shields.io/badge/Windows-10%20%7C%2011-0078d4?logo=windows&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

[English](README.md) · Tiếng Việt

</div>

Tạo bởi **minhtrong67** với sự hỗ trợ của trợ lý AI **Claude**.

## Giới thiệu

Nếu bạn dùng nhiều profile trình duyệt (công việc, cá nhân, giải trí...), việc mở từng profile rồi tải lại cùng các trang web rất lặp đi lặp lại. **Site Launcher** đọc danh sách profile của các trình duyệt đã cài, rồi mở một hoặc nhiều profile cùng lúc, với các trang web bạn chọn đã nằm sẵn trong tab. App cũng đóng được profile và cho biết profile nào đang chạy.

Hỗ trợ **Google Chrome, Microsoft Edge, Brave, Vivaldi, Cốc Cốc và Mozilla Firefox**. Đây là app native nhỏ gọn: backend Rust, giao diện React.

## Ảnh chụp màn hình

<!-- Đặt ảnh vào thư mục screenshots (image01.png, image02.png, ...) rồi hiển thị ở đây:
<img src="screenshots/image01.png" alt="Cửa sổ chính" />
-->

## Tính năng

- **Microsoft Fluent Design.** Giao diện kiểu Windows 11: nền Mica, Mica Alt hoặc Acrylic (trong Cài đặt), thẻ nhiều lớp, góc bo 4 px và 8 px, màu nhấn xanh Windows, giao diện sáng, tối hoặc theo hệ thống.
- **Nhiều trình duyệt.** Chọn trình duyệt ở thanh tab; chỉ hiện các trình duyệt đã cài. Mỗi trình duyệt có danh sách profile riêng.
- **Trang web sẽ mở, tối đa 5.** Nhập địa chỉ (chỉ cần `github.com`, `https://` được tự thêm) hoặc tick chọn trong dropdown. Mỗi trang mở thành một tab. Để trống nếu chỉ muốn mở profile.
- **Dropdown trang đã lưu.** Mọi địa chỉ bạn nhập hoặc đã mở đều được ghi nhớ. Lần sau chọn một hoặc nhiều trang trong danh sách (tối đa 5), dùng được bàn phím, xóa từng trang hoặc xóa hết trong Cài đặt.
- **Trang riêng cho từng profile.** Mỗi profile dùng danh sách chung hoặc danh sách riêng. Nút trên mỗi hàng cho biết profile sẽ mở bao nhiêu trang.
- **Mở nhanh.** Bấm vào profile để mở. Chọn nhiều profile rồi mở cùng lúc, hoặc mở tất cả.
- **Đóng profile.** Đóng một profile, các profile đã chọn, hoặc mọi profile đang chạy. Trình duyệt nhận yêu cầu đóng cửa sổ bình thường nên có thể khôi phục tab lần sau.
- **Trạng thái trực tiếp.** Chấm xanh và nhãn "Đang mở" cho biết profile nào đang chạy.
- **Tìm kiếm và phím tắt.** Lọc theo tên hoặc email. `Ctrl+F` vào ô tìm kiếm, `Ctrl+A` chọn tất cả, `Esc` xóa tìm kiếm, bỏ chọn hoặc đóng bảng.
- **Tiếng Việt và English**, đổi được bất cứ lúc nào.
- **Cửa sổ khi mở app.** *Ghi nhớ kích thước* lần kéo gần nhất, hoặc *luôn phóng to tối đa*.
- **Bộ cài đặt có thương hiệu.** Icon app, setup, uninstall và ảnh cho trình cài đặt, trình cài có tiếng Việt và tiếng Anh.

## Cài đặt

### Yêu cầu

- Windows 10 hoặc 11 (đóng profile và hiệu ứng nền cần Windows; Mica và Mica Alt cần Windows 11, Acrylic chạy được trên Windows 10)
- Ít nhất một trình duyệt được hỗ trợ
- Microsoft Edge WebView2 Runtime (đã có sẵn trong Windows 11)

### Cài từ file setup

1. Build bộ cài (xem [Build](#build)) hoặc tải từ trang releases.
2. Chạy `Site Launcher_0.1.0_x64-setup.exe`. Cài cho người dùng hiện tại, không cần quyền quản trị.
3. Mở **Site Launcher** từ menu Start.

> Trang cần đăng nhập sẽ mở ở trạng thái chưa đăng nhập, trừ khi profile đó đã đăng nhập sẵn.

## Công nghệ

| Lớp | Công nghệ |
| --- | --- |
| Khung app | [Tauri 2](https://tauri.app) (Rust) |
| Giao diện | React 18, Vite 6 |
| Thiết kế | Microsoft Fluent Design, hiệu ứng nền của Windows |
| Styling | CSS thuần, giao diện sáng và tối |
| Backend | Rust, `serde_json`, gọi trực tiếp Win32 (`user32`, `kernel32`) |
| Bộ cài | NSIS, cài theo người dùng |
| Trình quản lý gói | pnpm |

## Phát triển

Yêu cầu: [Node.js](https://nodejs.org) 18+, [pnpm](https://pnpm.io), [Rust](https://rustup.rs) (stable) và [điều kiện cần của Tauri trên Windows](https://tauri.app/start/prerequisites/) (Microsoft C++ Build Tools).

```bash
pnpm install    # cài thư viện
pnpm dev        # chạy app ở chế độ phát triển
```

Dự án nằm trong một Cargo workspace (`members = ["*/src-tauri"]`) nên Rust dùng chung thư mục `target` của workspace.

## Build

```bash
pnpm build
```

Kết quả, tính từ thư mục gốc của workspace:

- `target/release/site-launcher.exe` — bản chạy trực tiếp
- `target/release/bundle/nsis/` — bộ cài

### Cách hoạt động

- **Chrome, Edge, Brave, Vivaldi, Cốc Cốc:** profile lấy từ file `Local State` của trình duyệt. Mở bằng `<trình duyệt> --profile-directory=<dir> --new-window <các trang...>`.
- **Firefox:** profile lấy từ `profiles.ini`. Mở bằng `firefox -no-remote -P <tên> -new-window <trang đầu> -new-tab <các trang còn lại...>`. Firefox không hiện tên profile trên cửa sổ nên "Đang mở" chỉ nhận diện cửa sổ do Site Launcher mở. Profile đang mở sẵn trong Firefox không thể mở lần thứ hai.
- **Đóng** theo dõi các cửa sổ app đã mở và, với trình duyệt Chromium, cả cửa sổ có tiêu đề chứa tên profile. Chỉ cửa sổ thuộc đúng file chạy của trình duyệt đó bị tác động.
- Cài đặt và các trang đã lưu được lưu cục bộ trong app.

Nếu trình duyệt cài ở vị trí khác thường, chỉnh hàm `exe_path()` trong `src-tauri/src/main.rs`.

## Cấu trúc dự án

Xem sơ đồ trong [README.md](README.md#project-structure).

## Giấy phép

MIT, xem [LICENSE](LICENSE).
