const EN = `---
title: Welcome
---
# Welcome to Material Readme

A **Material Design 3** editor and viewer for Markdown. Write on the left, read the live preview on the right, and switch layouts with \`Ctrl+1\`, \`Ctrl+2\` and \`Ctrl+3\`.

## Highlights

- [x] Live preview with synchronized scrolling
- [x] Formatting toolbar and keyboard shortcuts
- [x] Find and replace with regular expressions
- [ ] Your next great README

> [!TIP]
> Press \`Ctrl+,\` to open **Settings** and pick any Material colour as your theme.

## Code

\`\`\`js
// Syntax highlighting in both the editor and the preview
const greet = (name) => \`Hello, \${name}!\`;
console.log(greet('Material'));
\`\`\`

## Table

| Shortcut | Action |
| --- | --- |
| Ctrl+S | Save |
| Ctrl+F | Find |
| Ctrl+H | Find and replace |

### Links

Visit [Tauri](https://tauri.app) or jump back to [Highlights](#highlights).
`;
const VI = `---
title: Chào mừng
---
# Chào mừng đến với Material Readme

Trình soạn thảo và xem Markdown theo phong cách **Material Design 3**. Viết ở bên trái, xem bản xem trước trực tiếp ở bên phải, đổi bố cục bằng \`Ctrl+1\`, \`Ctrl+2\` và \`Ctrl+3\`.

## Điểm nổi bật

- [x] Xem trước trực tiếp, cuộn đồng bộ hai khung
- [x] Thanh định dạng và phím tắt
- [x] Tìm và thay thế, hỗ trợ biểu thức chính quy
- [ ] README tuyệt vời tiếp theo của bạn

> [!TIP]
> Nhấn \`Ctrl+,\` để mở **Cài đặt** và chọn bất kỳ màu Material nào làm màu chủ đề.

## Mã nguồn

\`\`\`js
// Tô màu cú pháp cả trong trình soạn thảo lẫn bản xem trước
const greet = (name) => \`Xin chào, \${name}!\`;
console.log(greet('Material'));
\`\`\`

## Bảng

| Phím tắt | Chức năng |
| --- | --- |
| Ctrl+S | Lưu |
| Ctrl+F | Tìm kiếm |
| Ctrl+H | Tìm và thay thế |

### Liên kết

Truy cập [Tauri](https://tauri.app) hoặc quay lại [Điểm nổi bật](#điểm-nổi-bật).
`;
export const sampleText = (lang) => (lang === 'vi' ? VI : EN);
