// Падение: буквы сыплются, сталкиваются и складываются в кучу; в конце цикла пол открывается.
(function () {
  const NS = 720; // шагов симуляции на цикл: состояние зависит только от фазы t
  function init(e) {
    const { W, p } = e, r = e.rnd(11), bodies = [];
    const a = Math.min(p.smin, p.smax), b = Math.max(p.smin, p.smax);
    for (let i = 0; i < p.count; i++) {
      const rad = (PT.lerp(a, b, Math.pow(r(), 2)) * e.min) / 2;
      bodies.push({
        r: rad, m: rad * rad, x: rad + r() * Math.max(1, W - 2 * rad), y: -rad * 1.5,
        vx: (r() - 0.5) * W * 0.004, vy: 0, a: r() * PT.TAU, w: (r() - 0.5) * 0.08,
        born: Math.floor((i * NS * 0.5) / p.count), i, dead: false,
      });
    }
    return { bodies, step: 0 };
  }
  function step(sim, e, n) {
    const { W, H, p } = e, gy = H * 0.0004 * p.grav, floor = n < NS * 0.84, act = [];
    for (const b of sim.bodies) {
      if (n < b.born || b.dead) continue;
      b.vy += gy; b.vx *= 0.995; b.vy *= 0.998;
      b.x += b.vx; b.y += b.vy; b.a += b.w; b.w *= 0.98;
      if (b.y > H + b.r * 3) { b.dead = true; continue; }
      act.push(b);
    }
    for (let it = 0; it < 4; it++) {
      for (let i = 0; i < act.length; i++) {
        const b = act[i];
        for (let j = i + 1; j < act.length; j++) {
          const q = act[j], dx = q.x - b.x, dy = q.y - b.y, rr = b.r + q.r, d2 = dx * dx + dy * dy;
          if (d2 >= rr * rr || d2 === 0) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, ov = rr - d, tm = b.m + q.m;
          b.x -= (nx * ov * q.m) / tm; b.y -= (ny * ov * q.m) / tm;
          q.x += (nx * ov * b.m) / tm; q.y += (ny * ov * b.m) / tm;
          if (it === 0) {
            const rvx = q.vx - b.vx, rvy = q.vy - b.vy, vn = rvx * nx + rvy * ny;
            if (vn < 0) {
              const rest = -vn > gy * 5 ? p.bounce : 0;
              const imp = (-(1 + rest) * vn) / (1 / b.m + 1 / q.m);
              b.vx -= (imp / b.m) * nx; b.vy -= (imp / b.m) * ny;
              q.vx += (imp / q.m) * nx; q.vy += (imp / q.m) * ny;
              const vt = -rvx * ny + rvy * nx;
              b.w += (vt / b.r) * 0.04; q.w += (vt / q.r) * 0.04;
            }
          }
        }
        if (b.x < b.r) { b.x = b.r; if (b.vx < 0) b.vx = -b.vx * p.bounce; }
        if (b.x > W - b.r) { b.x = W - b.r; if (b.vx > 0) b.vx = -b.vx * p.bounce; }
        if (floor && b.y > H - b.r) {
          b.y = H - b.r;
          if (b.vy > 0) b.vy = b.vy > gy * 5 ? -b.vy * p.bounce : 0;
          if (it === 0) { b.vx *= 0.92; b.w = PT.lerp(b.w, b.vx / b.r, 0.2); }
        }
      }
    }
  }
  PT.register({
    id: 'fall', name: 'Падение',
    params: [
      { key: 'count', label: 'Количество', type: 'int', min: 5, max: 160, def: 60 },
      { key: 'smin', label: 'Мин. размер', type: 'range', min: 0.03, max: 0.2, step: 0.005, def: 0.07 },
      { key: 'smax', label: 'Макс. размер', type: 'range', min: 0.05, max: 0.45, step: 0.005, def: 0.2 },
      { key: 'grav', label: 'Тяжесть', type: 'range', min: 0.4, max: 2.5, step: 0.01, def: 1 },
      { key: 'bounce', label: 'Упругость', type: 'range', min: 0, max: 0.8, step: 0.01, def: 0.3 },
      { key: 'disc', label: 'Кружки', type: 'bool', def: false },
    ],
    draw(g, e) {
      const target = Math.floor(e.t * NS);
      let sim = e.store.sim;
      if (!sim || target < sim.step) sim = e.store.sim = init(e);
      while (sim.step < target) { step(sim, e, sim.step); sim.step++; }
      for (const b of sim.bodies) {
        if (sim.step <= b.born || b.dead) continue;
        if (e.p.disc) {
          g.fillStyle = e.col(b.i);
          g.beginPath(); g.arc(b.x, b.y, b.r, 0, PT.TAU); g.fill();
          g.fillStyle = e.S.bg;
          PT.G(g, e.ch(b.i), b.x, b.y, b.r * 1.7, b.a);
        } else {
          g.fillStyle = e.col(b.i);
          PT.G(g, e.ch(b.i), b.x, b.y, b.r * 2.1, b.a);
        }
      }
    },
  });
})();
