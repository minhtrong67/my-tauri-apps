#!/usr/bin/env python3
"""Generate every Material Edit icon in the Material 3 Expressive style (Pillow only).

Expressive icon language: a bold scalloped "9-sided cookie" container, chunky rounded glyphs,
tonal accents from one palette, no thin lines (so it stays crisp at 16 px).

Outputs into src-tauri/icons:
  16/24/32/48/64/128/256/512 px PNGs, 128x128@2x.png, icon.png (512), icon.ico (16-256), icon.icns
  Square*Logo.png + StoreLogo.png (Windows Store sizes)
  installer.ico, uninstaller.ico (grey cookie + red "remove" badge)
  nsis-sidebar.bmp, nsis-header.bmp
and src/assets/logo.png (used inside the app).

Brand colour: Material "Pink" #E91E63 (a Material key colour, picked at random for this release).
"""
import math
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src-tauri" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

S = 1024
SS = 2
N = S * SS

BRAND = (0xE9, 0x1E, 0x63)


def mix(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


WHITE, BLACK = (255, 255, 255), (0, 0, 0)
PRIMARY, PRIMARY_HI, PRIMARY_LO = BRAND, mix(BRAND, WHITE, 0.22), mix(BRAND, BLACK, 0.30)
CONTAINER = mix(BRAND, WHITE, 0.82)
TERTIARY, TERTIARY_C = (0xFF, 0xB3, 0x4D), (0xFF, 0xDF, 0xB0)
GREY, GREY_HI, GREY_C = (0x6B, 0x65, 0x70), (0x9A, 0x94, 0x9F), (0xE4, 0xDF, 0xE7)
ERROR, ERROR_C = (0xB3, 0x26, 0x1E), (0xFF, 0xDA, 0xD6)


def cookie_points(cx, cy, R, k=9, amp=0.05, n=720, rot=-math.pi / 2):
    return [(cx + math.cos(i / n * math.tau + rot) * R * (1 + amp * math.cos(k * i / n * math.tau)),
             cy + math.sin(i / n * math.tau + rot) * R * (1 + amp * math.cos(k * i / n * math.tau))) for i in range(n)]


def mask_poly(pts, size=N):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return m


def round_mask(m, radius):
    b = m.filter(ImageFilter.GaussianBlur(radius))
    return b.point(lambda v: 255 if v > 128 else 0).filter(ImageFilter.GaussianBlur(1.2))


def gradient(w, h, c1, c2, angle=135):
    size = max(w, h)
    base = Image.linear_gradient("L").resize((size, size)).rotate(angle - 90, resample=Image.BICUBIC)
    g = Image.composite(Image.new("RGB", (size, size), c2), Image.new("RGB", (size, size), c1), base)
    return g.crop((0, 0, w, h))


def paste_color(img, mask, color):
    img.paste(Image.new("RGBA", img.size, color + (255,)), (0, 0), mask)


def shadow(img, mask, dy, blur, color=(60, 0, 20), alpha=110):
    sh = Image.new("L", img.size, 0)
    sh.paste(mask, (0, dy * SS))
    sh = sh.filter(ImageFilter.GaussianBlur(blur * SS)).point(lambda v: v * alpha // 255)
    layer = Image.new("RGBA", img.size, color + (0,))
    layer.putalpha(sh)
    img.alpha_composite(layer)


def pill(box):
    x0, y0, x1, y1 = [v * SS for v in box]
    m = Image.new("L", (N, N), 0)
    ImageDraw.Draw(m).rounded_rectangle((x0, y0, x1, y1), radius=(y1 - y0) // 2, fill=255)
    return m


def star4(cx, cy, r, inner=0.3):
    pts = []
    for i in range(8):
        a = math.pi / 4 * i - math.pi / 2
        rr = r if i % 2 == 0 else r * inner
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    return pts


def draw_icon(uninstall=False):
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    c_main, c_hi, c_lo = (GREY, GREY_HI, mix(GREY, BLACK, 0.3)) if uninstall else (PRIMARY, PRIMARY_HI, PRIMARY_LO)
    c_cont = GREY_C if uninstall else CONTAINER
    c_tert = GREY_C if uninstall else TERTIARY
    c_tert_c = GREY_C if uninstall else TERTIARY_C

    cookie = mask_poly(cookie_points(N / 2, N / 2, 0.468 * N, k=9, amp=0.046)).filter(ImageFilter.GaussianBlur(1.5))
    img.paste(gradient(N, N, c_hi, c_lo, 140).convert("RGBA"), (0, 0), cookie)
    glow = Image.new("RGBA", (N, N), (255, 255, 255, 0))
    ImageDraw.Draw(glow).ellipse((-0.15 * N, -0.25 * N, 0.75 * N, 0.55 * N), fill=(255, 255, 255, 70))
    glow = glow.filter(ImageFilter.GaussianBlur(0.12 * N))
    glow.putalpha(ImageChops.multiply(glow.getchannel("A"), cookie))
    img.alpha_composite(glow)

    tri = Image.new("L", (N, N), 0)
    cx, cy, r = 0.512 * N, 0.425 * N, 0.205 * N
    ImageDraw.Draw(tri).polygon([(cx - r * 0.62, cy - r), (cx - r * 0.62, cy + r), (cx + r * 1.02, cy)], fill=255)
    tri = round_mask(tri, 0.034 * N)
    shadow(img, tri, 14, 16, color=mix(c_lo, BLACK, 0.5), alpha=120)
    paste_color(img, tri, WHITE)

    y0, y1 = 676, 756
    for m, col in ((pill((236, y0, 640, y1)), c_cont), (pill((668, y0, 788, y1)), c_tert_c)):
        shadow(img, m, 10, 10, color=mix(c_lo, BLACK, 0.5), alpha=90)
        paste_color(img, m, col)
    dot = Image.new("L", (N, N), 0)
    ImageDraw.Draw(dot).ellipse((266 * SS, (y0 + 20) * SS, 306 * SS, (y0 + 60) * SS), fill=255)
    paste_color(img, dot, c_main)

    sp = Image.new("L", (N, N), 0)
    ImageDraw.Draw(sp).polygon(star4(0.755 * N, 0.255 * N, 0.095 * N, 0.34), fill=255)
    paste_color(img, round_mask(sp, 0.01 * N), c_tert)
    sp2 = Image.new("L", (N, N), 0)
    ImageDraw.Draw(sp2).polygon(star4(0.835 * N, 0.375 * N, 0.045 * N, 0.34), fill=255)
    paste_color(img, round_mask(sp2, 0.006 * N), c_cont)

    if uninstall:
        bcx, bcy = 0.775 * N, 0.775 * N
        ring = mask_poly(cookie_points(bcx, bcy, 0.185 * N, k=6, amp=0.07)).filter(ImageFilter.GaussianBlur(1.2))
        shadow(img, ring, 12, 14, color=(60, 0, 0), alpha=140)
        paste_color(img, ring, GREY_C)
        paste_color(img, mask_poly(cookie_points(bcx, bcy, 0.15 * N, k=6, amp=0.07)).filter(ImageFilter.GaussianBlur(1.2)), ERROR)
        bar = Image.new("L", (N, N), 0)
        ImageDraw.Draw(bar).rounded_rectangle((bcx - 0.075 * N, bcy - 0.02 * N, bcx + 0.075 * N, bcy + 0.02 * N), radius=0.02 * N, fill=255)
        paste_color(img, bar, ERROR_C)

    return img.resize((S, S), Image.LANCZOS)


def square(img, size):
    return img.resize((size, size), Image.LANCZOS)


def sidebar(icon):
    w, h, k = 164, 314, 4
    big = gradient(w * k, h * k, mix(BRAND, BLACK, 0.5), mix(BRAND, WHITE, 0.05), 160).convert("RGBA")
    for cx, cy, R, kk, amp, col in [(130, 290, 120, 9, 0.06, (255, 255, 255, 34)), (20, 215, 62, 6, 0.09, (255, 179, 77, 60)), (150, 150, 38, 8, 0.1, (255, 255, 255, 28))]:
        layer = Image.new("RGBA", big.size, (0, 0, 0, 0))
        ImageDraw.Draw(layer).polygon(cookie_points(cx * k, cy * k, R * k, k=kk, amp=amp, n=360), fill=col)
        big.alpha_composite(layer)
    ic = square(icon, 104 * k)
    big.alpha_composite(ic, ((w * k - 104 * k) // 2, 34 * k))
    return big.resize((w, h), Image.LANCZOS).convert("RGB")


def header(icon):
    w, h = 150, 57
    img = Image.new("RGB", (w, h), mix(BRAND, WHITE, 0.94))
    ic = square(icon, 44)
    img.paste(ic, (w - 54, 6), ic)
    return img


def main():
    app, unin = draw_icon(False), draw_icon(True)
    square(app, 512).save(OUT / "icon.png")
    for n in (16, 24, 48, 64, 256, 512):
        square(app, n).save(OUT / f"{n}x{n}.png")
    for n in (30, 44, 71, 89, 107, 142, 150, 284, 310):
        square(app, n).save(OUT / f"Square{n}x{n}Logo.png")
    square(app, 50).save(OUT / "StoreLogo.png")
    square(app, 32).save(OUT / "32x32.png")
    square(app, 128).save(OUT / "128x128.png")
    square(app, 256).save(OUT / "128x128@2x.png")
    sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    app.save(OUT / "icon.ico", sizes=sizes)
    app.save(OUT / "installer.ico", sizes=sizes)
    unin.save(OUT / "uninstaller.ico", sizes=sizes)
    app.save(OUT / "icon.icns", sizes=[(16, 16), (32, 32), (64, 64), (128, 128), (256, 256), (512, 512), (1024, 1024)])
    sidebar(app).save(OUT / "nsis-sidebar.bmp")
    header(app).save(OUT / "nsis-header.bmp")
    assets = ROOT / "src" / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    square(app, 256).save(assets / "logo.png")
    print("Icons written to", OUT)


if __name__ == "__main__":
    main()
