Put the Windows installer here after running `npm run build`.

Tauri creates it at:
  src-tauri/../target/release/bundle/nsis/Material Readme_2.0.0_x64-setup.exe
(or <workspace>/target/release/bundle/nsis/ when you use the shared Cargo workspace)

Copy it into this folder WITHOUT renaming it. The landing page (index.html) links to:
  downloads/Material Readme_2.0.0_x64-setup.exe
