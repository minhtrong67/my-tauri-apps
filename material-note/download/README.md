# download/

Put the Windows installer here. The landing page (`../index.html`) links to this exact file name:

```
download/Material-Note-Setup.exe
```

After `npm run build`, take the installer from `<workspace>/target/release/bundle/nsis/`
(`Material Note_x.y.z_x64-setup.exe`), **rename it to `Material-Note-Setup.exe`** and copy it into this folder.
Keeping a fixed name means the landing page never needs editing when you release a new version.
