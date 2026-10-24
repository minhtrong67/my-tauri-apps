<div align="center">

<img src="src/assets/logo.svg" alt="Material File logo" width="120" height="120">

# Material File

**A simple, fast file manager inspired by Windows 11 File Explorer, designed with Material Design 3 Expressive — built with Tauri, React and TypeScript.**

[English](README.md) · [Tiếng Việt](README.vi.md)

![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![Design](https://img.shields.io/badge/Design-Material%203%20Expressive-FFC107)
![License](https://img.shields.io/badge/License-MIT-green)
![Author](https://img.shields.io/badge/Author-minhtrong67-FFC107)
![AI](https://img.shields.io/badge/AI-Claude-D97757)

</div>

---

## Introduction

Material File keeps the parts of File Explorer people use every day — quick access, drives, folder tabs, breadcrumbs, details and icon views, copy / cut / paste, rename, recycle bin, search and a details pane — and adds the things Explorer is missing: **dual pane, colour tags, a command palette, duplicate finder and a disk-usage map**. It starts quickly, uses little memory (Tauri + the system WebView) and follows Google's **Material Design 3 Expressive** with spring motion and shape-morphing controls.

## Screenshots

<p align="center">
  <img src="screenshots/image01.png" alt="Material File - light theme" width="49%">
  <img src="screenshots/image02.png" alt="Material File - dark theme" width="49%">
</p>
<p align="center">
  <img src="screenshots/image03.png" alt="Material File - icon view and details pane" width="49%">
  <img src="screenshots/image04.png" alt="Material File - dual pane and settings" width="49%">
</p>

## Features

| Area | What you get |
| --- | --- |
| Navigation | Folder tabs (middle-click to close), breadcrumbs with sub-folder jump, folder tree, back / forward history, mouse side buttons, **dual pane (F9)** with drag & drop between panes |
| Views | Details with resizable columns, small / medium / large icons, grouping, type filters, **virtualised list** (only visible rows are rendered, so huge folders stay smooth), **layout remembered per folder**, compact / comfortable density |
| Command palette | **Ctrl+K** to jump to any folder, file or command |
| File operations | Copy / move / rename with conflict dialog, progress with cancel, Recycle Bin delete, undo, batch rename, drag & drop (also **from Explorer into the app**) |
| Organise | **Colour tags and stars**, pinned folders, frequent folders, recent files |
| Search | Filter as you type, Enter searches all sub-folders (cancellable), **advanced search**: regex, file type, size and date filters |
| Tools | **Duplicate finder** (size → partial hash → full hash), **disk-usage treemap**, archives (ZIP built in, RAR / 7-Zip via WinRAR / 7-Zip), set wallpaper |
| Preview | Details pane with text preview, **Space quick-look** for images (zoom / pan), video, audio, PDF, Markdown and text; real **image thumbnails** generated in Rust and cached |
| Live | The list **refreshes by itself** when files change (file watcher) |
| Background | Optional **system-tray** mode, global shortcut **Ctrl+Alt+E**, restore tabs, **"Open with Material File"** Explorer context menu (installed by the setup) |
| Appearance | Light / dark / system, 19 Material theme colours + custom colour, 5 bundled fonts (Roboto, Inter, Open Sans, Noto Sans, Nunito) + system fonts, text size (small / medium / large), English & Tiếng Việt |
| Window | Remember the window size **or** always open maximised |
| Updates | Gentle update notification from GitHub Releases (once a day, can be turned off) |
| UI details | Custom tooltips, themed dropdowns (never the native `<select>`), toasts (info / success / warning / error), dialogs whose buttons carry an icon, a label and an intent colour |

### Keyboard shortcuts

| Action | Shortcut | Action | Shortcut |
| --- | --- | --- | --- |
| Command palette | `Ctrl+K` | Settings | `Ctrl+,` |
| New tab / close tab | `Ctrl+T` / `Ctrl+W` | New window | `Ctrl+N` |
| Address bar | `Ctrl+L` | Search / advanced search | `Ctrl+F` / `Ctrl+Shift+F` |
| New folder | `Ctrl+Shift+N` | Rename | `F2` |
| Copy / cut / paste | `Ctrl+C` / `X` / `V` | Delete / delete permanently | `Del` / `Shift+Del` |
| Undo | `Ctrl+Z` | Copy path | `Ctrl+Shift+C` |
| Back / forward / up | `Alt+←` / `→` / `↑` | Properties | `Alt+Enter` |
| Quick look | `Space` | Details pane | `Alt+P` |
| Dual pane | `F9` | Full screen | `F11` |
| Details / icon view | `Ctrl+1` / `Ctrl+2` | Cycle view size | `Ctrl+Wheel` |

## Download

Get the latest installer from the [Releases](https://github.com/minhtrong67/material-file/releases) page or from the landing page (`index.html`, button **Download**).

## Installation

1. Run `Material-File-Setup.exe` (installs for the current user — no administrator rights needed).
2. If Windows SmartScreen warns about an unsigned app, choose **More info → Run anyway**.
3. Requires **Windows 10 / 11 (64-bit)** with WebView2 (included in Windows 11).

## Tech stack

| Layer | Technology |
| --- | --- |
| Shell / backend | [Tauri 2](https://tauri.app) + Rust (`notify`, `image`, `regex`, `trash`, `sysinfo`) |
| UI | React 18 + TypeScript 5 |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 + Material 3 colour roles (CSS variables, OKLCH) |
| State | Zustand |
| Icons | [Lucide](https://lucide.dev) (`lucide-react`) |
| Preview | `marked` + `DOMPurify` (Markdown) |
| Fonts | System UI font by default; Roboto, Inter, Open Sans, Noto Sans, Nunito bundled via Fontsource |

## Development

Prerequisites: [Node.js 20+](https://nodejs.org), [Rust](https://rustup.rs) and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for Windows (WebView2 + MSVC build tools).

This folder is a member of a Cargo workspace (`*/src-tauri`) that shares one build cache (`../target`).

```bash
npm install     # install dependencies
npm run dev     # run the desktop app with hot reload (tauri dev)
```

Optional: `npm run web:dev` serves only the UI in a normal browser with an in-memory demo file system (handy for UI work; no Rust needed). `npm run web:build` type-checks and builds the frontend.

## Build

```bash
npm run build   # tsc + vite build + tauri build → NSIS installer
```

The installer is created in `target/release/bundle/nsis/` (workspace root). Copy it to `download/Material-File-Setup.exe` so the landing page can offer it.

To regenerate the app / installer / uninstaller icons (amber `#FFC107`): `npm run icons` (needs Python + Pillow).

## Project structure

```
material-file/
├─ index.html                 # landing page (single file, SEO + social meta, EN/VI, themes)
├─ package.json  vite.config.ts  tsconfig.json
├─ src/                       # Vite app root
│  ├─ index.html  main.tsx  Root.tsx  index.css  fonts.css
│  ├─ assets/                 # logo.svg, bundled fonts
│  ├─ components/             # FileList (virtualised), panes, sidebar, command bar, details…
│  │  ├─ ui/                  # Tooltip, Select, Modal, Toaster, ContextMenu, Buttons, Controls
│  │  └─ dialogs/             # Settings, Properties, Duplicates, Usage map, Search, Lightbox, Palette, Update
│  ├─ store/                  # zustand stores: settings, explorer (panes/tabs/ops), ui
│  ├─ hooks/                  # shortcuts, window/theme/watcher/drop/tray effects
│  └─ lib/                    # api (Tauri bridge + browser mock), i18n (EN/VI), theme, menus, view, treemap
├─ src-tauri/
│  ├─ src/main.rs             # commands: list, copy/move with progress, trash, archives…
│  ├─ src/extras.rs           # search, watcher, thumbnails, duplicates, disk usage, tray, shortcut
│  ├─ icons/                  # app icons + installer/ (setup, uninstall, NSIS/WiX images, hooks.nsh)
│  └─ tauri.conf.json  capabilities/
├─ tools/generate_icons.py    # amber Material icon generator
├─ screenshots/               # image01.png … image04.png
├─ download/                  # put the setup file here
└─ LICENSE
```

### Limitations

- Windows-first: the Recycle Bin shortcut, WinRAR / 7-Zip integration, mouse side-button hook, wallpaper and Explorer context menu are Windows features.
- The update check only *notifies* about a new GitHub release; it does not install it automatically.
- Unsigned installer → SmartScreen warning on first run.

## Credits

Designed and developed by **minhtrong67** with the support of **Claude** (Anthropic).
Icons by [Lucide](https://lucide.dev), fonts by [Fontsource](https://fontsource.org).

## License

Released under the [MIT License](LICENSE) — free and open source.
