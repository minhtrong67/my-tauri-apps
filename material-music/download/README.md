# Download folder

Put the Windows installer here. The landing page (`index.html`) links to:

```
download/Material-Music_1.2.0_x64-setup.exe
```

After `npm run build`, copy `target/release/bundle/nsis/Material Music_1.2.0_x64-setup.exe`
(path is relative to your Tauri workspace) into this folder and rename it to the name above (no spaces).

## Auto-update files

`npm run release` also writes `latest.json` here and copies the signed installer. The app reads `download/latest.json` to find new versions. Do not edit it by hand, and delete any test `latest.json` before deploying.
