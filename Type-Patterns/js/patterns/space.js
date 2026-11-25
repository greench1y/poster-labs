// Буквы в пространстве: разный размер, разные углы, перспектива.
PT.register({
  id: 'space', name: 'В пространстве',
  params: [
    { key: 'count', label: 'Количество', type: 'int', min: 5, max: 400, def: 110 },
    { key: 'smin', label: 'Мин. размер', type: 'range', min: 0.02, max: 0.4, step: 0.005, def: 0.05 },
    { key: 'smax', label: 'Макс. размер', type: 'range', min: 0.05, max: 1, step: 0.005, def: 0.45 },
    { key: 'tilt', label: 'Разброс углов', type: 'range', min: 0, max: 1, step: 0.01, def: 0.6 },
    { key: 'depth', label: 'Глубина', type: 'range', min: 0.1, max: 2, step: 0.01, def: 1 },
    { key: 'persp', label: 'Объектив', type: 'range', min: 0.5, max: 4, step: 0.01, def: 1.2 },
    { key: 'orbit', label: 'Облёт камеры', type: 'int', min: -2, max: 2, def: 1 },
    { key: 'spin', label: 'Кручение букв', type: 'int', min: 0, max: 3, def: 1 },
    { key: 'float', label: 'Покачивание', type: 'range', min: 0, max: 1, step: 0.01, def: 0.3 },
    { key: 'fog', label: 'Дымка', type: 'range', min: 0, max: 1, step: 0.01, def: 0.45 },
  ],
  draw(g, e) {
    const { W, H, t, p } = e, TAU = PT.TAU;
    const D = Math.max(W, H) * 1.25;
    let items = e.store.items;
    if (!items) {
      const r = e.rnd(3), a = Math.min(p.smin, p.smax), b = Math.max(p.smin, p.smax);
      items = e.store.items = [];
      for (let i = 0; i < p.count; i++) {
        items.push({
          x: (r() - 0.5) * D, y: (r() - 0.5) * D, z: (r() - 0.5) * D * p.depth,
          size: PT.lerp(a, b, Math.pow(r(), 2.2)) * e.min,
          rx: (r() - 0.5) * TAU * p.tilt, ry: (r() - 0.5) * TAU * p.tilt, rz: (r() - 0.5) * Math.PI * p.tilt,
          sx: Math.round((r() * 2 - 1) * p.spin), sy: Math.round((r() * 2 - 1) * p.spin),
          ph: r(), i,
        });
      }
    }
    const f = p.persp * Math.max(W, H), oa = TAU * t * p.orbit;
    const list = items.map((it) => {
      const ax = it.rx + TAU * t * it.sx, ay = it.ry + TAU * t * it.sy;
      const tr = (v) => PT.rotY(PT.rotY(PT.rotX(PT.rotZ(v, it.rz), ax), ay), oa);
      const C = PT.rotY([it.x, it.y + Math.sin(TAU * (t + it.ph)) * p.float * it.size * 0.6, it.z], oa);
      return { C, U: tr([it.size, 0, 0]), V: tr([0, it.size, 0]), it };
    });
    list.sort((a, b) => b.C[2] - a.C[2]);
    for (const o of list) {
      const zn = PT.clamp(o.C[2] / (D * 1.4) + 0.5, 0, 1);
      g.globalAlpha = 1 - p.fog * zn;
      g.fillStyle = e.col(o.it.i);
      PT.G3(g, e.ch(o.it.i), o.C, o.U, o.V, f, W / 2, H / 2);
    }
    g.globalAlpha = 1;
  },
});
