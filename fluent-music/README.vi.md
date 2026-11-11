<div align="center">

<img src="src-tauri/icons/icon.png" width="112" alt="Biểu tượng Fluent Music" />

# Fluent Music

**Trình phát nhạc local cho Windows với giao diện Microsoft Fluent 2 (Windows 11).**

[English](README.md)

</div>

Fluent Music phát nhạc lưu trên máy tính của bạn. Ứng dụng xây dựng bằng [Tauri 2](https://tauri.app), React và Rust nên nhỏ, nhanh và nhẹ bộ nhớ.

## Điểm nổi bật

- **Thiết kế Fluent 2** – Segoe UI Variable, thanh điều hướng NavigationView, title bar kiểu Windows, flyout, hộp thoại, công tắc và bộ icon Fluent System Icons.
- **Chất liệu cửa sổ** – chọn **Mica**, **Acrylic** hoặc **Mica Alt** trong *Cài đặt → Giao diện* (mặc định: Mica). Tự chuyển sang màu đặc nếu hệ thống không hỗ trợ.
- Chủ đề **sáng / tối / theo hệ thống** và **màu nhấn của Windows** (hoặc màu bạn chọn, hoặc lấy từ ảnh bìa).
- Thư viện MP3, FLAC, WAV, OGG, Opus, M4A, AAC; album, nghệ sĩ, playlist, playlist thông minh, yêu thích, lịch sử và thống kê.
- Phát liền mạch, crossfade, ReplayGain, equalizer 10 băng, hẹn giờ tắt, chọn thiết bị âm thanh.
- Lời bài hát đồng bộ (`.lrc`, nhúng trong tag hoặc từ LRCLIB), visualizer, mini player, khay hệ thống, phím media, phím tắt toàn cục.
- Tìm và phát nhạc YouTube Music, scrobble ListenBrainz, tìm bài trùng, sao lưu / khôi phục.
- Giao diện tiếng Anh và tiếng Việt.

## Yêu cầu

Windows 10 hoặc 11 (64-bit) có Microsoft Edge WebView2. **Mica và Mica Alt cần Windows 11** (Mica Alt: 22H2 trở lên); Acrylic chạy trên Windows 10 1809+ nhưng có thể giật khi kéo hoặc đổi cỡ cửa sổ trên một số máy.

## Build từ mã nguồn

```bash
pnpm install
pnpm dev          # chạy khi phát triển
pnpm build        # bộ cài: target/release/bundle/nsis/Fluent Music_<version>_x64-setup.exe
pnpm portable     # tùy chọn: zip portable trong download/
```

Cần Node 20+, [pnpm](https://pnpm.io) 10, Rust (stable) và [điều kiện của Tauri](https://tauri.app/start/prerequisites/). Cargo workspace có thể dùng chung một thư mục `target` cạnh thư mục dự án.

Lệnh khác: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm check:i18n`, `pnpm icons` (tạo lại toàn bộ icon từ `public/icon.svg`).

## Chất liệu cửa sổ hoạt động thế nào

`set_backdrop(kind, dark)` (Rust, `src-tauri/src/window.rs`) áp dụng Mica / Acrylic / Mica Alt qua backdrop DWM của cửa sổ. Lựa chọn được lưu trong `prefs.json` và áp dụng trước khi cửa sổ hiện lần đầu; front end đặt `data-backdrop` trên `<html>` để trang vẽ các lớp trong suốt (hoặc màu đặc khi hệ điều hành từ chối hiệu ứng).

## Giấy phép

MIT – xem [LICENSE](LICENSE).
