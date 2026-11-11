<div align="center">

<img src="src-tauri/icons/icon.png" width="112" alt="Fluent Video icon" />

# Fluent Video

**A fast, full-featured video player for Windows with a Microsoft Fluent Design interface and Mica / Acrylic window materials.**

![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-stable-DEA584?logo=rust&logoColor=black)
![Design](https://img.shields.io/badge/Design-Fluent%20Design-0078D4)
![Platform](https://img.shields.io/badge/Platform-Windows%2010%2F11-0078D4?logo=windows&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

![Author](https://img.shields.io/badge/Author-minhtrong67-0078D4?style=for-the-badge)
![AI](https://img.shields.io/badge/AI%20support-Claude-D97757?style=for-the-badge)

English · [Tiếng Việt](README.vi.md)

</div>

---

## Table of contents

1. [Introduction](#introduction)
2. [Screenshots](#screenshots)
3. [Features](#features)
4. [Download](#download)
5. [Installation](#installation)
6. [Tech Stack](#tech-stack)
7. [Development](#development)
8. [Build](#build)
9. [Project Structure](#project-structure)
10. [License](#license)

---

## Introduction

**Fluent Video** is a desktop video player for Windows built with [Tauri](https://tauri.app), React and Rust. A lightweight native shell (a few MB, low memory use) meets the look and feel of Windows 11:

- **Microsoft Fluent Design** – NavigationView pane, layered surfaces, 4 px controls and 8 px flyouts, WinUI type ramp, Fluent System Icons, native-style caption buttons and decelerate motion.
- **Window materials** – choose **Mica** (default), **Acrylic** or **Mica Alt** in *Settings → Appearance*; the backdrop follows light / dark mode.
- **Accent color** – 18 Windows accent colors or any custom color, in **light**, **dark** or **follow-system** mode.
- **English and Vietnamese** interface, switchable at any time.
- **Segoe UI Variable by default**, with a font picker (Inter, Roboto, Open Sans, Noto Sans, Nunito, Montserrat, Source Sans 3, Be Vietnam Pro and common Windows fonts).
- A **personal library** that scans your Windows *Videos* folder, remembers where you stopped and generates thumbnails.
- Everything you expect from a serious player: playlists, subtitles, speed control, A-B loop, screenshots, mini player and keyboard shortcuts.

> ✨ Designed and developed by **minhtrong67** — with the support of the AI assistant **Claude** (Anthropic).

## Screenshots

Put your screenshots in the `screenshots/` folder (`image01.png` … `image04.png`) and reference them here:

| Library | Player |
|:---:|:---:|
| ![Library](screenshots/image01.png) | ![Player](screenshots/image02.png) |

| Playlist | Settings |
|:---:|:---:|
| ![Playlist](screenshots/image03.png) | ![Settings](screenshots/image04.png) |

## Features

### Fluent Design
- NavigationView with a collapsing pane (Home, Library, Settings) and a rounded content layer that carries the window material through.
- Settings page with **SettingsCards** and **Expanders**, ToggleSwitch, selector bar, radio tiles and text boxes with the accent focus line.
- **Fluent System Icons** (outline for normal, filled for selected / active states), WinUI-style context menus, content dialogs and info-bar toasts.
- Windows 11 caption buttons (minimize, maximize / restore, red close) and an app icon drawn in the Fluent style.
- Motion with the Fluent decelerate curve (167 – 333 ms); reduced automatically when Windows animations are off.

### Window material (transparency effect)
- **Mica** (default) – subtle material tinted by your wallpaper.
- **Acrylic** – translucent frosted glass.
- **Mica Alt** – stronger-tinted Mica with more contrast between layers.
- Applied instantly, remembered between launches and re-tinted when you switch light / dark. Mica and Mica Alt need Windows 11; on older systems the app falls back automatically (Mica Alt → Mica → Acrylic → solid colors) and tells you in Settings.

### Library
- **Automatic scan of the Windows Videos folder** on startup, including sub-folders such as *Captures* and *Screen Recordings*.
- **Refresh** (Home header, Library tab or `F5`) rescans on demand: new files are added, changed files updated, deleted files removed. Re-importing a file never creates a duplicate.
- Safe by design: if a drive or folder is temporarily offline, its videos are kept.
- Extra library folders in *Settings → Library*; search, sort by date / name / size and **list / grid** view.
- Thumbnails are generated lazily for the videos on screen, cached on disk and shown with a shimmer while loading.

### Playback
- Open files or folders, drag & drop, or **Open with** from Explorer; a second launch reuses the running window.
- Playlist with drag-to-reorder, shuffle and repeat (off / all / one); opening one file also queues the other videos in its folder (optional).
- **Resume playback** with a *Continue watching* shelf, speed **0.25× – 4×**, frame stepping, **A-B loop**, bookmarks.
- Seek bar with **hover preview thumbnails** and buffered range, mouse-wheel volume, **volume boost up to 200 %**, **night mode**, double-click left / right to skip and in the middle for fullscreen.
- Sleep timer (15 – 120 minutes or after the current video).

### Playlist panel & context menu
- Side panel with **search**, **list / grid** switch, drag-to-reorder, per-item context menu; keeps the playing video in view.
- **Right-click the video** for play / pause, skip, speed, playlist, subtitles, audio, picture, A-B loop, screenshot, fullscreen, mini player, always on top, file actions.

### Picture
- Fit / fill / stretch, zoom up to 400 % with drag-to-pan, rotate 90°, flip, brightness / contrast / saturation / hue.
- **Screenshot** of the current frame saved as PNG in `Pictures\Fluent Video`.

### Subtitles
- Finds `.srt`, `.vtt`, `.ass`, `.ssa` next to the video (or in `Subs` / `Subtitles`) and prefers your UI language; load any file manually or drop it on the window.
- Smart encoding detection (BOM, UTF-8, Windows-1258, Windows-1252); delay (`G` / `H`), size, color, background, opacity and position.

### Windows integration
- **Window on startup** (*Settings → Window*): **Remember size** or **Always maximized**.
- Frameless Fluent title bar, fullscreen, **mini player** that stays on top, media keys and system media overlay, file associations (set up by the installer).

### Performance
- The window stays hidden until the first frame **and** the window material are ready (no white or transparent flash); the last theme is applied before the first paint.
- **Fast seeking on large videos** – files are streamed from disk through a small loopback-only range server; the seek bar and clock are updated without React re-renders; previews load only while hovering.
- Lazy thumbnails, small debounced disk writes and a built-in error screen with *Reload*.

### Supported formats

Playback uses the **Microsoft Edge WebView2** media stack, so support depends on the codecs on your PC.

| Container | Typical codecs | Notes |
|---|---|---|
| MP4 / M4V / MOV | H.264 + AAC | Works everywhere |
| WebM | VP8 / VP9 / AV1 + Vorbis / Opus | AV1 may need the *AV1 Video Extension* |
| MKV | H.264 / VP9 + AAC / Opus / MP3 | Works when the inner codecs are supported |
| HEVC / H.265 | – | Needs *HEVC Video Extensions* from the Microsoft Store |
| AVI, WMV, FLV, MPG | – | Often unsupported – the player offers **Open with default app** |

### Keyboard shortcuts

| Key | Action | Key | Action |
|---|---|---|---|
| `Space` / `K` | Play / pause | `M` | Mute |
| `←` / `→` | Seek (5 / 10 / 15 s) | `F` / `F11` | Fullscreen |
| `J` / `L` | Seek 10 s | `[` / `]` | Slower / faster |
| `↑` / `↓` | Volume | `,` / `.` | Previous / next frame |
| `Shift+N` / `Shift+P` | Next / previous video | `C` / `V` | Cycle / toggle subtitles |
| `G` / `H` | Subtitle delay − / + | `A` | A-B loop |
| `S` | Screenshot | `Q` | Playlist |
| `R` | Rotate 90° | `T` | Mini player |
| `0` – `9` | Jump to 0 – 90 % | `I` | Video info |
| `Ctrl+O` | Open file (`Shift`: folder) | `Esc` | Exit fullscreen / mini player |
| `F5` | Refresh library | Right-click | Context menu |

## Download

Download the latest installer from the **Releases** page of this repository (`Fluent Video_1.2.0_x64-setup.exe`). No installer is stored in the source tree – build it yourself with `npm run build` (see [Build](#build)).

| | |
|---|---|
| OS | Windows 11 recommended (Mica / Mica Alt). Windows 10 1809+ works with Acrylic or solid colors |
| Runtime | Microsoft Edge WebView2 (preinstalled on Windows 11 and up-to-date Windows 10) |

## Installation

1. Run the installer. It installs per user, so **no administrator rights** are needed.
2. If Windows SmartScreen shows *"Windows protected your PC"* (the installer is not code-signed), click **More info → Run anyway**.
3. Launch **Fluent Video** from the Start menu; the **Videos** folder is scanned automatically. Add other folders in *Settings → Library*.

**Open videos from Explorer** – right-click a video → *Open with* → *Fluent Video*.
**Uninstall** – *Settings → Apps → Installed apps → Fluent Video → Uninstall*. Settings and history stay in `%APPDATA%\com.minhtrong67.fluent-video`, thumbnails in `%LOCALAPPDATA%\com.minhtrong67.fluent-video`.

**Troubleshooting**

| Problem | Solution |
|---|---|
| *"This video can't be played"* | The codec is not supported by WebView2. Install *HEVC Video Extensions* or click **Open with default app**. |
| The window is not translucent | Settings → Appearance → Window material shows what is applied. Mica needs Windows 11; Acrylic needs Windows 10 1809+. |
| Window feels slow while dragging with Acrylic | Acrylic is GPU heavy on some drivers – switch to Mica. |
| Old icon after reinstall | Windows caches icons – restart Explorer. |

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Tauri 2](https://tauri.app) (Rust) – single-instance, dialogs, asset protocol, file associations, [`window-vibrancy`](https://github.com/tauri-apps/window-vibrancy) for Mica / Acrylic / Mica Alt |
| UI | [React 18](https://react.dev) + [TypeScript 5](https://www.typescriptlang.org) |
| Build tool | [Vite 5](https://vitejs.dev) |
| Styling | [Tailwind CSS 3](https://tailwindcss.com) with Fluent Design tokens (layers, strokes, accent, type ramp) |
| Design system | Microsoft Fluent Design – [Fluent System Icons](https://github.com/microsoft/fluentui-system-icons) (`@fluentui/react-icons`), Segoe UI Variable + bundled [Fontsource](https://fontsource.org) fonts |
| State | [Zustand](https://zustand-demo.pmnd.rs) |
| Playback | HTML5 `<video>` on WebView2 + Web Audio API |
| Installer | NSIS (via the Tauri bundler) |

## Development

**Prerequisites:** Windows 10 / 11 with WebView2, [Node.js](https://nodejs.org) 18+, [Rust](https://rustup.rs) (stable) with *Desktop development with C++*, and the [Tauri prerequisites](https://tauri.app/start/prerequisites/).

```bash
cd fluent-video
npm install
npm run dev
```

| Command | What it does |
|---|---|
| `npm run dev` | Run the desktop app (Tauri) with hot reload |
| `npm run build` | Build the Windows installer |
| `npm run vite:dev` | UI only in a browser at `http://localhost:1420` (no Tauri features; solid colors instead of Mica) |
| `npm run fonts` | Regenerate `src/fonts.css` after changing the font list |
| `npx tsc --noEmit` | Type-check the frontend |
| `cargo check` (inside `src-tauri`) | Type-check the Rust backend |

**Customization**

| What | Where |
|---|---|
| Default accent color / window material | `defaultSettings` in `src/lib/types.ts` |
| Fluent tokens (layers, strokes, text colors) | `:root` / `:root.dark` in `src/index.css` |
| Backdrop logic | `set_backdrop` in `src-tauri/src/lib.rs`, `applyBackdrop` in `src/lib/window.ts` |
| Add a language | add a dictionary in `src/lib/i18n.ts` |
| Default window size | `app.windows` in `src-tauri/tauri.conf.json` |

**User data:** `%APPDATA%\com.minhtrong67.fluent-video\state.json` (settings, library, history), `window.json` (window geometry), thumbnails in `%LOCALAPPDATA%\com.minhtrong67.fluent-video\thumbs`.

## Build

```bash
npm install
npm run build
```

| Artifact | Path |
|---|---|
| Installer | `src-tauri/target/release/bundle/nsis/Fluent Video_1.2.0_x64-setup.exe` |
| Portable executable | `src-tauri/target/release/fluent-video.exe` |

Icons live in `src-tauri/icons` (`icon.ico` for the app and taskbar, `installer.ico` for setup / uninstall, PNG sizes 32 – 256 px).

## Project Structure

```
fluent-video/
├─ index.html                 app entry (Vite)
├─ public/icon.png            app logo used in the UI
├─ screenshots/               screenshots used in this README
├─ src/
│  ├─ index.css               Fluent tokens, slider, text box, scroll bar, motion
│  ├─ components/             ui.tsx (buttons, switch, menus, dialogs), NavView, TitleBar, Player, Controls, SeekBar, QueuePanel
│  ├─ views/                  Home.tsx, Settings.tsx
│  └─ lib/                    theme.ts (accent + fonts), window.ts (window material), store.ts, i18n.ts, engine.ts
└─ src-tauri/                 Rust backend, tauri.conf.json, capabilities, icons
```

## License

[MIT](LICENSE) © minhtrong67. Designed and developed by **minhtrong67** with the support of the AI assistant **Claude** (Anthropic).
