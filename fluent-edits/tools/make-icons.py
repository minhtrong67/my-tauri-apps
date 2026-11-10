#!/usr/bin/env python3
"""Generate every Fluent Edits icon in a Microsoft Fluent / Windows 11 style (Pillow only).

Fluent app-icon language: a soft rounded-square tile with a gentle light-to-deep gradient, layered translucent
surfaces, a subtle top highlight and soft drop shadows. Motif: a video preview card (play) over a clip timeline
with a gold playhead.

Outputs into src-tauri/icons:
  16/24/32/48/64/128/256/512 px PNGs, 128x128@2x.png, icon.png (512), icon.ico (16-256), icon.icns
  Square*Logo.png + StoreLogo.png (Windows Store sizes)
  installer.ico, uninstaller.ico (grey tile + red "remove" badge)
  nsis-sidebar.bmp, nsis-header.bmp
and src/assets/logo.png (used inside the app).
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src-tauri" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

S = 1024          # final master size
SS = 2            # supersampling
N = S * SS

WHITE, BLACK = (255, 255, 255), (0, 0, 0)
BLUE_HI, BLUE_LO = (0x4D, 0xB4, 0xFF), (0x06, 0x56, 0xCC)     # tile gradient
ACCENT = (0x00, 0x78, 0xD4)                                    # Windows "default blue"
GOLD, GOLD_HI = (0xFF, 0xB9, 0x00), (0xFF, 0xD7, 0x5E)         # playhead
GREY_HI, GREY_LO = (0xA6, 0xAD, 0xB8), (0x5F, 0x66, 0x73)
RED = (0xC4, 0x2B, 0x1C)


def mix(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def gradient(w, h, c1, c2, angle=135):
    """Linear gradient c1 -> c2. Built on an oversized canvas so rotation never leaves empty corners."""
    size = max(w, h)
    big = int(size * 1.6)
    base = Image.linear_gradient("L").resize((big, big)).rotate(angle - 90, resample=Image.BICUBIC)
    off = (big - size) // 2
    base = base.crop((off, off, off + size, off + size))
    g = Image.composite(Image.new("RGB", (size, size), c2), Image.new("RGB", (size, size), c1), base)
    return g.crop((0, 0, w, h))


def rrect(box, r, size=N):
    """Anti-aliased rounded-rectangle mask. `box` in master (1024) units."""
    m = Image.new("L", (size, size), 0)
    x0, y0, x1, y1 = [v * SS for v in box]
    ImageDraw.Draw(m).rounded_rectangle((x0, y0, x1, y1), radius=r * SS, fill=255)
    return m.filter(ImageFilter.GaussianBlur(0.8))


def circle(cx, cy, r):
    m = Image.new("L", (N, N), 0)
    ImageDraw.Draw(m).ellipse(((cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS), fill=255)
    return m.filter(ImageFilter.GaussianBlur(0.8))


def rounded_poly(pts, rad):
    m = Image.new("L", (N, N), 0)
    ImageDraw.Draw(m).polygon([(x * SS, y * SS) for x, y in pts], fill=255)
    b = m.filter(ImageFilter.GaussianBlur(rad * SS))
    return b.point(lambda v: 255 if v > 128 else 0).filter(ImageFilter.GaussianBlur(1.0))


def fill(img, mask, color, alpha=255):
    layer = Image.new("RGBA", img.size, color + (255,))
    a = mask.point(lambda v: v * alpha // 255) if alpha != 255 else mask
    layer.putalpha(a)
    img.alpha_composite(layer)


def fill_gradient(img, mask, c1, c2, angle=90, box=None):
    g = gradient(N, N, c1, c2, angle).convert("RGBA")
    g.putalpha(mask)
    img.alpha_composite(g)


def shadow(img, mask, dy, blur, alpha=90, color=(0, 20, 70)):
    sh = Image.new("L", img.size, 0)
    sh.paste(mask, (0, dy * SS))
    sh = sh.filter(ImageFilter.GaussianBlur(blur * SS)).point(lambda v: v * alpha // 255)
    layer = Image.new("RGBA", img.size, color + (0,))
    layer.putalpha(sh)
    img.alpha_composite(layer)


def draw_icon(uninstall=False):
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    hi, lo = (GREY_HI, GREY_LO) if uninstall else (BLUE_HI, BLUE_LO)
    sh_col = (20, 24, 30) if uninstall else (0, 20, 70)

    # tile (Windows 11 icon plate)
    tile = rrect((52, 52, 972, 972), 214)
    shadow(img, tile, 14, 16, 70, sh_col)
    fill_gradient(img, tile, hi, lo, 140)
    # soft top-left light + inner edge highlight
    glow = Image.new("RGBA", (N, N), (255, 255, 255, 0))
    ImageDraw.Draw(glow).ellipse((-0.25 * N, -0.45 * N, 0.85 * N, 0.5 * N), fill=(255, 255, 255, 60))
    glow = glow.filter(ImageFilter.GaussianBlur(0.1 * N))
    glow.putalpha(ImageChops.multiply(glow.getchannel("A"), tile))
    img.alpha_composite(glow)
    edge = ImageChops.subtract(tile, rrect((58, 58, 966, 966), 208))
    fill(img, edge, WHITE, 70)

    # preview card
    card = rrect((196, 172, 828, 556), 58)
    shadow(img, card, 22, 22, 110, sh_col)
    fill_gradient(img, card, WHITE, mix(WHITE, hi, 0.22), 100)
    # play glyph
    play = rounded_poly([(436, 262), (436, 466), (608, 364)], 15)
    fill_gradient(img, play, mix(ACCENT, WHITE, 0.15) if not uninstall else GREY_HI, lo, 110)

    # timeline clips
    y0, y1 = 628, 724
    clips = [((196, y0, 456, y1), 0.96), ((472, y0, 668, y1), 0.62), ((684, y0, 828, y1), 0.36)]
    for box, a in clips:
        m = rrect(box, 26)
        shadow(img, m, 8, 8, 60, sh_col)
        fill(img, m, WHITE, int(255 * a))
    # second, thinner audio-style track
    for box, a in (((196, 748, 560, 796), 0.5), ((576, 748, 828, 796), 0.3)):
        fill(img, rrect(box, 22), WHITE, int(255 * a))

    # playhead
    ph = rrect((540, 598, 572, 840), 16)
    shadow(img, ph, 6, 8, 90, sh_col)
    fill_gradient(img, ph, GOLD_HI, GOLD, 90)
    head = circle(556, 598, 34)
    shadow(img, head, 6, 8, 90, sh_col)
    fill_gradient(img, head, GOLD_HI, GOLD, 120)

    if uninstall:
        b = circle(792, 792, 118)
        shadow(img, b, 10, 12, 120, (60, 0, 0))
        fill(img, b, WHITE)
        fill(img, circle(792, 792, 96), RED)
        fill(img, rrect((744, 780, 840, 804), 12), WHITE)
    return img.resize((S, S), Image.LANCZOS)


def square(img, size):
    return img.resize((size, size), Image.LANCZOS)


def sidebar(icon):
    w, h, k = 164, 314, 4
    big = gradient(w * k, h * k, mix(BLUE_LO, BLACK, 0.35), mix(BLUE_HI, BLUE_LO, 0.35), 160).convert("RGBA")
    d = ImageDraw.Draw(big, "RGBA")
    for cx, cy, r, a in ((150, 300, 130, 28), (10, 230, 70, 22), (170, 120, 46, 18)):   # soft translucent discs ("acrylic" layers)
        d.ellipse(((cx - r) * k, (cy - r) * k, (cx + r) * k, (cy + r) * k), fill=(255, 255, 255, a))
    ic = square(icon, 104 * k)
    big.alpha_composite(ic, ((w * k - 104 * k) // 2, 34 * k))
    return big.resize((w, h), Image.LANCZOS).convert("RGB")


def header(icon):
    w, h = 150, 57
    img = Image.new("RGB", (w, h), (0xF3, 0xF3, 0xF3))
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
