"""
Generates every icon of Fluent Music from the SVG masters (Fluent 2 / Windows 11 style: layered blue-to-violet tile, glass music note).

    pip install pillow playwright      # chromium: python -m playwright install chromium
    python scripts/generate-icons.py   # or: npm run icons

Masters   public/icon.svg        full artwork with depth + drop shadow (>= 128 px)
          public/icon-small.svg  bolder, flat variant for 16-64 px
Outputs   src-tauri/icons/  icon.ico (16-256) icon.png 32x32 64x64 128x128 128x128@2x 256x256, Square*Logo, StoreLogo,
                            setup/uninstall/installer .ico (+ setup/uninstall .png), installer-header.bmp, installer-sidebar.bmp
          public/icon.png (256) and public/icon-512.png
"""
import io
import os

from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ICONS = os.path.join(ROOT, 'src-tauri', 'icons')
PUBLIC = os.path.join(ROOT, 'public')
os.makedirs(ICONS, exist_ok=True)
SMALL_LIMIT = 100  # below this the flat variant is used


def read(name):
    with open(os.path.join(PUBLIC, name), encoding='utf-8') as f:
        return f.read()


FULL, SMALL = read('icon.svg'), read('icon-small.svg')
_page = None
_cache = {}


def raster(size, small=None):
    """Render the master (or the small variant) at `size` px with a transparent background."""
    small = size < SMALL_LIMIT if small is None else small
    key = (size, small)
    if key not in _cache:
        _page.set_viewport_size({'width': size, 'height': size})
        _page.set_content(f'<style>html,body{{margin:0;background:transparent}}svg{{width:{size}px;height:{size}px;display:block}}</style>{SMALL if small else FULL}')
        _cache[key] = Image.open(io.BytesIO(_page.screenshot(omit_background=True))).convert('RGBA')
    return _cache[key].copy()


def save(img, *path):
    img.save(os.path.join(*path))


def ico(path, sizes=(16, 24, 32, 48, 64, 128, 256), source=None):
    """PNG-compressed multi-size .ico; each entry is rendered natively, not downscaled."""
    imgs = [(source(s) if source else raster(s)) for s in sizes]
    imgs[-1].save(path, format='ICO', sizes=[(s, s) for s in sizes], append_images=imgs[:-1])


def badge(img, kind):
    """Subtle corner badge: a down-arrow (installer) or a cross (uninstaller) on a white disc."""
    s = img.width
    d = ImageDraw.Draw(img)
    r = int(s * 0.19)
    cx, cy = s - r - int(s * 0.07), s - r - int(s * 0.07)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 255, 255, 255))
    col = (0, 120, 212, 255) if kind == 'setup' else (196, 43, 28, 255)
    w = max(2, int(s * 0.04))
    k = int(r * 0.5)
    if kind == 'setup':
        d.line((cx, cy - k, cx, cy + k), fill=col, width=w)
        d.line((cx - k, cy, cx, cy + k), fill=col, width=w)
        d.line((cx + k, cy, cx, cy + k), fill=col, width=w)
    else:
        d.line((cx - k, cy - k, cx + k, cy + k), fill=col, width=w)
        d.line((cx - k, cy + k, cx + k, cy - k), fill=col, width=w)
    return img


def gradient(w, h, c1, c2):
    img = Image.new('RGB', (w, h))
    px = img.load()
    for y in range(h):
        for x in range(w):
            t = (x / max(1, w - 1) * 0.4 + y / max(1, h - 1) * 0.6)
            px[x, y] = tuple(round(a + (b - a) * t) for a, b in zip(c1, c2))
    return img


def paste(dst, src, xy):
    dst.paste(src, xy, src)


def main():
    global _page
    with sync_playwright() as p:
        browser = p.chromium.launch()
        _page = browser.new_page(device_scale_factor=1)

        # app icons
        for name, s in [('32x32', 32), ('64x64', 64), ('128x128', 128), ('128x128@2x', 256), ('256x256', 256), ('icon', 512)]:
            save(raster(s), ICONS, f'{name}.png')
        ico(os.path.join(ICONS, 'icon.ico'))
        ico(os.path.join(ICONS, 'installer.ico'))
        for s in (30, 44, 71, 89, 107, 142, 150, 284, 310):
            save(raster(s), ICONS, f'Square{s}x{s}Logo.png')
        save(raster(50), ICONS, 'StoreLogo.png')

        # installer / uninstaller (subtle badge on the large renders only)
        for kind in ('setup', 'uninstall'):
            ico(os.path.join(ICONS, f'{kind}.ico'), source=lambda s, k=kind: badge(raster(s), k) if s >= 48 else raster(s))
            save(badge(raster(256), kind), ICONS, f'{kind}.png')

        # NSIS artwork, light Fluent surface (#F3F3F3) with a soft blue wash
        hdr = Image.new('RGB', (150, 57), (243, 243, 243))
        paste_wash = gradient(150, 57, (243, 243, 243), (221, 234, 250))
        hdr.paste(paste_wash)
        paste(hdr, raster(48), (150 - 48 - 8, 4))
        hdr.save(os.path.join(ICONS, 'installer-header.bmp'), format='BMP')

        side = gradient(164, 314, (243, 243, 243), (205, 222, 248))
        d = ImageDraw.Draw(side)
        d.ellipse((-60, 180, 200, 440), fill=(222, 233, 250))
        d.ellipse((20, 230, 260, 470), fill=(206, 221, 247))
        side_rgba = side.convert('RGBA')
        paste(side_rgba, raster(112), (26, 70))
        side_rgba.convert('RGB').save(os.path.join(ICONS, 'installer-sidebar.bmp'), format='BMP')

        # in-app logo
        save(raster(256), PUBLIC, 'icon.png')
        save(raster(512), PUBLIC, 'icon-512.png')
        browser.close()
    print('Icons written to', ICONS)


if __name__ == '__main__':
    main()
