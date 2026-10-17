<div align="center">

<img src="src-tauri/icons/icon.png" width="96" alt="Chrome Launcher icon" />

# Chrome Launcher

**Open and close your Chrome profiles in one click, each with the tabs you choose.**

![Author](https://img.shields.io/badge/author-minhtrong67-9aa5ff?style=for-the-badge)
![AI](https://img.shields.io/badge/built%20with%20AI-Claude-6fd6b0?style=for-the-badge)

![Tauri](https://img.shields.io/badge/Tauri-2-24c8db?logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=black)
![Platform](https://img.shields.io/badge/Windows-10%20%7C%2011-0078d4?logo=windows&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

English · [Tiếng Việt](README.vi.md)

</div>

Created by **minhtrong67** with the help of the AI assistant **Claude**.

## Introduction

If you keep several Chrome profiles (work, personal, media, backup...), opening each one and loading the same pages gets repetitive. **Chrome Launcher** reads your Chrome profile list and opens any profile, or many at once, with the websites you pick already loaded in tabs. It can also close them again and shows which profiles are running.

It is a small native app: a Rust backend with a React interface, a few MB on disk.

## Screenshots

<table>
  <tr>
    <td><img src="screenshots/image01.png" alt="Dark theme, Vietnamese" /></td>
    <td><img src="screenshots/image02.png" alt="Tab editor with saved sites dropdown, light theme" /></td>
  </tr>
  <tr>
    <td><img src="screenshots/image03.png" alt="Custom tabs for one profile, dark theme" /></td>
    <td><img src="screenshots/image04.png" alt="Settings panel, light theme, Vietnamese" /></td>
  </tr>
</table>

> The screenshots are renders of the real interface with sample profiles.

## Features

- **Material Design 3.** Every color comes from the included `material-theme.json` (exported from Material Theme Builder), with Material shapes, state layers, ripples and motion.
- **Any website, any number of tabs.** Build a list of tabs to open: add a site, and choose how many tabs of it to open (1 to 20). Leave the list empty to open only the profile.
- **Saved sites dropdown.** Every address you enter or launch is remembered and offered in a dropdown next time, with keyboard navigation. Remove single sites, or clear them all in Settings. Typing `github.com` is enough; `https://` is added for you.
- **Tabs per profile.** Every profile can use the shared tab list or its own custom one. The tab button on each row shows how many tabs it will open.
- **Open fast.** Click a profile to open it. Select several and open them together, or open all.
- **Close profiles.** Close one profile, a selection, or everything that is running. Chrome receives the normal "close window" request, so it can restore your tabs next time.
- **Live status.** A green dot and a "Running" badge show which profiles are open; the list refreshes itself while the app is visible.
- **Search and shortcuts.** Filter by name or email. `Ctrl+F` focuses search, `Ctrl+A` selects all, `Esc` clears search, selection or closes panels.
- **Light, dark or system theme**, plus standard, medium and high contrast, with a smooth transition. The native title bar follows the theme.
- **English and Vietnamese**, switchable at any time.
- **Window behavior.** Choose to *remember the size* you last dragged the window to, or to *always open maximized*.
- **Polished and light.** Staggered list animations, skeleton loading, profile photos loaded on demand, and reduced-motion support.
- **Branded installer.** App, setup and uninstall icons drawn with the theme palette, in standard Windows sizes (16 to 256 px), plus installer artwork and a Vietnamese and English setup wizard.

## Installation

### Requirements

- Windows 10 or 11 (closing profiles is Windows-only; opening works on macOS and Linux too)
- Google Chrome
- Microsoft Edge WebView2 Runtime (already included in Windows 11)

### Install from the setup file

1. Build the installer (see [Build](#build)) or download it from your releases.
2. Run `Chrome Launcher_0.1.0_x64-setup.exe`. It installs for the current user, no administrator rights needed.
3. Start **Chrome Launcher** from the Start menu.

Prefer no installer? Copy `target/release/chrome-launcher.exe` anywhere and run it.

> Pages that need a login open signed out unless that profile is already signed in.

## Tech stack

| Layer | Technology |
| --- | --- |
| Shell | [Tauri 2](https://tauri.app) (Rust) |
| Interface | React 18, Vite 6 |
| Design | Material Design 3, tokens generated from `material-theme.json` |
| Styling | Plain CSS, light and dark schemes with three contrast levels |
| Backend | Rust, `serde_json`, direct Win32 calls (`user32`, `kernel32`) |
| Installer | NSIS, per-user install |

## Development

Prerequisites: [Node.js](https://nodejs.org) 18+, [Rust](https://rustup.rs) (stable) and the [Tauri prerequisites for Windows](https://tauri.app/start/prerequisites/) (Microsoft C++ Build Tools).

```bash
npm install     # install dependencies
npm run dev     # start the app in development mode with hot reload
```

### Customizing the theme

The app reads `material-theme.json` at build time. To restyle it, export a new theme from [Material Theme Builder](https://material-foundation.github.io/material-theme-builder/), replace this file, and run `npm run dev` again. Light, dark and the medium and high contrast schemes are all used.

This project lives in a Cargo workspace (`members = ["*/src-tauri"]`), so Rust builds share the workspace `target` folder.

## Build

```bash
npm run build
```

Outputs, relative to the workspace root:

- `target/release/chrome-launcher.exe` — portable executable
- `target/release/bundle/nsis/` — installer

If Chrome is installed somewhere unusual, adjust `chrome_path()` in `src-tauri/src/main.rs`.

### How it works

Opening runs `chrome.exe --profile-directory=<dir> --new-window <urls...>`, so every address becomes a tab of one new window. Closing tracks the Chrome windows the app opened, and also recognizes windows whose title ends with the profile name (Chrome shows it when you use several profiles). Only windows belonging to `chrome.exe` are touched. Your settings and saved sites are stored locally in the app.

## Project structure

```
chrome-launcher/
├── src/
│   ├── components/
│   │   ├── Avatar.jsx          # profile photo with initials fallback
│   │   ├── Combo.jsx           # address input with saved-sites dropdown
│   │   ├── Controls.jsx        # segmented control and radio option
│   │   ├── Fav.jsx             # colored site badge
│   │   ├── Icons.jsx           # logo and icons
│   │   ├── Row.jsx             # one profile row
│   │   ├── SettingsPanel.jsx   # language, theme, window, saved sites
│   │   ├── TabsCard.jsx        # default tabs: summary chips + editor
│   │   ├── TabsEditor.jsx      # list of sites with tab counts
│   │   └── TabsModal.jsx       # custom tabs for one profile
│   ├── App.jsx                 # main screen and logic
│   ├── i18n.js                 # English and Vietnamese strings
│   ├── main.jsx                # entry point
│   ├── ripple.js               # Material ripple effect
│   ├── settings.js             # persisted settings
│   ├── sites.js                # address helpers
│   ├── styles.js               # Material 3 CSS
│   ├── theme.js                # builds color variables from material-theme.json
│   └── tauri.js                # Tauri API wrapper
├── src-tauri/
│   ├── capabilities/           # window permissions
│   ├── icons/                  # app, setup and uninstall icons, installer images
│   ├── src/main.rs             # list, open, close and detect profiles
│   ├── Cargo.toml
│   └── tauri.conf.json
├── screenshots/                # image01.png ... image04.png
├── index.html
├── material-theme.json         # Material 3 color schemes (source of all colors)
├── package.json
├── vite.config.js
├── LICENSE
└── README.md
```

## License

Released under the [MIT License](LICENSE). Copyright © 2026 **minhtrong67**.

---

<div align="center">

Made by **minhtrong67** · with the help of AI **Claude**

</div>
