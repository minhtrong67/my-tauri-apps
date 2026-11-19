<div align="center">
  <img src="public/icon.png" width="96" alt="Fluent Folder Icon" />

# Fluent Folder Icon

**Change folder icons and colors on Windows 11 and 10, add custom text to any folder.**
Icons stay put and don't revert after a restart. Apply to multiple folders at once and restore with one click.

Built with **Tauri 2 · React · TailwindCSS 4 · Vite · pnpm** in Microsoft **Fluent Design**.
</div>

> **System compatibility:** works as a folder icon changer, folder colorizer, folder customizer and `.ico` file creator for Windows 11 and Windows 10. Supports high-DPI and 4K displays.

## Screenshots

| | |
|---|---|
| ![Main window](screenshots/image01.png) | ![Icon library](screenshots/image02.png) |
| ![Presets](screenshots/image03.png) | ![Settings – backdrop material](screenshots/image04.png) |

## Features

- **Folder design** – 8 styles including the default **Windows 11** and Windows 10 folders (plus Classic, Flat, Minimal, Outline, Glass, Neon), 22 ready-made colors, 18 popular gradients, solid / linear / radial fills, full-spectrum picker, 7 pattern fills.
- **Icons (8,000+)** – solid Material Design icons (7,000+), solid Font Awesome (1,900+), **app logos** (TikTok, Facebook, GitHub, YouTube… 3,000+ brands), 1,500+ searchable emoji in 8 categories, outline Lucide icons, or your own image. Optional circle / rounded backdrop, opacity, offset, shadow and Multiply / Screen / Overlay blending.
- **Text on folders** – font, color, size, letter spacing, line height, opacity, outline and shadow.
- **Icons that stick** – applied with Windows' native `desktop.ini`, so they survive reboots and travel with the folder.
- **Customized folders memory** – every folder you apply an icon to is remembered in a "Customized" tab, so you can select many and restyle, restore or re-add them to the list in one click.
- **Batch apply** – select many folders (drag & drop supported) and apply one design to all of them.
- **Presets** – 28 built-in presets (Work, Documents, Downloads, GitHub, TikTok…); save the whole design, reapply with one click, export / import as JSON.
- **Right-click launch** – optional "Customize with Fluent Folder Icon" entry in the folder context menu.
- **Restore** – put one or many folders back to the default icon, leaving no `desktop.ini` behind.
- **Export `.ico`** – multi-size (256 → 16 px) icon file.
- **Fluent settings** – Light / Dark / System theme, accent color, English + Tiếng Việt, window startup mode, and the backdrop material:

| Material | Notes |
|---|---|
| **Mica** (default) | Subtle wallpaper tint, Windows 11 |
| **Mica Alt** | Stronger tint, Windows 11 |
| **Acrylic** | Frosted glass blur |
| **Blur** | Windows 10 blur-behind |
| **Liquid Glass** | Glossy refractive glass, pill controls, animated ambient light |
| **Frosted Glass** | Heavy blur, milky tint, fine grain |
| **None** | Solid background |

## Project layout

Put this folder next to the shared Cargo workspace (`Cargo.toml` with `members = ["*/src-tauri"]`); it is picked up automatically and shares the `target/` cache.

```
fluent-folder-icon/
├─ src/                React + Tailwind UI (render.ts draws the folder on canvas)
├─ src-tauri/          Rust backend (desktop.ini, shell refresh, registry, dialogs)
└─ screenshots/        image01.png, image02.png, …
```

## Run

Requirements: Node 20+, pnpm, Rust (MSVC toolchain) and the WebView2 runtime (Windows 10/11).

```bash
pnpm install
pnpm dev        # tauri dev
pnpm build      # tauri build → NSIS installer in target/release/bundle
```

`pnpm web:dev` runs only the Vite UI in a browser (previews work, applying icons does not).

## How icons are applied

1. The design is drawn on a canvas and encoded as a multi-size `.ico`.
2. The backend writes `fluent-folder-icon-<timestamp>.ico` (hidden + system) into the folder and sets `IconResource` in `desktop.ini`. A fresh file name each time defeats Explorer's icon cache.
3. The folder gets the read-only attribute (required by Windows to honor `desktop.ini`) and Explorer is notified, so no restart is needed.
4. **Restore** removes the icon file and the icon keys; `desktop.ini` is deleted when nothing else remains in it.

## Credits

Author **minhtrong67** · built with **Claude** (AI support).
