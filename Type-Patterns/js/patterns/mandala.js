// Мандала: кольца букв с радиальной симметрией.
PT.register({
  id: 'mandala', name: 'Мандала',
  params: [
    { key: 'rings', label: 'Кольца', type: 'int', min: 1, max: 14, def: 7 },
    { key: 'sym', label: 'Симметрия', type: 'int', min: 2, max: 24, def: 8 },
    { key: 'size', label: 'Размер', type: 'range', min: 0.4, max: 1.8, step: 0.01, def: 1 },
    { key: 'hole', label: 'Отверстие', type: 'range', min: 0, max: 0.7, step: 0.01, def: 0.12 },
    { key: 'grow', label: 'Рост к краю', type: 'range', min: 0, max: 1, step: 0.01, def: 0.5 },
    { key: 'dens', label: 'Плотность', type: 'range', min: 0.5, max: 2, step: 0.01, def: 1 },
    { key: 'speed', label: 'Вращение', type: 'int', min: 0, max: 4, def: 1 },
    { key: 'pulse', label: 'Пульсация', type: 'range', min: 0, max: 1, step: 0.01, def: 0.35 },
    { key: 'spin', label: 'Кручение букв', type: 'int', min: 0, max: 3, def: 0 },
    { key: 'orient', label: 'Ориентация', type: 'select', options: [['out', 'Наружу'], ['in', 'Внутрь'], ['tan', 'Вдоль радиуса']], def: 'out' },
  ],
  draw(g, e) {
    const { W, H, t, p } = e, TAU = PT.TAU;
    const R = e.min * 0.48 * p.size, r0 = R * p.hole;
    const th = []; let sum = 0;
    for (let k = 0; k < p.rings; k++) { th[k] = 1 + p.grow * 2.5 * (p.rings > 1 ? k / (p.rings - 1) : 0); sum += th[k]; }
    g.translate(W / 2, H / 2);
    let r = r0, idx = 0;
    for (let k = 0; k < p.rings; k++) {
      const d = ((R - r0) * th[k]) / sum, rc = r + d / 2; r += d;
      const size = d * 1.2;
      // На кольце p.sym одинаковых секторов по L букв: поворот на один сектор незаметен, поэтому цикл бесшовный.
      const L = Math.max(1, Math.round(((TAU * rc) / (size * 0.78)) * p.dens / p.sym));
      const dir = k % 2 ? -1 : 1, tot = p.sym * L;
      const rot = (dir * TAU * p.speed * t) / p.sym;
      const sc = 1 + p.pulse * 0.6 * Math.sin(TAU * (t - k * 0.17));
      for (let s = 0; s < p.sym; s++) for (let j = 0; j < L; j++) {
        const a = rot + (TAU * (s * L + j)) / tot - Math.PI / 2;
        const lr = (p.orient === 'out' ? a + Math.PI / 2 : p.orient === 'in' ? a - Math.PI / 2 : a) + TAU * p.spin * t * dir;
        g.fillStyle = e.col(idx + j);
        PT.G(g, e.ch(idx + j), Math.cos(a) * rc, Math.sin(a) * rc, size * sc, lr);
      }
      idx += L;
    }
  },
});
