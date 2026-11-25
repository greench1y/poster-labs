// Спираль: текст закручен к центру, бесконечная воронка.
PT.register({
  id: 'spiral', name: 'Спираль',
  params: [
    { key: 'perTurn', label: 'Букв на виток', type: 'int', min: 6, max: 60, def: 22 },
    { key: 'tight', label: 'Плотность витков', type: 'range', min: 0.4, max: 0.95, step: 0.005, def: 0.78 },
    { key: 'arms', label: 'Рукава', type: 'int', min: 1, max: 8, def: 1 },
    { key: 'size', label: 'Размер букв', type: 'range', min: 0.4, max: 2, step: 0.01, def: 1 },
    { key: 'speed', label: 'Скорость', type: 'int', min: -3, max: 3, def: 1 },
    { key: 'twist', label: 'Вращение', type: 'int', min: -3, max: 3, def: 0 },
    { key: 'orient', label: 'Ориентация', type: 'select', options: [['tan', 'По витку'], ['rad', 'К центру']], def: 'tan' },
  ],
  draw(g, e) {
    const { W, H, t, p } = e, TAU = PT.TAU;
    const R0 = (Math.hypot(W, H) / 2) * 1.3, dl = TAU / p.perTurn, b = Math.log(p.tight) / TAU;
    // Логарифмическая спираль самоподобна: сдвиг на длину текста возвращает ту же картинку.
    const shift = t * p.speed * e.ns;
    g.translate(W / 2, H / 2);
    for (let arm = 0; arm < p.arms; arm++) {
      g.save();
      g.rotate((TAU * arm) / p.arms + (TAU * p.twist * t) / p.arms);
      for (let j = Math.ceil(-shift), c = 0; c < 5000; j++, c++) {
        const th = (j + shift) * dl, r = R0 * Math.exp(b * th), size = r * dl * 1.2 * p.size;
        if (size < 1.2) break;
        g.fillStyle = e.colq(j);
        PT.G(g, e.sq(j), r * Math.cos(th), r * Math.sin(th), size, p.orient === 'tan' ? th + Math.PI / 2 : th + Math.PI);
      }
      g.restore();
    }
  },
});
