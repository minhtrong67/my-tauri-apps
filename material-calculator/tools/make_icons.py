"""Generates the Material You style source artwork (app / setup / uninstall icons
and the NSIS installer bitmaps). Requires Pillow. Run: python tools/make_icons.py"""
from PIL import Image, ImageDraw
import os, math

OUT = os.path.join(os.path.dirname(__file__), "..", "src-tauri")
SRC = os.path.join(OUT, "icons-src")
INST = os.path.join(OUT, "installer")
os.makedirs(SRC, exist_ok=True); os.makedirs(INST, exist_ok=True)

S = 2048  # work at 2x, downsample for clean anti-aliasing
k = S / 1024

def hx(h, a=255):
    h = h.lstrip("#"); return (int(h[0:2],16), int(h[2:4],16), int(h[4:6],16), a)

PRIMARY, ON_PRIMARY = hx("#6750A4"), hx("#FFFFFF")
PRIMARY_C, SECONDARY_C, SECONDARY_ON = hx("#EADDFF"), hx("#E8DEF8"), hx("#4A4458")
TERTIARY_C, TERTIARY_ON = hx("#FFD8E4"), hx("#633B48")
ERROR_C, ERROR_ON = hx("#F9DEDC"), hx("#8C1D18")

def rr(d, box, r, fill):
    x0,y0,x1,y1 = [v*k for v in box]
    d.rounded_rectangle((x0,y0,x1,y1), radius=r*k, fill=fill)

def bar(d, cx, cy, w, h, fill, angle=0):
    """rounded bar centred on (cx,cy); optional rotation (degrees)."""
    if angle == 0:
        rr(d, (cx-w/2, cy-h/2, cx+w/2, cy+h/2), h/2, fill); return
    layer = Image.new("RGBA", (S,S), (0,0,0,0)); ld = ImageDraw.Draw(layer)
    rr(ld, (cx-w/2, cy-h/2, cx+w/2, cy+h/2), h/2, fill)
    layer = layer.rotate(-angle, center=(cx*k, cy*k), resample=Image.BICUBIC)
    d._image.alpha_composite(layer)

def glyph(d, kind, cx, cy, size, t, fill):
    if kind == "plus":
        bar(d, cx, cy, size, t, fill); bar(d, cx, cy, t, size, fill)
    elif kind == "minus":
        bar(d, cx, cy, size, t, fill)
    elif kind == "times":
        bar(d, cx, cy, size*1.15, t, fill, 45); bar(d, cx, cy, size*1.15, t, fill, -45)
    elif kind == "equals":
        bar(d, cx, cy-size*0.22, size, t, fill); bar(d, cx, cy+size*0.22, size, t, fill)

def app_icon():
    im = Image.new("RGBA", (S,S), (0,0,0,0)); d = ImageDraw.Draw(im)
    rr(d, (80,80,944,944), 210, PRIMARY)
    # display
    rr(d, (176,176,848,376), 60, PRIMARY_C)
    bar(d, 848-56-120, 276, 240, 52, PRIMARY)
    bar(d, 176+56+34, 276, 68, 28, hx("#B69DF8"))
    # keys
    kw, kh, gap = 320, 204, 32
    keys = [("plus",SECONDARY_C,SECONDARY_ON),("minus",SECONDARY_C,SECONDARY_ON),
            ("times",SECONDARY_C,SECONDARY_ON),("equals",TERTIARY_C,TERTIARY_ON)]
    for i,(g,bg,fg) in enumerate(keys):
        col, row = i%2, i//2
        x0 = 176 + col*(kw+gap); y0 = 408 + row*(kh+gap)
        rr(d, (x0,y0,x0+kw,y0+kh), 76, bg)
        glyph(d, g, x0+kw/2, y0+kh/2, 96, 30, fg)
    return im

def badge(base, kind):
    im = base.copy(); d = ImageDraw.Draw(im)
    cx = cy = 770; R = 250
    d.ellipse(((cx-R-34)*k,(cy-R-34)*k,(cx+R+34)*k,(cy+R+34)*k), fill=(0,0,0,0))  # punch ring
    # carve ring out of base (cut-out look)
    mask = Image.new("L", (S,S), 255); md = ImageDraw.Draw(mask)
    md.ellipse(((cx-R-30)*k,(cy-R-30)*k,(cx+R+30)*k,(cy+R+30)*k), fill=0)
    im.putalpha(Image.composite(im.getchannel("A"), Image.new("L",(S,S),0), mask))
    d = ImageDraw.Draw(im)
    bg, fg = (TERTIARY_C, TERTIARY_ON) if kind=="setup" else (ERROR_C, ERROR_ON)
    d.ellipse(((cx-R)*k,(cy-R)*k,(cx+R)*k,(cy+R)*k), fill=bg)
    if kind == "setup":      # download arrow
        bar(d, cx, cy-40, 40, 190, fg)
        bar(d, cx-52, cy+34, 40, 120, fg, -45); bar(d, cx+52, cy+34, 40, 120, fg, 45)
        bar(d, cx, cy+130, 210, 38, fg)
    else:                    # trash can
        rr(d, (cx-100, cy-40, cx+100, cy+150), 28, fg)
        bar(d, cx, cy-72, 250, 38, fg)
        rr(d, (cx-40, cy-130, cx+40, cy-86), 16, fg)
        for dx in (-45, 0, 45): bar(d, cx+dx, cy+55, 22, 100, bg)
    return im

def save_png(im, name, size=1024):
    im.resize((size,size), Image.LANCZOS).save(os.path.join(SRC, name))

app = app_icon()
save_png(app, "app-icon.png", 1024)
setup = badge(app, "setup"); uninstall = badge(app, "uninstall")
ico_sizes = [(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)]
for name, im in (("setup", setup), ("uninstall", uninstall)):
    big = im.resize((256,256), Image.LANCZOS)
    big.save(os.path.join(INST, f"{name}.ico"), sizes=ico_sizes)
    save_png(im, f"{name}-icon.png", 512)

# ---- NSIS bitmaps -------------------------------------------------------
def bmp(im, name): im.convert("RGB").save(os.path.join(INST, name), "BMP")

def logo(px): return app.resize((px,px), Image.LANCZOS)

def sidebar():
    W,H = 164,314; sc = 3
    im = Image.new("RGBA", (W*sc,H*sc), hx("#F7F2FA")); d = ImageDraw.Draw(im)
    d.ellipse((-70*sc, 150*sc, 150*sc, 370*sc), fill=hx("#EADDFF"))
    d.ellipse((60*sc, 190*sc, 230*sc, 360*sc), fill=hx("#E8DEF8"))
    d.ellipse((90*sc, -50*sc, 210*sc, 70*sc), fill=hx("#FFD8E4", 140))
    lg = app.resize((88*sc, 88*sc), Image.LANCZOS)
    im.alpha_composite(lg, (38*sc, 64*sc))
    # tiny key row
    for i,(c) in enumerate(["#6750A4","#CCC2DC","#CCC2DC","#EFB8C8"]):
        x = 22*sc + i*34*sc
        d.rounded_rectangle((x, 262*sc, x+26*sc, 288*sc), radius=9*sc, fill=hx(c))
    return im.resize((W,H), Image.LANCZOS)

def header():
    W,H = 150,57; sc = 4
    im = Image.new("RGBA", (W*sc,H*sc), hx("#FEF7FF")); d = ImageDraw.Draw(im)
    d.ellipse((-30*sc, -40*sc, 70*sc, 40*sc), fill=hx("#F3EDF7"))
    d.ellipse((20*sc, 20*sc, 110*sc, 90*sc), fill=hx("#EADDFF", 120))
    lg = app.resize((40*sc, 40*sc), Image.LANCZOS)
    im.alpha_composite(lg, (100*sc, 9*sc))
    return im.resize((W,H), Image.LANCZOS)

bmp(sidebar(), "sidebar.bmp"); bmp(header(), "header.bmp")
print("done")
