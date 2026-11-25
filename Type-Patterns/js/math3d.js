// Простая 3D-математика: повороты и буква на плоскости в перспективе.
(function () {
  const PT = window.PT;
  PT.rotX = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; };
  PT.rotY = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; };
  PT.rotZ = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; };

  // Буква в 3D: C — центр, U и V — векторы «вправо» и «вниз» длиной в один кегль.
  // Камера в точке z = -f смотрит вдоль +z. Плоскость буквы приближается аффинной матрицей.
  PT.G3 = function (g, ch, C, U, V, f, cx, cy) {
    if (ch === ' ') return;
    const d = f + C[2];
    if (d < f * 0.12) return;
    const du = d + U[2] * 0.5, dv = d + V[2] * 0.5;
    if (du < 1 || dv < 1) return;
    const px = cx + (C[0] * f) / d, py = cy + (C[1] * f) / d;
    const ux = (cx + ((C[0] + U[0] * 0.5) * f) / du - px) / 50, uy = (cy + ((C[1] + U[1] * 0.5) * f) / du - py) / 50;
    const vx = (cx + ((C[0] + V[0] * 0.5) * f) / dv - px) / 50, vy = (cy + ((C[1] + V[1] * 0.5) * f) / dv - py) / 50;
    const det = Math.abs(ux * vy - uy * vx);
    if (det < 1e-7) return;
    g.save();
    g.transform(ux, uy, vx, vy, px, py);
    PT.put(g, ch, 0, PT.capOff, Math.sqrt(det));
    g.restore();
  };
})();
