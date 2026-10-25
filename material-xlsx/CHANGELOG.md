# Changelog

## 1.2.0
- **Added** more file formats: open `.xlsm` / `.xltx` / `.xltm` (macros dropped) and `.json`; export sheet as `.tsv` / `.json`; unsupported types (`.xls`, `.ods`, `.xlsb`) now show a clear message; supported formats are documented in the README, landing page and open dialog
- **Fixed** opening a `.csv` / `.json` / `.xlsm` and pressing Save could overwrite the original file with `.xlsx` data; now Save asks for a new `.xlsx` name and templates open as untitled
- **Changed** new Material 3 Expressive icon set in M3 green: "cookie" tile app icon, installer icon (download badge), uninstaller icon (trash badge), Windows Store tiles, `.ico` / `.icns`, SVG favicon and share image; regenerate with `python scripts/make-icons.py`
- **Changed** landing page: eased smooth scrolling for every in-page link (also with reduced-motion, just shorter), back-to-top button with a scroll-progress ring
- **Added** ~35 functions: SKEW, KURT, PERCENTRANK, TRIMMEAN, FISHER, BINOM.DIST, POISSON.DIST, EXPON.DIST, ERF, SUMX2MY2 / SUMXMY2 / SUMX2PY2, BITAND / BITOR / BITXOR / shifts, ROMAN / ARABIC, BASE / DECIMAL, COT, ACOSH / ASINH / ATANH and more (now 247, all covered by tests)
- **Added** crash recovery: automatic draft every 45 s, restore prompt on next launch
- **Added** single-instance mode, `open-file` hand-over, `.xlsx` / `.csv` / `.tsv` file associations
- **Added** Vite bundling (`npm run dev` / `npm run build` now use Vite + Tauri)
- **Added** Material 3 Expressive layer (spring motion, shape morphing, connected button groups)
- **Added** landing page: theme customiser (presets, custom colour / hex, random, reset), morphing hero shapes, "What's new" section
- **Changed** file I/O uses binary IPC instead of base64; only `.xlsx/.csv/.tsv/.txt` can be read or written
- **Security** strict CSP, sanitised colours read from files (print preview, tab colours), no `innerHTML` for error text
- **Fixed** version fallback, window show timeout (6 s → 3 s), README now lists 4 screenshots

## 1.1.0
- Charts, conditional formatting, data validation, custom sort, format as table, bundled fonts
