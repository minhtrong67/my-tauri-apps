# download/

Put the installers here. The landing page (`../index.html`) links to these exact file names:

| File | Used by |
| --- | --- |
| `Material-Video-Downloader-Setup.exe` | Windows download button (NSIS installer from `target/release/bundle/nsis/`) |
| `Material-Video-Downloader.dmg` | macOS visitors |
| `Material-Video-Downloader.AppImage` | Linux visitors |
| `material-video-downloader-extension.zip` | Chrome extension (created by `npm run pack:extension`) |

Rename the files produced by `npm run build` to the names above after copying them in.
