// Орбиты: текст летает по наклонённым эллипсам вокруг центральной буквы.
PT.register({
  id: 'orbits', name: 'Орбиты',
  params: [
    { key: 'count', label: 'Орбиты', type: 'int', min: 1, max: 12, def: 6 },
    { key: 'radius', label: 'Размер орбит', type: 'range', min: 0.5, max: 2, step: 0.01, def: 1.25 },
    { key: 'squash', label: 'Сплющенность', type: 'range', min: 0.1, max: 1, step: 0.01, def: 0.55 },
    { key: 'spread', label: 'Разброс наклона', type: 'range', min: 0, max: 1, step: 0.01, def: 0.6 },
    { key: 'size', label: 'Размер букв', type: 'range', min: 0.4, max: 2.5, step: 0.01, def: 1 },
    { key: 'speed', label: 'Скорость', type: 'int', min: 0, max: 6, def: 1 },
    { key: 'depth', label: 'Глубина', type: 'range', min: 0, max: 0.8, step: 0.01, def: 0.45 },
    { key: 'orient', label: 'Буквы', type: 'select', options: [['up', 'Прямо'], ['tan', 'По орбите']], def: 'up' },
    { key: 'sun', label: 'Буква в центре', type: 'bool', def: true },
  ],
  draw(g, e) {
    const { W, H, t, p } = e, TAU = PT.TAU, r = e.rnd(9), list = [];
    const Rmax = e.min * 0.47 * p.radius;
    for (let k = 0; k < p.count; k++) {
      const a = (Rmax * (k + 1.3)) / (p.count + 0.3), b = a * Math.min(1, p.squash * (0.7 + 0.6 * r()));
      const al = (r() - 0.5) * Math.PI * p.spread, ca = Math.cos(al), sa = Math.sin(al);
      const dir = k % 2 ? -1 : 1, sz = e.min * 0.07 * p.size * (0.8 + (0.5 * k) / p.count);
      const circ = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
      const reps = Math.max(1, Math.round(circ / (sz * 0.8) / e.ns)), m = reps * e.ns;
      const rot = (dir * TAU * p.speed * t) / reps;
      for (let i = 0; i < m; i++) {
        const ch = e.seq[i % e.ns];
        if (ch === ' ') continue;
        const u = (-TAU * i) / m + rot, cu = Math.cos(u), su = Math.sin(u), x = a * cu, y = b * su;
        list.push({
          x: x * ca - y * sa, y: x * sa + y * ca, z: su, ch, i,
          size: sz * (1 + p.depth * su),
          rot: p.orient === 'tan' ? Math.atan2(-b * cu, a * su) + al : 0,
        });
      }
    }
    if (p.sun) list.push({ x: 0, y: 0, z: 0, ch: e.ch(0), i: 0, size: e.min * 0.2 * p.size, rot: 0, sun: true });
    list.sort((A, B) => A.z - B.z);
    g.translate(W / 2, H / 2);
    for (const o of list) {
      g.globalAlpha = o.sun ? 1 : 1 - p.depth * 0.7 * (1 - o.z) * 0.5;
      g.fillStyle = o.sun ? e.S.colors[e.S.colorMode === 'mono' ? 0 : 1] : e.colq(o.i);
      PT.G(g, o.ch, o.x, o.y, o.size, o.rot);
    }
    g.globalAlpha = 1;
  },
});
