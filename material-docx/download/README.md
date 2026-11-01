# Download folder

Put the Windows setup file here and name it:

    Material-Docx-Setup.exe

The landing page (`../index.html`) links to `download/Material-Docx-Setup.exe`. If that file is missing it also tries the
default Tauri name `Material Docx_2.3.0_x64-setup.exe`.

Installers are produced by `npm run build` in `target/release/bundle/nsis/` (at the Cargo workspace root).
