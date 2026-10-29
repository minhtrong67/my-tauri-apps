# Download folder

Drop the installer produced by `npm run build` into this folder **without renaming it**:

```
src-tauri/target/release/bundle/nsis/Material JSON_1.1.0_x64-setup.exe   →   download/
```

(When the project lives inside the shared Tauri workspace the bundle is at `../target/release/bundle/nsis/`.)

The landing page (`index.html`) links to `download/Material%20JSON_1.1.0_x64-setup.exe`.
When you bump the version, update that link in `index.html` (search for `x64-setup.exe`).
