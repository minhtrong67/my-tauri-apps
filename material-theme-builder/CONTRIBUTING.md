# Contributing

Thanks for helping improve Material Theme Builder, created by [minhtrong67](https://github.com/minhtrong67) with AI assistance from Claude. By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md). Contributions are licensed under the project's MIT license.

## Setup

Requirements: Node.js 22+, Rust (stable) and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS.

```bash
git clone https://github.com/minhtrong67/material-theme-builder.git
cd material-theme-builder
npm install
npm run dev
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Launch the desktop app (`tauri dev`) with hot reload |
| `npm run build` | Build installers (`tauri build`) |
| `npm run dev:web` | Run only the Vite frontend in a browser |
| `npm run build:web` | Type-check (`tsc --noEmit`) and build the frontend |
| `npm test` | Run unit tests with Vitest |
| `npm run icons` | Regenerate app, setup and uninstall icons |

## Tauri versions

Every Tauri crate in `src-tauri/Cargo.toml` and its npm twin in `package.json` must share the same major.minor version (for example `tauri-plugin-fs` `~2.7` and `@tauri-apps/plugin-fs` `~2.7.1`), otherwise `npm run dev` stops with "version mismatched Tauri packages". Bump both sides together, then run `npm install` and `npx tauri info` to confirm they match.

## Code style

- TypeScript strict, functional React components and hooks, Tailwind 4 utility classes.
- Colors come from the `--md-*` theme variables; never hard-code colors in components.
- Icons come from `lucide-react`. Every icon-only button needs a `Tooltip`.
- Keep pure logic in `app/src/lib/` with a `*.test.ts` file next to it.
- Every UI change must work in light and dark mode and at the minimum window size.

## Commit style

[Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`. Keep the subject under 72 characters, in the imperative mood.

## Pull request checklist

- [ ] Branch from `main`, one focused change per PR
- [ ] `npm run build:web` and `npm test` pass
- [ ] Tests added or updated for logic changes
- [ ] Strings added in both English and Vietnamese
- [ ] Screenshots for visual changes (light and dark)
- [ ] README or docs updated when behavior changes

## How to add an export format

1. In `app/src/lib/export.ts`, add the id to the `ExportFormat` union and an entry to `EXPORT_FORMATS` (`id`, `label`, `file`, `ext`).
2. Write a builder function that takes `ExportInput` and returns a string, and add a `case` for it in `buildExport`.
3. Add i18n strings if the format has a description or hint (see below).
4. The existing tests in `export.test.ts` iterate over `EXPORT_FORMATS`, so your format is checked automatically for non-empty output containing the light primary color. Add format-specific assertions if useful.

## How to add an i18n key

1. Open `app/src/lib/i18n.ts`.
2. Add the key to the English dictionary, then the same key to the Vietnamese dictionary. A missing key in either language is a bug.
3. Use it through the translation hook (`t("your.key")`) instead of literal strings in JSX.

## How to add an accent color

1. Open `app/src/state/settings.tsx` and add an entry to the `ACCENTS` array: `{ id, hex, en, vi }` (seed color plus English and Vietnamese names). The app derives the full Material 3 scheme from the seed.
2. To add a quick-pick swatch for the theme builder instead, append a hex value to `QUICK_PICKS` in `app/src/lib/theme.ts`.
3. Check the result in light and dark mode, including the contrast checker.

## How to add a language

1. In `app/src/lib/i18n.ts`, add the language code to the language union and a complete dictionary with the same keys as English.
2. Add the option to the language picker in Settings and, if the language needs a specific font subset, to the font list.
3. For the landing page, add a matching dictionary to `I18N` in `index.html` and a button in the language switcher.

## How to add a font

1. Install the package, for example `npm i @fontsource/your-font`.
2. Import the weights you need in the app entry file and register the font in the settings font list (`app/src/state/settings.tsx`).
3. Check light and dark mode, all three text sizes and Vietnamese diacritics.

## Project structure

```
app/            React + TypeScript frontend (components, lib, state, tests)
src-tauri/      Rust shell, Tauri config, capabilities and icons
scripts/        Icon generation and tooling
screenshots/    README and landing page images
docs/           Extra documentation (code signing)
index.html      Single-file landing page
.github/        CI, release workflow and templates
```

## Code signing

Release builds work without any secrets, but unsigned installers trigger warnings. Signing requires a certificate that belongs to the author or publisher; contributors cannot sign official builds and forks must use their own certificates.

- **Windows**: obtain a code-signing certificate (OV or EV) from a certificate authority, or use a cloud signing service. Windows SmartScreen builds reputation over time; EV certificates get it sooner, OV certificates may still warn for a while. In CI, set the `WINDOWS_CERTIFICATE` (base64 PFX) and `WINDOWS_CERTIFICATE_PASSWORD` secrets and the release workflow imports the certificate and configures Tauri. For custom tools such as Azure Trusted Signing or a hardware token, use `bundle.windows.signCommand` in `tauri.conf.json`.
- **macOS**: requires an Apple Developer account. Provide `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD` (app-specific password) and `APPLE_TEAM_ID`; tauri-action signs and notarizes the app.
- **Updater**: update bundles are signed separately with `TAURI_SIGNING_PRIVATE_KEY`.

See [docs/CODE_SIGNING.md](docs/CODE_SIGNING.md) for details.
