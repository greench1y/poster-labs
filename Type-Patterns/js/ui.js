// Панель настроек, цикл предпросмотра, сохранение состояния.
(function () {
  const PT = window.PT, S = PT.S, $ = (s) => document.querySelector(s);
  const FONTS = ['Helvetica Neue', 'Arial', 'Arial Black', 'Impact', 'Futura', 'Avenir Next', 'Gill Sans', 'Optima', 'Didot', 'Bodoni 72', 'Baskerville', 'Georgia', 'Times New Roman', 'Rockwell', 'American Typewriter', 'Courier New', 'Menlo'];
  const FORMATS = [['1080x1350', '4:5 — 1080×1350'], ['1080x1440', '3:4 — 1080×1440'], ['1080x1528', 'A-формат — 1080×1528'], ['1080x1080', '1:1 — 1080×1080'], ['1080x1920', '9:16 — 1080×1920'], ['1920x1080', '16:9 — 1920×1080'], ['custom', 'Свой размер']];
  const PALS = [
    ['#111111', '#f2efe6', '#ff4d2e', '#3b6cff'], ['#f2efe6', '#111111', '#ff4d2e', '#1f4fff'],
    ['#ff4d2e', '#111111', '#f2efe6', '#ffd400'], ['#1f3cff', '#ffffff', '#ffd400', '#ff7ad9'],
    ['#ffd400', '#111111', '#ff3b30', '#1f3cff'], ['#0b3d2e', '#e9ffd0', '#ff8a5b', '#ffd166'],
    ['#f5c6d6', '#b3122e', '#111111', '#ffffff'], ['#000000', '#00ff88', '#ffffff', '#ff00aa'],
  ];

  // --- состояние между запусками ---
  let saved = null;
  try {
    const sv = JSON.parse(localStorage.getItem('pt-state') || 'null');
    if (sv && typeof sv === 'object') {
      saved = sv.params; delete sv.params;
      for (const k of Object.keys(S)) if (k !== 'params' && typeof sv[k] === typeof S[k]) S[k] = sv[k];
    }
  } catch (e) {}
  PT.initParams(saved);
  let saveT = 0;
  const save = () => {
    clearTimeout(saveT);
    saveT = setTimeout(() => { try { localStorage.setItem('pt-state', JSON.stringify(S)); } catch (e) {} }, 300);
  };

  // --- паттерны и их параметры ---
  function buildPatterns() {
    const box = $('#patterns');
    box.innerHTML = '';
    for (const p of PT.patterns) {
      const b = document.createElement('button');
      b.textContent = p.name;
      b.className = p.id === S.pattern ? 'on' : '';
      b.onclick = () => { S.pattern = p.id; buildPatterns(); buildParams(); save(); };
      box.append(b);
    }
  }
  const fmt = (v, q) => (q.type === 'int' ? String(v) : (+v).toFixed((q.step || 1) < 0.1 ? 2 : (q.step || 1) < 1 ? 1 : 0));
  function buildParams() {
    const box = $('#params'), pat = PT.byId[S.pattern], vals = S.params[S.pattern];
    $('#paramsTitle').textContent = 'Параметры — ' + pat.name;
    box.innerHTML = '';
    for (const q of pat.params) {
      const row = document.createElement('label');
      row.className = 'row';
      const name = document.createElement('span');
      name.textContent = q.label;
      row.append(name);
      if (q.type === 'select') {
        const s = document.createElement('select');
        for (const [v, l] of q.options) s.add(new Option(l, v));
        s.value = vals[q.key];
        s.oninput = () => { vals[q.key] = s.value; save(); };
        row.append(s, document.createElement('i'));
      } else if (q.type === 'bool') {
        const c = document.createElement('input');
        c.type = 'checkbox'; c.checked = vals[q.key];
        c.oninput = () => { vals[q.key] = c.checked; save(); };
        row.append(c, document.createElement('i'));
      } else {
        const r = document.createElement('input'), out = document.createElement('output');
        r.type = 'range'; r.min = q.min; r.max = q.max; r.step = q.type === 'int' ? 1 : q.step || 0.01; r.value = vals[q.key];
        out.textContent = fmt(vals[q.key], q);
        r.oninput = () => { vals[q.key] = +r.value; out.textContent = fmt(r.value, q); save(); };
        row.append(r, out);
      }
      box.append(row);
    }
  }
  $('#btnRand').onclick = () => {
    const vals = S.params[S.pattern];
    for (const q of PT.byId[S.pattern].params) {
      if (q.type === 'select') vals[q.key] = q.options[Math.floor(Math.random() * q.options.length)][0];
      else if (q.type === 'bool') vals[q.key] = Math.random() < 0.5;
      else if (q.type === 'int') vals[q.key] = q.min + Math.floor(Math.random() * (q.max - q.min + 1));
      else vals[q.key] = q.min + Math.random() * (q.max - q.min);
    }
    buildParams(); save();
  };
  $('#btnReset').onclick = () => { S.params[S.pattern] = PT.defaults(S.pattern); buildParams(); save(); };

  // --- текст и шрифт ---
  const bind = (sel, key, conv, after) => {
    const el = $(sel), isChk = el.type === 'checkbox';
    if (isChk) el.checked = S[key]; else el.value = S[key];
    el.addEventListener('input', () => { S[key] = isChk ? el.checked : conv ? conv(el.value) : el.value; after && after(); save(); });
    return el;
  };
  bind('#text', 'text');
  bind('#upper', 'upper');
  function buildFonts(list) {
    const sel = $('#font');
    sel.innerHTML = '';
    if (!list.includes(S.font)) list = [S.font, ...list];
    for (const f of list) sel.add(new Option(f, f));
    sel.value = S.font;
  }
  let fontList = FONTS.slice();
  buildFonts(fontList);
  bind('#weight', 'weight', Number);

  // Слайдеры осей вариативного шрифта.
  const AXIS = { wght: 'Жирность', wdth: 'Ширина', slnt: 'Наклон', ital: 'Курсив', opsz: 'Оптический размер', GRAD: 'Градация' };
  function buildAxes() {
    const box = $('#axes'), cf = PT.customFonts[S.font];
    box.innerHTML = '';
    $('#weight').disabled = !!cf;
    if (!cf || !cf.axes.length) return;
    for (const a of cf.axes) {
      const row = document.createElement('label'), name = document.createElement('span'), r = document.createElement('input'), out = document.createElement('output');
      row.className = 'row';
      name.textContent = (AXIS[a.tag] || a.tag) + (AXIS[a.tag] ? ' · ' + a.tag : '');
      const step = a.max - a.min >= 50 ? 1 : 0.01, show = (v) => (out.textContent = step === 1 ? Math.round(v) : (+v).toFixed(2));
      r.type = 'range'; r.min = a.min; r.max = a.max; r.step = step; r.value = cf.values[a.tag];
      show(cf.values[a.tag]);
      r.oninput = () => { show(r.value); PT.setAxis(cf, a.tag, +r.value); };
      r.ondblclick = () => { r.value = a.def; r.oninput(); };
      r.title = 'Двойной клик — значение по умолчанию';
      row.append(name, r, out);
      box.append(row);
    }
  }
  const axesNote = (cf) => (cf.axes.length ? ' — осей: ' + cf.axes.length : cf.unreadable ? ' — оси читаются только из .ttf и .otf' : ' — не вариативный');

  // Системные шрифты, к файлам которых дан доступ: семейство → данные начертания.
  let localData = {};
  $('#font').oninput = async () => {
    S.font = $('#font').value; save();
    const fd = localData[S.font];
    if (fd && !PT.customFonts[S.font]) {
      try {
        const buf = await (await fd.blob()).arrayBuffer(), ax = PT.parseAxes(buf);
        if (ax && ax.length && $('#font').value === fd.family) await PT.addFont(fd.family, buf);
      } catch (e) {}
    }
    buildAxes();
  };
  $('#btnFont').onclick = () => $('#fontFile').click();
  $('#fontFile').onchange = async (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    try {
      const cf = await PT.addFontFile(f);
      S.font = cf.name;
      fontList = [S.font, ...fontList.filter((x) => x !== S.font)];
      buildFonts(fontList);
      buildAxes();
      status('Шрифт загружен: ' + S.font + axesNote(cf));
    } catch (e) { status('Не удалось прочитать файл шрифта'); }
    ev.target.value = '';
  };
  if (window.queryLocalFonts) {
    $('#btnLocal').hidden = false;
    $('#btnLocal').onclick = async () => {
      try {
        const all = await window.queryLocalFonts();
        localData = {};
        for (const f of all) if (!localData[f.family] || f.style === 'Regular') localData[f.family] = f;
        const fams = Object.keys(localData).sort();
        if (fams.length) { fontList = [...Object.keys(PT.customFonts), ...fams.filter((f) => !PT.customFonts[f])]; buildFonts(fontList); status('Шрифтов в системе: ' + fams.length + '. У вариативных появятся слайдеры осей.'); }
      } catch (e) { status('Нет доступа к шрифтам системы'); }
    };
  }
  buildAxes();

  // --- формат и цвет ---
  const fsel = $('#format');
  for (const [v, l] of FORMATS) fsel.add(new Option(l, v));
  const syncFormat = () => {
    const v = S.W + 'x' + S.H, known = FORMATS.some((f) => f[0] === v);
    if (fsel.value !== 'custom' || known) fsel.value = known ? v : 'custom';
    $('#customSize').hidden = fsel.value !== 'custom';
    $('#cw').value = S.W; $('#chh').value = S.H;
  };
  syncFormat();
  fsel.oninput = () => {
    if (fsel.value !== 'custom') { const [w, h] = fsel.value.split('x').map(Number); S.W = w; S.H = h; }
    $('#customSize').hidden = fsel.value !== 'custom';
    $('#cw').value = S.W; $('#chh').value = S.H;
    save();
  };
  const custom = () => {
    S.W = PT.clamp(Math.round(+$('#cw').value / 2) * 2 || 1080, 200, 8000);
    S.H = PT.clamp(Math.round(+$('#chh').value / 2) * 2 || 1350, 200, 8000);
    save();
  };
  $('#cw').onchange = custom; $('#chh').onchange = custom;

  const colorEls = [['#bg', () => S.bg, (v) => (S.bg = v)], ...[0, 1, 2].map((i) => ['#c' + i, () => S.colors[i], (v) => (S.colors[i] = v)])];
  const syncColors = () => colorEls.forEach(([s, get]) => ($(s).value = get()));
  colorEls.forEach(([s, , set]) => ($(s).oninput = () => { set($(s).value); save(); }));
  syncColors();
  for (const pal of PALS) {
    const b = document.createElement('button');
    b.title = 'Палитра';
    b.innerHTML = pal.map((c) => `<i style="background:${c}"></i>`).join('');
    b.onclick = () => { S.bg = pal[0]; S.colors = pal.slice(1); syncColors(); save(); };
    $('#palettes').append(b);
  }
  bind('#colorMode', 'colorMode');
  bind('#outline', 'outline');
  bind('#strokeW', 'strokeW', Number, () => ($('#strokeWOut').textContent = S.strokeW));
  $('#strokeWOut').textContent = S.strokeW;

  // --- анимация ---
  const playBtn = $('#play'), scrub = $('#scrub');
  const syncPlay = () => (playBtn.textContent = S.playing ? 'Пауза' : 'Играть');
  playBtn.onclick = () => { S.playing = !S.playing; syncPlay(); save(); };
  syncPlay();
  scrub.oninput = () => { PT.t = scrub.value / 1000; };
  bind('#loop', 'loop', Number, () => ($('#loopOut').textContent = S.loop));
  $('#loopOut').textContent = S.loop;
  const seedEl = bind('#seed', 'seed', (v) => PT.clamp(Math.round(+v) || 1, 1, 99999));
  $('#dice').onclick = () => { S.seed = 1 + Math.floor(Math.random() * 9999); seedEl.value = S.seed; save(); };
  document.addEventListener('keydown', (ev) => {
    if (ev.code === 'Space' && !/TEXTAREA|INPUT|SELECT|BUTTON/.test(document.activeElement.tagName)) { ev.preventDefault(); playBtn.click(); }
  });

  // --- экспорт ---
  const status = (s) => ($('#status').textContent = s);
  $('#btnPng').onclick = async () => { status('Готовлю PNG…'); status('PNG сохранён: ' + (await PT.exportPNG(+$('#pngScale').value))); };
  $('#btnVid').onclick = async () => {
    const btn = $('#btnVid'), prog = $('#prog');
    btn.disabled = true; prog.hidden = false; prog.value = 0;
    status('Рендер видео…');
    try {
      const info = await PT.exportVideo({ fps: +$('#fps').value, k: +$('#vidScale').value, loops: +$('#loops').value }, (v) => (prog.value = v));
      status('Видео сохранено: ' + info);
    } catch (e) { console.error(e); status('Ошибка экспорта: ' + (e.message || e)); }
    btn.disabled = false; prog.hidden = true;
  };

  buildPatterns();
  buildParams();

  // --- предпросмотр ---
  const cv = $('#cv'), g = cv.getContext('2d'), stage = $('#stage');
  function layout() {
    const k = Math.min((stage.clientWidth - 48) / S.W, (stage.clientHeight - 48) / S.H);
    const cw = Math.max(40, Math.floor(S.W * k)), ch = Math.max(40, Math.floor(S.H * k)), dpr = window.devicePixelRatio || 1;
    const pw = Math.round(cw * dpr), ph = Math.round(ch * dpr);
    if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; cv.style.width = cw + 'px'; cv.style.height = ch + 'px'; }
  }
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!PT.exporting) {
      if (S.playing) { PT.t = (PT.t + dt / S.loop) % 1; scrub.value = Math.round(PT.t * 1000); }
      layout();
      PT.render(g, PT.t, cv.width, cv.height);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  PT.frameNow = () => { layout(); PT.render(g, PT.t, cv.width, cv.height); };
})();
