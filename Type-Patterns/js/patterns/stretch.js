// Растяжка: строки текста во весь формат, ширина перетекает от буквы к букве.
PT.register({
  id: 'stretch', name: 'Растяжка',
  params: [
    { key: 'rows', label: 'Строк (0 — авто)', type: 'int', min: 0, max: 12, def: 0 },
    { key: 'amp', label: 'Растяжение', type: 'range', min: 0, max: 14, step: 0.1, def: 6 },
    { key: 'sharp', label: 'Резкость', type: 'range', min: 1, max: 8, step: 0.1, def: 3 },
    { key: 'waves', label: 'Волн в строке', type: 'range', min: 0.5, max: 3, step: 0.01, def: 1 },
    { key: 'speed', label: 'Скорость', type: 'int', min: -4, max: 4, def: 1 },
    { key: 'rowShift', label: 'Сдвиг строк', type: 'range', min: 0, max: 1, step: 0.01, def: 0.25 },
    { key: 'vamp', label: 'Растяжение строк', type: 'range', min: 0, max: 6, step: 0.1, def: 1.5 },
    { key: 'margin', label: 'Поля', type: 'range', min: 0, max: 0.15, step: 0.005, def: 0.04 },
    { key: 'gap', label: 'Зазор', type: 'range', min: 0, max: 1, step: 0.01, def: 0.25 },
  ],
  draw(g, e) {
    const { W, H, t, p } = e, TAU = PT.TAU;
    const split = (rows) => {
      const per = Math.ceil(e.n / rows), out = [];
      for (let i = 0; i < e.n; i += per) out.push(e.chars.slice(i, i + per));
      return out;
    };
    let lines;
    if (e.lines.length > 1) lines = e.lines.map((l) => Array.from(l.replace(/\s+/g, '')));
    else if (p.rows > 0) lines = split(Math.min(p.rows, e.n));
    else if (e.words.length > 1) lines = e.words.map((w) => Array.from(w));
    else lines = split(PT.clamp(Math.round(Math.sqrt((e.n * H) / W / 2)), 1, e.n));
    lines = lines.filter((l) => l.length);
    const R = lines.length, mg = p.margin * e.min, gp = p.gap * e.min * 0.04;
    const hs = []; let sh = 0;
    for (let k = 0; k < R; k++) { hs[k] = 1 + p.vamp * Math.pow(0.5 + 0.5 * Math.cos(TAU * (k / R - t * p.speed + 0.5)), 2); sh += hs[k]; }
    let y = mg, idx = 0;
    for (let k = 0; k < R; k++) {
      const h = (hs[k] / sh) * (H - 2 * mg), ln = lines[k], m = ln.length;
      const ws = []; let sw = 0;
      for (let i = 0; i < m; i++) { ws[i] = 1 + p.amp * Math.pow(0.5 + 0.5 * Math.cos(TAU * ((i / m) * p.waves - t * p.speed + k * p.rowShift)), p.sharp); sw += ws[i]; }
      let x = mg;
      for (let i = 0; i < m; i++) {
        const w = (ws[i] / sw) * (W - 2 * mg);
        g.fillStyle = e.col(idx + i);
        PT.fit(g, ln[i], x + w / 2, y + h / 2, w - gp, h - gp, e.vm);
        x += w;
      }
      y += h; idx += m;
    }
  },
});
