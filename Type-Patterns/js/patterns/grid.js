// Сетка: ширины колонок и высоты строк дышат, буквы растягиваются в свои ячейки.
PT.register({
  id: 'grid', name: 'Сетка',
  params: [
    { key: 'cols', label: 'Колонки', type: 'int', min: 1, max: 24, def: 6 },
    { key: 'rows', label: 'Строки', type: 'int', min: 1, max: 24, def: 8 },
    { key: 'amp', label: 'Сила', type: 'range', min: 0, max: 3, step: 0.01, def: 1.4 },
    { key: 'wx', label: 'Волн по ширине', type: 'range', min: 0, max: 3, step: 0.01, def: 1 },
    { key: 'wy', label: 'Волн по высоте', type: 'range', min: 0, max: 3, step: 0.01, def: 1 },
    { key: 'speed', label: 'Скорость', type: 'int', min: 0, max: 4, def: 1 },
    { key: 'diag', label: 'Сдвиг строк', type: 'range', min: 0, max: 1, step: 0.01, def: 0.25 },
    { key: 'shear', label: 'Излом колонок', type: 'range', min: 0, max: 0.5, step: 0.01, def: 0 },
    { key: 'gap', label: 'Зазор', type: 'range', min: 0, max: 0.4, step: 0.01, def: 0.08 },
  ],
  draw(g, e) {
    const { W, H, t, p } = e, TAU = PT.TAU, C = p.cols, R = p.rows;
    const gp = p.gap * Math.min(W / C, H / R);
    const rh = []; let sh = 0;
    for (let j = 0; j < R; j++) { rh[j] = Math.exp(p.amp * Math.sin(TAU * ((j / R) * p.wy - t * p.speed + p.diag))); sh += rh[j]; }
    let y = 0;
    for (let j = 0; j < R; j++) {
      const h = (rh[j] / sh) * H;
      const cw = []; let sw = 0;
      for (let i = 0; i < C; i++) { cw[i] = Math.exp(p.amp * Math.sin(TAU * ((i / C) * p.wx - t * p.speed + j * p.shear))); sw += cw[i]; }
      let x = 0;
      for (let i = 0; i < C; i++) {
        const w = (cw[i] / sw) * W;
        if (w > gp + 0.5 && h > gp + 0.5) {
          g.fillStyle = e.col(j * C + i);
          PT.fit(g, e.ch(j * C + i), x + w / 2, y + h / 2, w - gp, h - gp, e.vm);
        }
        x += w;
      }
      y += h;
    }
  },
});
