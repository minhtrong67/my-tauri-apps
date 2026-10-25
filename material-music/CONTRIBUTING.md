# Contributing to Material Music

Thanks for helping! Material Music is open source (MIT) and every contribution is welcome: bug reports, ideas, translations and code.

## Setup

```bash
npm install
npm run dev        # starts Vite + the Tauri window
```

You need Node.js 20+, Rust (stable) and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for Windows.

## Before you open a pull request

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run check:i18n  # English and Vietnamese must have the same texts
npm test            # Vitest (pure logic: lyrics, playlists, smart rules, duplicates, statistics…)
cargo test --manifest-path src-tauri/Cargo.toml
```

## Guidelines

- **Texts** live in `src/lib/i18n.ts`. Add every new text in **both** English and Vietnamese.
- **Icons** come from [Lucide](https://lucide.dev); register new ones in `src/components/icons.ts`.
- **Design**: follow Material 3 Expressive — theme colours via the CSS tokens (`bg-primary`, `text-on-surface`, …), never hard-coded colours, and make sure it works in light and dark mode.
- Dialog buttons need a label, an icon and a colour that matches the action.
- Icon-only buttons need a `title` (it becomes the tooltip and the accessible name).
- Keep the web view offline: network calls belong in Rust (`src-tauri/src`), not in the front end.
- Small, focused pull requests are easier to review. Describe *why* the change is needed.

## Reporting bugs

Use the issue templates and include your Material Music version and Windows version.
