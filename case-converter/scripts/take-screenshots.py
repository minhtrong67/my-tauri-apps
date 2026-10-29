#!/usr/bin/env python3
"""
Captures the four README / landing page screenshots (screenshots/image01.png ... image04.png).

Usage:
    pip install playwright && playwright install chromium
    npm run web:build
    python -m http.server 4173 --directory dist      # in another terminal
    python scripts/take-screenshots.py
"""
import asyncio
import json
from pathlib import Path

from playwright.async_api import async_playwright

OUT = Path(__file__).resolve().parent.parent / "screenshots"
URL = "http://127.0.0.1:4173/?frame"  # ?frame shows the window buttons in a browser
TEXT = "the quick brown fox jumps over the lazy dog\nChào mừng bạn đến với Case Converter\nHello World from NASA and the XML parser"
BASE = {"theme": "light", "seed": "#769CDF", "lang": "en", "font": "system", "fontSize": "md",
        "autoCopy": False, "keepHistory": True, "smartTitle": True, "keepAcronyms": True, "favorites": ["camel", "snake"]}


def init_script(settings, session):
    return (f"localStorage.setItem('cc.settings.v2', {json.dumps(json.dumps(settings))});"
            f"localStorage.setItem('cc.session.v1', {json.dumps(json.dumps(session))});")


async def shot(browser, name, settings, session, action=None):
    ctx = await browser.new_context(viewport={"width": 1280, "height": 800}, device_scale_factor=1.5, locale="en-US")
    await ctx.add_init_script(init_script(settings, session))
    page = await ctx.new_page()
    await page.goto(URL)
    await page.wait_for_timeout(900)
    if action:
        await action(page)
    await page.wait_for_timeout(700)
    await page.screenshot(path=str(OUT / f"{name}.png"))
    await ctx.close()


async def open_settings(page):
    await page.keyboard.press("Control+,")
    await page.wait_for_timeout(900)


async def open_select(page):
    await page.click("button[role=combobox]")
    await page.wait_for_timeout(500)


async def main():
    OUT.mkdir(exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        await shot(browser, "image01", BASE, {"tab": "convert", "caseId": "title", "toolId": "dedupe", "input": TEXT})
        await shot(browser, "image02", {**BASE, "theme": "dark", "seed": "#009688"},
                   {"tab": "all", "caseId": "title", "toolId": "dedupe", "input": TEXT})
        await shot(browser, "image03", {**BASE, "seed": "#FF5722", "lang": "vi"},
                   {"tab": "convert", "caseId": "camel", "toolId": "dedupe", "input": TEXT}, open_settings)
        await shot(browser, "image04", {**BASE, "theme": "dark", "seed": "#673AB7"},
                   {"tab": "tools", "caseId": "title", "toolId": "join", "input": "apple\nbanana\ncherry\ndate"}, open_select)
        await browser.close()


asyncio.run(main())
