<div align="center">

<img src="assets/icon-512.png" alt="Claude Tracker" width="112" />

# Claude Tracker

**Know which Claude account is ready — before you open Chrome.**

A free, open-source Windows dashboard that tracks Claude usage limits and reset times across all your Chrome profiles — designed in Material 3 Expressive.

[![License: MIT](https://img.shields.io/badge/license-MIT-b5502c.svg)](LICENSE)
![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-0078d4)
![Tauri](https://img.shields.io/badge/Tauri-2-24c8db)
![React](https://img.shields.io/badge/React-18-61dafb)

[Download](downloads/) · [Landing page](index.html) · [Tiếng Việt](README.vi.md)

</div>

---

## Introduction

If you juggle several Claude accounts, one per Chrome profile, you quickly lose track of which one still has capacity and when the others come back. **Claude Tracker** puts them all in one place: a small Chrome extension reports each profile's limits to a desktop app that runs entirely on your PC, and the dashboard shows live countdowns, progress toward each reset, usage forecasts, notifications and one-click access to the right Chrome profile.

> Claude Tracker is an independent project. It is not affiliated with or endorsed by Anthropic.

## Screenshots

| Grid view (dark) | List view (dark) |
| :---: | :---: |
| ![Grid view, dark theme](screenshots/image01.png) | ![List view, dark theme](screenshots/image02.png) |
| **Grid view (light)** | **Settings** |
| ![Grid view, light theme](screenshots/image03.png) | ![Settings, dark theme](screenshots/image04.png) |

All screenshots use demo data.

## Features

- **One dashboard for every profile.** Each card shows the Claude account, the Chrome profile (`Profile 4 · 01 - Work`) and the Google account signed in to that profile. Nothing is truncated.
- **Overview tiles.** Ready, waiting, next to recover — click a tile to filter — plus **Open best account**, which picks the ready account with the lowest usage.
- **Live reset countdown** with a Material 3 Expressive *wavy progress* bar; time left is spelled out in full ("2 hours 31 minutes"). A card celebrates the moment an account recovers.
- **Usage history and forecast.** Sparklines per account and a "limit expected at 15:40" prediction based on your recent pace. History can be exported to CSV.
- **Smart notifications.** A warning when usage reaches a threshold, a note at the expected reset time, and configurable quiet hours.
- **Organize.** Pin, rename and add notes to accounts; hide accounts (restorable, they do not reappear on their own); grid or list view; filters and search.
- **Real Chrome profile avatars**, read from the picture Chrome already stores (falls back to initials).
- **Open all Chrome** in one click, or only the best account.
- **System tray.** Dynamic tooltip ("3 ready · 2 waiting · next 15:40"), quick menu, optional start with Windows (minimized) and single-instance protection.
- **Appearance.** Light, dark or follow the system; eight Material theme colors; three text sizes; six typefaces (system UI by default, plus bundled Roboto, Inter, Be Vietnam Pro, Noto Sans, Open Sans); [Lucide](https://lucide.dev) icons.
- **English and Tiếng Việt**, detected automatically and switchable at any time (the extension too).
- **Window behavior.** Remember the size and position you left, or always open maximized.
- **Keyboard shortcuts.** `Ctrl+R` refresh · `Ctrl+F` search · `Ctrl+1` dashboard · `Ctrl+,` settings.
- **Private by design.** No cloud and no sign-in. The app listens only on `127.0.0.1`, requires a secret token, rejects web-page origins and writes its data atomically.
- **Responsive and smooth.** Navigation rail on wide windows, navigation bar on narrow ones; custom tooltips, dropdowns, toasts and dialogs in both themes; animations respect `prefers-reduced-motion`.

### Account states

| State | Condition |
| --- | --- |
| Ready | Limit not reached, or the reset time has passed: the account switches to Ready automatically |
| Waiting for reset | Limit reached and the reset time has not passed: live countdown |
| No data | The extension has not reported usage yet |

When a reset time passes, the card flips to **Ready / Available** on its own (usage shown as 0%) and says when it reset; the next extension report replaces that estimate with real numbers.

## Installation

### 1. Install the app

Download `ClaudeTracker-Setup.exe` from the [`downloads/`](downloads/) folder (or the Releases page) and run it. Windows 10/11 already includes WebView2. Closing the window sends the app to the system tray (this can be turned off in Settings); choose **Quit** in the tray menu to exit completely.

### 2. Add the extension (once per Chrome profile)

1. Open `chrome://extensions` in the profile and turn on **Developer mode**.
2. Choose **Load unpacked** and select the [`extension/`](extension/) folder.
3. Open the extension's settings and enter the **port** and **token** shown in the app under **Settings → Connection**, then press **Save & connect**.
4. Make sure the profile is signed in to claude.ai and to Chrome (Google account) so the app can match the right Chrome profile automatically.

### How it works

```
Chrome profiles                                Claude Tracker (Windows)
┌──────────────────────────┐   POST /ingest   ┌───────────────────────────────┐
│ extension/ (MV3)         │  127.0.0.1:47821 │ Rust: tiny_http (loopback)    │
│ reuses the claude.ai     │ ───────────────► │  ├─ parses usage → tracker.json│
│ session already signed in│   x-tracker-token│  ├─ watcher: reset notifications│
└──────────────────────────┘                  │  └─ launches chrome.exe profile│
                                              │ React UI: dashboard, countdown │
                                              └───────────────────────────────┘
```

The extension reuses your existing signed-in session instead of reading Chrome cookies (which are encrypted per-browser on recent Chrome versions).

### Known limitations

- The claude.ai usage endpoint is internal and may change. If a bar is empty, check **Settings → Connection → Raw data diagnostics** and adjust `parse_usage` in `src-tauri/src/main.rs` and `getJson` in `extension/background.js`.
- The app must be running (the tray counts) to receive data and send notifications.
- Free-plan accounts are detected from the on-page banner and need an open claude.ai tab in that profile.

## Tech stack

| Layer | Technology |
| --- | --- |
| Desktop shell | [Tauri 2](https://tauri.app) (Rust) |
| Local API | `tiny_http` on `127.0.0.1`, `serde`, `chrono`; `tauri-plugin-single-instance`, `-autostart`, `-notification` |
| UI | React 18, TypeScript, Vite 5, Tailwind CSS 3 |
| Icons | [lucide-react](https://lucide.dev) |
| Styling | Material 3 Expressive design tokens in CSS variables, shared with Tailwind utilities; system font stack plus bundled `@fontsource` fonts |
| Browser extension | Chrome Manifest V3 |
| Installer | NSIS (via Tauri bundler) |

## Development

Requirements: [Node.js](https://nodejs.org) 18+, [Rust](https://rustup.rs) (MSVC toolchain) and WebView2 (included in Windows 10/11).

```bash
npm install
npm run dev        # Tauri app with hot reload
npm run dev:mock   # UI only, in the browser, with demo data (no Rust needed)
npm run build:web  # type-check + production build of the UI
```

`npm run dev:mock` serves the interface at `http://localhost:1420` with a fake backend (`app/src/mock/`), which is handy for UI work and for taking screenshots (`npm run screenshots`, needs `npm i -D playwright`).

Icons are generated from one geometry by `npm run icons` (requires Python and Pillow): app icon, setup icon and uninstall icon in all desktop sizes, drawn as a Claude-orange (`#D97757`) Material 3 Expressive "cookie" shape.

## Build

```bash
npm run build         # builds the NSIS installer
npm run release:copy  # copies it to downloads/ClaudeTracker-Setup.exe
```

The installer is written to `src-tauri/target/release/bundle/nsis/`. `release:copy` copies the newest one to `downloads/ClaudeTracker-Setup.exe`, which is where [`index.html`](index.html) (the landing page) links. The custom uninstaller icon requires a recent Tauri CLI (`@tauri-apps/cli` ≥ 2.8).

## Project structure

```
claude-tracker/
├─ tailwind.config.js      # Tailwind mapped to the CSS design tokens
├─ index.html              # Landing page (single file, Material 3 Expressive)
├─ app/                    # React UI (Vite root)
│  ├─ index.html
│  ├─ public/              # favicon
│  └─ src/
│     ├─ App.tsx           # shell: navigation rail, overview tiles, filters, shortcuts
│     ├─ AccountCard.tsx   # account card (grid + list), wavy progress, forecast
│     ├─ EditDialog.tsx    # rename / note dialog
│     ├─ SettingsView.tsx  # appearance, window & system, notifications, connection, data, about
│     ├─ ui.tsx            # logo, avatar, tooltip, select, switch, toast, dialogs, wavy progress, sparkline
│     ├─ i18n.tsx          # English / Vietnamese strings
│     ├─ prefs.ts, fonts.ts, accents.ts, logo.ts
│     ├─ lib.ts            # state analysis, forecast, countdown formatting
│     ├─ styles.css        # Material 3 Expressive tokens and layout
│     └─ mock/             # fake backend for `npm run dev:mock`
├─ extension/              # Chrome extension (MV3, EN/VI)
├─ src-tauri/              # Rust backend, Tauri config, icons
│  ├─ src/main.rs
│  └─ icons/               # icon.ico, setup.ico, uninstall.ico, PNG sizes
├─ downloads/              # installer for the landing page's download button
├─ screenshots/            # image01.png … image04.png
├─ assets/                 # logo, Open Graph image
├─ scripts/                # icons, screenshots, installer copy
└─ LICENSE
```

## License

Released under the [MIT License](LICENSE). © 2026 minhtrong67.
