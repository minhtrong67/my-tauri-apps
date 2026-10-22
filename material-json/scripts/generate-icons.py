#!/usr/bin/env python3
"""Generate every icon used by Material JSON (app, installer, uninstaller, NSIS banners).

Requires Pillow:  pip install pillow
Run:              python scripts/generate-icons.py
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'src-tauri', 'icons')
PUB = os.path.join(ROOT, 'app', 'public')
os.makedirs(OUT, exist_ok=True); os.makedirs(PUB, exist_ok=True)

S = 1024
FONTS = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf',
    'C:/Windows/Fonts/consolab.ttf', 'C:/Windows/Fonts/courbd.ttf',
    '/System/Library/Fonts/Menlo.ttc', '/usr/share/fonts/TTF/DejaVuSansMono-Bold.ttf',
]
def font(size):
    for f in FONTS:
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()

def gradient(size, c1, c2):
    g = Image.new('RGB', (size, size))
    px = g.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            px[x, y] = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
    return g

def squircle_mask(size, radius):
    m = Image.new('L', (size * 2, size * 2), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size * 2 - 1, size * 2 - 1], radius=radius * 2, fill=255)
    return m.resize((size, size), Image.LANCZOS)

def base(c1, c2):
    """Rounded Material tile with a soft highlight."""
    img = gradient(S, c1, c2).convert('RGBA')
    hl = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(hl)
    d.ellipse([-S * .3, -S * .55, S * 1.0, S * .45], fill=(255, 255, 255, 38))
    img = Image.alpha_composite(img, hl)
    out = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    out.paste(img, (0, 0), squircle_mask(S, 230))
    return out

def braces(img, color=(255, 255, 255, 255), dot=True):
    f = font(760)
    layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for ch, cx in (('{', S * .30), ('}', S * .70)):
        bb = d.textbbox((0, 0), ch, font=f)
        w, h = bb[2] - bb[0], bb[3] - bb[1]
        d.text((cx - w / 2 - bb[0], S / 2 - h / 2 - bb[1] - 6), ch, font=f, fill=color)
    if dot:
        for dy in (-70, 70):
            d.ellipse([S / 2 - 46, S / 2 + dy - 46, S / 2 + 46, S / 2 + dy + 46], fill=color)
    shadow = layer.filter(ImageFilter.GaussianBlur(14)).point(lambda v: int(v * .28))
    sh = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    sh.paste((120, 50, 0, 255), (0, 14), shadow.split()[3])
    img = Image.alpha_composite(img, sh)
    return Image.alpha_composite(img, layer)

def badge(img, bg, kind):
    d = ImageDraw.Draw(img)
    r = 250; cx, cy = S - 250, S - 250
    d.ellipse([cx - r - 18, cy - r - 18, cx + r + 18, cy + r + 18], fill=(0, 0, 0, 55))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=bg)
    w = 54
    if kind == 'download':
        d.line([cx, cy - 120, cx, cy + 70], fill='white', width=w)
        d.line([cx - 95, cy + 10, cx, cy + 105], fill='white', width=w, joint='curve')
        d.line([cx + 95, cy + 10, cx, cy + 105], fill='white', width=w, joint='curve')
        d.line([cx - 120, cy + 150, cx + 120, cy + 150], fill='white', width=w)
    else:
        d.line([cx - 105, cy - 105, cx + 105, cy + 105], fill='white', width=w + 6)
        d.line([cx + 105, cy - 105, cx - 105, cy + 105], fill='white', width=w + 6)
    for p in ((cx - 120, cy + 150), (cx + 120, cy + 150), (cx, cy - 120)):
        pass
    return img

ORANGE = ((255, 183, 77), (245, 124, 0))          # Material orange 300 -> 700
BLUEGREY = ((144, 164, 174), (84, 110, 122))       # Material blue-grey 300 -> 600

app = braces(base(*ORANGE))
installer = badge(braces(base(*ORANGE)), (46, 125, 50, 255), 'download')
uninstaller = badge(braces(base(*BLUEGREY)), (211, 47, 47, 255), 'remove')

def save_png(img, name, size, folder=OUT):
    img.resize((size, size), Image.LANCZOS).save(os.path.join(folder, name))

# Tauri / desktop PNGs
for name, size in [('32x32.png', 32), ('128x128.png', 128), ('128x128@2x.png', 256), ('icon.png', 512),
                   ('Square30x30Logo.png', 30), ('Square44x44Logo.png', 44), ('Square71x71Logo.png', 71), ('Square89x89Logo.png', 89),
                   ('Square107x107Logo.png', 107), ('Square142x142Logo.png', 142), ('Square150x150Logo.png', 150),
                   ('Square284x284Logo.png', 284), ('Square310x310Logo.png', 310), ('StoreLogo.png', 50)]:
    save_png(app, name, size)
save_png(app, 'icon.png', 512, PUB)

ICO = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
app.save(os.path.join(OUT, 'icon.ico'), sizes=ICO)
installer.save(os.path.join(OUT, 'installer.ico'), sizes=ICO)
uninstaller.save(os.path.join(OUT, 'uninstaller.ico'), sizes=ICO)
app.resize((1024, 1024), Image.LANCZOS).save(os.path.join(OUT, 'icon.icns'))
installer.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'installer.png'))
uninstaller.resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, 'uninstaller.png'))

# ---- NSIS banners (24-bit BMP, exact sizes required by the installer) ----
def sidebar(c1, c2, tile, label):
    W, H = 164, 314
    bg = Image.new('RGB', (W, H))
    px = bg.load()
    for y in range(H):
        for x in range(W):
            t = (y / H) * .8 + (x / W) * .2
            px[x, y] = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
    big = tile.resize((300, 300), Image.LANCZOS)
    ghost = big.copy(); ghost.putalpha(ghost.split()[3].point(lambda v: int(v * .16)))
    bg.paste(ghost, (-80, 120), ghost)
    logo = tile.resize((72, 72), Image.LANCZOS)
    bg.paste(logo, (46, 54), logo)
    d = ImageDraw.Draw(bg)
    try: f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 17)
    except Exception: f = ImageFont.load_default()
    for i, line in enumerate(label):
        w = d.textlength(line, font=f)
        d.text(((W - w) / 2, 140 + i * 24), line, font=f, fill='white')
    return bg

def header(tile, accent):
    W, H = 150, 57
    bg = Image.new('RGB', (W, H), (255, 251, 255))
    d = ImageDraw.Draw(bg)
    d.rectangle([0, H - 3, W, H], fill=accent)
    logo = tile.resize((44, 44), Image.LANCZOS)
    bg.paste(logo, (W - 52, 6), logo)
    return bg

sidebar(ORANGE[0], ORANGE[1], app, ['Material', 'JSON']).save(os.path.join(OUT, 'nsis-sidebar.bmp'))
header(app, ORANGE[1]).save(os.path.join(OUT, 'nsis-header.bmp'))
header(uninstaller, BLUEGREY[1]).save(os.path.join(OUT, 'nsis-uninstaller-header.bmp'))
print('icons written to', os.path.normpath(OUT))
