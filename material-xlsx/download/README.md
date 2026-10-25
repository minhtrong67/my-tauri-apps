# Download folder

Put the Windows installer here after running `npm run build`:

```
src-tauri/target/release/bundle/nsis/Material Xlsx_1.2.0_x64-setup.exe   →   download/Material Xlsx_1.2.0_x64-setup.exe
```

The landing page (`../index.html`) links to exactly this file name. If you change the app version, edit the
`APP` constant at the top of the `<script>` in `index.html` (and the matching `href` of the download buttons).
