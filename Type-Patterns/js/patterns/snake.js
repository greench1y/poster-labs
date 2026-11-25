// Змейка: текст ползёт по извивающейся траектории.
PT.register({
  id: 'snake', name: 'Змейка',
  params: [
    { key: 'shape', label: 'Траектория', type: 'select', options: [['serp', 'Серпантин'], ['liss', 'Петли']], def: 'serp' },
    { key: 'rows', label: 'Витки', type: 'int', min: 1, max: 14, def: 5 },
    { key: 'la', label: 'Петли по X', type: 'int', min: 1, max: 6, def: 3 },
    { key: 'lb', label: 'Петли по Y', type: 'int', min: 1, max: 6, def: 2 },
    { key: 'size', label: 'Размер букв', type: 'range', min: 0.3, max: 2, step: 0.01, def: 1 },
    { key: 'track', label: 'Трекинг', type: 'range', min: 0.7, max: 2, step: 0.01, def: 1 },
    { key: 'speed', label: 'Скорость', type: 'int', min: -4, max: 4, def: 1 },
    { key: 'wob', label: 'Извивание', type: 'range', min: 0, max: 1.5, step: 0.01, def: 0.6 },
    { key: 'wlen', label: 'Длина волны', type: 'range', min: 0.1, max: 1.5, step: 0.01, def: 0.5 },
    { key: 'wspeed', label: 'Скорость волны', type: 'int', min: -3, max: 3, def: 1 },
    { key: 'pm', label: 'Пульс размера', type: 'range', min: 0, max: 1, step: 0.01, def: 0.3 },
    { key: 'pw', label: 'Волн пульса', type: 'int', min: 1, max: 12, def: 4 },
  ],
  draw(g, e) {
    const { W, H, t, p } = e, TAU = PT.TAU;
    const closed = p.shape === 'liss';
    let pts = [], rs = H / p.rows;
    if (closed) {
      const N = 720;
      for (let i = 0; i < N; i++) {
        const u = (TAU * i) / N;
        pts.push([W / 2 + W * 0.42 * Math.sin(p.la * u + Math.PI / 4), H / 2 + H * 0.44 * Math.sin(p.lb * u)]);
      }
    } else {
      const rad = rs / 2, x0 = rad + W * 0.04, x1 = W - rad - W * 0.04;
      for (let k = 0; k < p.rows; k++) {
        const y = rs * (k + 0.5), dir = k % 2 ? -1 : 1;
        let xa = dir > 0 ? x0 : x1, xb = dir > 0 ? x1 : x0;
        if (k === 0) xa = -W * 0.3;
        if (k === p.rows - 1) xb = dir > 0 ? W * 1.3 : -W * 0.3;
        const n = Math.max(1, Math.ceil(Math.abs(xb - xa) / 10));
        for (let i = 0; i < n; i++) pts.push([xa + ((xb - xa) * i) / n, y]);
        if (k < p.rows - 1) {
          for (let i = 0; i < 14; i++) { const a = -Math.PI / 2 + (Math.PI * i) / 14; pts.push([xb + dir * rad * Math.cos(a), y + rad + rad * Math.sin(a)]); }
        } else pts.push([xb, y]);
      }
    }
    const cumOf = (P) => {
      const c = [0];
      for (let i = 1; i < P.length; i++) c[i] = c[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
      return c;
    };
    const M = pts.length;
    let cum = cumOf(pts);
    let L = cum[M - 1] + (closed ? Math.hypot(pts[0][0] - pts[M - 1][0], pts[0][1] - pts[M - 1][1]) : 0);
    if (p.wob > 0) {
      const nw = closed ? Math.max(1, Math.round(L / (W * p.wlen))) : L / (W * p.wlen);
      const amp = p.wob * (closed ? e.min * 0.05 : rs * 0.3);
      const out = [];
      for (let i = 0; i < M; i++) {
        const a = pts[closed ? PT.mod(i - 1, M) : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % M : Math.min(M - 1, i + 1)];
        const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
        const off = amp * Math.sin(TAU * ((cum[i] / L) * nw - t * p.wspeed));
        out.push([pts[i][0] - (dy / d) * off, pts[i][1] + (dx / d) * off]);
      }
      pts = out;
      cum = cumOf(pts);
      L = cum[M - 1] + (closed ? Math.hypot(pts[0][0] - pts[M - 1][0], pts[0][1] - pts[M - 1][1]) : 0);
    }
    const at = (s) => {
      let lo = 0, hi = M - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
      let a = pts[lo], b = pts[hi], seg = cum[hi] - cum[lo];
      if (closed && s >= cum[M - 1]) { a = pts[M - 1]; b = pts[0]; seg = L - cum[M - 1]; lo = M - 1; }
      const f = seg > 0 ? (s - cum[lo]) / seg : 0;
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(b[1] - a[1], b[0] - a[0])];
    };

    const size = (closed ? e.min * 0.075 : rs * 0.62) * p.size;
    const adv = []; let period = 0;
    for (let i = 0; i < e.ns; i++) { adv[i] = (PT.m(e.seq[i]).w / 100) * size * p.track; period += adv[i]; }
    let count = Infinity;
    if (closed) {
      const reps = Math.max(1, Math.round(L / period)), k = L / (reps * period);
      for (let i = 0; i < e.ns; i++) adv[i] *= k;
      period *= k; count = reps * e.ns;
    }
    let s = PT.mod(t * p.speed, 1) * period - (closed ? 0 : period);
    for (let i = 0; i < count && s < L && i < 6000; i++) {
      const a = adv[i % e.ns], c = s + a / 2;
      s += a;
      if (!closed && (c < 0 || c > L)) continue;
      const q = at(closed ? PT.mod(c, L) : c);
      const sz = size * (1 + p.pm * 0.5 * Math.sin(TAU * ((c / L) * p.pw - t)));
      g.fillStyle = e.colq(i);
      PT.G(g, e.seq[i % e.ns], q[0], q[1], sz, q[2]);
    }
  },
});
