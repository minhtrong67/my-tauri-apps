# Security Policy

## Supported versions

Only the latest release receives security fixes.

## Reporting a vulnerability

Please do not open a public issue. Report privately through
[GitHub Security Advisories](https://github.com/minhtrong67/material-theme-builder/security/advisories/new).

Include a description, reproduction steps, affected version and operating system, and the potential impact. You can expect an acknowledgement within 7 days and a fix or mitigation plan within 30 days for confirmed issues. Reporters are credited in the release notes unless they prefer otherwise.

## Scope and notes

- The app runs locally, has no accounts and sends no telemetry.
- File access goes through Tauri's dialog and fs plugins, limited by the capabilities in `src-tauri/capabilities/`.
- Release builds are signed for the auto-updater with a minisign key; see [docs/CODE_SIGNING.md](docs/CODE_SIGNING.md). Only install builds from the official [Releases](https://github.com/minhtrong67/material-theme-builder/releases) page.
