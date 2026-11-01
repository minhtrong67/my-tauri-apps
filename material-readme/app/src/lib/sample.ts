import type { Lang } from './i18n';

const EN = `---
title: Welcome
---
# Welcome to Material Readme

A **Material 3 Expressive** editor and viewer for Markdown. Write on the left, read the live preview on the right, and switch layouts with \`Ctrl+1\`, \`Ctrl+2\` and \`Ctrl+3\`.

## Highlights

- [x] Live preview with synchronized scrolling
- [x] Formatting toolbar, command palette and keyboard shortcuts
- [x] Paste an image and it is saved next to your file
- [ ] Your next great README

> [!TIP]
> Press \`Ctrl+,\` to open **Settings** and pick any Material colour, font and text size.

## Code

\`\`\`ts
// Syntax highlighting in both the editor and the preview
const greet = (name: string) => \`Hello, \${name}!\`;
console.log(greet('Material'));
\`\`\`

## Table

| Shortcut | Action |
| --- | --- |
| Ctrl+S | Save |
| Ctrl+F | Find |
| Ctrl+Shift+P | Command palette |

### Links

Visit [Tauri](https://tauri.app) or jump back to [Highlights](#highlights).
`;
const VI = `---
title: Chào mừng
---
# Chào mừng đến với Material Readme

Trình soạn thảo và xem Markdown theo phong cách **Material 3 Expressive**. Viết ở bên trái, xem bản xem trước trực tiếp ở bên phải, đổi bố cục bằng \`Ctrl+1\`, \`Ctrl+2\` và \`Ctrl+3\`.

## Điểm nổi bật

- [x] Xem trước trực tiếp, cuộn đồng bộ hai khung
- [x] Thanh định dạng, bảng lệnh và phím tắt
- [x] Dán ảnh vào là ảnh được lưu cạnh tệp của bạn
- [ ] README tuyệt vời tiếp theo của bạn

> [!TIP]
> Nhấn \`Ctrl+,\` để mở **Cài đặt** và chọn màu Material, font chữ và cỡ chữ.

## Mã nguồn

\`\`\`ts
// Tô màu cú pháp cả trong trình soạn thảo lẫn bản xem trước
const greet = (name: string) => \`Xin chào, \${name}!\`;
console.log(greet('Material'));
\`\`\`

## Bảng

| Phím tắt | Chức năng |
| --- | --- |
| Ctrl+S | Lưu |
| Ctrl+F | Tìm kiếm |
| Ctrl+Shift+P | Bảng lệnh |

### Liên kết

Truy cập [Tauri](https://tauri.app) hoặc quay lại [Điểm nổi bật](#điểm-nổi-bật).
`;
export const sampleText = (lang: Lang) => (lang === 'vi' ? VI : EN);
