<div align="center">

<img src="src/assets/logo.svg" alt="Fluent File logo" width="120" height="120">

# Fluent File

**A simple, fast file manager inspired by Windows 11 File Explorer, designed with Microsoft Fluent Design — built with Tauri, React and TypeScript.**

[English](README.md) · [Tiếng Việt](README.vi.md)

![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![Design](https://img.shields.io/badge/Design-Microsoft%20Fluent-0067C0)
![License](https://img.shields.io/badge/License-MIT-green)
![Author](https://img.shields.io/badge/Author-minhtrong67-0067C0)
![AI](https://img.shields.io/badge/AI-Claude-D97757)

</div>

---

## Introduction

Fluent File keeps the parts of File Explorer people use every day — quick access, drives, folder tabs, breadcrumbs, details and icon views, copy / cut / paste, rename, recycle bin, search and a details pane — and adds the things Explorer is missing: **dual pane, colour tags, a command palette, duplicate finder and a disk-usage map**. It starts quickly, uses little memory (Tauri + the system WebView) and follows Google's **Microsoft Fluent Design** with spring motion and shape-morphing controls.

## Screenshots

<!-- Add your screenshots to screenshots/ (image01.png - image04.png) and reference them here. -->

## Features

| Area | What you get |
| --- | --- |
| Navigation | Folder tabs (middle-click to close), breadcrumbs with sub-folder jump, folder tree, back / forward history, mouse side buttons, **dual pane (F9)** with drag & drop between panes |
| Views | Details with resizable columns, small / medium / large icons, grouping, type filters, **virtualised list** (only visible rows are rendered, so huge folders stay smooth), **layout remembered per folder**, compact / comfortable density |
| Command palette | **Ctrl+K** to jump to any folder, file or command |
| File operations | Copy / move / rename with conflict dialog, progress bar with cancel, Recycle Bin delete, **undo for rename, move, create and delete (restores from the Recycle Bin)**, **batch rename with live preview** (pattern `{name} {n} {date}`, find & replace, regex, letter case), drag & drop (also **from Explorer into the app**), friendly error messages |
| Organise | **Colour tags and stars** (rename them, filter by tag), pinned folders, frequent folders, recent files, **drag tabs to reorder** |
| Search | Filter as you type, Enter searches all sub-folders (cancellable), **advanced search**: regex, file type, size and date filters, **search history** and **saved searches** |
| Tools | Archives (ZIP built in, RAR / 7-Zip via WinRAR / 7-Zip), set wallpaper, custom context-menu commands |
| Preview | Details pane with text preview, **Space quick-look** for images (zoom / pan), video, audio, PDF, Markdown and text; real **image thumbnails** generated in Rust and cached |
| Live | The list **refreshes by itself** when files change (file watcher) |
| Background | Optional **system-tray** mode, global shortcut **Ctrl+Alt+E**, restore tabs, **"Open with Fluent File"** Explorer context menu (installed by the setup) |
| Appearance | Light / dark / system, 22 Windows accent colours + custom colour, **Windows system font by default** (other installed fonts optional), text size (small / medium / large), English & Tiếng Việt |
| Window material | Mica (default), Mica Alt, Acrylic, **Frosted glass**, **Liquid glass**, **Material You (Material Design 3)** or solid - Settings > Appearance (Mica needs Windows 11) |
| Customization | Per-folder look in a full designer (8 folder styles, solid / gradient fills, Material, Font Awesome, 3,000+ logos and emoji, badge, size, offset, 14 presets), folder sizes, start page, UI and list font sizes, icon style (solid / outline / thin), automatic Windows accent colour, context-menu editor, custom title bar |
| System tools | Toolbox button / command palette: Control Panel, Windows Settings, Task Manager, Device Manager, Disk Management, Services, Environment variables, Registry Editor, Clean temp files, Reload app; **Ctrl+Alt+T** opens a terminal in the selected folder |
| Random rename | Right-click > Random rename: letters, digits, GUID, date + random, words ... plus your own patterns ({l:8}, {guid}, {date}, {n:3}, {name} ...) in Settings > Context menu |
| Quick access | Drag items in the sidebar to reorder them (or right-click > Move up / Move down), unpin default folders, pin any folder; the Home page follows the same order |
| Drag out | Drag files from the list out of the window into other programs (Chrome upload areas, Explorer, chat apps); dropping them back on the window is ignored |
| Layout | Drag the edge of the sidebar to resize it (double-click to reset); thumbnails show the whole image instead of a cropped square |
| Custom folders | Right-click a folder > Customize folder: pick a colour and a glyph per folder |
| Columns | Right-click a column header (or double-click its edge) to auto fit it to its content |
| Window | Remember the window size **or** always open maximised |
| Fluent Design | Windows 11 look: neutral layered surfaces, 4 px / 8 px corners, accent indicator on selection, subtle hover fills, solid Fluent System Icons, short decelerating motion, Fluent progress bar and ring |
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

Get the latest installer from the [Releases](https://github.com/minhtrong67/my-tauri-apps/releases) page or from the landing page (`index.html`, button **Download**).

## Installation

1. Run `Fluent-File-Setup.exe` (installs for the current user — no administrator rights needed).
2. If Windows SmartScreen warns about an unsigned app, choose **More info → Run anyway**.
3. Requires **Windows 10 / 11 (64-bit)** with WebView2 (included in Windows 11).

## Tech stack

| Layer | Technology |
| --- | --- |
| Shell / backend | [Tauri 2](https://tauri.app) + Rust (`notify`, `image`, `regex`, `trash`, `sysinfo`) |
| UI | React 18 + TypeScript 5 |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 + Fluent colour tokens (CSS variables, OKLCH accent) |
| State | Zustand |
| Icons | [Fluent System Icons](https://github.com/microsoft/fluentui-system-icons) (`@fluentui/react-icons`, filled) + [Simple Icons](https://simpleicons.org) for platform logos |
| Preview | `marked` + `DOMPurify` (Markdown) |
| Fonts | System UI font (Segoe UI Variable on Windows 11) by default; fonts installed on the PC can be chosen in Settings |

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

The installer is created in `target/release/bundle/nsis/` (workspace root). Copy it to `download/Fluent-File-Setup.exe` so the landing page can offer it.

Portable build (single `.exe`, needs WebView2): `npm run build:portable` → `download/Fluent-File-Portable.exe`.

To regenerate the app / installer / uninstaller icons (amber `#FFC107`): `npm run icons` (needs Python + Pillow).

## Project structure

```
fluent-file/
├─ index.html                 # landing page (single file, SEO + social meta, EN/VI, themes)
├─ package.json  vite.config.ts  tsconfig.json
├─ src/                       # Vite app root
│  ├─ index.html  main.tsx  Root.tsx  index.css  fonts.css
│  ├─ assets/                 # logo.svg
│  ├─ components/             # FileList (virtualised), panes, sidebar, command bar, details…
│  │  ├─ ui/                  # Tooltip, Select, Modal, Toaster, ContextMenu, Buttons, Controls
│  │  └─ dialogs/             # Settings, Properties, Search, Lightbox, Palette, Rename, Customize folder
│  ├─ store/                  # zustand stores: settings, explorer (panes/tabs/ops), ui
│  ├─ hooks/                  # shortcuts, window/theme/watcher/drop/tray effects
│  └─ lib/                    # api (Tauri bridge + browser mock), i18n (EN/VI), theme, menus, view
├─ src-tauri/
│  ├─ src/main.rs             # commands: list, copy/move with progress, trash, archives…
│  ├─ src/extras.rs           # search, watcher, shell thumbnails & icons, folder sizes, tray, shortcut
│  ├─ icons/                  # app icons + installer/ (setup, uninstall, NSIS/WiX images, hooks.nsh)
│  └─ tauri.conf.json  capabilities/
├─ scripts/portable.mjs       # copies the release exe to download/ (portable build)
├─ tools/generate_icons.py    # Fluent folder icon generator
├─ screenshots/               # image01.png … image04.png
├─ download/                  # put the setup file here
└─ LICENSE
```

### Limitations

- Windows-first: the Recycle Bin shortcut, WinRAR / 7-Zip integration, mouse side-button hook, wallpaper and Explorer context menu are Windows features.
- Unsigned installer → SmartScreen warning on first run.

## Credits

Designed and developed by **minhtrong67** with the support of **Claude** (Anthropic).
Icons by [Fluent System Icons](https://github.com/microsoft/fluentui-system-icons) and [Simple Icons](https://simpleicons.org).

## License

Released under the [MIT License](LICENSE) — free and open source.
