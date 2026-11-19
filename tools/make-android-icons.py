# Генерация Android-иконок из game/icon-512.png (Pillow).
# python tools/make-android-icons.py
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'game', 'icon-512.png')
RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')

LEGACY = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
FOREGROUND = {'mdpi': 108, 'hdpi': 162, 'xhdpi': 216, 'xxhdpi': 324, 'xxxhdpi': 432}

src = Image.open(SRC).convert('RGBA')

for density, size in LEGACY.items():
    folder = os.path.join(RES, 'mipmap-' + density)
    os.makedirs(folder, exist_ok=True)
    src.resize((size, size), Image.LANCZOS).save(os.path.join(folder, 'ic_launcher.png'))

# adaptive foreground: иконка с полями, чтобы маска лаунчера не срезала кота
for density, size in FOREGROUND.items():
    folder = os.path.join(RES, 'mipmap-' + density)
    os.makedirs(folder, exist_ok=True)
    inner = int(round(size * 0.72))
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    art = src.resize((inner, inner), Image.LANCZOS)
    canvas.alpha_composite(art, ((size - inner) // 2, (size - inner) // 2))
    canvas.save(os.path.join(folder, 'ic_launcher_foreground.png'))

print('android icons:', ', '.join(LEGACY), '+ adaptive foreground')
