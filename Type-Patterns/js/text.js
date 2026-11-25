// Шрифты, метрики глифов и базовые функции рисования букв.
// Все буквы рисуются шрифтом 100px и масштабируются трансформацией.
(function () {
  const PT = window.PT, S = PT.S;
  const mc = document.createElement('canvas').getContext('2d');
  const cache = new Map();

  // Шрифты, загруженные из файла: имя → { buffer, axes, values, family, face }.
  PT.customFonts = {};
  PT.fontStr = (size) => {
    const cf = PT.customFonts[S.font];
    // У своих шрифтов жирность задаётся осью wght, а не синтетическим утолщением.
    return `${cf ? 400 : S.weight} ${size}px "${cf ? cf.family : S.font}", "Helvetica Neue", Arial, sans-serif`;
  };

  // Оси вариативного шрифта из таблицы fvar. null — формат не читается (woff/woff2).
  PT.parseAxes = function (buf) {
    try {
      const d = new DataView(buf);
      const tag = (o) => String.fromCharCode(d.getUint8(o), d.getUint8(o + 1), d.getUint8(o + 2), d.getUint8(o + 3));
      let base = 0;
      if (tag(0) === 'ttcf') base = d.getUint32(12);
      if (tag(base) === 'wOFF' || tag(base) === 'wOF2') return null;
      const n = d.getUint16(base + 4), axes = [];
      for (let i = 0; i < n; i++) {
        const r = base + 12 + i * 16;
        if (tag(r) !== 'fvar') continue;
        const off = d.getUint32(r + 8), ao = d.getUint16(off + 4), ac = d.getUint16(off + 8), as = d.getUint16(off + 10);
        for (let a = 0; a < ac; a++) {
          const p = off + ao + a * as;
          const ax = { tag: tag(p), min: d.getInt32(p + 4) / 65536, def: d.getInt32(p + 8) / 65536, max: d.getInt32(p + 12) / 65536 };
          if (ax.max > ax.min && /^[\x20-\x7e]{4}$/.test(ax.tag)) axes.push(ax);
        }
      }
      return axes;
    } catch (e) { return []; }
  };

  // Canvas не умеет font-variation-settings, поэтому на каждое положение осей
  // регистрируется новое начертание с этими значениями и подменяет прежнее.
  let vCount = 0;
  async function build(cf) {
    if (cf.busy) { cf.dirty = true; return; }
    cf.busy = true;
    try {
      do {
        cf.dirty = false;
        const fam = cf.name + '__v' + ++vCount;
        const desc = cf.axes.length ? { variationSettings: cf.axes.map((a) => `"${a.tag}" ${cf.values[a.tag]}`).join(', ') } : {};
        const face = new FontFace(fam, cf.buffer, desc);
        await face.load();
        document.fonts.add(face);
        if (cf.face) document.fonts.delete(cf.face);
        cf.face = face; cf.family = fam;
        PT.fontRev++;
        cache.clear();
      } while (cf.dirty);
    } finally { cf.busy = false; }
  }
  PT.addFont = async function (name, buffer) {
    name = name.replace(/["\\]/g, '');
    const axes = PT.parseAxes(buffer);
    const cf = { name, buffer, axes: axes || [], unreadable: axes === null, values: {} };
    for (const a of cf.axes) cf.values[a.tag] = a.def;
    await build(cf);
    PT.customFonts[name] = cf;
    return cf;
  };
  PT.setAxis = (cf, tag, v) => { cf.values[tag] = v; return build(cf); };

  // Метрики глифа при кегле 100 и выравнивании по центру.
  PT.m = function (ch) {
    const key = S.font + '|' + S.weight + '|' + PT.fontRev + '|' + ch;
    let v = cache.get(key);
    if (!v) {
      mc.font = PT.fontStr(100);
      mc.textAlign = 'center';
      const m = mc.measureText(ch);
      v = { w: m.width, l: m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight, a: m.actualBoundingBoxAscent, d: m.actualBoundingBoxDescent };
      if (cache.size > 5000) cache.clear();
      cache.set(key, v);
    }
    return v;
  };

  // Заливка или контур в локальных координатах; k — примерный масштаб локальных единиц.
  PT.put = function (g, ch, x, y, k) {
    if (S.outline && !PT.noOutline) {
      g.lineWidth = S.strokeW / Math.max(k, 1e-3);
      g.strokeStyle = g.fillStyle;
      g.strokeText(ch, x, y);
    } else g.fillText(ch, x, y);
  };

  // Буква по центру (x, y), кегль size, поворот rot, доп. масштаб sx/sy.
  PT.G = function (g, ch, x, y, size, rot, sx, sy) {
    if (ch === ' ' || !(size > 0.3)) return;
    const k = size / 100;
    g.save();
    g.translate(x, y);
    if (rot) g.rotate(rot);
    g.scale(k * (sx === undefined ? 1 : sx), k * (sy === undefined ? 1 : sy));
    PT.put(g, ch, 0, PT.capOff, k);
    g.restore();
  };

  // Буква, растянутая точно в прямоугольник w×h с центром (cx, cy).
  PT.fit = function (g, ch, cx, cy, w, h, vm) {
    const m = PT.m(ch), bw = m.l + m.r, bh = vm.A + vm.D;
    if (bw < 1 || bh < 1 || w <= 0 || h <= 0) return;
    g.save();
    g.translate(cx, cy);
    g.scale(w / bw, h / bh);
    PT.put(g, ch, (m.l - m.r) / 2, (vm.A - vm.D) / 2, Math.sqrt((w / bw) * (h / bh)));
    g.restore();
  };

  PT.addFontFile = async function (file) {
    return PT.addFont(file.name.replace(/\.[^.]+$/, ''), await file.arrayBuffer());
  };
})();
