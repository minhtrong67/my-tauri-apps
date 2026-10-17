# download

Put the Windows installer built by `npm run build` in this folder, so the **Download** button on the landing page (`../index.html`) works:

```
download/Material Video Player_1.0.0_x64-setup.exe
```

The installer is generated at `src-tauri/target/release/bundle/nsis/` (or `<workspace>/target/release/bundle/nsis/` when the Cargo workspace is used). Keep the file name exactly as Tauri produced it, or update the `href` of the download buttons in `index.html` (search for `x64-setup.exe`) if you rename it or change the version.
