# -*- coding: utf-8 -*-
"""Шаблоны-подложки для своих спрайтов покупателей в «ПВЗ: Смена».

Все числа взяты из формул drawPerson (game/src/art.js) и сцен:
  стопы на groundY, полный рост h, голова R = 0.09h с центром на 0.805h над стопами.

Запуск:  python tools/make-customer-templates.py
Выход:   art/customers/
  _template-512x1280.png        — чистый кадр с гайдами (класть под свой рисунок)
  _map-512x1280.png             — карта пропорций с подписями
  _template-portrait-280x280.png— кадр портрета в диалоге (2×)
  _preview-1280x720.png         — схема: где покупатели на экране и в каком масштабе
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'art', 'customers')
os.makedirs(OUT, exist_ok=True)

FONT_PATH = 'C:/Windows/Fonts/segoeui.ttf'
FONT_BOLD = 'C:/Windows/Fonts/segoeuib.ttf'

C_TEXT = (255, 255, 255, 235)
C_DIM = (255, 255, 255, 150)
C_AXIS = (120, 210, 255, 190)
C_HEAD = (255, 150, 210, 220)
C_HEAD_DIM = (255, 150, 210, 120)
C_BODY = (160, 240, 190, 200)
C_WARN = (255, 110, 110, 220)
C_TOP = (255, 210, 120, 220)


def font(size, bold=False):
    try:
        return ImageFont.truetype(FONT_BOLD if bold else FONT_PATH, size)
    except Exception:
        return ImageFont.load_default()


# ---- геометрия фигуры в долях h (снизу вверх) ----
TOP_HAT = 0.949      # помпон шапки
TOP_HAIR = 0.912     # макушка с обычной причёской
TOP_HEAD = 0.897     # макушка (без волос)
HEAD_CY = 0.805
HEAD_R = 0.090
CHIN = HEAD_CY - 1.06 * HEAD_R      # 0.7096
SHOULDER = 0.675
CHEST = 0.615
WAIST = 0.515
HIP = 0.445
KNEE = 0.220
W_SHOULDER = 0.112
W_HIP = 0.090
W_HAND = 0.146
W_BAG = 0.153

LANDMARKS = [
    (TOP_HAT, 'макушка в шапке', C_TOP),
    (TOP_HAIR, 'макушка с волосами', C_TOP),
    (TOP_HEAD, 'макушка', C_TOP),
    (HEAD_CY, 'центр головы', C_HEAD),
    (CHIN, 'подбородок', C_HEAD_DIM),
    (SHOULDER, 'линия плеч', C_BODY),
    (CHEST, 'грудь', C_BODY),
    (WAIST, 'пояс', C_BODY),
    (HIP, 'бёдра', C_BODY),
    (KNEE, 'колени', C_BODY),
]


def y_of(frac, h):
    """y в пикселях от верхней кромки кадра, если стопы на нижней кромке."""
    return round(h * (1.0 - frac))


def dashed(draw, xy, fill, width=1, dash=9, gap=7):
    x1, y1, x2, y2 = xy
    if x1 == x2:
        y = y1
        while y < y2:
            draw.line([(x1, y), (x1, min(y + dash, y2))], fill=fill, width=width)
            y += dash + gap
    else:
        x = x1
        while x < x2:
            draw.line([(x, y1), (min(x + dash, x2), y1)], fill=fill, width=width)
            x += dash + gap


def text(draw, x, y, s, size=13, fill=C_TEXT, anchor='lm', bold=False):
    f = font(size, bold)
    draw.text((x + 1, y + 1), s, font=f, fill=(0, 0, 0, 160), anchor=anchor)
    draw.text((x, y), s, font=f, fill=fill, anchor=anchor)


def draw_guides(d, x0, w, h, with_ticks=True):
    """Гайды внутри кадра шириной w и высотой h; левый край кадра — x0."""
    cx = x0 + w // 2
    d.rectangle([x0, 0, x0 + w - 1, h - 1], outline=(255, 255, 255, 110), width=1)
    dashed(d, (cx, 0, cx, h), C_AXIS, 1, 12, 10)

    for frac, name, col in LANDMARKS:
        y = y_of(frac, h)
        dashed(d, (x0, y, x0 + w, y), col, 1, 10, 8)
        if with_ticks:
            text(d, x0 + 6, y - 8, '%.3g h' % frac, 10, (col[0], col[1], col[2], 170), 'lm')

    # голова
    hy = y_of(HEAD_CY, h)
    r = HEAD_R * h
    d.ellipse([cx - r, hy - r, cx + r, hy + r], outline=C_HEAD_DIM, width=2)

    # руки / сумка — короткие направляющие у пояса и груди
    y_a, y_b = y_of(0.78, h), y_of(0.40, h)
    for i, (frac, col) in enumerate(((W_HAND, (200, 200, 255, 110)),
                                     (W_BAG, (200, 200, 255, 80)))):
        off = frac * h
        dashed(d, (cx - off, y_a, cx - off, y_b), col, 1, 5, 9)
        dashed(d, (cx + off, y_a, cx + off, y_b), col, 1, 5, 9)
        if with_ticks:
            text(d, cx + off + 5, y_b - 12 - i * 16,
                 'рука 0.146h' if i == 0 else 'сумка 0.153h', 9, col, 'lm')

    # стопы
    d.line([(x0, h - 1), (x0 + w, h - 1)], fill=(255, 90, 90, 255), width=3)


def make_template(W=512, H=1280):
    """Чистый кадр: только гайды, без подписей-легенд."""
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_guides(d, 0, W, H, with_ticks=False)
    # короткие подписи у самых важных линий, чтобы кадр читался без карты
    text(d, 8, H - 26, 'ЛИНИЯ СТОП · сюда groundY', 13, (255, 130, 130, 255), 'lm', True)
    text(d, 8, y_of(HEAD_CY, H) - 104, 'голова: R = 0.09h', 11, (255, 170, 220, 170))
    return img


def make_map(W=512, H=1280, GUTTER=250):
    """Карта пропорций: слева поле с подписями, справа точный кадр 512×1280."""
    img = Image.new('RGBA', (GUTTER + W + 16, H), (24, 18, 15, 255))
    d = ImageDraw.Draw(img)
    x0 = GUTTER
    d.rectangle([x0, 0, x0 + W - 1, H - 1], fill=(58, 44, 35, 255))
    draw_guides(d, x0, W, H, with_ticks=False)

    # заголовок — внизу слева, чтобы не спорить с подписями у макушки
    ty = H - 420
    text(d, 12, ty, 'ПВЗ: Смена', 15, C_TEXT, 'lm', True)
    text(d, 12, ty + 20, 'шаблон спрайта покупателя', 13, C_DIM)
    text(d, 12, ty + 44, '512 × 1280 px', 13, (255, 220, 170, 235), 'lm', True)
    text(d, 12, ty + 64, 'h = 1280, ось X = 256,', 12, C_DIM)
    text(d, 12, ty + 80, 'стопы на нижней кромке', 12, C_DIM)

    for frac, name, col in LANDMARKS:
        y = y_of(frac, H)
        d.line([(GUTTER - 14, y), (GUTTER - 1, y)], fill=col, width=1)
        text(d, GUTTER - 20, y, '%s  %.3g' % (name, frac), 12, col, 'rm')

    # легенда по перекрытию прилавком
    y_low = y_of((800 - 470) / 539.0, H)
    y_mid = y_of((800 - 470) / 580.0, H)
    y_tall = y_of((800 - 470) / 626.0, H)
    ly = H - 158
    text(d, 12, ly, 'Прилавок закрывает низ фигуры:', 12, (255, 170, 170, 235), 'lm', True)
    for i, (y, s) in enumerate(((y_low, 'h = 539 (низкий клиент)'),
                                (y_mid, 'h = 580 (обычный)'),
                                (y_tall, 'h = 626 (высокий)'))):
        text(d, 12, ly + 20 + i * 17, '— ниже y ≈ %d: %s' % (y, s), 11, (255, 170, 170, 200))
    for y in (y_low, y_mid, y_tall):
        dashed(d, (x0, y, x0 + W, y), (255, 110, 110, 170), 1, 14, 8)

    text(d, 12, H - 34, '1 px кадра = 1/1280 роста', 11, C_DIM)
    return img


def make_portrait(S=280):
    """Портрет в диалоге: в игре круг r = 70, здесь 2× → r = 140."""
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = S / 2
    r = S / 2 - 1
    d.ellipse([c - r, c - r, c + r, c + r], outline=C_HEAD, width=3)
    dashed(d, (c, 0, c, S), C_AXIS, 1, 10, 9)
    h = 600.0
    feet = c + 250 * 2
    hr = HEAD_R * h
    hy = feet - HEAD_CY * h
    d.ellipse([c - hr, hy - hr, c + hr, hy + hr], outline=C_HEAD_DIM, width=2)
    for frac, s in ((CHIN, 'подбородок'), (SHOULDER, 'плечи'), (CHEST, 'грудь')):
        y = feet - frac * h
        dashed(d, (0, y, S, y), (160, 240, 190, 150), 1, 8, 8)
        text(d, 4, y - 9, s, 10, (160, 240, 190, 220))
    text(d, c, 16, 'видно только', 11, (255, 255, 255, 220), 'mm')
    text(d, c, 30, 'внутри круга', 11, (255, 255, 255, 220), 'mm')
    return img


def make_preview(W=1280, H=720):
    """Где покупатель стоит на экране и в каком масштабе — схема."""
    img = Image.new('RGBA', (W, H), (26, 20, 17, 255))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 470], fill=(46, 36, 30, 255))
    d.rectangle([0, 470, W, H], fill=(64, 46, 32, 255))
    dashed(d, (0, 470, W, 470), (255, 200, 140, 200), 2, 14, 8)
    text(d, 10, 462, 'y = 470', 11, (255, 200, 140, 220))
    text(d, 12, H - 20, 'прилавок (стол): всё ниже y = 470 перекрывает покупателя', 12, (255, 200, 140, 220))
    text(d, 12, 20, 'Схема: где покупатели на экране 1280 × 720 и сколько места занимают', 16, C_TEXT, 'lm', True)

    def box(x, gy, h, col, w=2):
        half = 0.4 * h / 2
        top = gy - h
        d.rectangle([x - half, top, x + half, gy], outline=col, width=w)
        dashed(d, (x - half, gy - TOP_HAT * h, x + half, gy - TOP_HAT * h), col, 1, 6, 6)
        dashed(d, (x - W_SHOULDER * h, gy - SHOULDER * h, x + W_SHOULDER * h, gy - SHOULDER * h), col, 1, 6, 6)

    # главный покупатель
    box(625, 800, 626, (120, 220, 255, 235))
    box(625, 800, 539, (120, 220, 255, 130), 1)
    text(d, 625 + 128, 640, 'главный покупатель', 12, (120, 220, 255, 240), 'lm', True)
    text(d, 625 + 128, 658, 'x = 625, стопы y = 800', 11, (120, 220, 255, 190))
    text(d, 625 + 128, 674, 'рост 539…626 px', 11, (120, 220, 255, 190))
    text(d, 625 + 128, 690, 'видно от макушки до стола', 11, (120, 220, 255, 190))

    # очередь
    slots = [(1012, 505, 348), (1076, 498, 330), (1138, 492, 314), (1196, 488, 300)]
    for i, (x, gy, h) in enumerate(slots):
        box(x, gy, h, (255, 190, 120, 220))
        text(d, x, gy - h + 12, str(i + 1), 12, (255, 214, 160, 240), 'mm', True)
    text(d, 1104, 120, 'очередь: 4 слота', 12, (255, 190, 120, 240), 'mm', True)
    text(d, 1104, 136, '300…376 px, стопы y = 488…505', 11, (255, 190, 120, 200), 'mm')

    # портрет в диалоге
    px, py, pr = 214, 330, 70
    d.ellipse([px - pr, py - pr, px + pr, py + pr], outline=C_HEAD, width=2)
    d.rectangle([px - 0.2 * 300, py + 250 - 300, px + 0.2 * 300, py + 250], outline=(255, 150, 210, 90), width=1)
    text(d, px, py + 92, 'портрет в диалоге', 11, C_HEAD, 'mm', True)
    text(d, px, py + 108, 'круг r = 70, рост 300 px', 10, (255, 150, 210, 190), 'mm')

    text(d, W - 12, H - 20, 'ещё: мессенджер 76 px · прохожий за дверью 70 px · мафия 470 / 540 px', 12, C_DIM, 'rm')
    text(d, W - 12, H - 38, 'все размеры — в логических px канвы 1280 × 720', 12, C_DIM, 'rm')
    return img


# =====================================================================
#  Вариативные пропорции (в духе Good Pizza, Great Pizza)
#  Кадр шире: 768 × 1280 (0.6 : 1). Жёстко закреплён только низ (стопы)
#  и ось, а голова/тело могут быть какими угодно в пределах зон.
# =====================================================================

FRAME_W = 768
FRAME_H = 1280
CENTER = FRAME_W // 2
CORE_HALF = 192          # старая «узкая» зона 512 px (±0.15h)
WIDE_HALF = 370          # предел для очень широких (±0.29h)
HEAD_ZONE = (110, 480)   # зона головы по вертикали (выше 110 — облачко реплики)
HEAD_HALF = 190          # предел головы по горизонтали (Ø до 380)
FACE_LINE = 250
CHIN_MIN = 500           # подбородок не ниже этой линии
CROP = (497, 552, 605)   # линии перекрытия прилавком при height 0.93 / 1.0 / 1.08


def make_variety_template(GUTTER=250):
    W = GUTTER + FRAME_W + 16
    img = Image.new('RGBA', (W, FRAME_H), (24, 18, 15, 255))
    d = ImageDraw.Draw(img)
    x0 = GUTTER
    cx = x0 + CENTER

    d.rectangle([x0, 0, x0 + FRAME_W - 1, FRAME_H - 1], fill=(58, 44, 35, 255))

    # зона головы
    overlay = Image.new('RGBA', (FRAME_W, FRAME_H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rectangle([CENTER - HEAD_HALF, HEAD_ZONE[0], CENTER + HEAD_HALF, HEAD_ZONE[1]],
                 fill=(120, 240, 170, 26), outline=(120, 240, 170, 150), width=2)
    img.alpha_composite(overlay, (x0, 0))

    # ядро 512 и предел ширины
    d.rectangle([cx - CORE_HALF, 0, cx + CORE_HALF, FRAME_H - 1], outline=(180, 200, 255, 90), width=1)
    for s in (-1, 1):
        dashed(d, (cx + s * WIDE_HALF, 0, cx + s * WIDE_HALF, FRAME_H), (255, 160, 160, 90), 1, 8, 12)
        dashed(d, (cx + s * CORE_HALF, 0, cx + s * CORE_HALF, FRAME_H), (180, 200, 255, 90), 1, 8, 12)

    dashed(d, (cx, 0, cx, FRAME_H), C_AXIS, 1, 12, 10)
    dashed(d, (x0, FACE_LINE, x0 + FRAME_W, FACE_LINE), C_HEAD, 1, 10, 8)
    dashed(d, (x0, CHIN_MIN, x0 + FRAME_W, CHIN_MIN), (255, 90, 90, 220), 2, 12, 6)
    for y in CROP:
        dashed(d, (x0, y, x0 + FRAME_W, y), (255, 110, 110, 150), 1, 14, 8)

    d.line([(x0, FRAME_H - 1), (x0 + FRAME_W, FRAME_H - 1)], fill=(255, 90, 90, 255), width=3)
    d.rectangle([x0, 0, x0 + FRAME_W - 1, FRAME_H - 1], outline=(255, 255, 255, 110), width=1)

    # подписи слева
    text(d, 12, 24, 'ПВЗ: Смена · вариативные пропорции', 15, C_TEXT, 'lm', True)
    text(d, 12, 44, '768 × 1280 px (0.6 : 1), стопы на нижней кромке', 12, (255, 220, 170, 235))
    text(d, 12, 86, 'ядро ±192 (ширина 512) · предел ширины ±370', 11, (200, 210, 255, 200))
    text(d, GUTTER - 20, HEAD_ZONE[0] + 12, 'верх зоны головы', 11, (120, 240, 170, 230), 'rm')
    text(d, GUTTER - 20, HEAD_ZONE[1] - 10, 'низ зоны головы', 11, (120, 240, 170, 230), 'rm')
    text(d, GUTTER - 20, FACE_LINE, 'линия лица (центр головы)', 12, C_HEAD, 'rm')
    text(d, GUTTER - 20, CHIN_MIN - 14, 'подбородок не ниже', 12, (255, 120, 120, 240), 'rm', True)
    text(d, GUTTER - 20, 497 + 26, 'прилавок (h = 539)', 10, (255, 150, 150, 200), 'rm')
    text(d, GUTTER - 20, 552 + 26, 'прилавок (h = 580)', 10, (255, 150, 150, 200), 'rm')
    text(d, GUTTER - 20, 605 + 26, 'прилавок (h = 626)', 10, (255, 150, 150, 200), 'rm')
    text(d, GUTTER - 20, FRAME_H - 20, 'стопы · groundY', 12, (255, 120, 120, 255), 'rm', True)
    return img


def _silhouette(d, cx, feet, s, a):
    """Схематичный силуэт: только пропорции, без деталей.
    Координаты в a — в пикселях кадра 768×1280 от верхней кромки."""
    fill = (216, 205, 194, 235)
    edge = (255, 255, 255, 130)

    def Y(v):
        return v * s

    # ноги
    for side in (-1, 1):
        top = cx + side * a['leg_off'] * s
        d.polygon([(top - a['leg_top'] * s / 2, Y(a['hip'])),
                   (top + a['leg_top'] * s / 2, Y(a['hip'])),
                   (top + a['leg_bot'] * s / 2, Y(1280)),
                   (top - a['leg_bot'] * s / 2, Y(1280))],
                  fill=fill, outline=edge)
    # торс
    d.polygon([(cx - a['sh_hw'] * s, Y(a['shoulders'])),
               (cx - a['waist_hw'] * s, Y(a['waist'])),
               (cx - a['hip_hw'] * s, Y(a['hip'])),
               (cx + a['hip_hw'] * s, Y(a['hip'])),
               (cx + a['waist_hw'] * s, Y(a['waist'])),
               (cx + a['sh_hw'] * s, Y(a['shoulders'])),
               (cx + a['neck'] * s, Y(a['shoulders'] - 14)),
               (cx - a['neck'] * s, Y(a['shoulders'] - 14))],
              fill=fill, outline=edge)
    # шея
    d.rectangle([cx - a['neck'] * s, Y(a['head_cy'] + a['head_r'] * 0.55),
                 cx + a['neck'] * s, Y(a['shoulders'])], fill=fill)
    # голова
    hr, hy = a['head_r'] * s, Y(a['head_cy'])
    d.ellipse([cx - hr, hy - hr, cx + hr, hy + hr], fill=fill, outline=edge, width=2)


ARCHETYPES = [
    dict(caption='Обычный (как сейчас)',
         note='голова Ø230 · плечи ±143 · рост 1280',
         head_r=115, head_cy=250, shoulders=416, waist=621, hip=710,
         sh_hw=143, waist_hw=112, hip_hw=115, neck=26, leg_off=47, leg_top=72, leg_bot=52),
    dict(caption='Огромная голова',
         note='Ø360 (28 % роста) · короткие ноги',
         head_r=180, head_cy=290, shoulders=510, waist=670, hip=900,
         sh_hw=150, waist_hw=180, hip_hw=170, neck=34, leg_off=60, leg_top=100, leg_bot=70),
    dict(caption='Грузный, широкий',
         note='плечи ±235 (0.37 роста) · голова Ø200',
         head_r=100, head_cy=210, shoulders=370, waist=620, hip=880,
         sh_hw=235, waist_hw=265, hip_hw=230, neck=34, leg_off=80, leg_top=120, leg_bot=90),
    dict(caption='Высокий, тонкий',
         note='голова Ø150 · плечи ±100 · длинные ноги',
         head_r=75, head_cy=155, shoulders=300, waist=560, hip=760,
         sh_hw=100, waist_hw=85, hip_hw=90, neck=20, leg_off=34, leg_top=58, leg_bot=40),
]


def make_archetypes():
    s = 720.0 / FRAME_H
    pw = int(round(FRAME_W * s))          # 432
    W = pw * len(ARCHETYPES)
    H = 720 + 70
    img = Image.new('RGBA', (W, H), (26, 20, 17, 255))
    # полосы «скрыто прилавком» — отдельным слоем, чтобы были полупрозрачными
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for i in range(len(ARCHETYPES)):
        x0 = i * pw
        od.rectangle([x0, int(552 * s), x0 + pw, 720], fill=(255, 90, 90, 26))
    img.alpha_composite(overlay)
    d = ImageDraw.Draw(img)
    for i, a in enumerate(ARCHETYPES):
        x0 = i * pw
        cx = x0 + pw // 2
        feet = 720
        if i:
            d.line([(x0, 0), (x0, H)], fill=(255, 255, 255, 26), width=1)
        dashed(d, (x0, int(552 * s), x0 + pw, int(552 * s)), (255, 120, 120, 170), 1, 9, 7)
        d.line([(x0, feet - 1), (x0 + pw, feet - 1)], fill=(255, 120, 120, 255), width=2)
        dashed(d, (cx, 0, cx, feet), (120, 210, 255, 80), 1, 8, 10)
        _silhouette(d, cx, feet, s, a)
        text(d, cx, 736, a['caption'], 15, (255, 220, 170, 245), 'mm', True)
        text(d, cx, 758, a['note'], 12, (255, 255, 255, 175), 'mm')
    text(d, 12, 20, 'Пропорции: один кадр 768 × 1280, стопы на нижней кромке', 15, C_TEXT, 'lm', True)
    text(d, 12, 40, 'красная полоса снизу — то, что закрывает прилавок в главной сцене', 12, (255, 160, 160, 200))
    return img


def save(img, name):
    p = os.path.join(OUT, name)
    img.save(p)
    print('ok', os.path.relpath(p, ROOT), img.size)


if __name__ == '__main__':
    save(make_template(), '_template-512x1280.png')
    save(make_map(), '_map-512x1280.png')
    save(make_portrait(), '_template-portrait-280x280.png')
    save(make_preview(), '_preview-1280x720.png')
    save(make_variety_template(), '_template-variety-768x1280.png')
    save(make_archetypes(), '_archetypes-768x1280.png')
