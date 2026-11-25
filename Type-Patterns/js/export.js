// Экспорт: PNG в увеличенном разрешении и покадровое видео одного цикла.
(function () {
  const PT = window.PT, S = PT.S;

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const base = () => `poster-${S.pattern}-`;

  PT.exportPNG = function (k) {
    k = Math.min(k, 8192 / Math.max(S.W, S.H));
    const c = document.createElement('canvas');
    c.width = Math.round(S.W * k); c.height = Math.round(S.H * k);
    PT.render(c.getContext('2d'), PT.t, c.width, c.height);
    return new Promise((res) => c.toBlob((b) => { download(b, `${base()}${c.width}x${c.height}.png`); res(`${c.width}×${c.height}`); }, 'image/png'));
  };

  PT.exportVideo = async function (opt, onProg) {
    const { fps, k, loops } = opt;
    const w = Math.round((S.W * k) / 2) * 2, h = Math.round((S.H * k) / 2) * 2;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const perLoop = Math.round(S.loop * fps), total = perLoop * loops;
    PT.exporting = true;
    try {
      if (window.VideoEncoder && window.Mp4Muxer) {
        const mbs = Math.ceil(w / 16) * Math.ceil(h / 16);
        const cfg = {
          codec: mbs > 8192 ? 'avc1.640033' : 'avc1.640028', width: w, height: h,
          bitrate: Math.min(60e6, Math.round(w * h * fps * 0.2)), framerate: fps,
        };
        if ((await VideoEncoder.isConfigSupported(cfg)).supported) {
          const muxer = new Mp4Muxer.Muxer({ target: new Mp4Muxer.ArrayBufferTarget(), video: { codec: 'avc', width: w, height: h }, fastStart: 'in-memory' });
          let err = null;
          const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { err = e; } });
          enc.configure(cfg);
          for (let i = 0; i < total; i++) {
            if (err) throw err;
            PT.render(g, (i % perLoop) / perLoop, w, h);
            const fr = new VideoFrame(c, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
            enc.encode(fr, { keyFrame: i % (fps * 2) === 0 });
            fr.close();
            while (enc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 4));
            if (i % 4 === 0) { onProg && onProg((i + 1) / total); await new Promise((r) => setTimeout(r, 0)); }
          }
          await enc.flush();
          if (err) throw err;
          enc.close();
          muxer.finalize();
          download(new Blob([muxer.target.buffer], { type: 'video/mp4' }), `${base()}${w}x${h}-${fps}fps.mp4`);
          return `MP4 ${w}×${h}, ${fps} fps, ${(total / fps).toFixed(1)} с`;
        }
      }
      // Запасной путь: запись в реальном времени в WebM.
      const stream = c.captureStream(fps), chunks = [];
      const rec = new MediaRecorder(stream, { mimeType: 'video/webm', videoBitsPerSecond: 12e6 });
      rec.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
      const done = new Promise((r) => (rec.onstop = r));
      PT.render(g, 0, w, h);
      rec.start();
      const dur = S.loop * loops * 1000, t0 = performance.now();
      await new Promise((res) => {
        (function tick() {
          const el = performance.now() - t0;
          if (el >= dur) return res();
          PT.render(g, (el / 1000 / S.loop) % 1, w, h);
          onProg && onProg(el / dur);
          requestAnimationFrame(tick);
        })();
      });
      rec.stop();
      await done;
      download(new Blob(chunks, { type: 'video/webm' }), `${base()}${w}x${h}.webm`);
      return `WebM ${w}×${h} (запись в реальном времени)`;
    } finally {
      PT.exporting = false;
    }
  };
})();
