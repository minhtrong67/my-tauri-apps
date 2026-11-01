#!/usr/bin/env python3
"""Generate every Material Docx icon in the Material 3 Expressive style (Word blue) with Pillow.

One scene description (shapes in a 1024 x 1024 space) drives both the PNG/ICO/ICNS/BMP rasters and the
SVG logos, so the app icon, the title-bar logo, the favicon and the landing page always match.

Outputs
  src-tauri/icons : 16..512 px PNGs, 128x128@2x.png, icon.png, icon.ico, icon.icns, Square*Logo.png, StoreLogo.png,
                    installer.ico, uninstaller.ico, nsis-sidebar.bmp, nsis-header.bmp
  src/logo.svg (app logo, also the favicon), src/logo-installer.svg, src/logo-uninstall.svg
Requires: pip install pillow
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src-tauri" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

S = 1024      # design space
SS = 3        # supersampling factor

# Word blue, expressed as Material 3 tonal roles
BLUE = (24, 90, 189)         # primary           #185ABD
BLUE_MID = (43, 124, 211)    # primary, lighter  #2B7CD3
BLUE_DEEP = (16, 63, 145)    # primary, darker   #103F91
SKY = (65, 165, 238)         # accent            #41A5EE
CONTAINER = (214, 228, 255)  # primary container #D6E4FF
LINE = (160, 196, 245)
WHITE = (255, 255, 255)
SLATE = (73, 80, 96)         # neutral-variant (uninstaller)
SLATE_MID = (98, 106, 124)
SLATE_DEEP = (52, 58, 72)
RED = (211, 47, 47)
SHADOW = (6, 24, 70)


def rgb(c):
    return "#%02x%02x%02x" % tuple(c)


# ----------------------------------------------------------------------------- geometry
def squircle(cx, cy, r, n=5.0, pts=160):
    out = []
    for i in range(pts):
        t = 2 * math.pi * i / pts
        c, s = math.cos(t), math.sin(t)
        out.append((cx + r * math.copysign(abs(c) ** (2 / n), c), cy + r * math.copysign(abs(s) ** (2 / n), s)))
    return out


def cookie(cx, cy, r, lobes=9, amp=0.075, pts=220, rot=0.0):
    """M3 Expressive 'cookie' shape: a circle with soft scalloped lobes."""
    out = []
    for i in range(pts):
        t = 2 * math.pi * i / pts
        rr = r * (1 + amp * math.cos(lobes * t + rot))
        out.append((cx + rr * math.cos(t), cy + rr * math.sin(t)))
    return out


def circle(cx, cy, r, pts=96):
    return [(cx + r * math.cos(2 * math.pi * i / pts), cy + r * math.sin(2 * math.pi * i / pts)) for i in range(pts)]


def rrect(x, y, w, h, r, step=6, chamfer=0):
    """Rounded rectangle polygon; `chamfer` cuts the top-right corner (page fold)."""
    pts = []

    def edge(p0, p1):
        d = math.dist(p0, p1)
        k = max(1, int(d / step))
        return [(p0[0] + (p1[0] - p0[0]) * i / k, p0[1] + (p1[1] - p0[1]) * i / k) for i in range(k)]

    def arc(cx, cy, a0, a1):
        k = 14
        return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / k)), cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / k))) for i in range(k + 1)]

    pts += arc(x + r, y + r, 180, 270)
    pts += edge((x + r, y), (x + w - r, y))
    pts += arc(x + w - r, y + r, 270, 360)
    pts += edge((x + w, y + r), (x + w, y + h - r))
    pts += arc(x + w - r, y + h - r, 0, 90)
    pts += edge((x + w - r, y + h), (x + r, y + h))
    pts += arc(x + r, y + h - r, 90, 180)
    pts += edge((x, y + h - r), (x, y + r))
    if chamfer:
        x1, y0 = x + w, y
        pts = [p for p in pts if (p[1] - y0) - (p[0] - x1) >= chamfer]
    return pts


def rot(pts, ang, cx=S / 2, cy=S / 2):
    a = math.radians(ang)
    ca, sa = math.cos(a), math.sin(a)
    return [(cx + (px - cx) * ca - (py - cy) * sa, cy + (px - cx) * sa + (py - cy) * ca) for px, py in pts]


# ----------------------------------------------------------------------------- scene
class Scene:
    def __init__(self):
        self.ops = []

    def poly(self, pts, fill, clip=None, shadow=None):
        self.ops.append(("poly", pts, fill, clip, shadow))

    def stroke(self, pts, width, color, clip=None):
        self.ops.append(("stroke", pts, width, color, clip))


def page_scene(sc, ang=-6, accent=None):
    """Document page with a folded corner, a bold W and two text pills."""
    px, py, pw, ph, fold = 236, 164, 552, 700, 160
    page = rot(rrect(px, py, pw, ph, 96, chamfer=fold), ang)
    sc.poly(page, WHITE, shadow=(0, 26, 30, 120))
    x1, y0 = px + pw, py
    tri = rot([(x1 - fold, y0 + 6), (x1 - 6, y0 + fold), (x1 - fold, y0 + fold)], ang)
    sc.poly(tri, CONTAINER)
    cx, cy = px + pw / 2, py + ph / 2
    w = [(cx - 168, cy - 150), (cx - 84, cy + 70), (cx, cy - 56), (cx + 84, cy + 70), (cx + 168, cy - 150)]
    sc.stroke(rot(w, ang), 84, accent or BLUE)
    for yy, ln in ((cy + 196, 330), (cy + 270, 214)):
        sc.stroke(rot([(cx - ln / 2, yy), (cx + ln / 2, yy)], ang), 40, LINE)


def build_app(variant="app"):
    sc = Scene()
    if variant == "uninstall":
        c0, c1, c2 = SLATE, SLATE_MID, SLATE_DEEP
    else:
        c0, c1, c2 = BLUE, BLUE_MID, BLUE_DEEP
    tile = squircle(S / 2, S / 2, S / 2 - 8)
    sc.poly(tile, c0)
    sc.poly(cookie(800, 214, 400, 9, 0.07, rot=0.3), c1, clip=tile)
    sc.poly(circle(150, 900, 330), c2, clip=tile)
    page_scene(sc, accent=c0)
    if variant == "install":
        sc.poly(circle(792, 792, 168), SKY, shadow=(0, 14, 18, 100))
        sc.stroke([(792, 706), (792, 836)], 46, WHITE)
        sc.stroke([(730, 786), (792, 848), (854, 786)], 46, WHITE)
    elif variant == "uninstall":
        sc.poly(circle(792, 792, 168), RED, shadow=(0, 14, 18, 100))
        sc.stroke([(738, 738), (846, 846)], 46, WHITE)
        sc.stroke([(846, 738), (738, 846)], 46, WHITE)
    return sc


# ----------------------------------------------------------------------------- raster
def render(sc, size):
    n = size * SS
    k = n / S
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))

    def mask_of(pts, dx=0, dy=0):
        m = Image.new("L", (n, n), 0)
        ImageDraw.Draw(m).polygon([((x + dx) * k, (y + dy) * k) for x, y in pts], fill=255)
        return m

    for op in sc.ops:
        if op[0] == "poly":
            _, pts, fill, clip, shadow = op
            if shadow:
                dx, dy, blur, alpha = shadow
                sh = Image.new("RGBA", (n, n), SHADOW + (0,))
                sh.putalpha(mask_of(pts, dx, dy).point(lambda v: v * alpha // 255))
                img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur * k)))
            layer = Image.new("RGBA", (n, n), fill + (255,))
            m = mask_of(pts)
            if clip:
                m = ImageChops.multiply(m, mask_of(clip))
            layer.putalpha(m)
            img.alpha_composite(layer)
        else:
            _, pts, width, color, clip = op
            m = Image.new("L", (n, n), 0)
            d = ImageDraw.Draw(m)
            sp = [(x * k, y * k) for x, y in pts]
            d.line(sp, fill=255, width=int(width * k), joint="curve")
            r = width * k / 2
            for x, y in sp:
                d.ellipse((x - r, y - r, x + r, y + r), fill=255)
            if clip:
                m = ImageChops.multiply(m, mask_of(clip))
            layer = Image.new("RGBA", (n, n), color + (255,))
            layer.putalpha(m)
            img.alpha_composite(layer)
    return img.resize((size, size), Image.LANCZOS)


# ----------------------------------------------------------------------------- svg
def svg_of(sc, size=1024):
    defs, body = [], []
    for i, op in enumerate(sc.ops):
        if op[0] == "poly":
            _, pts, fill, clip, shadow = op
            d = "M" + "L".join(f"{x:.0f} {y:.0f}" for x, y in pts) + "Z"
            attrs = ""
            if clip:
                cd = "M" + "L".join(f"{x:.0f} {y:.0f}" for x, y in clip) + "Z"
                defs.append(f'<clipPath id="c{i}"><path d="{cd}"/></clipPath>')
                attrs += f' clip-path="url(#c{i})"'
            if shadow:
                dx, dy, blur, alpha = shadow
                defs.append(f'<filter id="f{i}" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="{dx}" dy="{dy}" stdDeviation="{blur}" flood-color="{rgb(SHADOW)}" flood-opacity="{alpha / 255:.2f}"/></filter>')
                attrs += f' filter="url(#f{i})"'
            body.append(f'<path d="{d}" fill="{rgb(fill)}"{attrs}/>')
        else:
            _, pts, width, color, clip = op
            d = "M" + "L".join(f"{x:.0f} {y:.0f}" for x, y in pts)
            body.append(f'<path d="{d}" fill="none" stroke="{rgb(color)}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"/>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="{size}" height="{size}">' + ("<defs>" + "".join(defs) + "</defs>" if defs else "") + "".join(body) + "</svg>"


# ----------------------------------------------------------------------------- installer art
def sidebar(app):
    """NSIS welcome/finish sidebar, 164 x 314."""
    W, H = 164 * 3, 314 * 3
    img = Image.new("RGB", (W, H), BLUE)
    d = ImageDraw.Draw(img, "RGBA")
    d.polygon([(x / 1024 * 520 + 40, y / 1024 * 520 - 120) for x, y in cookie(800, 214, 400, 9, 0.07, rot=0.3)], fill=BLUE_MID + (255,))
    d.ellipse((-160, H - 360, 360, H + 160), fill=BLUE_DEEP + (255,))
    d.rounded_rectangle((W - 130, H - 520, W + 60, H - 440), radius=40, fill=SKY + (255,))
    ic = app.resize((300, 300), Image.LANCZOS)
    img.paste(ic, ((W - 300) // 2, 190), ic)
    for i, ln in enumerate((300, 220, 150)):
        y = 600 + i * 56
        d.rounded_rectangle(((W - 300) // 2, y, (W - 300) // 2 + ln, y + 26), radius=13, fill=CONTAINER + (230 - i * 40,))
    return img.resize((164, 314), Image.LANCZOS)


def header(app):
    """NSIS header, 150 x 57 (white band with the icon on the right)."""
    W, H = 150 * 4, 57 * 4
    img = Image.new("RGB", (W, H), WHITE)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((16, 18, 16 + 120, 18 + 18), radius=9, fill=CONTAINER)
    d.rounded_rectangle((16, 46, 16 + 76, 46 + 14), radius=7, fill=LINE)
    ic = app.resize((190, 190), Image.LANCZOS)
    img.paste(ic, (W - 190 - 14, 19), ic)
    return img.resize((150, 57), Image.LANCZOS)


def main():
    app_sc, inst_sc, un_sc = build_app("app"), build_app("install"), build_app("uninstall")
    app, inst, unin = render(app_sc, 1024), render(inst_sc, 1024), render(un_sc, 1024)

    app.resize((512, 512), Image.LANCZOS).save(OUT / "icon.png")
    for n in (16, 24, 32, 48, 64, 128, 256, 512):
        render(app_sc, n).save(OUT / f"{n}x{n}.png")  # rendered natively per size for crisp edges
    app.resize((256, 256), Image.LANCZOS).save(OUT / "128x128@2x.png")
    for n in (30, 44, 71, 89, 107, 142, 150, 284, 310):
        render(app_sc, n).save(OUT / f"Square{n}x{n}Logo.png")
    render(app_sc, 50).save(OUT / "StoreLogo.png")
    sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    app.save(OUT / "icon.ico", sizes=sizes)
    inst.save(OUT / "installer.ico", sizes=sizes)
    unin.save(OUT / "uninstaller.ico", sizes=sizes)
    app.save(OUT / "icon.icns", sizes=[(16, 16), (32, 32), (64, 64), (128, 128), (256, 256), (512, 512), (1024, 1024)])
    sidebar(app).save(OUT / "nsis-sidebar.bmp")
    header(app).save(OUT / "nsis-header.bmp")

    (ROOT / "src" / "logo.svg").write_text(svg_of(app_sc), encoding="utf-8")
    (ROOT / "src" / "logo-installer.svg").write_text(svg_of(inst_sc), encoding="utf-8")
    (ROOT / "src" / "logo-uninstall.svg").write_text(svg_of(un_sc), encoding="utf-8")
    print("icons written to", OUT)


if __name__ == "__main__":
    main()
