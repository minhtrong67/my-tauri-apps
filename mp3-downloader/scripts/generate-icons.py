#!/usr/bin/env python3
"""Sinh toàn bộ bộ icon (app, setup, uninstall, NSIS, favicon, og-image) theo phong cách Material 3 Expressive.
Chạy:  pip install pillow && python scripts/generate-icons.py
Hình khối: "cookie" nhiều thùy (scalloped) — một trong các hình dạng đặc trưng của M3 Expressive."""
import math, os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS = os.path.join(ROOT, "src-tauri", "icons")
S = 2048  # vẽ ở 2048 rồi thu nhỏ để mượt viền
K = S / 1024

GREEN = ((0x7C, 0xCB, 0x7F), (0x2E, 0x8B, 0x3A))      # Material Green: sáng → đậm (nền chính)
GREEN_DARK = (0x1B, 0x5E, 0x20)
SLATE = ((0x8F, 0xA4, 0xAE), (0x4F, 0x66, 0x72))      # Blue Grey cho trình gỡ cài đặt
WHITE = (255, 255, 255, 255)

def cookie_pts(cx, cy, R, lobes=12, amp=0.045, steps=720):
    pts = []
    for i in range(steps):
        a = i / steps * math.tau
        r = R * (1 + amp * math.cos(lobes * a)) / (1 + amp)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts

def gradient(size, top, bottom):
    g = Image.new("RGBA", (size, size))
    d = ImageDraw.Draw(g)
    for y in range(size):
        t = y / (size - 1)
        d.line([(0, y), (size, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)) + (255,))
    return g

def base(colors):
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).polygon(cookie_pts(S / 2, S / 2, S * 0.485), fill=255)
    img.paste(gradient(S, *colors), (0, 0), mask)
    # highlight mềm phía trên
    hl = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(hl).ellipse([S * 0.18, S * 0.05, S * 0.82, S * 0.5], fill=(255, 255, 255, 46))
    hl = hl.filter(ImageFilter.GaussianBlur(60 * K))
    clip = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    clip.paste(hl, (0, 0), mask)
    return Image.alpha_composite(img, clip), mask

def shadowed(img, draw_fn, color=WHITE, blur=14, off=14, alpha=70, shade=(0, 40, 0)):
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(layer), color)
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    a = layer.split()[3].point(lambda v: v * alpha // 255)
    sh.paste(Image.new("RGBA", (S, S), shade + (255,)), (int(off * K * 0.3), int(off * K)), a)
    sh = sh.filter(ImageFilter.GaussianBlur(blur * K))
    return Image.alpha_composite(Image.alpha_composite(img, sh), layer)

def rrect(d, box, r, fill):
    d.rounded_rectangle([v * K for v in box], radius=r * K, fill=fill)

def poly(d, pts, fill):
    d.polygon([(x * K, y * K) for x, y in pts], fill=fill)

def ellipse_rot(d, cx, cy, rx, ry, deg, fill):
    pts = []
    t = math.radians(deg)
    for i in range(120):
        a = i / 120 * math.tau
        x, y = rx * math.cos(a), ry * math.sin(a)
        pts.append((cx + x * math.cos(t) - y * math.sin(t), cy + x * math.sin(t) + y * math.cos(t)))
    poly(d, pts, fill)

def note(d, c):  # nốt nhạc đôi
    ellipse_rot(d, 392, 650, 88, 66, -22, c); ellipse_rot(d, 648, 598, 88, 66, -22, c)
    rrect(d, (432, 300, 478, 660), 22, c); rrect(d, (688, 248, 734, 608), 22, c)
    poly(d, [(432, 300), (734, 246), (734, 350), (432, 404)], c)

def arrow_down(d, cx, cy, s, c):  # mũi tên tải xuống, s = nửa chiều rộng
    rrect(d, (cx - s * .28, cy - s * 1.0, cx + s * .28, cy + s * .25), s * .28, c)
    poly(d, [(cx - s * .82, cy - s * .08), (cx + s * .82, cy - s * .08), (cx, cy + s * .8)], c)

def badge(img):
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([(722 - 150) * K, (722 - 150) * K, (722 + 150) * K, (722 + 150) * K], fill=GREEN_DARK + (255,))
    img = Image.alpha_composite(img, layer)
    d = ImageDraw.Draw(img)
    arrow_down(d, 722, 706, 72, WHITE)
    rrect(d, (648, 786, 796, 806), 10, WHITE)
    return img

def app_icon():
    img, _ = base(GREEN)
    img = shadowed(img, lambda d, c: note(d, c))
    return badge(img)

def setup_icon():  # mũi tên đi vào khay = cài đặt
    img, _ = base(GREEN)
    def g(d, c):
        arrow_down(d, 512, 440, 190, c)
        rrect(d, (262, 720, 762, 790), 35, c); rrect(d, (262, 640, 332, 790), 35, c); rrect(d, (692, 640, 762, 790), 35, c)
    return shadowed(img, g)

def uninstall_icon():  # thùng rác
    img, _ = base(SLATE)
    def g(d, c):
        rrect(d, (330, 330, 694, 372), 21, c); rrect(d, (440, 270, 584, 335), 28, c)
        poly(d, [(366, 420), (658, 420), (632, 760), (392, 760)], c)
        rrect(d, (366, 400, 658, 450), 22, c); rrect(d, (392, 700, 632, 780), 40, c)
    img = shadowed(img, g, shade=(10, 20, 30))
    d = ImageDraw.Draw(img)
    for x in (452, 512, 572):  # rãnh trên thân thùng
        d.rounded_rectangle([(x - 12) * K, 480 * K, (x + 12) * K, 690 * K], radius=12 * K, fill=SLATE[1] + (255,))
    return img

def out(img, size):
    return img.resize((size, size), Image.LANCZOS)

def save_set(img, name_png=None, ico=None, sizes=(16, 24, 32, 48, 64, 128, 256)):
    big = out(img, 1024)
    if ico:
        out(img, 256).save(os.path.join(ICONS, ico), sizes=[(s, s) for s in sizes])
    return big

def main():
    os.makedirs(ICONS, exist_ok=True)
    app, setup, unin = app_icon(), setup_icon(), uninstall_icon()
    big = save_set(app, ico="icon.ico")
    out(app, 512).save(os.path.join(ICONS, "icon.png"))
    for n, s in (("32x32.png", 32), ("64x64.png", 64), ("128x128.png", 128), ("128x128@2x.png", 256)):
        out(app, s).save(os.path.join(ICONS, n))
    big.save(os.path.join(ICONS, "icon.icns"), format="ICNS")
    save_set(setup, ico="installer.ico"); save_set(unin, ico="uninstaller.ico")
    # NSIS: header 150x57, sidebar 164x314 (BMP 24-bit)
    hdr = Image.new("RGB", (150, 57), (0xE8, 0xF5, 0xE9)); hdr.paste(out(app, 44), (100, 6), out(app, 44)); hdr.save(os.path.join(ICONS, "nsis-header.bmp"))
    side = Image.new("RGB", (164, 314)); sd = ImageDraw.Draw(side)
    for y in range(314):
        t = y / 313; sd.line([(0, y), (164, y)], fill=(int(0x2E + (0x7C - 0x2E) * t * .55), int(0x7D + (0xCB - 0x7D) * t * .55), int(0x32 + (0x7F - 0x32) * t * .55)))
    big_c = Image.new("RGBA", (164, 164), (0, 0, 0, 0)); big_c.paste(out(app, 132), (16, 16))
    side.paste(big_c, (0, 34), big_c); side.save(os.path.join(ICONS, "nsis-sidebar.bmp"))
    # tài nguyên cho giao diện và landing page
    out(app, 256).save(os.path.join(ROOT, "app", "public", "app-icon.png"))
    out(app, 256).save(os.path.join(ROOT, "assets", "icon.png"))
    out(app, 512).save(os.path.join(ROOT, "assets", "icon-512.png"))
    out(setup, 128).save(os.path.join(ROOT, "assets", "icon-setup.png")); out(unin, 128).save(os.path.join(ROOT, "assets", "icon-uninstall.png"))
    og()
    favicon()

def font(size, bold=True):
    for p in ("C:/Windows/Fonts/segoeuib.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def og():
    W, H = 1200, 630
    im = Image.new("RGB", (W, H), (0xEE, 0xF8, 0xEC)); d = ImageDraw.Draw(im, "RGBA")
    for cx, cy, r, col in ((1050, 80, 300, (0xB7, 0xF3, 0x97, 255)), (120, 640, 260, (0xC8, 0xE6, 0xC9, 255)), (640, -80, 180, (0xDC, 0xED, 0xC8, 255))):
        d.polygon(cookie_pts(cx, cy, r, 10, .05, 360), fill=col)
    icon = out(app_icon(), 360); im.paste(icon, (760, 135), icon)
    d.text((80, 190), "MP3 Downloader", font=font(84), fill=(0x1B, 0x3B, 0x1F))
    d.text((84, 300), "YouTube · TikTok · Spotify → MP3", font=font(40), fill=(0x2E, 0x6B, 0x35))
    d.rounded_rectangle([84, 380, 470, 452], radius=36, fill=(0x2E, 0x8B, 0x3A)); d.text((120, 392), "Free & open source", font=font(36), fill=WHITE)
    d.text((84, 540), "Material 3 Expressive  ·  by minhtrong67 with Claude", font=font(28), fill=(0x4A, 0x6B, 0x4D))
    im.save(os.path.join(ROOT, "assets", "og-image.png"))

def favicon():
    pts = " ".join(f"{x/2:.1f},{y/2:.1f}" for x, y in cookie_pts(512, 512, 496, 12, .045, 240))
    pts = " ".join(f"{x:.1f},{y:.1f}" for x, y in cookie_pts(512, 512, 496, 12, .045, 240))
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7CCB7F"/><stop offset="1" stop-color="#2E8B3A"/></linearGradient></defs><polygon points="{pts}" fill="url(#g)"/><g fill="#fff"><ellipse cx="392" cy="650" rx="88" ry="66" transform="rotate(-22 392 650)"/><ellipse cx="648" cy="598" rx="88" ry="66" transform="rotate(-22 648 598)"/><rect x="432" y="300" width="46" height="360" rx="22"/><rect x="688" y="248" width="46" height="360" rx="22"/><polygon points="432,300 734,246 734,350 432,404"/></g><circle cx="722" cy="722" r="150" fill="#1B5E20"/><g fill="#fff"><rect x="702" y="634" width="40" height="90" rx="20"/><polygon points="663,700 781,700 722,764"/><rect x="648" y="786" width="148" height="20" rx="10"/></g></svg>'''
    open(os.path.join(ROOT, "assets", "favicon.svg"), "w").write(svg)

if __name__ == "__main__":
    main()
