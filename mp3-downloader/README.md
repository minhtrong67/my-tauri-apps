<div align="center">

<img src="assets/icon-512.png" width="120" alt="MP3 Downloader icon">

# MP3 Downloader

**Search or paste a link — get a tagged MP3 from YouTube, TikTok and Spotify.**
A free, open-source desktop app built with Tauri, React and Material 3 Expressive.

[Download](download/) · [Landing page](index.html) · [Tiếng Việt](README.vi.md)

![License](https://img.shields.io/badge/license-MIT-4CAF50) ![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB) ![React](https://img.shields.io/badge/React-18-61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)

</div>

## Introduction

MP3 Downloader turns links (or just a song name) into MP3 files with cover art, title, artist, album and year embedded. It wraps [yt-dlp](https://github.com/yt-dlp/yt-dlp) and [ffmpeg](https://ffmpeg.org) in a calm, colourful interface that follows **Material 3 Expressive (2026)**: cookie-shaped icons, shape-morphing buttons, spring motion and wavy progress bars.

## Screenshots

| | |
|---|---|
| ![Download](screenshots/image01.png) | ![Playlist & tags](screenshots/image02.png) |
| ![History](screenshots/image03.png) | ![Settings](screenshots/image04.png) |

> Put four screenshots named `image01.png` … `image04.png` in [`screenshots/`](screenshots/) (Download, Playlist/Tags, History, Settings).

## Features

- **Three sources** — YouTube, TikTok and Spotify tracks (Spotify is matched to the best audio on YouTube and tagged from Spotify's metadata). Many links at once.
- **Search by name** — type a song title, pick a result.
- **Playlists** — open a playlist, tick the tracks, queue them.
- **Edit tags** before downloading (title, artist, album, year).
- **Smart queue** — parallel downloads (1–4), speed limit, automatic retries on HTTP 403, wavy live progress, stop all.
- **History** — search, reveal, download again, delete file.
- **File naming** — four templates, optional per-artist folders, duplicate policy (keep both / skip / replace).
- **Quality** — best or 320 / 256 / 192 / 128 kbps, optional square cover crop.
- **Network** — browser cookies (for "sign in" errors) and proxy.
- **Safe** — yt-dlp / ffmpeg / Deno downloads are verified with SHA-256, strict CSP, single instance.
- **Stays current** — warns when yt-dlp is outdated and updates it in one click; desktop notifications.
- **Make it yours** — light / dark / system, 16 Material theme colours + custom, 5 fonts (system default, Roboto…), 3 text sizes, English & Vietnamese, window mode (remember size / always maximised).
- **Polished UI** — custom title bar, tooltips, toasts (info / success / warning / error), custom dropdowns, dialogs and side sheets with labelled, coloured actions.

## Installation

1. Download `MP3 Downloader_<version>_x64-setup.exe` from [`download/`](download/) (Windows 10/11, 64-bit).
2. Run it. If SmartScreen warns, choose **More info → Run anyway** (the installer is not code-signed).
3. On first launch the app offers to download **yt-dlp**, **ffmpeg** and (recommended) **Deno** for you.

macOS / Linux: build from source (see below) and install `yt-dlp` and `ffmpeg` yourself (e.g. with your package manager).

## Tech stack

| Layer | Technology |
|---|---|
| Shell | Tauri 2 (Rust) + plugins: dialog, opener, notification, single-instance |
| UI | React 18, TypeScript, Vite 5, Tailwind CSS 3 |
| Design | Material 3 Expressive, `@material/material-color-utilities` (Expressive scheme) |
| Icons | [lucide-react](https://lucide.dev) |
| State | Zustand (persisted settings & history) |
| Engines | yt-dlp, ffmpeg, Deno (optional) |

## Development

Requirements: [Node.js 18+](https://nodejs.org), [Rust](https://rustup.rs) and the [Tauri prerequisites](https://tauri.app/start/prerequisites/).

This project lives in a **Cargo workspace** (the root `Cargo.toml` has `members = ["*/src-tauri"]`), so every Tauri project in the folder shares one `target/` cache.

```bash
npm install
npm run dev
```

`npm run dev` starts Vite and the Tauri window with hot reload.

## Build

```bash
npm run build
```

The installer is written to the workspace's shared `target/release/bundle/nsis/` folder. Copy it into [`download/`](download/) so the landing page's **Download** button works (the link expects `MP3 Downloader_0.5.0_x64-setup.exe`).

Regenerate every icon (app, setup, uninstall, NSIS images, favicon, social image) with `pip install pillow && python scripts/generate-icons.py`.

## Project structure

```
mp3-downloader/
├─ index.html              # Landing page (single file, Material 3 Expressive)
├─ assets/                 # Landing page assets (icons, favicon, og-image)
├─ download/               # Put the installer (.exe) here
├─ screenshots/            # image01.png … image04.png
├─ scripts/generate-icons.py
├─ app/                    # Vite root of the desktop UI
│  ├─ index.html
│  ├─ public/
│  └─ src/
│     ├─ components/       # ui primitives (Button, Select, Overlay, Toast…) + feature components
│     ├─ layout/           # TitleBar, NavRail
│     ├─ pages/            # Download, History, Settings
│     └─ lib/              # theme, i18n, stores, queue, tools, tauri bridge
└─ src-tauri/              # Rust backend, config, capabilities, icons
```

## License

[MIT](LICENSE) © 2026 **minhtrong67** — made with the help of **Claude** (Anthropic).
Only download content you own or have permission to use.
