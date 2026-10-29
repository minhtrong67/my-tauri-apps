Dat file cai dat vao thu muc nay:

    Material-Screenshot_2.0.0_x64-setup.exe

Sau khi chay `npm run build`, bo cai nam o <workspace>/target/release/bundle/nsis/
(ten file co dau cach: "Material Screenshot_2.0.0_x64-setup.exe"). Hay doi ten thanh
Material-Screenshot_2.0.0_x64-setup.exe roi chep vao day de nut Tai ve trong index.html hoat dong.

Place the installer in this folder:

    Material-Screenshot_2.0.0_x64-setup.exe

After `npm run build` the installer is created in <workspace>/target/release/bundle/nsis/
(the file name contains a space). Rename it and copy it here so the Download buttons in index.html work.
