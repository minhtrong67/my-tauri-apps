#!/usr/bin/env python3
"""Generate every icon used by Fluent JSON in the Microsoft Fluent / Windows 11 style:
a layered paper sheet with a folded corner, a soft blue gradient, a glass highlight and a bold { : } glyph.

Outputs: app icon (PNG/ICO/ICNS, all desktop sizes), installer + uninstaller icons, and the NSIS banners.

Requires Pillow:  pip install pillow
Run:              python scripts/generate-icons.py
"""
import math, os
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'src-tauri', 'icons')
PUB = os.path.join(ROOT, 'public')
os.makedirs(OUT, exist_ok=True); os.makedirs(PUB, exist_ok=True)

S = 1024          # final master size
SS = 2            # supersampling factor
W = S * SS

BLUE = ((76, 194, 255), (0, 120, 212), (0, 78, 140))      # Windows accent light -> base -> dark
GREY = ((190, 196, 204), (118, 128, 140), (70, 78, 90))   # uninstaller

def lerp(c1, c2, t): return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))

def vgrad(box, stops, diag=0.35):
    """Gradient image of size W x W, top-left -> bottom-right, through three colour stops."""
    g = Image.new('RGB', (W, W))
    px = g.load()
    for y in range(0, W, 1):
        for x in range(0, W, 4):
            t = min(1, max(0, (y / W) * (1 - diag) + (x / W) * diag))
            c = lerp(stops[0], stops[1], t * 2) if t < .5 else lerp(stops[1], stops[2], (t - .5) * 2)
            for k in range(4):
                if x + k < W: px[x + k, y] = c
    return g.convert('RGBA')

def rrect_mask(box, r):
    m = Image.new('L', (W, W), 0)
    ImageDraw.Draw(m).rounded_rectangle([v * SS for v in box], radius=r * SS, fill=255)
    return m

def sheet_mask(box, r, fold):
    """Rounded sheet with the top-right corner cut for the fold."""
    x0, y0, x1, y1 = box
    m = rrect_mask(box, r)
    cut = Image.new('L', (W, W), 0)
    d = ImageDraw.Draw(cut)
    d.polygon([((x1 - fold) * SS, (y0 - 4) * SS), ((x1 + 4) * SS, (y0 - 4) * SS), ((x1 + 4) * SS, (y0 + fold) * SS)], fill=255)
    return ImageChops.subtract(m, cut)

def shadow_of(mask, blur, dy, alpha, color=(0, 30, 70)):
    sh = Image.new('RGBA', (W, W), color + (0,))
    a = mask.filter(ImageFilter.GaussianBlur(blur * SS)).point(lambda v: int(v * alpha))
    sh.putalpha(ImageChops.offset(a, 0, dy * SS))
    return sh

def bez(p0, p1, p2, n=40):
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
             (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in [i / n for i in range(n + 1)]]

def brace_points(cx, cy, h, w, mirror=False):
    """One curly brace centred on (cx, cy), height h, depth w."""
    top, bot, mid = cy - h / 2, cy + h / 2, cy
    x = cx - w / 2
    seg = []
    seg += bez((cx + w / 2, top), (x, top), (x, top + h * .17))
    seg += [(x, top + h * .17), (x, mid - h * .1)]
    seg += bez((x, mid - h * .1), (x, mid - h * .02), (x - w * .55, mid))
    seg += bez((x - w * .55, mid), (x, mid + h * .02), (x, mid + h * .1))
    seg += [(x, mid + h * .1), (x, bot - h * .17)]
    seg += bez((x, bot - h * .17), (x, bot), (cx + w / 2, bot))
    if mirror:
        seg = [(2 * cx - px, py) for px, py in seg]
    return seg

def stroke(draw, pts, width, fill):
    k = SS; r = width * k / 2
    for x, y in pts:
        draw.ellipse([x * k - r, y * k - r, x * k + r, y * k + r], fill=fill)
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        draw.line([x0 * k, y0 * k, x1 * k, y1 * k], fill=fill, width=int(width * k))

def glyph(color, cx=470, cy=600):
    layer = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    gap = 120
    for mirror, off in ((False, -gap), (True, gap)):
        stroke(d, brace_points(cx + off + (-40 if not mirror else 40), cy, 330, 100, mirror), 56, color)
    for dy in (-52, 52):
        r = 28 * SS
        d.ellipse([cx * SS - r, (cy + dy) * SS - r, cx * SS + r, (cy + dy) * SS + r], fill=color)
    return layer

def tile(stops):
    img = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    # back sheet: translucent "glass" layer (Mica / Acrylic reference)
    back_box = (136, 150, 700, 860)
    bm = sheet_mask(back_box, 76, 120)
    back = Image.new('RGBA', (W, W), (255, 255, 255, 0))
    g = vgrad(None, ((255, 255, 255), (214, 238, 255), (170, 214, 250)), .1)
    back = Image.composite(g, back, bm)
    back.putalpha(bm.point(lambda v: int(v * .78)))
    img = Image.alpha_composite(img, shadow_of(bm, 18, 14, .22))
    img = Image.alpha_composite(img, back)
    # front sheet
    box = (236, 112, 884, 912)
    fm = sheet_mask(box, 84, 170)
    img = Image.alpha_composite(img, shadow_of(fm, 30, 34, .5))
    body = Image.composite(vgrad(box, stops, .45), Image.new('RGBA', (W, W), (0, 0, 0, 0)), fm)
    img = Image.alpha_composite(img, body)
    # folded corner
    x1, y0, fold = box[2], box[1], 170
    fold_poly = [((x1 - fold) * SS, y0 * SS), ((x1 - fold) * SS, (y0 + fold - 34) * SS), ((x1 - fold + 34) * SS, (y0 + fold) * SS), (x1 * SS, (y0 + fold) * SS)]
    fm2 = Image.new('L', (W, W), 0)
    ImageDraw.Draw(fm2).polygon(fold_poly, fill=255)
    fm2 = ImageChops.multiply(fm2.filter(ImageFilter.GaussianBlur(3 * SS)), rrect_mask(box, 84))
    fm2 = fm2.point(lambda v: 255 if v > 128 else 0).filter(ImageFilter.GaussianBlur(1.2 * SS))
    fold_img = Image.composite(vgrad(box, ((190, 232, 255), (110, 190, 245), (60, 150, 225)), .6), Image.new('RGBA', (W, W), (0, 0, 0, 0)), fm2)
    img = Image.alpha_composite(img, shadow_of(fm2, 8, 6, .35))
    img = Image.alpha_composite(img, fold_img)
    # glass highlight along the top-left edge
    edge = ImageChops.subtract(fm, fm.filter(ImageFilter.MinFilter(9 * SS + 1)).filter(ImageFilter.GaussianBlur(1)))
    hl = Image.new('RGBA', (W, W), (255, 255, 255, 0))
    top_fade = Image.linear_gradient('L').resize((W, W)).transpose(Image.FLIP_TOP_BOTTOM).point(lambda v: int(v * .75))
    hl.putalpha(ImageChops.multiply(edge, top_fade))
    img = Image.alpha_composite(img, hl)
    # soft inner light
    glow = Image.new('RGBA', (W, W), (255, 255, 255, 0))
    gm = Image.new('L', (W, W), 0)
    ImageDraw.Draw(gm).ellipse([box[0] * SS - 200 * SS, (box[1] - 360) * SS, (box[2] - 60) * SS, (box[1] + 380) * SS], fill=50)
    glow.putalpha(ImageChops.multiply(gm.filter(ImageFilter.GaussianBlur(60 * SS)), fm))
    img = Image.alpha_composite(img, glow)
    # glyph with a soft shadow
    gl = glyph((255, 255, 255, 255), cx=572, cy=620)
    sh = gl.filter(ImageFilter.GaussianBlur(10 * SS))
    sh = Image.merge('RGBA', (sh.split()[0].point(lambda v: 0), sh.split()[1].point(lambda v: 30), sh.split()[2].point(lambda v: 70), sh.split()[3].point(lambda v: int(v * .4))))
    img = Image.alpha_composite(img, ImageChops.offset(sh, 0, 10 * SS))
    img = Image.alpha_composite(img, gl)
    return img.resize((S, S), Image.LANCZOS)

def badge(img, kind):
    big = img.resize((W, W), Image.LANCZOS)
    r = 190 * SS; cx, cy = 770 * SS, 770 * SS
    sh = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse([cx - r, cy - r + 12 * SS, cx + r, cy + r + 12 * SS], fill=(0, 0, 0, 110))
    big = Image.alpha_composite(big, sh.filter(ImageFilter.GaussianBlur(14 * SS)))
    d = ImageDraw.Draw(big)
    fill, ink = ((255, 255, 255, 255), (0, 95, 184, 255)) if kind == 'download' else ((32, 32, 32, 255), (255, 255, 255, 255))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)
    w = 44 * SS
    def line(a, b):
        d.line([a[0] * SS, a[1] * SS, b[0] * SS, b[1] * SS], fill=ink, width=w)
        for p in (a, b):
            d.ellipse([p[0] * SS - w / 2, p[1] * SS - w / 2, p[0] * SS + w / 2, p[1] * SS + w / 2], fill=ink)
    c = (cx / SS, cy / SS)
    if kind == 'download':
        line((c[0], c[1] - 90), (c[0], c[1] + 50)); line((c[0] - 66, c[1] - 10), (c[0], c[1] + 58)); line((c[0] + 66, c[1] - 10), (c[0], c[1] + 58))
        line((c[0] - 88, c[1] + 104), (c[0] + 88, c[1] + 104))
    else:
        line((c[0] - 74, c[1] - 74), (c[0] + 74, c[1] + 74)); line((c[0] + 74, c[1] - 74), (c[0] - 74, c[1] + 74))
    return big.resize((S, S), Image.LANCZOS)

app = tile(BLUE)
installer = badge(tile(BLUE), 'download')
uninstaller = badge(tile(GREY), 'remove')

def save_png(img, name, size, folder=OUT):
    img.resize((size, size), Image.LANCZOS).save(os.path.join(folder, name))

for name, size in [('32x32.png', 32), ('128x128.png', 128), ('128x128@2x.png', 256), ('icon.png', 512),
                   ('Square30x30Logo.png', 30), ('Square44x44Logo.png', 44), ('Square71x71Logo.png', 71), ('Square89x89Logo.png', 89),
                   ('Square107x107Logo.png', 107), ('Square142x142Logo.png', 142), ('Square150x150Logo.png', 150),
                   ('Square284x284Logo.png', 284), ('Square310x310Logo.png', 310), ('StoreLogo.png', 50)]:
    save_png(app, name, size)
save_png(app, 'icon.png', 512, PUB)

ICO = [(16, 16), (20, 20), (24, 24), (32, 32), (40, 40), (48, 48), (64, 64), (128, 128), (256, 256)]
app.save(os.path.join(OUT, 'icon.ico'), sizes=ICO)
installer.save(os.path.join(OUT, 'installer.ico'), sizes=ICO)
uninstaller.save(os.path.join(OUT, 'uninstaller.ico'), sizes=ICO)
app.save(os.path.join(OUT, 'icon.icns'))
save_png(installer, 'installer.png', 512); save_png(uninstaller, 'uninstaller.png', 512)

# ---- NSIS banners (24-bit BMP, exact sizes required by the installer) ----
def font(size):
    for f in ['C:/Windows/Fonts/segoeuib.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/System/Library/Fonts/Helvetica.ttc']:
        if os.path.exists(f): return ImageFont.truetype(f, size)
    return ImageFont.load_default()

def sidebar(stops, logo_tile, label):
    Wd, H = 164, 314
    bg = Image.new('RGB', (Wd, H))
    px = bg.load()
    for y in range(H):
        for x in range(Wd):
            px[x, y] = lerp(stops[0], stops[2], y / H * .8 + x / Wd * .2)
    big = logo_tile.resize((300, 300), Image.LANCZOS)
    ghost = big.copy(); ghost.putalpha(ghost.split()[3].point(lambda v: int(v * .14)))
    bg.paste(ghost, (-84, 130), ghost)
    logo = logo_tile.resize((84, 84), Image.LANCZOS)
    bg.paste(logo, (40, 44), logo)
    d = ImageDraw.Draw(bg); f = font(18)
    for i, line in enumerate(label):
        tw = d.textlength(line, font=f); d.text(((Wd - tw) / 2, 150 + i * 24), line, font=f, fill='white')
    return bg

def header(logo_tile, accent):
    Wd, H = 150, 57
    bg = Image.new('RGB', (Wd, H), (243, 243, 243))
    ImageDraw.Draw(bg).rectangle([0, H - 3, Wd, H], fill=accent)
    logo = logo_tile.resize((44, 44), Image.LANCZOS)
    bg.paste(logo, (Wd - 52, 5), logo)
    return bg

sidebar(BLUE, app, ['Fluent', 'JSON']).save(os.path.join(OUT, 'nsis-sidebar.bmp'))
header(app, BLUE[1]).save(os.path.join(OUT, 'nsis-header.bmp'))
header(uninstaller, GREY[1]).save(os.path.join(OUT, 'nsis-uninstaller-header.bmp'))
print('icons written to', os.path.normpath(OUT))
