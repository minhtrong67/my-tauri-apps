#!/usr/bin/env python3
"""Material 3 Expressive icon set for Material Xlsx.

Generates the app / installer / uninstaller icons (.png, .ico, .icns), Windows Store tiles,
the SVG favicon and the social share image. Needs: pip install pillow numpy (brotli + fonttools for og-image fonts).
Run from the project root:  python scripts/make-icons.py
"""
import io, math, struct
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "src-tauri" / "icons"

def rgb(h):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

# Material 3 green tonal palette (seed #1B6B3A)
PAL = {
    "app": dict(top="#52CC80", bot="#0C5A2A", sheet="#F6FFF6", head="#A6F4B4", line="#1B6B3A", sel="#1B6B3A", spark="#D8FFE2"),
    "uninstaller": dict(top="#86B393", bot="#2F5239", sheet="#F4FBF5", head="#C3E8CC", line="#3D6B4A", sel="#3D6B4A", spark="#E3F7E8"),
}
PAL["installer"] = PAL["app"]

def cookie(n=9, amp=0.055, R=0.455, steps=900):
    """M3 Expressive 'cookie' shape: a circle with n soft lobes, as normalised points."""
    pts = []
    for i in range(steps):
        t = 2 * math.pi * i / steps; r = R * (1 + amp * math.cos(n * t))
        pts.append((0.5 + r * math.cos(t), 0.5 + r * math.sin(t)))
    return pts

def star(cx, cy, r, steps=96):
    """4-point sparkle (astroid)."""
    return [(cx + r * math.cos(2 * math.pi * i / steps) ** 3, cy + r * math.sin(2 * math.pi * i / steps) ** 3) for i in range(steps)]

def rline(d, pts, w, fill):
    """Polyline with round caps / joins."""
    d.line(pts, fill=fill, width=int(w), joint="curve")
    for x, y in (pts[0], pts[-1]) + tuple(pts[1:-1]):
        d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=fill)

def gradient(S, top, bot):
    y, x = np.mgrid[0:S, 0:S].astype(np.float32) / S
    t = np.clip(x * 0.40 + y * 0.60, 0, 1)[..., None]
    a, b = np.array(rgb(top), np.float32), np.array(rgb(bot), np.float32)
    col = a * (1 - t) + b * t
    hl = np.clip(1 - np.hypot(x - 0.28, y - 0.22) / 0.62, 0, 1)[..., None] ** 2 * 0.20  # soft top-left light
    col = col + (255 - col) * hl
    return Image.fromarray(np.clip(col, 0, 255).astype(np.uint8), "RGB")

def render(size, variant="app"):
    p = PAL[variant]; SS = 4 if size <= 256 else 3; S = size * SS
    simple, tiny = size <= 40, size <= 24
    P = lambda pts: [(x * S, y * S) for x, y in pts]
    # tile
    mask = Image.new("L", (S, S), 0); ImageDraw.Draw(mask).polygon(P(cookie()), fill=255)
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0)); img.paste(gradient(S, p["top"], p["bot"]), (0, 0), mask)
    # sheet
    if simple: bx = (0.20, 0.25, 0.80, 0.77)
    else: bx = (0.24, 0.29, 0.72, 0.73)
    x0, y0, x1, y1 = [v * S for v in bx]; rad = (0.11 if simple else 0.085) * S
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    d.rectangle((x0, y0, x1, y1), fill=rgb(p["sheet"]))
    hh = (0.16 if simple else 0.12) * S; d.rectangle((x0, y0, x1, y0 + hh), fill=rgb(p["head"]))
    lw = (0.045 if simple else 0.018) * S; w = x1 - x0; hgt = y1 - y0 - hh
    if simple:
        d.rectangle((x0 + w / 2 - lw / 2, y0 + hh, x0 + w / 2 + lw / 2, y1), fill=rgb(p["line"]))
        d.rectangle((x0, y0 + hh + hgt / 2 - lw / 2, x1, y0 + hh + hgt / 2 + lw / 2), fill=rgb(p["line"]))
        if not tiny: d.rectangle((x0 + w / 2 + lw / 2, y0 + hh + hgt / 2 + lw / 2, x1, y1), fill=rgb(p["sel"]))
    else:
        for i in (1, 2): d.rectangle((x0 + w * i / 3 - lw / 2, y0 + hh, x0 + w * i / 3 + lw / 2, y1), fill=rgb(p["line"]))
        for i in (0, 1): d.rectangle((x0, y0 + hh + hgt * i / 2 - lw / 2, x1, y0 + hh + hgt * i / 2 + lw / 2), fill=rgb(p["line"]))
        cx0, cy0 = x0 + w / 3 + lw / 2, y0 + hh + hgt / 2 + lw / 2   # selected cell (row 2, col 2)
        d.rounded_rectangle((cx0, cy0, x0 + w * 2 / 3 - lw / 2, y1 - lw / 2), radius=0.018 * S, fill=rgb(p["sel"]))
    smask = Image.new("L", (S, S), 0); ImageDraw.Draw(smask).rounded_rectangle((x0, y0, x1, y1), radius=rad, fill=255)
    layer.putalpha(smask)
    shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0)); sm = Image.new("L", (S, S), 0)
    ImageDraw.Draw(sm).rounded_rectangle((x0, y0 + 0.016 * S, x1, y1 + 0.016 * S), radius=rad, fill=110)
    shadow.putalpha(sm.filter(ImageFilter.GaussianBlur(0.022 * S))); shadow = Image.composite(shadow, Image.new("RGBA", (S, S)), mask)
    img = Image.alpha_composite(img, shadow); img = Image.alpha_composite(img, layer)
    d = ImageDraw.Draw(img)
    if not simple and variant == "app":   # sparkle
        d.polygon(P(star(0.785, 0.215, 0.075)), fill=rgb(p["spark"]))
        d.polygon(P(star(0.69, 0.145, 0.032)), fill=rgb(p["spark"]))
    if variant in ("installer", "uninstaller"):   # badge
        bc = (0.745, 0.745); br = 0.19 if not simple else 0.23
        if simple: bc = (0.72, 0.72)
        cxp, cyp = bc[0] * S, bc[1] * S
        d.ellipse((cxp - (br + 0.03) * S, cyp - (br + 0.03) * S, cxp + (br + 0.03) * S, cyp + (br + 0.03) * S), fill=rgb(p["bot"]))
        fill, ink = (rgb("#A6F4B4"), rgb("#0B4A22")) if variant == "installer" else (rgb("#FFDAD6"), rgb("#93000A"))
        d.ellipse((cxp - br * S, cyp - br * S, cxp + br * S, cyp + br * S), fill=fill)
        u = br / 0.19; g = lambda dx, dy: (cxp + dx * u * S, cyp + dy * u * S); lw2 = 0.04 * u * S
        if variant == "installer":
            rline(d, [g(0, -0.085), g(0, 0.035)], lw2, ink); rline(d, [g(-0.06, -0.02), g(0, 0.045), g(0.06, -0.02)], lw2, ink); rline(d, [g(-0.08, 0.09), g(0.08, 0.09)], lw2, ink)
        else:
            rline(d, [g(-0.08, -0.06), g(0.08, -0.06)], lw2, ink); rline(d, [g(-0.025, -0.095), g(0.025, -0.095)], lw2, ink)
            rline(d, [g(-0.06, -0.03), g(-0.05, 0.085), g(0.05, 0.085), g(0.06, -0.03)], lw2, ink); rline(d, [g(0, 0), g(0, 0.055)], lw2 * 0.8, ink)
    return img.resize((size, size), Image.LANCZOS)

def png_bytes(im):
    b = io.BytesIO(); im.save(b, "PNG", optimize=True); return b.getvalue()

def write_ico(path, variant, sizes=(16, 24, 32, 48, 64, 128, 256)):
    blobs = [png_bytes(render(s, variant)) for s in sizes]
    out = struct.pack("<HHH", 0, 1, len(sizes)); off = 6 + 16 * len(sizes)
    for s, bl in zip(sizes, blobs):
        out += struct.pack("<BBBBHHII", s % 256, s % 256, 0, 0, 1, 32, len(bl), off); off += len(bl)
    Path(path).write_bytes(out + b"".join(blobs))

def write_icns(path):
    kinds = [("icp4", 16), ("icp5", 32), ("icp6", 64), ("ic07", 128), ("ic08", 256), ("ic09", 512), ("ic10", 1024)]
    body = b"".join(k.encode() + struct.pack(">I", 8 + len(d)) + d for k, d in ((k, png_bytes(render(s))) for k, s in kinds))
    Path(path).write_bytes(b"icns" + struct.pack(">I", 8 + len(body)) + body)

def write_svg(path):
    f = lambda pts, k=512: " ".join(f"{x * k:.1f},{y * k:.1f}" for x, y in pts)
    p = PAL["app"]; k = 512
    x0, y0, x1, y1 = [v * k for v in (0.24, 0.29, 0.72, 0.73)]; hh, lw = 0.12 * k, 0.018 * k; w = x1 - x0; hgt = y1 - y0 - hh
    lines = "".join(f'<rect x="{x0 + w * i / 3 - lw / 2:.1f}" y="{y0 + hh:.1f}" width="{lw:.1f}" height="{hgt:.1f}"/>' for i in (1, 2))
    lines += "".join(f'<rect x="{x0:.1f}" y="{y0 + hh + hgt * i / 2 - lw / 2:.1f}" width="{w:.1f}" height="{lw:.1f}"/>' for i in (0, 1))
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {k} {k}" role="img" aria-label="Material Xlsx">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{p['top']}"/><stop offset="1" stop-color="{p['bot']}"/></linearGradient>
<clipPath id="s"><rect x="{x0:.1f}" y="{y0:.1f}" width="{w:.1f}" height="{y1 - y0:.1f}" rx="{0.085 * k:.1f}"/></clipPath>
<filter id="b" x="-20%" y="-20%" width="140%" height="150%"><feGaussianBlur stdDeviation="9"/></filter></defs>
<polygon points="{f(cookie())}" fill="url(#g)"/>
<rect x="{x0:.1f}" y="{y0 + 8:.1f}" width="{w:.1f}" height="{y1 - y0:.1f}" rx="{0.085 * k:.1f}" fill="#000" opacity=".3" filter="url(#b)"/>
<g clip-path="url(#s)"><rect x="{x0:.1f}" y="{y0:.1f}" width="{w:.1f}" height="{y1 - y0:.1f}" fill="{p['sheet']}"/><rect x="{x0:.1f}" y="{y0:.1f}" width="{w:.1f}" height="{hh:.1f}" fill="{p['head']}"/>
<g fill="{p['line']}">{lines}<rect x="{x0 + w / 3 + lw / 2:.1f}" y="{y0 + hh + hgt / 2 + lw / 2:.1f}" width="{w / 3 - lw:.1f}" height="{hgt / 2 - lw:.1f}" rx="9"/></g></g>
<polygon points="{f(star(0.785, 0.215, 0.075))}" fill="{p['spark']}"/><polygon points="{f(star(0.69, 0.145, 0.032))}" fill="{p['spark']}"/></svg>'''
    Path(path).write_text(svg, encoding="utf-8")

def og_image(path, font_dir):
    W, H = 1200, 630
    y, x = np.mgrid[0:H, 0:W].astype(np.float32); t = np.clip((x / W) * 0.6 + (y / H) * 0.4, 0, 1)[..., None]
    a, b = np.array(rgb("#F3FCF4"), np.float32), np.array(rgb("#D5F3DC"), np.float32)
    img = Image.fromarray((a * (1 - t) + b * t).astype(np.uint8), "RGB").convert("RGBA")
    def blob(cx, cy, r, col, alpha, rot=0):
        m = Image.new("L", (W * 2, H * 2), 0); pts = [(px * 2 * r * 2 + (cx * 2 - r * 2), py * 2 * r * 2 + (cy * 2 - r * 2)) for px, py in cookie(steps=600)]
        c, s = math.cos(rot), math.sin(rot); pts = [((px - cx * 2) * c - (py - cy * 2) * s + cx * 2, (px - cx * 2) * s + (py - cy * 2) * c + cy * 2) for px, py in pts]
        ImageDraw.Draw(m).polygon(pts, fill=int(255 * alpha)); m = m.resize((W, H), Image.LANCZOS)
        layer = Image.new("RGBA", (W, H), rgb(col) + (0,)); layer.putalpha(m); return layer
    img = Image.alpha_composite(img, blob(930, 300, 330, "#A6F4B4", 0.65, 0.3))
    img = Image.alpha_composite(img, blob(1130, 560, 150, "#52CC80", 0.45, 0.8))
    img = Image.alpha_composite(img, blob(60, 640, 170, "#A6F4B4", 0.55, 0.1))
    ic = render(440); sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sh.paste(ic, (710, 85), ic)
    shadow = sh.filter(ImageFilter.GaussianBlur(22)); al = shadow.split()[3].point(lambda v: int(v * 0.35)); dark = Image.new("RGBA", (W, H), (10, 60, 30, 0)); dark.putalpha(al)
    img = Image.alpha_composite(img, Image.new("RGBA", (W, H), (0, 0, 0, 0))); img = Image.alpha_composite(img, dark.transform((W, H), Image.AFFINE, (1, 0, 0, 0, 1, -14))); img = Image.alpha_composite(img, sh)
    d = ImageDraw.Draw(img); fb = ImageFont.truetype(str(font_dir / "inter-700.ttf"), 96); fr = ImageFont.truetype(str(font_dir / "inter-400.ttf"), 38); fs = ImageFont.truetype(str(font_dir / "inter-700.ttf"), 27)
    d.text((72, 168), "Material", font=fb, fill=rgb("#0B2E18")); d.text((72, 270), "Xlsx", font=fb, fill=rgb("#1B6B3A"))
    d.text((74, 396), "Fast, offline spreadsheets in", font=fr, fill=rgb("#2F4B37")); d.text((74, 446), "Material 3 Expressive.", font=fr, fill=rgb("#2F4B37"))
    x = 74
    for label in ("XLSX · CSV", "Charts", "EN · VI"):
        tw = d.textlength(label, font=fs); d.rounded_rectangle((x, 520, x + tw + 44, 574), radius=27, fill=rgb("#A6F4B4")); d.text((x + 22, 531), label, font=fs, fill=rgb("#0B4A22")); x += tw + 62
    img.convert("RGB").save(path, "PNG", optimize=True)

def main(og_font_dir=None):
    ICONS.mkdir(parents=True, exist_ok=True)
    for name, s in {"32x32": 32, "64x64": 64, "128x128": 128, "128x128@2x": 256, "icon": 512, "Square30x30Logo": 30, "Square44x44Logo": 44, "Square71x71Logo": 71, "Square89x89Logo": 89,
                    "Square107x107Logo": 107, "Square142x142Logo": 142, "Square150x150Logo": 150, "Square284x284Logo": 284, "Square310x310Logo": 310, "StoreLogo": 50}.items():
        render(s).save(ICONS / f"{name}.png", optimize=True)
    render(256).save(ROOT / "src" / "app-icon.png", optimize=True)
    write_ico(ICONS / "icon.ico", "app"); write_ico(ICONS / "installer.ico", "installer"); write_ico(ICONS / "uninstaller.ico", "uninstaller"); write_icns(ICONS / "icon.icns")
    write_svg(ROOT / "icon.svg")
    if og_font_dir: og_image(ROOT / "og-image.png", Path(og_font_dir))
    print("icons generated")

if __name__ == "__main__":
    import sys; main(sys.argv[1] if len(sys.argv) > 1 else None)
