// Рябь: по сетке букв расходятся волны поворота и масштаба.
PT.register({
  id: 'ripple', name: 'Рябь',
  params: [
    { key: 'cols', label: 'Колонки', type: 'int', min: 3, max: 40, def: 12 },
    { key: 'size', label: 'Размер букв', type: 'range', min: 0.4, max: 1.8, step: 0.01, def: 1 },
    { key: 'shape', label: 'Форма волны', type: 'select', options: [['circle', 'Круги'], ['diamond', 'Ромбы'], ['line', 'Диагональ']], def: 'circle' },
    { key: 'waves', label: 'Число волн', type: 'range', min: 0.3, max: 6, step: 0.01, def: 2 },
    { key: 'speed', label: 'Скорость', type: 'int', min: -3, max: 3, def: 1 },
    { key: 'rot', label: 'Поворот, °', type: 'range', min: 0, max: 360, step: 1, def: 90 },
    { key: 'scl', label: 'Масштаб', type: 'range', min: 0, max: 1, step: 0.01, def: 0.5 },
    { key: 'flip', label: 'Переворот', type: 'bool', def: false },
    { key: 'cx', label: 'Центр X', type: 'range', min: 0, max: 1, step: 0.01, def: 0.5 },
    { key: 'cy', label: 'Центр Y', type: 'range', min: 0, max: 1, step: 0.01, def: 0.5 },
  ],
  draw(g, e) {
    const { W, H, t, p } = e, TAU = PT.TAU;
    const cell = W / p.cols, rows = Math.max(1, Math.round(H / cell)), ch = H / rows;
    const size = cell * 1.05 * p.size, ra = (p.rot * Math.PI) / 180;
    for (let j = 0; j < rows; j++) for (let i = 0; i < p.cols; i++) {
      const x = (i + 0.5) * cell, y = (j + 0.5) * ch;
      const dx = (x - p.cx * W) / e.min, dy = (y - p.cy * H) / e.min;
      const d = p.shape === 'circle' ? Math.hypot(dx, dy) : p.shape === 'diamond' ? Math.abs(dx) + Math.abs(dy) : (dx + dy) * 0.7;
      const ph = TAU * (d * p.waves - t * p.speed), s = Math.sin(ph);
      g.fillStyle = e.col(j * p.cols + i);
      PT.G(g, e.ch(j * p.cols + i), x, y, size * Math.max(0.05, 1 + p.scl * s), ra * s, p.flip ? Math.cos(ph) : 1, 1);
    }
  },
});
