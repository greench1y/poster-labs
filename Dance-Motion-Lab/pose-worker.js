// Pose + segmentation worker for Dance Motion Lab (classic worker).
// MediaPipe's wasm loader uses importScripts(), which module workers don't allow,
// so the CJS bundle is loaded here by evaluating it with a local `module` object.
const VER = '0.10.14';
const BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}`;
const MODEL_URL = v => `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_${v}/float16/latest/pose_landmarker_${v}.task`;

let vision = null, fileset = null, lm = null, lastTs = 0;

async function loadVision(){
  if (vision) return vision;
  const code = await (await fetch(`${BASE}/vision_bundle.cjs`)).text();
  const module = { exports: {} };
  new Function('module', 'exports', code)(module, module.exports);
  vision = module.exports;
  fileset = await vision.FilesetResolver.forVisionTasks(`${BASE}/wasm`);
  return vision;
}

self.onmessage = async (e) => {
  const m = e.data;
  if (m.type === 'init') {
    try {
      await loadVision();
      if (lm) { lm.close(); lm = null; }
      lm = await vision.PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL(m.model || 'lite'), delegate: 'CPU' },
        runningMode: 'VIDEO', numPoses: 1, outputSegmentationMasks: true,
        minPoseDetectionConfidence: .4, minPosePresenceConfidence: .4, minTrackingConfidence: .4,
      });
      lastTs = 0;
      self.postMessage({ type: 'ready', model: m.model });
    } catch (err) {
      self.postMessage({ type: 'error', msg: String(err && err.message || err) });
    }
    return;
  }
  if (m.type === 'frame') {
    const { bitmap, id } = m;
    if (!lm) { bitmap.close(); self.postMessage({ type: 'result', id, lm: null }); return; }
    const ts = Math.max(Math.round(m.ts), lastTs + 1); lastTs = ts;
    const t0 = performance.now();
    let out = { type: 'result', id, lm: null, mask: null, mw: 0, mh: 0 };
    const transfer = [];
    try {
      const r = lm.detectForVideo(bitmap, ts);
      if (r.landmarks && r.landmarks[0]) {
        const a = new Float32Array(33 * 3);
        r.landmarks[0].forEach((p, i) => { a[i*3] = p.x; a[i*3+1] = p.y; a[i*3+2] = p.visibility ?? 1; });
        out.lm = a; transfer.push(a.buffer);
      }
      const mk = r.segmentationMasks && r.segmentationMasks[0];
      if (mk && out.lm) {
        // white RGBA mask with soft alpha, ready for new ImageData() on the main thread
        const f = mk.getAsFloat32Array(), mw = mk.width, mh = mk.height, n = f.length;
        const u = new Uint8ClampedArray(n * 4).fill(255);
        for (let i = 0; i < n; i++) { const v = f[i]; u[i*4+3] = v <= .3 ? 0 : v >= .7 ? 255 : (v - .3) * 637.5; }
        // coarse float grid for d3.contours
        const gw = 160, gh = Math.max(2, Math.round(mh * gw / mw)), g = new Float32Array(gw * gh);
        for (let y = 0; y < gh; y++) { const sy = Math.min(mh - 1, Math.floor((y + .5) * mh / gh)) * mw;
          for (let x = 0; x < gw; x++) g[y*gw + x] = f[sy + Math.min(mw - 1, Math.floor((x + .5) * mw / gw))]; }
        Object.assign(out, { mask: u, mw, mh, grid: g, gw, gh });
        transfer.push(u.buffer, g.buffer);
      }
      if (r.segmentationMasks) for (const x of r.segmentationMasks) x.close();
    } catch (err) {
      out.error = String(err && err.message || err);
    } finally {
      bitmap.close();
    }
    out.ms = performance.now() - t0;
    self.postMessage(out, transfer);
  }
};
