#!/usr/bin/env python3
"""Генерируем PNG-иконки 192/512 и apple-touch-icon из SVG-логотипа."""
import subprocess
import sys
from pathlib import Path

try:
    from cairosvg import svg2png
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", "cairosvg"], check=True)
    from cairosvg import svg2png

PUBLIC = Path("/home/z/my-project/public")
SVG = PUBLIC / "logo.svg"

sizes = [192, 512]
for sz in sizes:
    out = PUBLIC / f"icon-{sz}.png"
    svg2png(url=str(SVG), write_to=str(out), output_width=sz, output_height=sz)
    print(f"  ✓ {out.name} ({out.stat().st_size} байт)")

# apple-touch-icon
apple = PUBLIC / "apple-touch-icon.png"
svg2png(url=str(SVG), write_to=str(apple), output_width=180, output_height=180)
print(f"  ✓ {apple.name} ({apple.stat().st_size} байт)")

# favicon
fav = PUBLIC / "favicon.ico"
svg2png(url=str(SVG), write_to=str(fav), output_width=64, output_height=64)
print(f"  ✓ {fav.name} ({fav.stat().st_size} байт)")

# maskable (то же, что icon-512)
mask = PUBLIC / "maskable-512.png"
svg2png(url=str(SVG), write_to=str(mask), output_width=512, output_height=512)
print(f"  ✓ {mask.name} ({mask.stat().st_size} байт)")

print("Готово!")
