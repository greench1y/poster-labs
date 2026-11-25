// Поток: слова плывут по полю шума, оставляя шлейф из букв.
PT.register({
  id: 'flow', name: 'Поток',
  params: [
    { key: 'count', label: 'Потоков', type: 'int', min: 5, max: 160, def: 50 },
    { key: 'trail', label: 'Длина шлейфа', type: 'int', min: 1, max: 40, def: 14 },
    { key: 'smin', label: 'Мин. размер', type: 'range', min: 0.01, max: 0.1, step: 0.002, def: 0.022 },
    { key: 'smax', label: 'Макс. размер', type: 'range', min: 0.02, max: 0.3, step: 0.002, def: 0.08 },
    { key: 'scale', label: 'Масштаб поля', type: 'range', min: 0.3, max: 4, step: 0.01, def: 1.2 },
    { key: 'curl', label: 'Закрученность', type: 'range', min: 0.2, max: 3, step: 0.01, def: 1 },
    { key: 'speed', label: 'Скорость', type: 'int', min: 1, max: 3, def: 1 },
    { key: 'fade', label: 'Затухание хвоста', type: 'range', min: 0, max: 1, step: 0.01, def: 0.85 },
  ],
  draw(g, e) {
    const { W, H, t, p } = e, TAU = PT.TAU;
    let parts = e.store.parts;
    if (!parts) {
      // Траектории считаются один раз; положение на них — чистая функция фазы, поэтому цикл бесшовный.
      const r = e.rnd(5), a = Math.min(p.smin, p.smax), b = Math.max(p.smin, p.smax), k = (p.scale * 2.2) / e.min;
      const fld = (x, y) => PT.noise2(x * k, y * k, e.S.seed) * TAU * 2 * p.curl;
      parts = e.store.parts = [];
      for (let i = 0; i < p.count; i++) {
        const size = PT.lerp(a, b, Math.pow(r(), 1.8)) * e.min, ds = size * 0.82;
        const M = PT.clamp(Math.round((1.5 * Math.max(W, H)) / ds), 16, 220), half = M >> 1;
        const pts = new Float32Array(M * 2), x0 = r() * W, y0 = r() * H;
        let x = x0, y = y0;
        for (let q = half; q < M; q++) { pts[2 * q] = x; pts[2 * q + 1] = y; const an = fld(x, y); x += Math.cos(an) * ds; y += Math.sin(an) * ds; }
        x = x0; y = y0;
        for (let q = half - 1; q >= 0; q--) { const an = fld(x, y); x -= Math.cos(an) * ds; y -= Math.sin(an) * ds; pts[2 * q] = x; pts[2 * q + 1] = y; }
        parts.push({ size, M, pts, ph: r() });
      }
    }
    for (const pt of parts) {
      const { M, pts } = pt, h = PT.mod(t * p.speed + pt.ph, 1) * (M + p.trail);
      const seg = (i) => { i = PT.clamp(i, 0, M - 2); return Math.atan2(pts[2 * i + 3] - pts[2 * i + 1], pts[2 * i + 2] - pts[2 * i]); };
      for (let j = 0; j < p.trail; j++) {
        const q = h - j;
        if (q < 0 || q > M - 1.001) continue;
        const i0 = Math.floor(q), f = q - i0;
        const x = PT.lerp(pts[2 * i0], pts[2 * i0 + 2], f), y = PT.lerp(pts[2 * i0 + 1], pts[2 * i0 + 3], f);
        if (x < -pt.size || x > W + pt.size || y < -pt.size || y > H + pt.size) continue;
        const a0 = seg(i0), a1 = seg(i0 + 1), da = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0));
        g.globalAlpha = (1 - (p.fade * j) / p.trail) * Math.min(1, q / 3, (M - 1 - q) / 3);
        g.fillStyle = e.col(-1 - j);
        PT.G(g, e.ch(-1 - j), x, y, pt.size, a0 + da * f);
      }
    }
    g.globalAlpha = 1;
  },
});
