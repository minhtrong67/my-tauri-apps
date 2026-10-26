# Releasing

Releases are built by GitHub Actions ([`release.yml`](../.github/workflows/release.yml)) when a tag starting with `v` is pushed. It builds Windows, macOS (universal) and Linux installers and creates a **draft** GitHub release.

## How users get updates

The app does not install updates by itself. Use the **Check for updates** button on the app card at the bottom of **Settings** asks the GitHub API for the latest published release, compares its tag with the installed version and, if newer, offers a button that opens the release page. No signing key or update server is needed. The landing page offers the same downloads.

## Cutting a release

1. Bump the version in `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` and `app/src/lib/update.ts` (`APP_VERSION`). `npm test` fails if they disagree.
2. Update the installer file names in `index.html` (`FILES` and the download links) if the version is part of them.
3. Commit: `chore: release v1.2.3`.
4. Tag and push:

   ```bash
   git tag v1.2.3
   git push origin main --tags
   ```

5. Wait for the **Release** workflow. Open the draft release, check the installers are attached, edit the notes, then publish. Only published (non-draft) releases are seen by the update check.

## Local test build

```bash
npm run build
```

Artifacts are written under `target/release/bundle/` of the Cargo workspace (or `src-tauri/target/release/bundle/` when the repo is used standalone).

## Optional: signed in-place updates later

Tauri also offers a signed updater (`tauri-plugin-updater`). It needs a key pair from `npx tauri signer generate`, the public key and an endpoint in `tauri.conf.json`, `bundle.createUpdaterArtifacts`, the private key as a CI secret and `uploadUpdaterJson: true`. It is not enabled here because a lost or leaked key breaks updates for every install. See [Code signing](CODE_SIGNING.md) for the separate OS-level signing.
