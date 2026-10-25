# Changelog

All notable changes to Material Music. The format follows [Keep a Changelog](https://keepachangelog.com/) and the project uses [Semantic Versioning](https://semver.org/).

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
- **Automatic daily backups** of playlists, favorites and settings (the last 5 are kept) and a button to open their folder.
- Developer tooling: ESLint, Vitest tests, an i18n consistency check, GitHub Actions (CI + signed release) and a portable build script.

### Changed
- The project, executable and data folder are now called **material-music** everywhere. Existing data from earlier builds is imported automatically on first start.
- A song only counts as played after 30 seconds (or half of it), so skipping no longer inflates play counts and *Most played*.
- Restoring a backup is validated first and asks for confirmation.
- Smaller start-up download: vendor code is split into separate chunks.
- The Rust back end is split into modules (`scan`, `state`, `window`, `system`, `lyrics`, `watch`, `scrobble`, `util`).

### Fixed
- A damaged `library.json` / `user.json` no longer wipes your data: the last good copy is restored and you are told about it.
- Durations such as 1 h 59 min 40 s were shown as "1 h 60 min".
- The updater public key is now configured (earlier builds shipped a placeholder).

## [1.2.0]
- Previous release.
