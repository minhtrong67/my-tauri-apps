Icon sources.

- `app-icon.svg` – application icon (render to a 1024 px PNG, then `npx tauri icon <png>`).
- `uninstall-icon.svg` – uninstaller icon (muted colours with a delete badge). Packed into `src-tauri/icons/uninstall.ico` (16, 24, 32, 48, 64, 128, 256 px).
- `make-ui-icons.mjs` – regenerates `src/js/icons.js` from the Material Symbols npm package.
