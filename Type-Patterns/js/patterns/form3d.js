// Текст на 3D-форме: цилиндр, сфера или тор.
PT.register({
  id: 'form3d', name: '3D-форма',
  params: [
    { key: 'shape', label: 'Форма', type: 'select', options: [['cyl', 'Цилиндр'], ['sphere', 'Сфера'], ['torus', 'Тор']], def: 'cyl' },
    { key: 'rows', label: 'Ряды', type: 'int', min: 2, max: 30, def: 9 },
    { key: 'size', label: 'Размер', type: 'range', min: 0.3, max: 1.6, step: 0.01, def: 0.9 },
    { key: 'dens', label: 'Плотность', type: 'range', min: 0.5, max: 2, step: 0.01, def: 1 },
    { key: 'spin', label: 'Вращение', type: 'int', min: -3, max: 3, def: 1 },
    { key: 'counter', label: 'Встречные ряды', type: 'bool', def: true },
    { key: 'flow', label: 'Поток по трубе', type: 'int', min: -3, max: 3, def: 1 },
    { key: 'tiltX', label: 'Наклон вперёд', type: 'range', min: -1, max: 1, step: 0.01, def: 0.25 },
    { key: 'tiltZ', label: 'Наклон вбок', type: 'range', min: -1, max: 1, step: 0.01, def: -0.15 },
    { key: 'persp', label: 'Объектив', type: 'range', min: 0.7, max: 5, step: 0.01, def: 1.6 },
    { key: 'back', label: 'Обратная сторона', type: 'select', options: [['dim', 'Приглушить'], ['hide', 'Скрыть'], ['show', 'Показать']], def: 'dim' },
  ],
  draw(g, e) {
    const { W, H, t, p } = e, TAU = PT.TAU, ns = e.ns, rows = p.rows;
    const base = e.min * 0.5 * p.size, items = [];
    const cnt = (circ, sz) => Math.max(1, Math.round(((circ / (sz * 0.72)) * p.dens) / ns)) * ns;
    const mul = (v, k) => [v[0] * k, v[1] * k, v[2] * k];
    const add = (C, u, v, N, arc, sz, ci) => {
      const eu = arc / 0.72, ev = Math.min(sz * 1.15, eu * 1.6);
      items.push({ C, U: mul(u, eu), V: mul(v, ev), N, ci });
    };
    const dirOf = (r) => (p.counter && r % 2 ? -1 : 1);
    if (p.shape === 'cyl') {
      const R = base * 0.78, Hc = R * 2.7, sz = Hc / rows, m = cnt(TAU * R, sz), arc = (TAU * R) / m;
      for (let r = 0; r < rows; r++) {
        const y = -Hc / 2 + sz * (r + 0.5), off = TAU * t * p.spin * dirOf(r);
        for (let i = 0; i < m; i++) {
          const th = (TAU * i) / m + off, s = Math.sin(th), c = Math.cos(th);
          add([R * s, y, -R * c], [c, 0, s], [0, 1, 0], [s, 0, -c], arc, sz, i + r * 2);
        }
      }
    } else if (p.shape === 'sphere') {
      const R = base, sz = (Math.PI * R) / rows;
      for (let r = 0; r < rows; r++) {
        const ph = -Math.PI / 2 + (Math.PI * (r + 0.5)) / rows, cp = Math.cos(ph), sp = Math.sin(ph), Rr = R * cp;
        const m = cnt(TAU * Rr, sz), arc = (TAU * Rr) / m, off = TAU * t * p.spin * dirOf(r);
        for (let i = 0; i < m; i++) {
          const th = (TAU * i) / m + off, s = Math.sin(th), c = Math.cos(th);
          add([Rr * s, R * sp, -Rr * c], [c, 0, s], [-sp * s, cp, sp * c], [cp * s, sp, -cp * c], arc, sz, i + r * 2);
        }
      }
    } else {
      const Rm = base * 0.7, rt = base * 0.36, sz = (TAU * rt) / rows, m = cnt(TAU * Rm, sz);
      for (let r = 0; r < rows; r++) {
        const ps = (TAU * r) / rows + TAU * t * p.flow, cp = Math.cos(ps), sp = Math.sin(ps), Rr = Rm + rt * cp;
        const arc = (TAU * Rr) / m, off = TAU * t * p.spin * dirOf(r);
        for (let i = 0; i < m; i++) {
          const th = (TAU * i) / m + off, s = Math.sin(th), c = Math.cos(th);
          add([Rr * s, rt * sp, -Rr * c], [c, 0, s], [-sp * s, cp, sp * c], [cp * s, sp, -cp * c], arc, sz, i + r * 2);
        }
      }
    }
    const ax = (p.tiltX * Math.PI) / 2, az = (p.tiltZ * Math.PI) / 2, f = p.persp * e.min;
    const T = (v) => PT.rotZ(PT.rotX(v, ax), az);
    for (const it of items) {
      it.C = T(it.C); it.U = T(it.U); it.V = T(it.V);
      const N = T(it.N);
      it.front = N[0] * it.C[0] + N[1] * it.C[1] + N[2] * (it.C[2] + f) < 0;
    }
    items.sort((a, b) => b.C[2] - a.C[2]);
    for (const it of items) {
      if (!it.front && p.back === 'hide') continue;
      g.globalAlpha = !it.front && p.back === 'dim' ? 0.2 : 1;
      g.fillStyle = e.colq(it.ci);
      PT.G3(g, e.sq(it.ci), it.C, it.U, it.V, f, W / 2, H / 2);
    }
    g.globalAlpha = 1;
  },
});
