// Ядро: состояние, реестр паттернов, случайность, шум, рендер кадра.
(function () {
  const PT = (window.PT = {
    patterns: [], byId: {}, TAU: Math.PI * 2,
    t: 0, store: {}, fontRev: 0, exporting: false, capOff: 36, noOutline: false,
  });

  PT.register = (p) => { PT.patterns.push(p); PT.byId[p.id] = p; };

  PT.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  PT.lerp = (a, b, t) => a + (b - a) * t;
  PT.smooth = (t) => { t = PT.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  PT.mod = (a, n) => ((a % n) + n) % n;

  PT.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  PT.hash = (x, y, s) => {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  PT.noise2 = (x, y, s) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = PT.hash(xi, yi, s), b = PT.hash(xi + 1, yi, s), c = PT.hash(xi, yi + 1, s), d = PT.hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  PT.mix = (h1, h2, t) => {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const a = p(h1), b = p(h2);
    return 'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';
  };

  const S = (PT.S = {
    text: 'ТИПОГРАФИКА', upper: true,
    font: 'Helvetica Neue', weight: 700,
    W: 1080, H: 1350,
    bg: '#111111', colors: ['#f2efe6', '#ff4d2e', '#3b6cff'], colorMode: 'mono',
    outline: false, strokeW: 3,
    loop: 8, seed: 1, playing: true,
    pattern: 'mandala', params: {},
  });

  PT.defaults = (id) => {
    const o = {};
    for (const q of PT.byId[id].params) o[q.key] = q.def;
    return o;
  };
  PT.initParams = (saved) => {
    for (const p of PT.patterns) {
      const d = PT.defaults(p.id), sv = (saved && saved[p.id]) || {};
      for (const q of p.params) if (typeof sv[q.key] === typeof q.def) d[q.key] = sv[q.key];
      S.params[p.id] = d;
    }
    if (!PT.byId[S.pattern]) S.pattern = PT.patterns[0].id;
  };

  PT.makeEnv = function (t) {
    let txt = S.text || '';
    if (S.upper) txt = txt.toUpperCase();
    if (!txt.trim()) txt = 'A';
    const chars = Array.from(txt.replace(/\s+/g, ''));
    const seq = Array.from(txt.replace(/\s+/g, ' ').trim() + ' ');
    const n = chars.length, ns = seq.length;
    let A = 1, D = 0;
    for (const c of chars) { const m = PT.m(c); if (m.a > A) A = m.a; if (m.d > D) D = m.d; }
    const cs = S.colors;
    const pick = (i, len) => {
      switch (S.colorMode) {
        case 'first': return PT.mod(i, len) === 0 ? cs[1] : cs[0];
        case 'cycle': return cs[PT.mod(i, 3)];
        case 'random': return cs[Math.floor(PT.hash(i, 7, S.seed) * 3)];
        default: return cs[0];
      }
    };
    return {
      W: S.W, H: S.H, min: Math.min(S.W, S.H), t, S,
      p: S.params[S.pattern], store: PT.store,
      chars, n, seq, ns,
      lines: txt.split('\n').map((s) => s.trim()).filter(Boolean),
      words: txt.trim().split(/\s+/),
      vm: { A, D },
      ch: (i) => chars[PT.mod(i, n)],
      sq: (i) => seq[PT.mod(i, ns)],
      col: (i) => pick(i, n),
      colq: (i) => pick(i, ns),
      rnd: (k) => PT.rng(S.seed * 7919 + (k || 0) * 104729 + 13),
    };
  };

  // Рисует кадр фазы t (0..1) на контексте g размером pw×ph пикселей.
  PT.render = function (g, t, pw, ph) {
    const pat = PT.byId[S.pattern];
    const key = JSON.stringify([S.pattern, S.params[S.pattern], S.text, S.upper, S.font, S.weight, S.W, S.H, S.seed, PT.fontRev]);
    if (key !== PT._key) { PT._key = key; PT.store = {}; PT._err = false; }
    g.save();
    g.setTransform(pw / S.W, 0, 0, ph / S.H, 0, 0);
    g.globalAlpha = 1;
    g.fillStyle = S.bg;
    g.fillRect(0, 0, S.W, S.H);
    g.beginPath(); g.rect(0, 0, S.W, S.H); g.clip();
    g.font = PT.fontStr(100);
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.lineJoin = 'round';
    const e = PT.makeEnv(t);
    PT.capOff = e.vm.A / 2;
    try { pat.draw(g, e); } catch (err) { if (!PT._err) console.error(err); PT._err = true; }
    g.restore();
  };
})();
