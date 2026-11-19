"""Иконка «ПВЗ: Смена»: кот в коробке на тёплом оранжевом фоне.

Рисуем в 2048 и уменьшаем: так края и мелкие детали остаются чистыми
и в сторе (512), и в системном списке приложений (48/32).

  python tools/make-icon.py
"""
from PIL import Image, ImageDraw, ImageFilter
import os
import random

S = 2048
img = Image.new("RGB", (S, S), "#f2994a")
d = ImageDraw.Draw(img)

ORANGE = "#f2994a"
ORANGE_DARK = "#d97b2f"
CREAM = "#fdf3e2"
WOOD = "#b57c47"
WOOD_LIGHT = "#c78b52"
BOX = "#c9a26a"
BOX_LIGHT = "#dcb87f"
BOX_DARK = "#a07c4b"
TAPE = "#e6d3a8"
FUR = "#e8a15a"
FUR_DARK = "#c97a2c"
BELLY = "#fbe0bd"
INK = "#4a2f1e"
GREEN = "#5aa877"


def rr(x0, y0, x1, y1, r, fill):
    d.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=fill)


def ellipse(cx, cy, rx, ry, fill):
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=fill)


# рамка-витрина
rr(0, 0, S, S, 0, ORANGE)
rr(40, 40, S - 40, S - 40, 300, ORANGE_DARK)
rr(110, 110, S - 110, S - 110, 250, CREAM)

# тёплый свет сверху
glow = Image.new("L", (S, S), 0)
gd = ImageDraw.Draw(glow)
gd.ellipse([-400, -600, 1500, 1300], fill=110)
glow = glow.filter(ImageFilter.GaussianBlur(180))
img.paste(Image.new("RGB", (S, S), "#fff6e6"), (0, 0), glow)
d = ImageDraw.Draw(img)

# стол (только нижняя полоса внутри скруглённой витрины)
inner = Image.new("L", (S, S), 0)
mid = ImageDraw.Draw(inner)
mid.rounded_rectangle([110, 110, S - 110, S - 110], radius=250, fill=255)
mid.rectangle([0, 0, S, 1390], fill=0)
desk = Image.new("RGB", (S, S), WOOD)
dd = ImageDraw.Draw(desk)
dd.rectangle([0, 1390, S, 1450], fill=WOOD_LIGHT)
img.paste(desk, (0, 0), inner)
d = ImageDraw.Draw(img)

# тень под коробкой
shadow = Image.new("L", (S, S), 0)
ImageDraw.Draw(shadow).ellipse([420, 1470, 1640, 1620], fill=120)
shadow = shadow.filter(ImageFilter.GaussianBlur(40))
img.paste(Image.new("RGB", (S, S), "#6b4426"), (0, 0), shadow)
d = ImageDraw.Draw(img)

# уши
d.polygon([(760, 760), (850, 400), (1030, 640)], fill=FUR)
d.polygon([(1288, 760), (1198, 400), (1018, 640)], fill=FUR)
d.polygon([(812, 720), (862, 505), (966, 655)], fill=FUR_DARK)
d.polygon([(1236, 720), (1186, 505), (1082, 655)], fill=FUR_DARK)

# голова
ellipse(1024, 830, 320, 290, FUR)
for x, y in [(960, 600), (1013, 585), (1066, 600)]:
    d.line([(x, y), (x + 6, y + 90)], fill=FUR_DARK, width=22)

# глаза-дуги, нос, морда
d.arc([850, 780, 1000, 900], 200, 340, fill=INK, width=18)
d.arc([1048, 780, 1198, 900], 200, 340, fill=INK, width=18)
ellipse(960, 940, 120, 105, BELLY)
ellipse(1088, 940, 120, 105, BELLY)
d.polygon([(990, 905), (1058, 905), (1024, 950)], fill="#c9745a")
d.arc([980, 940, 1024, 985], 20, 160, fill=INK, width=10)
d.arc([1024, 940, 1068, 985], 20, 160, fill=INK, width=10)

# усы
for sx in (-1, 1):
    for dy, ang in [(-14, -0.10), (8, 0.0), (30, 0.10)]:
        x0 = 1024 + sx * 110
        d.line([(x0, 945 + dy), (x0 + sx * 190, 945 + dy + int(ang * 190))], fill="#fffaf0", width=8)

# румянец
ellipse(830, 950, 55, 34, "#f2a07a")
ellipse(1218, 950, 55, 34, "#f2a07a")

# коробка
d.polygon([(470, 1080), (540, 960), (1508, 960), (1578, 1080)], fill=BOX_LIGHT)
d.line([(1004, 960), (1004, 1080)], fill=BOX_DARK, width=10)
rr(470, 1060, 1578, 1560, 26, BOX)
d.rectangle([470, 1060, 1578, 1120], fill=BOX_LIGHT)
d.line([(470, 1120), (1578, 1120)], fill=BOX_DARK, width=8)

# скотч
d.rectangle([980, 960, 1068, 1560], fill=TAPE)
d.line([(980, 960), (980, 1560)], fill=BOX_DARK, width=5)
d.line([(1068, 960), (1068, 1560)], fill=BOX_DARK, width=5)

# штрихкод
rr(560, 1230, 930, 1410, 18, "#fffaf0")
random.seed(7)
x = 590
while x < 900:
    w = random.choice([7, 9, 11, 14, 16])
    if x + w > 900:
        break
    d.rectangle([x, 1262, x + w, 1378], fill="#2a1a10")
    x += w + random.choice([8, 10, 12, 14])

# наклейка «ПВЗ» на коробке
rr(1200, 1180, 1500, 1290, 16, "#fffaf0")
d.rectangle([1200, 1180, 1500, 1290], outline=ORANGE, width=6)
try:
    from PIL import ImageFont
    f = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 62)
    d.text((1350, 1236), "ПВЗ", font=f, fill=ORANGE_DARK, anchor="mm")
except Exception as e:  # шрифт может отсутствовать в другой системе
    print("label skipped:", e)

# лапы поверх края коробки
for px in (830, 1048):
    rr(px, 1000, px + 170, 1130, 60, FUR)
    d.line([(px + 56, 1080), (px + 56, 1125)], fill=FUR_DARK, width=7)
    d.line([(px + 114, 1080), (px + 114, 1125)], fill=FUR_DARK, width=7)

# медальон
ellipse(1024, 1150, 40, 40, GREEN)

# виньетка по краям
vig = Image.new("L", (S, S), 0)
ImageDraw.Draw(vig).ellipse([-500, -500, S + 500, S + 500], fill=0)
vig = vig.filter(ImageFilter.GaussianBlur(300))
img.paste(Image.new("RGB", (S, S), "#3a2415"), (0, 0), vig.point(lambda v: int(v * 0.18)))

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out_dir = os.path.join(root, "game")
assets = os.path.join(root, "assets")
os.makedirs(assets, exist_ok=True)

for size, name in [(1024, "icon-1024.png"), (512, "icon-512.png"), (256, "icon-256.png")]:
    img.resize((size, size), Image.LANCZOS).save(os.path.join(out_dir, name))
# иконка приложения для Windows и сборки
img.resize((256, 256), Image.LANCZOS).save(os.path.join(assets, "icon-256.png"))
img.resize((256, 256), Image.LANCZOS).save(os.path.join(assets, "pvz.ico"),
                                           sizes=[(s, s) for s in (256, 128, 64, 48, 32, 16)])
print("saved:", os.path.join(out_dir, "icon-1024.png"), os.path.join(out_dir, "icon-512.png"),
      os.path.join(out_dir, "icon-256.png"), os.path.join(assets, "pvz.ico"))
