"""Sinh toàn bộ icon của Fluent Claude (chỉ cần Pillow):  python scripts/make_icons.py

Phong cách Fluent (Windows 11): ô vuông bo mềm, gradient cam Claude, highlight "kính" phía trên,
viền sáng mảnh và bóng đổ nhẹ. Biểu tượng = vòng tiến độ (đếm ngược reset) + ba cột mức dùng.
Kích thước nhỏ (< 48 px) dùng bản đơn giản hoá chỉ còn ba cột để vẫn đọc được.

Một hình học chung cho: app icon, setup icon (huy hiệu tải xuống), uninstall icon (huy hiệu thùng rác),
icon extension, favicon và logo.svg.   Xuất ra: src-tauri/icons, extension/icons, assets, app/public.
"""
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
M = 2048            # canvas gốc (supersample 2x so với thiết kế 1024)
K = M / 1024        # hệ số quy đổi toạ độ thiết kế -> canvas

# ---- bảng màu (cam Claude, sắc Fluent) ----
C_LIGHT = (247, 164, 126)
C_MID = (222, 123, 88)
C_DARK = (184, 81, 44)
INK = (45, 18, 8)

# ---- hình học thiết kế (hệ toạ độ 1024) ----
TILE = (64, 64, 960, 960)
TILE_R = 208
RING = dict(cx=512, cy=500, r=270, w=64)
BARS_FULL = [(372, 520, 0.98), (480, 450, 0.98), (588, 380, 0.55)]   # (x, top, alpha); rộng 64, đáy y=640
BARS_FULL_W, BARS_FULL_BOTTOM = 64, 640
BARS_SMALL = [(262, 432, 1.0), (432, 312, 1.0), (602, 192, 0.6)]     # rộng 160, đáy y=800
BARS_SMALL_W, BARS_SMALL_BOTTOM = 160, 800


def s(v):
    return int(round(v * K))


def box(b):
    return [s(b[0]), s(b[1]), s(b[2]), s(b[3])]


def rrect_mask(b, r):
    m = Image.new("L", (M, M), 0)
    ImageDraw.Draw(m).rounded_rectangle(box(b), s(r), fill=255)
    return m


def diag_gradient(c0, c1, c2):
    """Gradient chéo 3 điểm màu (trên-trái -> dưới-phải) phủ kín canvas."""
    g = Image.linear_gradient("L").resize((M, M), Image.BILINEAR)            # dọc, 0 (trên) -> 255 (dưới)
    h = g.rotate(90)                                                          # ngang, 0 (trái) -> 255 (phải)
    half = Image.new("L", (M, M), 128)
    diag = ImageChops.add(ImageChops.multiply(g, half), ImageChops.multiply(h, half))
    return ImageOps.colorize(diag, black=c0, white=c2, mid=c1).convert("RGBA")


def with_alpha(mask, a):
    return mask.point(lambda v: int(v * a))


def glyph_layers(detail):
    """Các lớp mặt nạ (L) của biểu tượng, màu trắng."""
    layers = {}
    if detail:
        cx, cy, r, w = RING["cx"], RING["cy"], RING["r"], RING["w"]
        outer = [s(cx - r - w / 2), s(cy - r - w / 2), s(cx + r + w / 2), s(cy + r + w / 2)]
        inner = [s(cx - r + w / 2), s(cy - r + w / 2), s(cx + r - w / 2), s(cy + r - w / 2)]
        track = Image.new("L", (M, M), 0)
        td = ImageDraw.Draw(track)
        td.ellipse(outer, fill=255)
        td.ellipse(inner, fill=0)
        layers["track"] = with_alpha(track, 0.28)
        # cung tiến độ 270° bắt đầu từ 12 giờ, đầu bo tròn
        arc = Image.new("L", (M, M), 0)
        ad = ImageDraw.Draw(arc)
        ad.arc([s(cx - r - w / 2), s(cy - r - w / 2), s(cx + r + w / 2), s(cy + r + w / 2)], start=-90, end=180, width=s(w), fill=255)
        for ang in (-90, 180):
            px = cx + r * math.cos(math.radians(ang))
            py = cy + r * math.sin(math.radians(ang))
            ad.ellipse([s(px - w / 2), s(py - w / 2), s(px + w / 2), s(py + w / 2)], fill=255)
        layers["arc"] = with_alpha(arc, 0.97)
        bars, bw, bottom = BARS_FULL, BARS_FULL_W, BARS_FULL_BOTTOM
    else:
        bars, bw, bottom = BARS_SMALL, BARS_SMALL_W, BARS_SMALL_BOTTOM
    for i, (x, top, a) in enumerate(bars):
        m = Image.new("L", (M, M), 0)
        ImageDraw.Draw(m).rounded_rectangle([s(x), s(top), s(x + bw), s(bottom)], s(bw / 2), fill=255)
        layers[f"bar{i}"] = with_alpha(m, a)
    return layers


def white_from(mask):
    img = Image.new("RGBA", (M, M), (255, 255, 255, 255))
    img.putalpha(mask)
    return img


def tile(detail=True, shadow=True):
    """Ô vuông Fluent hoàn chỉnh (RGBA, M x M)."""
    out = Image.new("RGBA", (M, M), (0, 0, 0, 0))
    tmask = rrect_mask(TILE, TILE_R)

    if shadow:
        shm = Image.new("L", (M, M), 0)
        ImageDraw.Draw(shm).rounded_rectangle([s(TILE[0]), s(TILE[1] + 20), s(TILE[2]), s(TILE[3] + 20)], s(TILE_R), fill=255)
        shm = shm.filter(ImageFilter.GaussianBlur(s(24)))
        sh = Image.new("RGBA", (M, M), INK + (255,))
        sh.putalpha(with_alpha(shm, 0.36))
        out = Image.alpha_composite(out, sh)

    # nền gradient
    bg = diag_gradient(C_LIGHT, C_MID, C_DARK)
    bg.putalpha(tmask)
    out = Image.alpha_composite(out, bg)

    # highlight kính phía trên-trái
    rg = Image.radial_gradient("L").resize((s(1300), s(1300)), Image.BILINEAR)   # tâm 0 -> mép 255
    # Pillow: giá trị = 255 ở góc, ~180 ở giữa cạnh -> chuẩn hoá để tắt hẳn về 0 tại bán kính 650 (khớp radialGradient trong SVG)
    hi_alpha = rg.point(lambda v: int(255 * 0.34 * (1 - min(1.0, v / 180.0)) ** 1.4))
    hi = Image.new("L", (M, M), 0)
    hi.paste(hi_alpha, (s(300) - s(650), s(170) - s(650)))
    out = Image.alpha_composite(out, white_from(ImageChops.multiply(hi, tmask)))

    # bóng tối nhẹ phía dưới (chiều sâu)
    vg = Image.linear_gradient("L").resize((M, M), Image.BILINEAR).point(lambda v: int(max(0, v - 120) * 0.62))
    dk = Image.new("RGBA", (M, M), INK + (255,))
    dk.putalpha(ImageChops.multiply(vg, tmask))
    out = Image.alpha_composite(out, dk)

    # viền sáng mảnh (rim light): sáng ở trên, mờ dần xuống dưới
    inner = rrect_mask((TILE[0] + 5, TILE[1] + 5, TILE[2] - 5, TILE[3] - 5), TILE_R - 5)
    rim = ImageChops.subtract(tmask, inner)
    fall = ImageOps.invert(Image.linear_gradient("L").resize((M, M), Image.BILINEAR)).point(lambda v: int(max(0, v - 90) * 0.9))
    out = Image.alpha_composite(out, white_from(ImageChops.multiply(rim, fall)))

    # biểu tượng (có bóng mờ để nổi trên nền cam)
    layers = glyph_layers(detail)
    union = Image.new("L", (M, M), 0)
    for m in layers.values():
        union = ImageChops.lighter(union, m)
    gs = union.filter(ImageFilter.GaussianBlur(s(14)))
    gsh = Image.new("RGBA", (M, M), INK + (255,))
    gsh.putalpha(ImageChops.offset(with_alpha(gs, 0.30), 0, s(10)))
    out = Image.alpha_composite(out, gsh)
    for m in layers.values():
        out = Image.alpha_composite(out, white_from(m))
    return out


def badge(base, kind):
    """Huy hiệu tròn ở góc dưới-phải cho setup / uninstall."""
    cx, cy, r = 772, 772, 232
    out = base.copy()
    sh = Image.new("L", (M, M), 0)
    ImageDraw.Draw(sh).ellipse([s(cx - r), s(cy - r + 14), s(cx + r), s(cy + r + 14)], fill=255)
    sh = sh.filter(ImageFilter.GaussianBlur(s(16)))
    shi = Image.new("RGBA", (M, M), (0, 0, 0, 255))
    shi.putalpha(with_alpha(sh, 0.40))
    out = Image.alpha_composite(out, shi)
    d = ImageDraw.Draw(out, "RGBA")
    if kind == "setup":
        d.ellipse([s(cx - r), s(cy - r), s(cx + r), s(cy + r)], fill=(255, 255, 255, 255))
        c = C_DARK + (255,)
        d.rounded_rectangle([s(cx - 30), s(cy - 140), s(cx + 30), s(cy + 20)], s(30), fill=c)
        d.polygon([(s(cx - 104), s(cy - 14)), (s(cx + 104), s(cy - 14)), (s(cx), s(cy + 96))], fill=c)
        d.rounded_rectangle([s(cx - 124), s(cy + 120), s(cx + 124), s(cy + 160)], s(20), fill=c)
    else:
        dark = (36, 36, 36, 255)
        d.ellipse([s(cx - r), s(cy - r), s(cx + r), s(cy + r)], fill=dark)
        w = (255, 255, 255, 255)
        d.rounded_rectangle([s(cx - 120), s(cy - 118), s(cx + 120), s(cy - 82)], s(18), fill=w)
        d.rounded_rectangle([s(cx - 36), s(cy - 150), s(cx + 36), s(cy - 108)], s(14), fill=w)
        d.polygon([(s(cx - 96), s(cy - 60)), (s(cx + 96), s(cy - 60)), (s(cx + 78), s(cy + 130)), (s(cx - 78), s(cy + 130))], fill=w)
        for dx in (-34, 0, 34):
            d.rounded_rectangle([s(cx + dx - 8), s(cy - 28), s(cx + dx + 8), s(cy + 96)], s(8), fill=dark)
    return out


def sized(img, n):
    return img.resize((n, n), Image.LANCZOS)


def save_ico(full, small, path, sizes=(16, 20, 24, 32, 40, 48, 64, 128, 256)):
    """ICO nhiều kích cỡ; cỡ nhỏ dùng bản đơn giản để không bị nát nét."""
    frames = [sized(small if n < 48 else full, n) for n in sizes]
    frames[-1].save(path, format="ICO", sizes=[(n, n) for n in sizes], append_images=frames[:-1])


def hexc(c):
    return "#%02X%02X%02X" % c


def svg_logo(shadow=True):
    cx, cy, r, w = RING["cx"], RING["cy"], RING["r"], RING["w"]
    bars = ""
    for x, top, a in BARS_FULL:
        op = "" if a > 0.9 else ' fill-opacity=".%d"' % int(a * 100)
        bars += f'<rect x="{x}" y="{top}" width="{BARS_FULL_W}" height="{BARS_FULL_BOTTOM - top}" rx="{BARS_FULL_W // 2}" fill="#fff"{op}/>'
    filt = ' filter="url(#fc-sh)"' if shadow else ""
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><defs>'
        f'<linearGradient id="fc-bg" x1="140" y1="64" x2="884" y2="960" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="{hexc(C_LIGHT)}"/><stop offset=".5" stop-color="{hexc(C_MID)}"/><stop offset="1" stop-color="{hexc(C_DARK)}"/></linearGradient>'
        '<radialGradient id="fc-hi" cx="300" cy="170" r="650" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
        '<linearGradient id="fc-rim" x1="0" y1="64" x2="0" y2="960" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".62"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>'
        '<linearGradient id="fc-dk" x1="0" y1="64" x2="0" y2="960" gradientUnits="userSpaceOnUse"><stop offset=".47" stop-color="#2D1208" stop-opacity="0"/><stop offset="1" stop-color="#2D1208" stop-opacity=".24"/></linearGradient>'
        '<filter id="fc-sh" x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dx="0" dy="20" stdDeviation="22" flood-color="#2D1208" flood-opacity=".36"/></filter>'
        '<filter id="fc-gs" x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#2D1208" flood-opacity=".30"/></filter>'
        '</defs>'
        f'<rect x="64" y="64" width="896" height="896" rx="{TILE_R}" fill="url(#fc-bg)"{filt}/>'
        f'<rect x="64" y="64" width="896" height="896" rx="{TILE_R}" fill="url(#fc-hi)"/>'
        f'<rect x="64" y="64" width="896" height="896" rx="{TILE_R}" fill="url(#fc-dk)"/>'
        f'<rect x="67" y="67" width="890" height="890" rx="{TILE_R - 3}" fill="none" stroke="url(#fc-rim)" stroke-width="6"/>'
        '<g filter="url(#fc-gs)">'
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="{w}"/>'
        f'<path d="M{cx} {cy - r}A{r} {r} 0 1 1 {cx - r} {cy}" fill="none" stroke="#fff" stroke-opacity=".97" stroke-width="{w}" stroke-linecap="round"/>'
        f'{bars}</g></svg>'
    )


def main():
    full = tile(True)
    small = tile(False)
    setup = badge(full, "setup")
    unins = badge(full, "uninstall")

    ti = ROOT / "src-tauri" / "icons"
    ti.mkdir(parents=True, exist_ok=True)
    for name, n in [("32x32.png", 32), ("64x64.png", 64), ("128x128.png", 128), ("128x128@2x.png", 256), ("icon.png", 512)]:
        sized(small if n < 48 else full, n).save(ti / name)
    save_ico(full, small, ti / "icon.ico")
    save_ico(setup, setup, ti / "setup.ico")
    save_ico(unins, unins, ti / "uninstall.ico")
    for n in (30, 44, 71, 89, 107, 142, 150, 284, 310):
        sized(small if n < 48 else full, n).save(ti / f"Square{n}x{n}Logo.png")
    sized(full, 50).save(ti / "StoreLogo.png")

    ei = ROOT / "extension" / "icons"
    ei.mkdir(parents=True, exist_ok=True)
    for n in (16, 32, 48, 128):
        sized(small if n < 48 else full, n).save(ei / f"{n}.png")

    a = ROOT / "assets"
    a.mkdir(exist_ok=True)
    sized(full, 512).save(a / "icon-512.png")
    (a / "logo.svg").write_text(svg_logo(), encoding="utf-8")
    pub = ROOT / "app" / "public"
    pub.mkdir(parents=True, exist_ok=True)
    (pub / "favicon.svg").write_text(svg_logo(shadow=False), encoding="utf-8")
    print("OK")


if __name__ == "__main__":
    main()
