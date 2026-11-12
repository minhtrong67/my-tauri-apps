#!/usr/bin/env python3
"""Sinh toàn bộ bộ icon của Fluent MP3 theo phong cách Microsoft Fluent Design (Windows 11).

Chạy:  pip install pillow numpy && python scripts/generate-icons.py

Ngôn ngữ thiết kế: ô vuông bo góc kiểu Windows 11, nền gradient xanh "Windows blue",
viền sáng mảnh phía trên, bóng đổ mềm, nốt nhạc trắng và huy hiệu "tải xuống" bằng kính mờ.
"""
import math
import os

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS = os.path.join(ROOT, "src-tauri", "icons")
S = 2048            # vẽ ở 2048 rồi thu nhỏ để viền mượt
K = S / 1024        # hệ toạ độ thiết kế: 1024 × 1024

BLUE = ((0x5F, 0xCB, 0xFF), (0x00, 0x78, 0xD4), (0x00, 0x3F, 0x92))      # sáng → chuẩn → đậm
SLATE = ((0xA3, 0xB1, 0xC2), (0x5E, 0x6E, 0x82), (0x2F, 0x3A, 0x49))     # trình gỡ cài đặt
ACCENT_ON_WHITE = (0x00, 0x5F, 0xB8)
WHITE = (255, 255, 255, 255)


def sc(v):
    return v * K


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def diagonal_gradient(colors):
    """Gradient chéo (trên-trái → dưới-phải) 3 điểm dừng."""
    c0, c1, c2 = (np.array(c, dtype=np.float32) for c in colors)
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    t = (xx + yy) / (2 * (S - 1))
    a = np.clip(t / 0.55, 0, 1)[..., None]
    b = np.clip((t - 0.55) / 0.45, 0, 1)[..., None]
    lo = c0 + (c1 - c0) * a
    hi = c1 + (c2 - c1) * b
    rgb = np.where((t < 0.55)[..., None], lo, hi)
    out = np.dstack([rgb, np.full((S, S), 255, dtype=np.float32)])
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def tile_mask(inset=70, radius=206):
    m = Image.new("L", (S, S), 0)
    ImageDraw.Draw(m).rounded_rectangle([sc(inset), sc(inset), S - sc(inset), S - sc(inset)], radius=sc(radius), fill=255)
    return m


def blur(img, r):
    return img.filter(ImageFilter.GaussianBlur(sc(r)))


def tinted_shadow(alpha_mask, dy, r, alpha, color=(0, 20, 70)):
    """Bóng đổ mềm từ một mặt nạ alpha."""
    a = alpha_mask.point(lambda v: v * alpha // 255)
    layer = Image.new("RGBA", (S, S), color + (0,))
    layer.putalpha(a)
    layer = ImageChops.offset(layer, 0, int(sc(dy)))
    return blur(layer, r)


def brush(d, pts, width, fill, taper=None):
    """Nét vẽ tròn đầu: nối các điểm bằng chuỗi hình tròn."""
    for i, (x, y) in enumerate(pts):
        w = width if taper is None else width * (1 + (taper - 1) * i / max(1, len(pts) - 1))
        r = sc(w) / 2
        d.ellipse([sc(x) - r, sc(y) - r, sc(x) + r, sc(y) + r], fill=fill)


def bezier(p0, p1, p2, p3, n=90):
    out = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        out.append((
            u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
            u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1],
        ))
    return out


def line_pts(a, b, n=40):
    return [(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n) for i in range(n + 1)]


def note_layer(dx=0, dy=0):
    """Nốt móc đơn màu trắng."""
    lay = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    cx, cy, rx, ry, ang = 352 + dx, 650 + dy, 124, 96, math.radians(-24)
    pts = []
    for i in range(240):
        t = i / 240 * math.tau
        x, y = rx * math.cos(t), ry * math.sin(t)
        pts.append((sc(cx + x * math.cos(ang) - y * math.sin(ang)), sc(cy + x * math.sin(ang) + y * math.cos(ang))))
    d.polygon(pts, fill=WHITE)                                                                  # thân nốt
    d.rounded_rectangle([sc(430 + dx), sc(246 + dy), sc(482 + dx), sc(660 + dy)], radius=sc(24), fill=WHITE)  # cán
    flag = bezier((456 + dx, 262 + dy), (560 + dx, 318 + dy), (676 + dx, 372 + dy), (652 + dx, 510 + dy))
    brush(d, flag, 54, WHITE, taper=0.62)                                                       # cờ nốt
    return lay


def badge_layer(arrow, cx=706, cy=706, r=176, simple=False):
    lay = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    d.ellipse([sc(cx - r), sc(cy - r), sc(cx + r), sc(cy + r)], fill=(255, 255, 255, 246))
    col = tuple(arrow) + (255,)
    w = 40
    brush(d, line_pts((cx, cy - 78), (cx, cy + 40)), w, col)
    brush(d, line_pts((cx - 62, cy - 22), (cx, cy + 46)), w, col)
    brush(d, line_pts((cx + 62, cy - 22), (cx, cy + 46)), w, col)
    if not simple:
        brush(d, line_pts((cx - 70, cy + 92), (cx + 70, cy + 92)), 34, col)
    return lay


def draw_icon(colors=BLUE, arrow=ACCENT_ON_WHITE, simple=False):
    mask = tile_mask()
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    img = Image.alpha_composite(img, tinted_shadow(mask, dy=22, r=26, alpha=95))

    tile = diagonal_gradient(colors)
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([sc(40), sc(-220), sc(760), sc(420)], fill=(255, 255, 255, 70))
    tile = Image.alpha_composite(tile, blur(glow, 70))                       # ánh sáng mềm như Mica
    clipped = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    clipped.paste(tile, (0, 0), mask)
    img = Image.alpha_composite(img, clipped)

    # viền sáng mảnh: đậm ở trên, mờ dần xuống dưới
    edge = ImageChops.subtract(mask, mask.filter(ImageFilter.MinFilter(9)))
    fade = ImageChops.invert(Image.linear_gradient("L").resize((S, S))).point(lambda v: int(v * 0.55))
    rim = Image.new("RGBA", (S, S), (255, 255, 255, 0))
    rim.putalpha(ImageChops.multiply(edge, fade))
    img = Image.alpha_composite(img, rim)

    note = note_layer(dx=8, dy=-26)
    img = Image.alpha_composite(img, tinted_shadow(note.split()[3], dy=14, r=16, alpha=100))
    img = Image.alpha_composite(img, note)

    badge = badge_layer(arrow, simple=simple)
    img = Image.alpha_composite(img, tinted_shadow(badge.split()[3], dy=14, r=16, alpha=120))
    img = Image.alpha_composite(img, badge)
    return img


def save_png(img, path, size):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.resize((size, size), Image.LANCZOS).save(path, optimize=True)


def save_ico(frames_by_size, path):
    sizes = sorted(frames_by_size)
    ordered = [frames_by_size[s] for s in sizes]
    os.makedirs(os.path.dirname(path), exist_ok=True)
    ordered[-1].save(path, format="ICO", sizes=[(s, s) for s in sizes], append_images=ordered[:-1])


def nsis_header(icon, path):
    """150×57: nền sáng kiểu Mica, biểu tượng ở bên phải."""
    w, h = 150, 57
    bg = Image.new("RGB", (w, h))
    px = bg.load()
    for y in range(h):
        for x in range(w):
            px[x, y] = lerp((250, 250, 250), (226, 238, 250), x / (w - 1))
    ic = icon.resize((44, 44), Image.LANCZOS)
    bg.paste(ic, (w - 52, (h - 44) // 2), ic)
    bg.save(path, format="BMP")


def nsis_sidebar(icon, path):
    """164×314: gradient xanh đậm với vầng sáng, biểu tượng ở phía trên."""
    w, h = 164, 314
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    t = np.clip(yy / (h - 1) * 0.8 + xx / (w - 1) * 0.2, 0, 1)[..., None]
    a, b = np.array((0x00, 0x78, 0xD4), np.float32), np.array((0x00, 0x2A, 0x66), np.float32)
    bg = Image.fromarray((a + (b - a) * t).astype(np.uint8), "RGB").convert("RGBA")
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([-60, -80, 150, 120], fill=(255, 255, 255, 40))
    bg = Image.alpha_composite(bg, glow.filter(ImageFilter.GaussianBlur(24)))
    bg.alpha_composite(icon.resize((96, 96), Image.LANCZOS), ((w - 96) // 2, 36))
    bg.convert("RGB").save(path, format="BMP")


def main():
    main_icon = draw_icon(BLUE)
    small_icon = draw_icon(BLUE, simple=True)               # bản đơn giản cho kích thước nhỏ
    slate_icon = draw_icon(SLATE, arrow=(0x4A, 0x58, 0x6A))
    slate_small = draw_icon(SLATE, arrow=(0x4A, 0x58, 0x6A), simple=True)

    save_png(main_icon, os.path.join(ICONS, "icon.png"), 512)
    save_png(main_icon, os.path.join(ICONS, "128x128@2x.png"), 256)
    save_png(main_icon, os.path.join(ICONS, "128x128.png"), 128)
    save_png(main_icon, os.path.join(ICONS, "64x64.png"), 64)
    save_png(small_icon, os.path.join(ICONS, "32x32.png"), 32)

    sizes = (16, 24, 32, 48, 64, 128, 256)
    blue = {s: (small_icon if s <= 32 else main_icon).resize((s, s), Image.LANCZOS) for s in sizes}
    save_ico(blue, os.path.join(ICONS, "icon.ico"))
    save_ico(blue, os.path.join(ICONS, "installer.ico"))
    save_ico({s: (slate_small if s <= 32 else slate_icon).resize((s, s), Image.LANCZOS) for s in sizes}, os.path.join(ICONS, "uninstaller.ico"))
    main_icon.resize((1024, 1024), Image.LANCZOS).save(os.path.join(ICONS, "icon.icns"))

    nsis_header(main_icon, os.path.join(ICONS, "nsis-header.bmp"))
    nsis_sidebar(main_icon, os.path.join(ICONS, "nsis-sidebar.bmp"))

    save_png(main_icon, os.path.join(ROOT, "app", "public", "app-icon.png"), 256)   # dùng trong giao diện
    save_png(main_icon, os.path.join(ROOT, "assets", "icon-512.png"), 512)          # dùng trong README
    print("OK — icons generated in", ICONS)


if __name__ == "__main__":
    main()
