// Буква из букв: крупный знак, набранный мелкими буквами того же текста.
(function () {
  function mask(cols, rows, paint) {
    const SS = 4, c = document.createElement('canvas');
    c.width = cols * SS; c.height = rows * SS;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#fff'; x.font = PT.fontStr(100); x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    PT.noOutline = true;
    try { paint(x, c.width, c.height); } finally { PT.noOutline = false; }
    const d = x.getImageData(0, 0, c.width, c.height).data, out = new Float32Array(cols * rows);
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      let s = 0;
      for (let yy = 0; yy < SS; yy++) for (let xx = 0; xx < SS; xx++) s += d[((r * SS + yy) * c.width + q * SS + xx) * 4];
      out[r * cols + q] = s / (SS * SS * 255);
    }
    return out;
  }
  PT.register({
    id: 'lol', name: 'Буква из букв',
    params: [
      { key: 'mode', label: 'Форма', type: 'select', options: [['cycle', 'Буквы по очереди'], ['word', 'Весь текст']], def: 'cycle' },
      { key: 'cols', label: 'Колонки', type: 'int', min: 8, max: 90, def: 36 },
      { key: 'margin', label: 'Поля', type: 'range', min: 0, max: 0.2, step: 0.005, def: 0.06 },
      { key: 'bgs', label: 'Фоновые буквы', type: 'range', min: 0, max: 1, step: 0.01, def: 0.22 },
      { key: 'morph', label: 'Плавность смены', type: 'range', min: 0.1, max: 1, step: 0.01, def: 0.5 },
      { key: 'pulse', label: 'Пульсация', type: 'range', min: 0, max: 1, step: 0.01, def: 0.35 },
      { key: 'speed', label: 'Скорость волны', type: 'int', min: 0, max: 4, def: 1 },
      { key: 'rot', label: 'Поворот, °', type: 'range', min: 0, max: 180, step: 1, def: 0 },
    ],
    draw(g, e) {
      const { W, H, t, p } = e, TAU = PT.TAU, cols = p.cols;
      const cw = W / cols, rows = Math.max(1, Math.round(H / cw)), ch = H / rows;
      const masks = e.store.masks || (e.store.masks = {});
      const get = (key, paint) => masks[key] || (masks[key] = mask(cols, rows, paint));
      const letter = (c) => get('c' + c, (x, w, h) => {
        const m = PT.m(c), bw = m.l + m.r, bh = m.a + m.d;
        if (bw < 1 || bh < 1) return;
        const mg = p.margin * Math.min(w, h);
        let sx = (w - 2 * mg) / bw, sy = (h - 2 * mg) / bh;
        if (sx > sy * 1.6) sx = sy * 1.6;
        if (sy > sx * 1.6) sy = sx * 1.6;
        PT.fit(x, c, w / 2, h / 2, bw * sx, bh * sy, { A: m.a, D: m.d });
      });
      let ma, mb, u = 0;
      if (p.mode === 'word') {
        ma = mb = get('word', (x, w, h) => {
          const src = e.lines.length > 1 ? e.lines : e.words;
          const lines = src.map((l) => Array.from(l.replace(/\s+/g, ''))).filter((l) => l.length);
          const mg = p.margin * Math.min(w, h), lh = (h - 2 * mg) / lines.length, gp = Math.min(w, h) * 0.012;
          lines.forEach((ln, k) => {
            let sum = 0;
            const bw = ln.map((c) => { const m = PT.m(c), v = Math.max(8, m.l + m.r); sum += v; return v; });
            let px = mg;
            ln.forEach((c, i) => {
              const cwid = (bw[i] / sum) * (w - 2 * mg);
              PT.fit(x, c, px + cwid / 2, mg + lh * (k + 0.5), cwid - gp, lh - gp, e.vm);
              px += cwid;
            });
          });
        });
      } else {
        const K = Math.min(e.n, 8), seg = PT.mod(t, 1) * K, k = Math.floor(seg) % K, f = seg - Math.floor(seg);
        ma = letter(e.chars[k]); mb = letter(e.chars[(k + 1) % K]);
        u = f < 1 - p.morph ? 0 : PT.smooth((f - (1 - p.morph)) / p.morph);
      }
      const ra = (p.rot * Math.PI) / 180;
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
        const idx = r * cols + q, m = ma[idx] + (mb[idx] - ma[idx]) * u;
        const k = p.bgs + (1 - p.bgs) * m;
        if (k < 0.02) continue;
        const x = (q + 0.5) * cw, y = (r + 0.5) * ch;
        const d = Math.hypot(x - W / 2, y - H / 2) / e.min;
        const wv = Math.sin(TAU * (t * p.speed - d * 2.2));
        g.globalAlpha = p.bgs > 0 ? 0.3 + 0.7 * m : 1;
        g.fillStyle = e.col(idx);
        PT.G(g, e.ch(idx), x, y, cw * 1.3 * k * (1 + p.pulse * 0.45 * m * wv), ra * wv * m);
      }
      g.globalAlpha = 1;
    },
  });
})();
