(function () {
  var people = [];
  for (var i = 0; i < 8; i++) {
    people.push({
      p: PVZ.art.makePerson({
        female: i % 2 === 0,
        style: ['short', 'bob', 'long', 'bun', 'curly', 'bald', 'short', 'bob'][i],
        expr: ['neutral', 'happy', 'sad', 'angry', 'confused', 'tired', 'happy', 'neutral'][i],
        glasses: i === 3,
        beard: i === 5,
        hat: null
      }),
      hair: true
    });
  }
  var scene = {
    update: function () {},
    draw: function (ctx) {
      var g = ctx.createLinearGradient(0, 0, 0, 720);
      g.addColorStop(0, '#f3e6d2');
      g.addColorStop(1, '#dcc6a6');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 1280, 720);
      ctx.fillStyle = 'rgba(120,90,60,0.18)';
      ctx.fillRect(0, 600, 1280, 120);
      people.forEach(function (it, i) {
        var x = 90 + i * 150;
        PVZ.art.drawPerson(ctx, it.p, x, 600, 470, {});
        PVZ.art.txt(ctx, it.p.name + ' · ' + it.p.style, x, 636, 12, '#5a4230', 600, 'center');
      });
    }
  };
  PVZ.game.trans = null;
  PVZ.game.setScene(scene);
  return 'lineup ok';
})()
