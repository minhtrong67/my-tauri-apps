# Contributing to Fluent Music

Thanks for helping! Fluent Music is open source (MIT) and every contribution is welcome: bug reports, ideas, translations and code.

## Setup

```bash
pnpm install
pnpm dev        # starts Vite + the Tauri window
```

You need Node.js 20+, Rust (stable) and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for Windows.

## Before you open a pull request

```bash
pnpm typecheck   # TypeScript
pnpm lint        # ESLint
pnpm check:i18n  # English and Vietnamese must have the same texts
pnpm test            # Vitest (pure logic: lyrics, playlists, smart rules, duplicates, statistics…)
cargo test --manifest-path src-tauri/Cargo.toml
```

## Guidelines

- **Texts** live in `src/lib/i18n.ts`. Add every new text in **both** English and Vietnamese.
- **Icons** come from [Fluent System Icons](https://github.com/microsoft/fluentui-system-icons) (`@fluentui/react-icons`); register new ones in `src/components/icons.ts` (a Regular glyph at 20 and 24 px, optionally Filled for active states).
- **Design**: follow Fluent 2 / Windows 11 — 4px control radius, 8px for cards and overlays, colours only via the CSS tokens (`bg-primary`, `text-on-surface`, `bg-card`, `bg-subtle` …), never hard-coded, and make sure it works in light and dark mode and on all three window materials.
- Dialog buttons need a label, an icon and a colour that matches the action.
- Icon-only buttons need a `title` (it becomes the tooltip and the accessible name).
- Keep the web view offline: network calls belong in Rust (`src-tauri/src`), not in the front end.
- Small, focused pull requests are easier to review. Describe *why* the change is needed.

## Reporting bugs

Use the issue templates and include your Fluent Music version and Windows version.
