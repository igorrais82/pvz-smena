"""Скриншоты для карточки RuStore: кадры 1280×720 с подписями.

Берёт свежие кадры из shots/store-*.png (сняты через tools/cdp.js при
viewport 1280×720, без кнопки DEV) и кладёт готовые карточки в store/.

  python tools/make-store-shots.py
"""
from PIL import Image, ImageDraw, ImageFont
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, "shots")
OUT = os.path.join(ROOT, "store")
os.makedirs(OUT, exist_ok=True)

CAPTION_FONT = "C:/Windows/Fonts/segoeuib.ttf"
BODY_FONT = "C:/Windows/Fonts/segoeui.ttf"
font_big = ImageFont.truetype(CAPTION_FONT, 40)
font_small = ImageFont.truetype(BODY_FONT, 22)
font_brand = ImageFont.truetype(CAPTION_FONT, 18)

CARDS = [
    ("store-day.png", "01-day.png", "Каждый клиент — свой характер",
     "Спокойный, спешащий, с ребёнком: у каждого своё терпение и свой код"),
    ("store-dialog.png", "02-dialog.png", "Решения возвращаются",
     "Блогер, сосед, мафия — последствия приходят через две смены"),
    ("store-shop.png", "03-shop.png", "Прокачка и уют",
     "19 улучшений и декора: от сканера-про до кота на столе"),
    ("store-evening.png", "04-evening.png", "Вечер: закрой смену",
     "Дверь, мусор, возвраты, касса — и отчёт, который всё расскажет"),
    ("store-report.png", "05-report.png", "Смена закрыта",
     "План, выручка, рейтинг — и сколько осталось на завтра"),
]


def make_caption(img, title, subtitle):
    w, h = img.size
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # плотная нижняя плашка: подписи не должны спорить с интерфейсом игры
    bar_top = 568
    for y in range(bar_top, bar_top + 12):
        k = (y - bar_top) / 12
        d.line([(0, y), (w, y)], fill=(16, 11, 8, int(255 * k)))
    d.rectangle([0, bar_top + 12, w, h], fill=(16, 11, 8, 255))
    # оранжевая черта слева от заголовка
    d.rectangle([48, 606, 54, 662], fill=(242, 153, 74, 255))
    d.text((78, 612), title, font=font_big, fill=(255, 243, 226, 255))
    d.text((80, 658), subtitle, font=font_small, fill=(255, 232, 208, 215))
    # брендовая подпись
    brand = "ПВЗ: Смена"
    tw = d.textlength(brand, font=font_brand)
    d.text((w - 48 - tw, 600), brand, font=font_brand, fill=(255, 196, 130, 235))
    return Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")


for src, dst, title, sub in CARDS:
    path = os.path.join(SHOTS, src)
    if not os.path.exists(path):
        print("skip (нет кадра):", src)
        continue
    im = Image.open(path).convert("RGB").resize((1280, 720), Image.LANCZOS)
    out = make_caption(im, title, sub)
    out.save(os.path.join(OUT, dst), optimize=True)
    print("saved:", os.path.join(OUT, dst))

# иконка 512 в комплект — как отдельный файл витрины
icon = Image.open(os.path.join(ROOT, "game", "icon-512.png"))
icon.save(os.path.join(OUT, "icon-512.png"))
print("saved:", os.path.join(OUT, "icon-512.png"))
