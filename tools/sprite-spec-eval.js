/* Замер габаритов drawPerson в долях роста (h).
   Запуск: node tools/cdp.js "file:///<путь>/tools/sprite-spec.html" shots/probe.png \
                --evalfile=tools/sprite-spec-eval.js
   Результат печатается в консоль как JSON: left/right/top/bottom в единицах h,
   начало координат — центр стоп.
   Нужен только для сверки art/customers/README.md с кодом. */
(function () {
  var art = PVZ.art;

  function bbox(person, opts) {
    var S = 4, H = 1000, W = 600; // h = 1000 логических, канвас — в S раз больше
    var cv = document.createElement('canvas');
    cv.width = W * S;
    cv.height = H * S;
    var g = cv.getContext('2d');
    g.setTransform(S, 0, 0, S, 0, 0);
    var gy = H - 100, cx = W / 2; // стопы на gy, ось x = cx
    art.drawPerson(g, person, cx, gy, H, opts || {});
    var d = g.getImageData(0, 0, cv.width, cv.height).data;
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    for (var y = 0; y < cv.height; y++) {
      for (var x = 0; x < cv.width; x++) {
        if (d[(y * cv.width + x) * 4 + 3] > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    return {
      left: +((minX / S - cx) / H).toFixed(4),
      right: +((maxX / S - cx) / H).toFixed(4),
      top: +((minY / S - gy) / H).toFixed(4),
      bottom: +((maxY / S - gy) / H).toFixed(4)
    };
  }

  var variants = {
    plain_short: { skin: 1, hair: '#2e2119', style: 'short', shirt: '#4a86b8', pants: '#3c4a5a', expr: 'neutral', female: false, glasses: false, hat: null, beard: false, bag: 'none', scarf: null, bangs: false, sleeves: 'short', pattern: 'plain', collar: 'round' },
    female_long_bag: { skin: 0, hair: '#6d4526', style: 'long', shirt: '#d0577f', pants: '#2f3b46', female: true, glasses: true, hat: null, bag: 'bag', scarf: '#5d7f9a', bangs: true },
    bald_backpack: { skin: 3, hair: '#3d3d46', style: 'bald', shirt: '#5aa877', pants: '#54483d', bag: 'backpack', beard: true },
    beanie_coat: { skin: 2, hair: '#4a3020', style: 'bun', shirt: '#8464b0', pants: '#40485c', hat: 'beanie', coat: '#4a5f7a', bag: 'none' },
    cap_curly: { skin: 5, hair: '#c9c1b6', style: 'curly', shirt: '#c9a227', pants: '#6a5d52', hat: 'cap' }
  };

  var out = {};
  Object.keys(variants).forEach(function (k) { out[k] = bbox(variants[k]); });
  out.plain_noShadow = bbox(variants.plain_short, { noShadow: true });
  out.angry_handsUp = bbox({ skin: 1, hair: '#2e2119', style: 'short', shirt: '#4a86b8', pants: '#3c4a5a', expr: 'angry', bag: 'none' });
  return JSON.stringify(out);
})()
