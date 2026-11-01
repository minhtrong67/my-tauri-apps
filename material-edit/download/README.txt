Place the installer here:

  Material-Edit_1.1.0_x64-setup.exe

It is created by `npm run build` and found in target/release/bundle/nsis/ of your Cargo workspace
(Tauri names it "Material Edit_1.1.0_x64-setup.exe" - rename the file, replacing the space with a hyphen).
The landing page (../index.html) links to this exact file name.
