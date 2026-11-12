"""Renders the built UI (npm run vite:build, then `npx vite preview --port 4173`) with the fake backend and saves screenshots.
Usage: python tools/preview/shoot.py OUT_DIR [light|dark] [mica|acrylic|mica-alt|none]"""
import sys, pathlib, json
from playwright.sync_api import sync_playwright
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
scheme = sys.argv[2] if len(sys.argv) > 2 else 'light'
bd = sys.argv[3] if len(sys.argv) > 3 else 'mica'
mock = (pathlib.Path(__file__).parent / 'mock-tauri.js').read_text()
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1240, 'height': 800}, color_scheme=scheme, device_scale_factor=1)
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    ctx.add_init_script(mock)
    # fake "wallpaper" behind the transparent window so Mica / Acrylic layers can be judged
    ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const w=document.createElement('div');w.style.cssText='position:fixed;inset:0;z-index:-1;background:radial-gradient(60% 80% at 20% 20%,#7aa7ff 0,transparent 60%),radial-gradient(50% 70% at 90% 80%,#c58bff 0,transparent 60%),#9fb6d8';document.body.prepend(w);})")
    if bd != 'mica':
        ctx.add_init_script(f"localStorage.setItem('__mock_settings', JSON.stringify({{backdrop:'{bd}'}}))")
    pg.goto('http://localhost:4173/')
    pg.wait_for_timeout(1200)
    pg.screenshot(path=str(out / 'home.png'))
    for name, sel in [('songs', 'nav button:nth-child(1) >> nth=2'), ('albums', None)]:
        pass
    def nav(label, fname):
        pg.get_by_role('button', name=label).first.click(); pg.wait_for_timeout(700); pg.screenshot(path=str(out / fname))
    nav('Songs', 'songs.png')
    nav('Settings', 'settings.png')
    pg.get_by_role('button', name='Appearance').first.click(); pg.wait_for_timeout(500); pg.screenshot(path=str(out / 'settings-appearance.png'))
    nav('Discover', 'discover.png')
    nav('Statistics', 'stats.png')
    pg.get_by_role('button', name='Home').first.click(); pg.wait_for_timeout(400)
    pg.get_by_role('button', name='Open now playing').first.click(); pg.wait_for_timeout(1200); pg.screenshot(path=str(out / 'nowplaying.png'))
    print('errors:', json.dumps(errs[:8]))
    b.close()
