<div align="center">

<img src="src-tauri/icons/icon.png" width="120" alt="Material Note logo">

# Material Note

**A fast, expressive notepad in Material 3 Expressive style.**
Tabs · Find & replace · Command palette · Themes · English & Vietnamese

[![License: MIT](https://img.shields.io/badge/license-MIT-6b4eff.svg)](LICENSE)
![Tauri 2](https://img.shields.io/badge/Tauri-2-24c8db)
![React](https://img.shields.io/badge/React-18-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)

[Download](download/) · [Landing page](index.html) · [Tiếng Việt](README.vi.md)

</div>

---

## Introduction

Material Note is a lightweight desktop notepad built with **Tauri**, **React** and **TypeScript**. It starts instantly, stays out of your way, and looks like a modern Material 3 Expressive app: pill buttons that morph when pressed, spring animations, a circular reveal when you switch theme, and a colour palette generated from any colour you like.

It is part of the open-source collection [my-tauri-apps](https://github.com/minhtrong67/my-tauri-apps).

## Screenshots

| | |
|---|---|
| ![Editor](screenshots/image01.png) | ![Find and replace](screenshots/image02.png) |
| ![Settings](screenshots/image03.png) | ![Command palette](screenshots/image04.png) |

## Features

- **Tabs that remember** – drag to reorder, middle-click to close, horizontal or vertical layout; open files, cursor, scroll position and even unsaved text are restored on the next launch.
- **Find & replace** – live highlights, match case, whole word, regular expressions, match counter, replace all.
- **Command palette** – `Ctrl+Shift+P` runs any action by name.
- **Encodings & safe saving** – UTF-8 (with/without BOM), UTF-16, Windows-125x, Shift-JIS, GBK and more; line-ending toggle (LF/CRLF); atomic saves; warning when a file changes on disk.
- **Editing helpers** – go to line, duplicate/delete line, upper/lower case, insert time/date, zoom with `Ctrl+Wheel`, word wrap, focus mode, full screen, print.
- **Auto save** for files that already have a name, and automatic session recovery.
- **Settings** – light / dark / system, 10 Material theme colours plus a custom colour picker, five fonts (System UI, Roboto, Inter, Lora, JetBrains Mono), Small / Medium / Large text, English and Vietnamese, and the window start behaviour (remember size or always maximised).
- **Polished UX** – custom tooltips, custom dropdowns, 4-variant toasts (info, success, warning, error), icon + label + colour on every dialog action, back-to-top buttons, drag & drop files, single instance.
- **Open files from Explorer** – `.txt`, `.md`, `.log`, `.json`, `.csv` and more.

### Keyboard shortcuts

| Action | Shortcut | Action | Shortcut |
|---|---|---|---|
| New tab | `Ctrl+N` | Find / Replace | `Ctrl+F` / `Ctrl+H` |
| Open / Save | `Ctrl+O` / `Ctrl+S` | Go to line | `Ctrl+G` |
| Save as | `Ctrl+Shift+S` | Command palette | `Ctrl+Shift+P` |
| Close tab | `Ctrl+W` | Settings | `Ctrl+,` |
| Next / previous tab | `Ctrl+Tab` / `Ctrl+Shift+Tab` | Focus mode | `Ctrl+Shift+Enter` |

## Installation

1. Download the latest installer from the [`download`](download/) folder (`Material-Note-Setup.exe`).
2. Run it. It installs for the current user, no administrator rights needed.
3. Start **Material Note** from the Start menu, or right-click a text file and choose *Open with*.

> Requires Windows 10 / 11 (64-bit). The app uses the WebView2 runtime that ships with Windows 11 and is installed automatically on Windows 10.

## Tech stack

| Layer | Technology |
|---|---|
| Desktop shell | [Tauri 2](https://tauri.app) (Rust) |
| UI | React 18 · TypeScript · Vite · Tailwind CSS 4 |
| State | Zustand |
| Design | Material 3 Expressive, colours from `@material/material-color-utilities` |
| Icons | [Lucide](https://lucide.dev) |
| Fonts | Roboto, Inter, Lora, JetBrains Mono (bundled, offline) |

## Development

Prerequisites: [Node.js](https://nodejs.org) 20+, [Rust](https://rustup.rs) and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS.

This project lives in a Cargo workspace folder (see the root `Cargo.toml`: every `*/src-tauri` is a member and all projects share one `target` cache).

```bash
npm install      # install dependencies
npm run dev      # start the desktop app with hot reload
```

Useful extras:

```bash
npm run web:dev    # the UI alone in a browser (http://127.0.0.1:1420)
npm run icons      # regenerate every app / installer icon (needs Python + Pillow)
npm run palettes   # regenerate the colour palettes embedded in index.html
```

## Build

```bash
npm run build
```

The installers are written to `target/release/bundle/` (NSIS `.exe` and WiX `.msi`). Rename the `.exe` to `Material-Note-Setup.exe` and copy it into [`download/`](download/) so the landing page's download button works.

## Project structure

```
material-note/
├─ index.html              Landing page (single file: themes, EN/VI, animations)
├─ app/                    Frontend (Vite root)
│  ├─ index.html
│  └─ src/
│     ├─ components/       AppBar, TabStrip, Editor, FindBar, StatusBar, dialogs …
│     │  └─ ui/            Button, Select, Popover/Menu, Dialog, Toast, Tooltip …
│     ├─ lib/              actions, commands, find, session, theme, i18n, tauri …
│     ├─ store/            Zustand stores: settings, documents, UI
│     └─ index.css         Tailwind + Material 3 Expressive tokens & animations
├─ src-tauri/              Rust side (file I/O, encodings, single instance)
│  ├─ src/main.rs · files.rs
│  └─ icons/               App icons + installer / uninstaller artwork
├─ tools/                  Icon and palette generators
├─ screenshots/            image01 … image04
├─ download/               Put the installer here
└─ package.json
```

## License

Material Note is open source software released under the [MIT License](LICENSE).

Created by **minhtrong67** with the support of **Claude**.
Project home: <https://github.com/minhtrong67/my-tauri-apps>
