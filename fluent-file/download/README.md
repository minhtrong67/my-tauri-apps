# download/

Put the Windows installer here so the **Download** button on the landing page (`index.html`) works.

1. Build the app: `npm run build`
2. Copy the installer from `target/release/bundle/nsis/` (workspace root) — it is named like `Fluent File_1.1.0_x64-setup.exe`
3. Paste it into this folder and rename it to **`Fluent-File-Setup.exe`**

The landing page links to `download/Fluent-File-Setup.exe`. To use another file name, change the
`DOWNLOAD_FILE` constant at the top of the `<script>` block in `index.html`.

## Portable build (optional)

`npm run build:portable` builds the app without an installer and copies `fluent-file.exe` here as **`Fluent-File-Portable.exe`**. The landing page offers it as the second download button.
