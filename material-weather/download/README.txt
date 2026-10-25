Put the installer built by `npm run build` in this folder, keeping its original file name:

    Material Weather_1.2.0_x64-setup.exe

(Tauri writes it to  <workspace>/target/release/bundle/nsis/ )

The "Download" buttons in ../index.html link to:  download/Material%20Weather_1.2.0_x64-setup.exe
If you change the app version or the file name, update DOWNLOAD_URL at the top of the <script> in index.html.
Until the file exists, the landing page shows a friendly note instead of a broken download.
