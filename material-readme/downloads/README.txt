Place the Windows installer here:

    Material Readme_3.0.0_x64-setup.exe

After running `npm run build`, copy it from
    <workspace>/target/release/bundle/nsis/
(or src-tauri/target/release/bundle/nsis/ when the project is built on its own).

The landing page (../index.html) and the README link to this exact file name.
If the version in package.json changes, update the file name in index.html
(tools/landing/landing.template.html) and rebuild it with:
    npx tsx tools/landing/build-landing.mjs

------------------------------------------------------------------------
Đặt bộ cài Windows vào đây:

    Material Readme_3.0.0_x64-setup.exe

Sau khi chạy `npm run build`, hãy chép tệp từ
    <workspace>/target/release/bundle/nsis/
Trang giới thiệu (../index.html) và README liên kết đúng tới tên tệp này.
