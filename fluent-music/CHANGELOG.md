# Changelog

All notable changes to Material Music. The format follows [Keep a Changelog](https://keepachangelog.com/) and the project uses [Semantic Versioning](https://semver.org/).

## [2.0.0] - 2026-11-11

### Changed
- **The app is now Fluent Music** with a complete **Microsoft Fluent 2 / Windows 11** design: Segoe UI Variable, 4px / 8px corner radii, NavigationView sidebar with an accent selection pill, Windows-style title bar and caption buttons, docked media transport bar, ContentDialog / MenuFlyout / InfoBar styling, Fluent toggle switches, sliders and segmented selectors, Fluent System Icons and Fluent motion curves.
- **New app icon** (and installer / setup / uninstall artwork) in the Fluent style.
- The accent color now defaults to the **Windows accent color**; a Windows accent palette, a custom color and "accent from the album art" are available in Settings → Appearance.
- The navigation pane collapses to icons automatically on narrow windows.
- The project, package, executable and window title are renamed to **fluent-music**. Data from earlier builds is imported automatically.

### Added
- **Window material (Windows 11): Mica, Acrylic and Mica Alt** in Settings → Appearance (default: Mica). It follows the light / dark mode, is remembered and applied before the window is shown, and falls back to solid colors when the OS does not support it.

### Removed
- The public landing page, the bundled Material Symbols font and the Material color library (the accent palette is generated in `src/lib/theme.ts`).

## [1.5.0] - 2026-11-08

### Changed
- **YouTube Music only.** Audius and Deezer are gone. Search and playback talk to YouTube Music's web API directly from Rust instead of starting yt-dlp, so searching takes a moment instead of several seconds and nothing needs to be installed.
- The Discover page is simpler: one source, no filter chips or per-row badges, a result count, and your last results are kept when you come back to the page.
- yt-dlp is now an optional last-resort fallback (Settings → Online music) instead of a requirement.

### Fixed
- **Theme colour now follows the artwork of online songs** (the cover is downloaded by the Rust side so its colour can be read). The previous song's colour stays until the new one is ready instead of flashing back to the default.
- **Songs that did not play / long loading:** several YouTube client identities are tried in parallel (the JavaScript-free `visionOS` one first), every stream link is probed before it is used, results are cached for the session, the next song and the song under the pointer are looked up ahead of time, and a stream that never starts is retried once after 12 s.
- A failed online song no longer shows the misleading "file is missing or unsupported" message, and the queue no longer skips through every failing song: playback stops with a clear reason and a *Retry* button.
- The play button no longer keeps spinning when a stream stalls.

### Removed
- Audius and Deezer sources, 30-second previews, and the source toggles in Settings. Songs saved from them by 1.4.0 are forgotten (they cannot be played any more).

## [1.4.0] - 2026-11-07

### Added
- **Online music:** a new **Discover** page that searches and streams songs online, with the same queue, favorites, playlists, equalizer, crossfade and mini player as local files.
- **Sources** (Settings → Online music): **Audius** (full songs) and **Deezer** (30 s previews) are on by default; **YouTube** through yt-dlp is optional and off by default.
- **yt-dlp manager:** downloads yt-dlp (and Deno, the JavaScript runtime it needs) from the official releases with SHA-256 verification, updates / removes what it installed, or uses your own copy. Nothing is bundled.
- **Synced lyrics for online songs** from LRCLIB, cached on disk (*Settings → Online music → Lyrics cache*). Previews show plain lyrics because they are excerpts.
- **Local streaming proxy** (127.0.0.1 only, per-stream tokens, Range support) so the equalizer and visualizer also work on online songs.
- Online songs you favorite or add to a playlist are kept in the library; others are forgotten after a while. A *Back to top* button on the Discover page.
- Rust unit tests for the providers, the proxy (end-to-end with a fake upstream) and the yt-dlp output parsing; Vitest tests for online ids and error messages.

### Fixed
- The loading indicator used an invalid animation spline (console error); it now morphs as intended.

### Changed
- The Content Security Policy now allows `https:` images (online artwork) and media from `127.0.0.1` (the streaming proxy).

## [1.3.0] - 2026-10-25

### Added
- **Audio output device** picker (Settings → Playback).
- **Statistics** page: songs and artists you play most, listening time and the last 7 days.
- **Duplicate finder**: groups the same song, keeps the best copy and moves play counts, favorites and playlists to it.
- **Custom smart playlists** with rules (genre, year, bitrate, format, length, recently added, played / not played, favorites).
- **Save the queue as a playlist.**
- **Lyrics offset** (−/+ 0.1 s per song) for synced lyrics.
- **Visualizer styles**: bars, wave and circle.
- **Sleep timer fade-out** over the last 20 seconds.
- **Global hotkeys** (Ctrl + Alt + Space / ← / → / M / T) that work in any app.
- **Customizable keyboard shortcuts.**
- **ListenBrainz scrobbling** (optional, needs your user token).
- **More reliable online lyrics:** cleaned titles, several lookups, scoring so the wrong song is never shown, retries, and an optional *Find lyrics automatically* setting.
- **Container-transform animation** between the player bar and the full-screen player (and back).
- **Home:** *Continue listening* card and quick shortcuts. **Settings:** sticky section bar.
- **New app, setup and uninstall icons** in Material 3 Expressive style (pink, scalloped “cookie” shape).
- Landing page: FAQ, scroll progress, active menu item and download facts.
- **Automatic daily backups** of playlists, favorites and settings (the last 5 are kept) and a button to open their folder.
- Developer tooling: ESLint, Vitest tests, an i18n consistency check, GitHub Actions (CI + release) and a portable build script. `npm run build` now also copies the installer to `download/`.

### Removed
- **Auto-update** (and the signing key / update manifest). New versions are installed by downloading the installer from the landing page.

### Changed
- The project, executable and data folder are now called **material-music** everywhere. Existing data from earlier builds is imported automatically on first start.
- A song only counts as played after 30 seconds (or half of it), so skipping no longer inflates play counts and *Most played*.
- Restoring a backup is validated first and asks for confirmation.
- Smaller start-up download: vendor code is split into separate chunks.
- The Rust back end is split into modules (`scan`, `state`, `window`, `system`, `lyrics`, `watch`, `scrobble`, `util`).

### Fixed
- A damaged `library.json` / `user.json` no longer wipes your data: the last good copy is restored and you are told about it.
- Durations such as 1 h 59 min 40 s were shown as "1 h 60 min".

## [1.2.0]
- Previous release.
