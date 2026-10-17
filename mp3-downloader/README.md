<div align="center">

<img src="src/app-icon.png" width="112" height="112" alt="MP3 Downloader icon" />

# MP3 Downloader

**Turn YouTube, TikTok and Spotify links into perfectly tagged MP3 files.**

Free · Open source · Material Design 3 · English & Tiếng Việt

[![License: MIT](https://img.shields.io/badge/license-MIT-8BC34A.svg)](LICENSE)
![Tauri 2](https://img.shields.io/badge/Tauri-2-24C8DB)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

[English](README.md) · [Tiếng Việt](README.vi.md)

</div>

## Introduction

MP3 Downloader is a lightweight desktop app built with [Tauri 2](https://tauri.app). Paste a link, pick a quality and get an MP3 with **cover art, title, artist, album and year** already embedded — ready for Windows Explorer, your phone or any music player.

The interface follows **Material Design 3**: light / dark / system themes, 16 Material theme colors plus any custom color, a choice of popular fonts, and smooth animations. It speaks **English and Vietnamese** and picks the language of your device automatically.

> Please only download content you have the right to use.

## Screenshots

| | | |
|:--:|:--:|:--:|
| ![Download page](screenshots/image01.png) | ![Settings](screenshots/image02.png) | ![Dark theme](screenshots/image03.png) |
| Download page | Settings | Dark theme |

## Features

- **Three sources** — YouTube, TikTok and Spotify tracks (`open.spotify.com/track/…`).
  Spotify is DRM-protected, so the app reads the track info from Spotify and finds the matching audio on YouTube Music / YouTube (matched by duration).
- **Tags & cover art** — title, artist, album, year and cover (optionally cropped to a square). File names look like `Artist - Title.mp3`.
- **Quality** — Best (VBR V0), 320, 256, 192 or 128 kbps.
- **Smart queue** — paste several links at once; two downloads run in parallel with speed, ETA, retry and cancel.
- **Resilient downloads** — on HTTP 403 the app automatically tries other YouTube clients / methods. Tagging problems never lose your MP3.
- **One-click tools** — installs `yt-dlp`, `ffmpeg` and `Deno` for you on Windows.
- **Material Design 3** — light / dark / system, 16 Material colors + custom color, fonts (Roboto, Inter, Open Sans, Be Vietnam Pro, Nunito, system, serif, mono).
- **English & Tiếng Việt** — detected from your device, changeable in Settings.
- **Window behavior** — either *remember the window size* or *always open maximized*.
- **Tidy settings** — grouped into Appearance, Downloads, Window and Tools.

## Download

Get the Windows installer from the [`download/`](download/) folder (or from the project's Releases page):

```
download/MP3 Downloader_0.4.0_x64-setup.exe
```

A landing page for the app is available in [`index.html`](index.html) (open it in a browser or host it on GitHub Pages).

## Installation

1. Run the installer and follow the steps (the setup and uninstaller use the app's own icons).
2. Start **MP3 Downloader**.
3. On first launch click **Install automatically** to get `yt-dlp`, `ffmpeg` and `Deno` (Windows).
   On macOS / Linux install `ffmpeg` (and optionally `deno`) with your package manager:

   ```bash
   brew install ffmpeg deno          # macOS
   sudo apt install ffmpeg           # Debian / Ubuntu
   ```

## Tech stack

| Area | Technology |
|---|---|
| Shell | [Tauri 2](https://tauri.app) (Rust) |
| Backend | Rust, `tokio`, `reqwest` (rustls), `regex`, `zip`, `arboard` |
| Frontend | Plain HTML / CSS / JavaScript — no bundler |
| Design | Material Design 3, [material-color-utilities](https://github.com/material-foundation/material-color-utilities) |
| Icons | [Lucide](https://lucide.dev) |
| Fonts | [Fontsource](https://fontsource.org) (Roboto, Inter, Open Sans, Be Vietnam Pro, Nunito) — bundled offline |
| Engines | [yt-dlp](https://github.com/yt-dlp/yt-dlp), [FFmpeg](https://ffmpeg.org), [Deno](https://deno.com) |

## Development

Requirements: [Node.js](https://nodejs.org) 18+, [Rust](https://rustup.rs) (stable) and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS.

This project lives inside a Cargo workspace whose root `Cargo.toml` contains `members = ["*/src-tauri"]`, so every subfolder with a `src-tauri/Cargo.toml` is picked up automatically and all projects share one `target` cache. No extra setup needed.

```bash
cd mp3-downloader
npm install
npm run dev
```

## Build

```bash
npm run build
```

Installers are written to the workspace's shared `target` folder, e.g. `target/release/bundle/nsis/MP3 Downloader_0.4.0_x64-setup.exe`. Copy the installer into [`download/`](download/) to make the landing page's **Download** button work.

## Project structure

```
mp3-downloader/
├─ index.html                landing page (single file, Material Design)
├─ og-image.png              social sharing image
├─ download/                 put the installer here
├─ screenshots/              image01.png, image02.png, …
├─ LICENSE
├─ package.json
├─ src/                      app UI (no bundler)
│  ├─ index.html
│  ├─ styles.css
│  ├─ app.js                 UI logic
│  ├─ i18n.js                English / Vietnamese strings
│  ├─ app-icon.png
│  ├─ fonts/                 bundled fonts
│  └─ vendor/mcu.js          material-color-utilities
└─ src-tauri/
   ├─ Cargo.toml
   ├─ tauri.conf.json
   ├─ capabilities/
   ├─ icons/                 app icon, installer.ico, uninstaller.ico
   └─ src/
      ├─ main.rs
      └─ lib.rs              backend: downloads, tools, window state
```

## License

Released under the [MIT License](LICENSE) © 2026 **minhtrong67**.

Built by **minhtrong67** with the support of **Claude** (Anthropic).

Third-party: Lucide (ISC), Fontsource fonts (OFL / Apache-2.0), material-color-utilities (Apache-2.0). `yt-dlp`, `ffmpeg` and `Deno` are downloaded separately and keep their own licenses.
