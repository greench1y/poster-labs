// Перекидное табло: ячейки перелистывают буквы волной.
PT.register({
  id: 'flap', name: 'Табло',
  params: [
    { key: 'cols', label: 'Колонки', type: 'int', min: 2, max: 24, def: 8 },
    { key: 'aspect', label: 'Высота ячейки', type: 'range', min: 0.8, max: 2.2, step: 0.01, def: 1.35 },
    { key: 'steps', label: 'Смен за цикл', type: 'int', min: 1, max: 12, def: 4 },
    { key: 'wave', label: 'Волна', type: 'select', options: [['diag', 'По диагонали'], ['row', 'По строкам'], ['center', 'От центра'], ['random', 'Случайно']], def: 'diag' },
    { key: 'spread', label: 'Растянутость волны', type: 'range', min: 0, max: 1, step: 0.01, def: 0.7 },
    { key: 'dur', label: 'Длительность смены', type: 'range', min: 0.1, max: 1, step: 0.01, def: 0.45 },
    { key: 'gap', label: 'Зазор', type: 'range', min: 0, max: 0.3, step: 0.01, def: 0.08 },
    { key: 'card', label: 'Плашки', type: 'bool', def: true },
  ],
  draw(g, e) {
    const { W, H, t, p } = e, S = e.S;
    const cw = W / p.cols, rows = Math.max(1, Math.round(H / (cw * p.aspect))), ch = H / rows;
    const gp = (p.gap * cw) / 2, iw = cw - gp * 2, ih = ch - gp * 2, rad = Math.min(iw, ih) * 0.08;
    const cardCol = PT.mix(S.bg, S.colors[0], 0.14);
    let maxW = 1;
    for (const c of e.chars) maxW = Math.max(maxW, PT.m(c).w);
    const size = Math.min((ih * 0.7) / (e.vm.A / 100), (iw * 0.86) / (maxW / 100));
    const half = (c, ci, top, sy, shade) => {
      g.save();
      g.scale(1, sy);
      g.beginPath();
      g.rect(-iw / 2 - 1, top ? -ih / 2 - 1 : 0, iw + 2, ih / 2 + 1);
      g.clip();
      if (p.card) { g.fillStyle = cardCol; g.beginPath(); g.roundRect(-iw / 2, -ih / 2, iw, ih, rad); g.fill(); }
      g.fillStyle = e.col(ci);
      PT.G(g, c, 0, 0, size);
      if (shade > 0) { g.fillStyle = 'rgba(0,0,0,' + shade + ')'; g.fillRect(-iw / 2, -ih / 2, iw, ih); }
      g.restore();
    };
    for (let j = 0; j < rows; j++) for (let i = 0; i < p.cols; i++) {
      let d;
      if (p.wave === 'diag') d = (i + j) / (p.cols + rows);
      else if (p.wave === 'row') d = j / rows;
      else if (p.wave === 'center') d = Math.min(0.999, Math.hypot((i + 0.5) / p.cols - 0.5, (j + 0.5) / rows - 0.5) * 1.4);
      else d = PT.hash(i, j, S.seed) * 0.999;
      const tau = t * p.steps - d * p.spread, k = Math.floor(tau);
      const pr = PT.smooth((tau - k) / p.dur);
      const b = j * p.cols + i, ci = b + PT.mod(k, p.steps), pi = b + PT.mod(k - 1, p.steps);
      const cur = e.ch(ci), prev = e.ch(pi);
      g.save();
      g.translate((i + 0.5) * cw, (j + 0.5) * ch);
      if (pr >= 1) { half(cur, ci, true, 1, 0); half(cur, ci, false, 1, 0); }
      else {
        half(cur, ci, true, 1, 0);
        half(prev, pi, false, 1, 0);
        const c = Math.cos(pr * Math.PI);
        if (pr < 0.5) half(prev, pi, true, Math.max(0.001, c), 0.35 * (1 - c));
        else half(cur, ci, false, Math.max(0.001, -c), 0.35 * (1 + c));
      }
      g.fillStyle = S.bg;
      g.fillRect(-iw / 2 - 1, -Math.max(1, ih * 0.008), iw + 2, Math.max(2, ih * 0.016));
      g.restore();
    }
  },
});
