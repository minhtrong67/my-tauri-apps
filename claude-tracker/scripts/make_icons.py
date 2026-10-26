"""Sinh toàn bộ icon của Claude Tracker (cần Pillow): python scripts/make_icons.py

Phong cách Material 3 Expressive: khối "cookie" 12 cánh phẳng màu Claude (#D97757) + ba cột mức dùng màu kem.
Một hình học chung -> app icon, setup icon (huy hiệu mũi tên tải xuống), uninstall icon (huy hiệu thùng rác).
Xuất: src-tauri/icons, extension/icons, assets (icon, logo.svg, preview), app/public.
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
S = 1024
CLAUDE = (217, 119, 87, 255)   # #D97757
CREAM = (250, 249, 245, 255)   # #FAF9F5
DARK = (20, 20, 19, 255)       # #141413
DEEP = (176, 84, 52, 255)      # sắc đậm hơn của cam Claude cho nét trên nền trắng


def cookie_points(cx=512, cy=512, r0=488, lobes=12, depth=0.04):
    pts = []
    for i in range(0, 360, 1):
        a = math.radians(i)
        r = r0 * (1 + depth * math.cos(lobes * a)) / (1 + depth)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def base_icon():
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, "RGBA")
    d.polygon(cookie_points(), fill=CLAUDE)
    # ba cột "mức dùng": hai cột đặc + một cột mờ (phần còn lại tới lúc reset)
    # cột thứ ba = kem pha 50% với cam (màu đặc, không dùng alpha để không "đục lỗ" nền trong suốt)
    soft = tuple((c + k) // 2 for c, k in zip(CLAUDE[:3], CREAM[:3])) + (255,)
    for x, top, col in [(236, 470, CREAM), (452, 330, CREAM), (668, 200, soft)]:
        d.rounded_rectangle([x, top, x + 120, 790], 60, fill=col)
    return img


def badge(img, kind):
    cx, cy, r = 770, 770, 235
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).polygon(cookie_points(cx, cy, r + 14, 8, 0.035), fill=(0, 0, 0, 45))
    img = Image.alpha_composite(img, shadow)  # trộn đúng alpha, không ghi đè pixel
    d = ImageDraw.Draw(img, "RGBA")
    if kind == "setup":
        d.polygon(cookie_points(cx, cy, r, 8, 0.035), fill=CREAM)
        c = DEEP
        d.rounded_rectangle([cx - 30, cy - 140, cx + 30, cy + 20], 30, fill=c)
        d.polygon([(cx - 104, cy - 14), (cx + 104, cy - 14), (cx, cy + 96)], fill=c)
        d.rounded_rectangle([cx - 124, cy + 120, cx + 124, cy + 160], 20, fill=c)
    else:
        d.polygon(cookie_points(cx, cy, r, 8, 0.035), fill=DARK)
        w = CREAM
        d.rounded_rectangle([cx - 120, cy - 118, cx + 120, cy - 82], 18, fill=w)
        d.rounded_rectangle([cx - 36, cy - 150, cx + 36, cy - 108], 14, fill=w)
        d.polygon([(cx - 96, cy - 60), (cx + 96, cy - 60), (cx + 78, cy + 130), (cx - 78, cy + 130)], fill=w)
        for dx in (-34, 0, 34):
            d.rounded_rectangle([cx + dx - 8, cy - 28, cx + dx + 8, cy + 96], 8, fill=DARK)
    return img


def sized(img, n):
    return img.resize((n, n), Image.LANCZOS)


def save_ico(img, path, sizes=(16, 24, 32, 48, 64, 128, 256)):
    # PNG nhúng từng kích cỡ -> sắc nét ở mọi mức scale của Windows
    img.save(path, format="ICO", sizes=[(n, n) for n in sizes])


def svg_logo():
    pts = cookie_points(r0=488)
    path = "M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in pts[::2]) + "Z"
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">'
        f'<path d="{path}" fill="#D97757"/>'
        '<rect x="236" y="470" width="120" height="320" rx="60" fill="#FAF9F5"/>'
        '<rect x="452" y="330" width="120" height="460" rx="60" fill="#FAF9F5"/>'
        '<rect x="668" y="200" width="120" height="590" rx="60" fill="#FAF9F5" fill-opacity=".5"/></svg>'
    )


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
    for n in (30, 44, 71, 89, 107, 142, 150, 284, 310):
        sized(app, n).save(ti / f"Square{n}x{n}Logo.png")
    sized(app, 50).save(ti / "StoreLogo.png")

    ei = ROOT / "extension" / "icons"
    ei.mkdir(parents=True, exist_ok=True)
    for n in (16, 32, 48, 128):
        sized(app, n).save(ei / f"{n}.png")

    a = ROOT / "assets"
    a.mkdir(exist_ok=True)
    sized(app, 512).save(a / "icon-512.png")
    sized(app, 180).save(a / "apple-touch-icon.png")
    sized(setup, 256).save(a / "setup-preview.png")
    sized(unins, 256).save(a / "uninstall-preview.png")
    (a / "logo.svg").write_text(svg_logo(), encoding="utf-8")
    print("OK")


if __name__ == "__main__":
    main()
