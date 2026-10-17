# download

Put the installer built by `npm run build` in this folder, keeping its file name:

```
Material CSV_2.0.0_x64-setup.exe
```

The landing page (`index.html` in the project root) links to `download/Material%20CSV_2.0.0_x64-setup.exe`.
After a new build, copy the file from `target/release/bundle/nsis/` (workspace root) into this folder.
If you change the version, update `VERSION` / `FILE` at the top of the script in `index.html`.
