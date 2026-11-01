#!/usr/bin/env python3
"""Rebuilds the single-file landing page (index.html) from tools/landing.tpl.html.
Injects the Lucide icon sprite plus src/theme.js and src/shapes.js, so the page always uses the same colour maths and shapes as the app.
Usage: python tools/build-landing.py"""
import re
from pathlib import Path
R = Path(__file__).resolve().parent.parent
tpl = (R / "tools/landing.tpl.html").read_text(encoding="utf8")
app = (R / "src/index.html").read_text(encoding="utf8")
need = "sun moon auto palette export menu close link bolt heart globe sparkles film swap layers wand text keyboard image play-fill info chev up check copy back fwd".split()
syms = ["  " + re.search(r'<symbol id="i-%s".*?</symbol>' % re.escape(n), app, re.S).group(0) for n in need]
sprite = '<svg width="0" height="0" style="position:absolute" aria-hidden="true">\n' + "\n".join(syms) + "\n</svg>"
strip = lambda js: re.sub(r"^export ", "", js, flags=re.M)
out = (tpl.replace("<!--SPRITE-->", sprite)
          .replace("/*THEME_JS*/", strip((R / "src/theme.js").read_text(encoding="utf8")))
          .replace("/*SHAPES_JS*/", strip((R / "src/shapes.js").read_text(encoding="utf8"))))
(R / "index.html").write_text(out, encoding="utf8")
print("index.html written:", len(out), "bytes")
