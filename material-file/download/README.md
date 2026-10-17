# download/

Put the Windows installer here so the **Download** button on the landing page (`index.html`) works.

1. Build the app: `npm run build`
2. Copy the installer from `target/release/bundle/nsis/` (workspace root) — it is named like `Material File_1.0.0_x64-setup.exe`
3. Paste it into this folder and rename it to **`Material-File-Setup.exe`**

The landing page links to `download/Material-File-Setup.exe`. To use another file name, change the
`data-file` constant at the top of the `<script>` block in `index.html` (search for `DOWNLOAD_FILE`).
