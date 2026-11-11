<div align="center">

<img src="src-tauri/icons/icon.png" width="112" alt="Fluent Music icon" />

# Fluent Music

**A local music player for Windows with a Microsoft Fluent 2 (Windows 11) interface.**

[Tiếng Việt](README.vi.md)

</div>

Fluent Music plays the music stored on your PC. It is built with [Tauri 2](https://tauri.app), React and Rust, so it is small, fast and light on memory.

## Highlights

- **Fluent 2 design** – Segoe UI Variable, NavigationView sidebar, Windows-style title bar, flyouts, dialogs, toggle switches and Fluent System Icons.
- **Window material** – choose **Mica**, **Acrylic** or **Mica Alt** in *Settings → Appearance* (default: Mica). Falls back to solid colors on systems that do not support them.
- **Light / dark / system** theme and the **Windows accent color** (or any accent you pick, or one taken from the album art).
- Library of MP3, FLAC, WAV, OGG, Opus, M4A and AAC; albums, artists, playlists, smart playlists, favorites, history and statistics.
- Gapless playback, crossfade, ReplayGain, 10-band equalizer, sleep timer, audio output selection.
- Synced lyrics (`.lrc`, embedded or from LRCLIB), visualizer, mini player, tray icon, media keys, global hotkeys.
- Online search and playback of YouTube Music songs, ListenBrainz scrobbling, duplicate finder, backup / restore.
- English and Vietnamese UI.

## Requirements

Windows 10 or 11 (64-bit) with the Microsoft Edge WebView2 runtime. **Mica and Mica Alt need Windows 11** (Mica Alt: 22H2 or newer); Acrylic works on Windows 10 1809+ but can stutter while dragging or resizing the window on some systems.

## Build from source

```bash
pnpm install
pnpm dev          # run the app in development
pnpm build        # installer: target/release/bundle/nsis/Fluent Music_<version>_x64-setup.exe
pnpm portable     # optional: portable zip in download/
```

Needs Node 20+, [pnpm](https://pnpm.io) 10, Rust (stable) and the [Tauri prerequisites](https://tauri.app/start/prerequisites/). The Cargo workspace may keep one shared `target` folder next to the project folder.

Other scripts: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm check:i18n`, `pnpm icons` (regenerates every icon from `public/icon.svg`).

## Project layout

```
fluent-music/
├─ index.html                 app entry
├─ public/                    app icon (SVG + PNG)
├─ src/
│  ├─ index.css               Fluent tokens, surfaces, buttons, motion
│  ├─ components/             ui kit (Button, Switch, Segmented, Select, Modal…), TitleBar, NavDrawer, PlayerBar, NowPlaying…
│  ├─ views/                  Library views, Discover, Settings, Statistics
│  └─ lib/                    store (zustand), audio engine, theme (accent + materials), i18n, Tauri bridge
├─ src-tauri/                 Rust backend (scan, tags, lyrics, tray, window material, online search)
├─ scripts/                   icon generation, installer / portable packaging, i18n check
└─ tools/preview/             fake Tauri backend + Playwright script to screenshot the UI in a browser
```

## Window material – how it works

`set_backdrop(kind, dark)` (Rust, `src-tauri/src/window.rs`) applies Mica / Acrylic / Mica Alt through the window's DWM backdrop. The choice is saved in `prefs.json` and applied before the window is first shown; the front end then sets `data-backdrop` on `<html>` so the page draws translucent layers (or solid colors when the OS refuses the effect).

## License

MIT – see [LICENSE](LICENSE).
