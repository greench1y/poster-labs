// Калейдоскоп: сектор с бегущим текстом, зеркально размноженный вокруг центра.
PT.register({
  id: 'kaleido', name: 'Калейдоскоп',
  params: [
    { key: 'sectors', label: 'Зеркальных пар', type: 'int', min: 2, max: 16, def: 6 },
    { key: 'size', label: 'Размер букв', type: 'range', min: 0.03, max: 0.5, step: 0.005, def: 0.14 },
    { key: 'gapY', label: 'Интерлиньяж', type: 'range', min: 0.7, max: 2, step: 0.01, def: 0.95 },
    { key: 'angle', label: 'Угол текста, °', type: 'range', min: 0, max: 360, step: 1, def: 20 },
    { key: 'sx', label: 'Бег вдоль строк', type: 'int', min: -3, max: 3, def: 1 },
    { key: 'sy', label: 'Бег поперёк', type: 'int', min: -2, max: 2, def: 0 },
    { key: 'rot', label: 'Вращение', type: 'int', min: -3, max: 3, def: 0 },
    { key: 'breathe', label: 'Дыхание', type: 'range', min: 0, max: 0.6, step: 0.01, def: 0.15 },
  ],
  draw(g, e) {
    const { W, H, t, p } = e, TAU = PT.TAU, ns = e.ns;
    const N = p.sectors * 2, al = TAU / N, Rm = Math.hypot(W, H) / 2 + 2, size = p.size * e.min;
    const cum = []; let Px = 0;
    for (let i = 0; i < ns; i++) { const a = (PT.m(e.seq[i]).w / 100) * size; cum[i] = Px + a / 2; Px += a; }
    const Py = size * p.gapY, z = 1 + p.breathe * Math.sin(TAU * t);
    const ang = (p.angle * Math.PI) / 180, ca = Math.cos(ang), sa = Math.sin(ang);
    const Rc = Rm / z + size, ox = t * p.sx * Px, oy = t * p.sy * 4 * Py;
    // Буквы, попадающие в один сектор, считаются один раз и повторяются во всех секторах.
    const list = [];
    for (let k = Math.floor((-Rc - oy) / Py); k <= Math.ceil((Rc - oy) / Py); k++) {
      const y = k * Py + oy, bx = (PT.mod(k, 4) * Px) / 4 + ox;
      for (let m = Math.floor((-Rc - bx) / Px) - 1; m <= Math.ceil((Rc - bx) / Px); m++) for (let i = 0; i < ns; i++) {
        if (e.seq[i] === ' ') continue;
        const x = bx + m * Px + cum[i];
        const wx = (x * ca - y * sa) * z, wy = (x * sa + y * ca) * z, rad = Math.hypot(wx, wy);
        if (rad > Rm + size * z) continue;
        const am = Math.min(Math.PI, (size * z * 0.9) / Math.max(rad, 1)), a = Math.atan2(wy, wx);
        if (a < -am || a > al + am) continue;
        list.push(x, y, i);
      }
    }
    g.translate(W / 2, H / 2);
    g.rotate(t * p.rot * 2 * al);
    for (let s = 0; s < N; s++) {
      g.save();
      if (s % 2 === 0) g.rotate(s * al);
      else { g.rotate((s + 1) * al); g.scale(1, -1); }
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, Rm, -0.003, al + 0.003); g.closePath(); g.clip();
      g.rotate(ang); g.scale(z, z);
      for (let q = 0; q < list.length; q += 3) {
        g.fillStyle = e.colq(list[q + 2]);
        PT.G(g, e.seq[list[q + 2]], list[q], list[q + 1], size);
      }
      g.restore();
    }
  },
});
