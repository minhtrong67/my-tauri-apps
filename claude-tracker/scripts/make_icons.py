"""Sinh toàn bộ icon của Claude Tracker (cần Pillow): python scripts/make_icons.py

Một hình học chung -> app icon, setup icon (huy hiệu mũi tên tải xuống), uninstall icon (huy hiệu thùng rác).
Xuất: src-tauri/icons, extension/icons, assets, app/public.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
S = 1024  # canvas gốc, vẽ ở 1024 rồi thu nhỏ bằng LANCZOS cho mép mượt
TOP, BOT = (236, 140, 108), (192, 85, 52)  # gradient accent


def squircle_mask(size, margin, radius):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([margin, margin, size - margin, size - margin], radius, fill=255)
    return m


def base_icon():
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    grad = Image.new("RGBA", (S, S))
    px = grad.load()
    for y in range(S):
        for x in range(S):
            t = (x + y) / (2 * S - 2)
            px[x, y] = tuple(int(TOP[i] + (BOT[i] - TOP[i]) * t) for i in range(3)) + (255,)
    img.paste(grad, (0, 0), squircle_mask(S, 40, 232))
    d = ImageDraw.Draw(img, "RGBA")
    # ba cột "mức dùng": hai cột đặc + một cột mờ (phần còn lại tới lúc reset)
    for x, top, a in [(236, 470, 255), (452, 330, 255), (668, 200, 105)]:
        d.rounded_rectangle([x, top, x + 120, 790], 60, fill=(255, 255, 255, a))
    return img


def badge(img, kind):
    d = ImageDraw.Draw(img, "RGBA")
    cx, cy, r = 760, 760, 250
    if kind == "setup":
        d.ellipse([cx - r - 14, cy - r - 14, cx + r + 14, cy + r + 14], fill=(0, 0, 0, 40))
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, 255))
        c = (190, 80, 48, 255)
        d.rounded_rectangle([cx - 28, cy - 140, cx + 28, cy + 30], 28, fill=c)
        d.polygon([(cx - 100, cy - 10), (cx + 100, cy - 10), (cx, cy + 100)], fill=c)
        d.rounded_rectangle([cx - 120, cy + 120, cx + 120, cy + 160], 20, fill=c)
    else:
        d.ellipse([cx - r - 14, cy - r - 14, cx + r + 14, cy + r + 14], fill=(0, 0, 0, 40))
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(43, 35, 32, 255))
        w = (255, 255, 255, 255)
        d.rounded_rectangle([cx - 120, cy - 120, cx + 120, cy - 84], 18, fill=w)  # nắp
        d.rounded_rectangle([cx - 36, cy - 150, cx + 36, cy - 110], 14, fill=w)  # quai
        d.polygon([(cx - 96, cy - 62), (cx + 96, cy - 62), (cx + 78, cy + 130), (cx - 78, cy + 130)], fill=w)
        for dx in (-34, 0, 34):
            d.rounded_rectangle([cx + dx - 8, cy - 30, cx + dx + 8, cy + 96], 8, fill=(43, 35, 32, 255))
    return img


def sized(img, n):
    return img.resize((n, n), Image.LANCZOS)


def save_ico(img, path, sizes=(16, 24, 32, 48, 64, 128, 256)):
    # PNG nhúng từng kích cỡ -> hiển thị sắc nét ở mọi mức scale của Windows
    img.save(path, format="ICO", sizes=[(n, n) for n in sizes])


def main():
    app = base_icon()
    setup = badge(base_icon(), "setup")
    unins = badge(base_icon(), "uninstall")

    ti = ROOT / "src-tauri" / "icons"
    ti.mkdir(parents=True, exist_ok=True)
    for name, n in [("32x32.png", 32), ("64x64.png", 64), ("128x128.png", 128), ("128x128@2x.png", 256), ("icon.png", 512)]:
        sized(app, n).save(ti / name)
    save_ico(app, ti / "icon.ico")
    save_ico(setup, ti / "setup.ico")
    save_ico(unins, ti / "uninstall.ico")
    # logo cho Microsoft Store / MSIX (Tauri tham chiếu khi build gói Appx)
    for n in (30, 44, 71, 89, 107, 142, 150, 284, 310):
        sized(app, n).save(ti / f"Square{n}x{n}Logo.png")
    sized(app, 50).save(ti / "StoreLogo.png")

    ei = ROOT / "extension" / "icons"
    for n in (16, 32, 48, 128):
        sized(app, n).save(ei / f"{n}.png")

    (ROOT / "assets").mkdir(exist_ok=True)
    sized(app, 512).save(ROOT / "assets" / "icon-512.png")
    sized(app, 180).save(ROOT / "assets" / "apple-touch-icon.png")
    sized(setup, 256).save(ROOT / "assets" / "setup-preview.png")
    sized(unins, 256).save(ROOT / "assets" / "uninstall-preview.png")
    print("OK")


if __name__ == "__main__":
    main()
