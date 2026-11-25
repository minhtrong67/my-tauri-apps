<div align="center">

<img src="src-tauri/icons/icon.png" width="96" alt="Site Launcher icon" />

# Site Launcher

**Open your browser profiles in one click, each with the websites you choose.**

![Author](https://img.shields.io/badge/author-minhtrong67-0078d4?style=for-the-badge)
![AI](https://img.shields.io/badge/built%20with%20AI-Claude-8764b8?style=for-the-badge)

![Tauri](https://img.shields.io/badge/Tauri-2-24c8db?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=black)
![Platform](https://img.shields.io/badge/Windows-10%20%7C%2011-0078d4?logo=windows&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

English · [Tiếng Việt](README.vi.md)

</div>

Created by **minhtrong67** with the help of the AI assistant **Claude**.

## Introduction

If you keep several browser profiles (work, personal, media...), opening each one and loading the same pages gets repetitive. **Site Launcher** reads the profile list of your installed browsers and opens any profile, or many at once, with the websites you picked already loaded in tabs. It can also close them again and shows which profiles are running.

It supports **Google Chrome, Microsoft Edge, Brave, Vivaldi, Cốc Cốc and Mozilla Firefox**. It is a small native app: a Rust backend with a React interface.

## Screenshots

<!-- Put your screenshots in the screenshots folder (image01.png, image02.png, ...) and show them here:
<img src="screenshots/image01.png" alt="Main window" />
-->

## Features

- **Microsoft Fluent Design.** Windows 11 look: Mica, Mica Alt or Acrylic backdrop (Settings), layered cards, 4 px and 8 px corners, Windows blue accent, light, dark or system theme.
- **Many browsers.** Pick the browser in the tab bar; only installed browsers are shown. Each browser lists its own profiles.
- **Websites to open, up to 5.** Type an address (`github.com` is enough, `https://` is added) or tick sites from the dropdown. Each site opens as one tab. Leave it empty to open only the profile.
- **Saved sites dropdown.** Every address you enter or launch is remembered. Next time, choose one or several from the multi-select list (maximum 5), use the keyboard, remove single sites, or clear them all in Settings.
- **Sites per profile.** Every profile can use the shared list or its own. The button on each row shows how many sites it opens.
- **Open fast.** Click a profile to open it. Select several and open them together, or open all.
- **Close profiles.** Close one profile, a selection, or everything that is running. The browser receives the normal "close window" request, so it can restore your tabs next time.
- **Live status.** A green dot and a "Running" badge show which profiles are open.
- **Search and shortcuts.** Filter by name or email. `Ctrl+F` focuses search, `Ctrl+A` selects all, `Esc` clears search, selection or closes panels.
- **English and Vietnamese**, switchable at any time.
- **Window behavior.** *Remember the size* you last dragged the window to, or *always open maximized*.
- **Branded installer.** App, setup and uninstall icons plus installer artwork, with a Vietnamese and English setup wizard.

## Installation

### Requirements

- Windows 10 or 11 (closing profiles and Mica need Windows; Mica and Mica Alt need Windows 11, Acrylic works on Windows 10)
- At least one supported browser
- Microsoft Edge WebView2 Runtime (already included in Windows 11)

### Install from the setup file

1. Build the installer (see [Build](#build)) or download it from your releases.
2. Run `Site Launcher_0.1.0_x64-setup.exe`. It installs for the current user, no administrator rights needed.
3. Start **Site Launcher** from the Start menu.

> Pages that need a login open signed out unless that profile is already signed in.

## Tech stack

| Layer | Technology |
| --- | --- |
| Shell | [Tauri 2](https://tauri.app) (Rust) |
| Interface | React 18, Vite 6 |
| Design | Microsoft Fluent Design, Windows backdrop effects |
| Styling | Plain CSS, light and dark themes |
| Backend | Rust, `serde_json`, direct Win32 calls (`user32`, `kernel32`) |
| Installer | NSIS, per-user install |
| Package manager | pnpm |

## Development

Prerequisites: [Node.js](https://nodejs.org) 18+, [pnpm](https://pnpm.io), [Rust](https://rustup.rs) (stable) and the [Tauri prerequisites for Windows](https://tauri.app/start/prerequisites/) (Microsoft C++ Build Tools).

```bash
pnpm install    # install dependencies
pnpm dev        # start the app in development mode with hot reload
```

This project lives in a Cargo workspace (`members = ["*/src-tauri"]`), so Rust builds share the workspace `target` folder.

## Build

```bash
pnpm build
```

Outputs, relative to the workspace root:

- `target/release/site-launcher.exe` — portable executable
- `target/release/bundle/nsis/` — installer

### How it works

- **Chrome, Edge, Brave, Vivaldi, Cốc Cốc:** profiles come from the browser's `Local State` file. Opening runs `<browser> --profile-directory=<dir> --new-window <urls...>`.
- **Firefox:** profiles come from `profiles.ini`. Opening runs `firefox -no-remote -P <name> -new-window <first url> -new-tab <other urls...>`. Firefox does not show the profile name on its windows, so "Running" only detects windows opened by Site Launcher. A profile that is already open in Firefox cannot be opened a second time.
- **Closing** tracks the windows the app opened and, for Chromium browsers, windows whose title contains the profile name. Only windows of the matching browser executable are touched.
- Settings and saved sites are stored locally in the app.

If a browser is installed somewhere unusual, adjust `exe_path()` in `src-tauri/src/main.rs`.

## Project structure

```
site-launcher/
├── src/
│   ├── components/
│   │   ├── Avatar.jsx          # profile photo with initials fallback
│   │   ├── Controls.jsx        # pivot, segmented control, radio, checkbox
│   │   ├── Fav.jsx             # colored site badge
│   │   ├── Icons.jsx           # logo and icons
│   │   ├── Row.jsx             # one profile row
│   │   ├── SettingsPanel.jsx   # language, theme, backdrop, window, saved sites
│   │   ├── SitePicker.jsx      # multi-select address box with saved sites (max 5)
│   │   ├── SitesCard.jsx       # default websites card
│   │   └── SitesModal.jsx      # websites for one profile
│   ├── App.jsx                 # main screen and logic
│   ├── i18n.js                 # English and Vietnamese strings
│   ├── main.jsx                # entry point
│   ├── settings.js             # persisted settings
│   ├── sites.js                # address helpers
│   ├── styles.js               # Fluent Design CSS
│   └── tauri.js                # Tauri API wrapper and backdrop effects
├── src-tauri/
│   ├── capabilities/           # window permissions
│   ├── icons/                  # app, setup and uninstall icons, installer images
│   ├── src/main.rs             # detect browsers; list, open, close profiles
│   ├── Cargo.toml
│   ├── build.rs
│   └── tauri.conf.json
├── screenshots/                # image01.png, image02.png, ...
├── index.html
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── vite.config.js
```

## License

MIT, see [LICENSE](LICENSE).
