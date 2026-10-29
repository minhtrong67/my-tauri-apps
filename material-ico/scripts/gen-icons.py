"""Generates the Material 3 Expressive icon set (app, installer, uninstaller, NSIS art).
Requires: pip install pillow   -   Run: python scripts/gen-icons.py
"""
import math, struct, io, os
from PIL import Image, ImageDraw, ImageFilter, ImageChops

OUT = os.path.join(os.path.dirname(__file__), "..", "src-tauri", "icons")
PUB = os.path.join(os.path.dirname(__file__), "..", "public")
os.makedirs(OUT, exist_ok=True); os.makedirs(PUB, exist_ok=True)
S = 2048  # working canvas, downscaled to 1024

THEMES = {
    "app":       dict(a="#86ACF0", b="#365E9D", panel="#D6E3FF", back="#AAC7FF", ink="#365E9D", ink2="#5177B8", badge="#FAD8FD", badge_ink="#705575", glyph="spark"),
    "setup":     dict(a="#86ACF0", b="#285290", panel="#D6E3FF", back="#AAC7FF", ink="#285290", ink2="#5177B8", badge="#FAD8FD", badge_ink="#705575", glyph="down"),
    "uninstall": dict(a="#FF8A80", b="#BA1A1A", panel="#FFE9E6", back="#FFB4AB", ink="#93000A", ink2="#CF2C27", badge="#FAD8FD", badge_ink="#705575", glyph="cross"),
}

def hexc(h, a=255):
    h = h.lstrip("#"); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)

def squircle_pts(cx, cy, r, n=5.2, steps=720):
    pts = []
    for i in range(steps):
        t = 2 * math.pi * i / steps
        c, s = math.cos(t), math.sin(t)
        pts.append((cx + r * math.copysign(abs(c) ** (2 / n), c), cy + r * math.copysign(abs(s) ** (2 / n), s)))
    return pts

def cookie(d, cx, cy, r, lobes, fill):
    ring = r * 0.8
    lr = r * 0.34
    d.ellipse((cx - ring, cy - ring, cx + ring, cy + ring), fill=fill)
    for i in range(lobes):
        a = 2 * math.pi * i / lobes
        x, y = cx + math.cos(a) * ring, cy + math.sin(a) * ring
        d.ellipse((x - lr, y - lr, x + lr, y + lr), fill=fill)

def star4(d, cx, cy, r, fill):
    pts = []
    for i in range(8):
        a = math.pi / 4 * i - math.pi / 2
        rr = r if i % 2 == 0 else r * 0.3
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    d.polygon(pts, fill=fill)

def draw_master(kind="app", simple=False):
    th = THEMES[kind]
    k = S / 1024
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    # tile with vertical gradient
    grad = Image.new("RGBA", (S, S))
    gd = ImageDraw.Draw(grad)
    A, B = hexc(th["a"]), hexc(th["b"])
    for y in range(S):
        t = y / (S - 1)
        gd.line([(0, y), (S, y)], fill=tuple(int(A[i] + (B[i] - A[i]) * t) for i in range(3)) + (255,))
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).polygon(squircle_pts(S / 2, S / 2, S / 2 - 30 * k), fill=255)
    grad.putalpha(mask); img.alpha_composite(grad)
    # soft highlight
    hl = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(hl).ellipse((-S * .2, -S * .55, S * 1.2, S * .45), fill=(255, 255, 255, 38))
    hl = hl.filter(ImageFilter.GaussianBlur(60 * k))
    hl.putalpha(ImageChops.multiply(hl.getchannel('A'), mask)); img.alpha_composite(hl)
    d = ImageDraw.Draw(img)
    # folder
    def rr(x0, y0, x1, y1, r, f): d.rounded_rectangle((x0 * k, y0 * k, x1 * k, y1 * k), r * k, fill=f)
    rr(190, 300, 480, 430, 60, hexc(th["back"]))      # tab
    rr(190, 350, 834, 800, 84, hexc(th["back"]))      # back plate
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((190 * k, 440 * k, 834 * k, 820 * k), 84 * k, fill=(0, 0, 0, 70))
    sh = sh.filter(ImageFilter.GaussianBlur(26 * k)); img.alpha_composite(sh); d = ImageDraw.Draw(img)
    rr(170, 430, 854, 810, 84, hexc(th["panel"]))      # front panel
    if not simple:
        d.ellipse((330 * k, 520 * k, 424 * k, 614 * k), fill=hexc(th["ink"]))
        d.polygon([(250 * k, 770 * k), (470 * k, 560 * k), (640 * k, 770 * k)], fill=hexc(th["ink2"]))
        d.polygon([(450 * k, 770 * k), (620 * k, 610 * k), (800 * k, 770 * k)], fill=hexc(th["ink"]))
    # expressive cookie badge
    bx, by, br = 770 * k, 290 * k, 190 * k
    cookie(d, bx + 6 * k, by + 10 * k, br, 10, (0, 0, 0, 40))
    cookie(d, bx, by, br, 10, hexc(th["badge"]))
    ink = hexc(th["badge_ink"])
    g = th["glyph"]
    if g == "spark": star4(d, bx, by, 95 * k, ink)
    elif g == "down":
        d.rounded_rectangle((bx - 20 * k, by - 90 * k, bx + 20 * k, by + 20 * k), 18 * k, fill=ink)
        d.polygon([(bx - 75 * k, by), (bx + 75 * k, by), (bx, by + 85 * k)], fill=ink)
    else:
        w = 26 * k
        d.line([(bx - 70 * k, by - 70 * k), (bx + 70 * k, by + 70 * k)], fill=ink, width=int(w))
        d.line([(bx - 70 * k, by + 70 * k), (bx + 70 * k, by - 70 * k)], fill=ink, width=int(w))
    return img.resize((1024, 1024), Image.LANCZOS)

def ico_bytes(sizes, kind):
    big, small = draw_master(kind), draw_master(kind, simple=True)
    blobs = []
    for s in sizes:
        im = (small if s <= 32 else big).resize((s, s), Image.LANCZOS)
        b = io.BytesIO(); im.save(b, "PNG"); blobs.append((s, b.getvalue()))
    head = struct.pack("<HHH", 0, 1, len(blobs)); off = 6 + 16 * len(blobs); ent = b""; data = b""
    for s, p in blobs:
        ent += struct.pack("<BBBBHHII", 0 if s >= 256 else s, 0 if s >= 256 else s, 0, 0, 1, 32, len(p), off + len(data)); data += p
    return head + ent + data

SIZES = [16, 24, 32, 48, 64, 128, 256]
app, app_small = draw_master("app"), draw_master("app", simple=True)
def png(size, name, folder=OUT):
    (app_small if size <= 32 else app).resize((size, size), Image.LANCZOS).save(os.path.join(folder, name))
png(32, "32x32.png"); png(128, "128x128.png"); png(256, "128x128@2x.png"); png(512, "icon.png"); png(512, "icon.png", PUB)
png(192, "icon-192.png", PUB)
for n, s in [("Square30x30Logo", 30), ("Square44x44Logo", 44), ("Square71x71Logo", 71), ("Square89x89Logo", 89), ("Square107x107Logo", 107), ("Square142x142Logo", 142), ("Square150x150Logo", 150), ("Square284x284Logo", 284), ("Square310x310Logo", 310), ("StoreLogo", 50)]:
    png(s, n + ".png")
app.save(os.path.join(OUT, "icon.icns"))
for name, kind in [("icon.ico", "app"), ("installer.ico", "setup"), ("uninstall.ico", "uninstall")]:
    open(os.path.join(OUT, name), "wb").write(ico_bytes(SIZES, kind))

# NSIS art (BMP): header 150x57, sidebar 164x314
def nsis_header():
    im = Image.new("RGB", (150, 57), "#F9F9FF"); d = ImageDraw.Draw(im)
    d.rectangle((0, 53, 150, 57), fill="#415F91")
    cookie(d, 24, 10, 34, 10, hexc("#D6E3FF")); cookie(d, 142, 60, 30, 8, hexc("#FAD8FD"))
    ic = app_small.resize((40, 40), Image.LANCZOS); im.paste(ic, (100, 7), ic)
    im.save(os.path.join(OUT, "nsis-header.bmp"))
def nsis_sidebar():
    W, H = 164 * 4, 314 * 4
    im = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(im)
    A, B = hexc("#415F91"), hexc("#1B2F52")
    for y in range(H):
        t = y / H; d.line([(0, y), (W, y)], fill=tuple(int(A[i] + (B[i] - A[i]) * t) for i in range(3)) + (255,))
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); od = ImageDraw.Draw(ov)
    cookie(od, W * .85, H * .12, 300, 10, (214, 227, 255, 60)); cookie(od, W * .1, H * .62, 250, 8, (250, 216, 253, 50)); cookie(od, W * .8, H * .93, 220, 9, (170, 199, 255, 60))
    im.alpha_composite(ov)
    ic = app.resize((300, 300), Image.LANCZOS); im.alpha_composite(ic, ((W - 300) // 2, 70))
    im.convert("RGB").resize((164, 314), Image.LANCZOS).save(os.path.join(OUT, "nsis-sidebar.bmp"))
nsis_header(); nsis_sidebar()
print("icons ok:", sorted(os.listdir(OUT)))
