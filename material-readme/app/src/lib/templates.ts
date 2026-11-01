import type { Lang } from './i18n';

export type TemplateId = 'blank' | 'readme' | 'api' | 'changelog' | 'notes';

const T: Record<TemplateId, Record<Lang, string>> = {
  blank: { en: '', vi: '' },
  readme: {
    en: `# Project name

> One sentence that explains what this project does and who it is for.

## Features

- First feature
- Second feature
- Third feature

## Installation

\`\`\`bash
npm install
npm run dev
\`\`\`

## Usage

Describe the most common way to use the project.

## Contributing

Pull requests are welcome. Please open an issue first to discuss what you would like to change.

## License

[MIT](LICENSE)
`,
    vi: `# Tên dự án

> Một câu giải thích dự án này làm gì và dành cho ai.

## Tính năng

- Tính năng thứ nhất
- Tính năng thứ hai
- Tính năng thứ ba

## Cài đặt

\`\`\`bash
npm install
npm run dev
\`\`\`

## Cách dùng

Mô tả cách dùng phổ biến nhất của dự án.

## Đóng góp

Pull request luôn được chào đón. Vui lòng mở issue trước để trao đổi về thay đổi bạn muốn thực hiện.

## Giấy phép

[MIT](LICENSE)
`,
  },
  api: {
    en: `# API reference

Base URL: \`https://api.example.com/v1\`

## Authentication

Send your token in the \`Authorization\` header.

\`\`\`http
Authorization: Bearer <token>
\`\`\`

## Endpoints

### GET /items

| Parameter | Type | Description |
| --- | --- | --- |
| \`limit\` | number | Items per page (default 20) |
| \`page\` | number | Page number |

\`\`\`json
{ "items": [{ "id": 1, "name": "Example" }], "total": 1 }
\`\`\`

> [!NOTE]
> Responses are paginated.
`,
    vi: `# Tài liệu API

Địa chỉ gốc: \`https://api.example.com/v1\`

## Xác thực

Gửi token trong header \`Authorization\`.

\`\`\`http
Authorization: Bearer <token>
\`\`\`

## Endpoint

### GET /items

| Tham số | Kiểu | Mô tả |
| --- | --- | --- |
| \`limit\` | number | Số mục mỗi trang (mặc định 20) |
| \`page\` | number | Số trang |

\`\`\`json
{ "items": [{ "id": 1, "name": "Ví dụ" }], "total": 1 }
\`\`\`

> [!NOTE]
> Kết quả được phân trang.
`,
  },
  changelog: {
    en: `# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Added
- 

## [1.0.0] - ${new Date().toISOString().slice(0, 10)}

### Added
- First public release.
`,
    vi: `# Nhật ký thay đổi

Mọi thay đổi đáng chú ý của dự án được ghi lại tại đây.

## [Chưa phát hành]

### Thêm mới
- 

## [1.0.0] - ${new Date().toISOString().slice(0, 10)}

### Thêm mới
- Bản phát hành công khai đầu tiên.
`,
  },
  notes: {
    en: `# Meeting notes

**Date:** ${new Date().toISOString().slice(0, 10)}
**Attendees:** 

## Agenda

1. 
2. 

## Decisions

- 

## Action items

- [ ] Owner: task, due date
`,
    vi: `# Biên bản họp

**Ngày:** ${new Date().toISOString().slice(0, 10)}
**Người tham dự:** 

## Chương trình

1. 
2. 

## Quyết định

- 

## Việc cần làm

- [ ] Người phụ trách: công việc, hạn chót
`,
  },
};
export const templateText = (id: TemplateId, lang: Lang) => T[id][lang];

export const BADGE_PRESETS = [
  { label: 'license', message: 'MIT', color: '2E7D32' },
  { label: 'platform', message: 'Windows', color: '0078D4' },
  { label: 'built with', message: 'Tauri 2', color: '24C8DB' },
  { label: 'version', message: '1.0.0', color: '6750A4' },
  { label: 'PRs', message: 'welcome', color: 'E91E63' },
];
const enc = (s: string) => encodeURIComponent(s.replace(/-/g, '--').replace(/_/g, '__').replace(/ /g, '_'));
export const badgeUrl = (label: string, message: string, color: string) => `https://img.shields.io/badge/${enc(label)}-${enc(message)}-${color.replace('#', '')}`;
export const badgeMd = (label: string, message: string, color: string) => `![${label}: ${message}](${badgeUrl(label, message, color)})`;
