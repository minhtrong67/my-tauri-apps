<div align="center">

<img src="src-tauri/icons/128x128@2x.png" width="112" alt="Material Calculator logo" />

# Material Calculator

**A fast, full-featured desktop calculator in Material 3 Expressive.**
Standard · Scientific · Programmer · Unit converter · Date calculator

![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

[Landing page](index.html) · [Download](download/) · [All projects](https://github.com/minhtrong67/my-tauri-apps)

</div>

## Introduction

Material Calculator is a tiny, offline desktop calculator with a springy **Material 3 Expressive** interface: shape-morphing keys, tonal palettes generated from any colour, light/dark/system themes and full English + Tiếng Việt localisation. The math engine is a hand-written parser (no `eval`).

## Screenshots

| | |
|---|---|
| ![Standard](screenshots/image01.png) | ![Scientific](screenshots/image02.png) |
| ![Settings](screenshots/image03.png) | ![Converter](screenshots/image04.png) |

## Features

- **Five modes** – Standard, Scientific (deg/rad/grad), Programmer (HEX/DEC/OCT/BIN, bit toggles), Converter, Date calculator
- **History & memory** panel with one-click reuse and confirm-before-clear dialogs
- **Appearance** – light / dark / system, Material theme colours + custom colour, 5 font options (System, Roboto, Inter, Nunito, Open Sans) and small / medium / large text
- **Language** – English, Tiếng Việt or follow the system
- **Window** – remember size when resized, or always open maximised; optional always-on-top
- **Polished UX** – custom tooltips, themed toasts (info / success / warning / error), custom scrollable dropdowns, scroll-to-top, keyboard shortcuts, reduced-motion support
- **Material 3 Expressive icon set** – app, setup and uninstall icons in all desktop sizes

## Installation

Download the installer from [`download/`](download/) (or GitHub Releases), run it and launch **Material Calculator**. Requires Windows 10/11 (WebView2 runtime).

## Tech stack

Tauri 2 (Rust) · Vite 6 · React 18 · TypeScript 5 · Tailwind CSS 4 · inline SVG icon set · `@material/material-color-utilities` · Fontsource fonts.

## Development

This project lives in a shared Cargo workspace (root `Cargo.toml`, `members = ["*/src-tauri"]`).

```bash
npm install     # install dependencies
npm run dev     # run the desktop app with hot reload
npm run build   # produce the installer (bundle output in the workspace target folder)
```

Extras: `npm run dev:web` (browser only) and `npm run build:web` (type-check + web bundle).

### Regenerating icons

```bash
python tools/make_icons.py                                          # source artwork + installer bitmaps (needs Pillow)
npx tauri icon src-tauri/icons-src/app-icon.png -o src-tauri/icons  # all platform sizes
```

## Project structure

```
material-calculator/
├── index.html            # landing page (single file)
├── app/                  # Vite root
│   ├── index.html
│   └── src/
│       ├── main.js       # app shell
│       ├── fonts.ts      # bundled fonts
│       ├── styles/       # tokens, base, shell, calc, views, expressive
│       └── js/           # engine, calc, programmer, units, i18n, theme, store,
│                         # appearance.ts, enhance.ts, views/settings.tsx
├── public/               # favicon + logo
├── download/             # put the setup file here
├── screenshots/          # image01 – image04
├── src-tauri/            # Rust, tauri.conf.json, icons, installer art
└── tools/make_icons.py
```

## License

Released under the [MIT License](LICENSE) — free and open source.
Source: <https://github.com/minhtrong67/my-tauri-apps>

Made by **minhtrong67** with the help of **Claude**.
