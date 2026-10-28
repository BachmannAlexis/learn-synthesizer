/*
 * "Before & after": the signal entering a pedal (grey) against the signal leaving it (orange):
 * waveform, spectrum, and what changed per frequency band (after − before, in dB).
 */
const GPCompare = (() => {
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const N = 4096;
  const tA = new Float32Array(N), tB = new Float32Array(N);
  let fA = null, fB = null, smooth = null, smoothKey = '';

  // 1/6-octave bands from 40 Hz to 16 kHz.
  const BANDS = [];
  for (let f = 40; f < 16000; f *= Math.pow(2, 1 / 6)) BANDS.push([f, f * Math.pow(2, 1 / 6)]);

  function onScreen(c) { const r = c.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight; }
  function setup(canvas) {
    const dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    return { g, w, h };
  }
  function grid(g, w, h, xs, ys) {
    g.strokeStyle = css('--grid'); g.lineWidth = 1; g.beginPath();
    xs.forEach((x) => { g.moveTo(Math.round(x) + 0.5, 0); g.lineTo(Math.round(x) + 0.5, h); });
    ys.forEach((y) => { g.moveTo(0, Math.round(y) + 0.5); g.lineTo(w, Math.round(y) + 0.5); });
    g.stroke();
  }
  function label(g, s, x, y, align = 'left') { g.fillStyle = css('--muted'); g.font = '10px ui-monospace, Menlo, monospace'; g.textAlign = align; g.fillText(s, x, y); }
  const rmsDb = (b) => { let s = 0; for (let i = 0; i < b.length; i++) s += b[i] * b[i]; return 10 * Math.log10(s / b.length + 1e-12); };

  // Both waveforms on the same scale, triggered on the "before" signal so they stand still.
  function wave(canvas, idle) {
    const { g, w, h } = setup(canvas);
    grid(g, w, h, [w / 4, w / 2, 3 * w / 4], [h / 2]);
    if (idle) return idleText(g, w, h);
    let start = 0;
    for (let i = 1; i < N / 2; i++) if (tA[i - 1] < 0 && tA[i] >= 0) { start = i; break; }
    const span = 2048;
    let peak = 0.02;
    for (let i = 0; i < span; i++) peak = Math.max(peak, Math.abs(tA[start + i]), Math.abs(tB[start + i]));
    const sc = (h / 2 - 6) / peak;
    const draw = (buf, color, width) => {
      g.beginPath();
      for (let i = 0; i < span; i += 2) { const x = (i / (span - 1)) * w, y = h / 2 - buf[start + i] * sc; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.strokeStyle = color; g.lineWidth = width; g.stroke();
    };
    draw(tA, css('--muted'), 1.5);
    draw(tB, css('--accent'), 2);
  }

  const fmin = 30, fmax = 16000;
  const fx = (f, w) => (Math.log(f / fmin) / Math.log(fmax / fmin)) * w;
  function spectrum(canvas, sr, idle) {
    const { g, w, h } = setup(canvas), dbMin = -100, dbMax = -10;
    const Y = (d) => h - ((Math.max(dbMin, d) - dbMin) / (dbMax - dbMin)) * h;
    grid(g, w, h, [100, 1000, 10000].map((f) => fx(f, w)), [-80, -60, -40, -20].map(Y));
    [100, 1000, 10000].forEach((f) => label(g, f >= 1000 ? f / 1000 + 'k' : String(f), fx(f, w) + 3, h - 4));
    if (idle) return idleText(g, w, h);
    const bin = sr / (2 * fA.length);
    const path = (arr) => {
      g.beginPath(); let lastX = -1, first = true;
      for (let i = 1; i < arr.length; i++) {
        const f = i * bin; if (f < fmin) continue; if (f > fmax) break;
        const x = fx(f, w); if (x - lastX < 1) continue; lastX = x;
        first ? g.moveTo(x, Y(arr[i])) : g.lineTo(x, Y(arr[i])); first = false;
      }
    };
    path(fA); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fillStyle = 'rgba(166, 154, 134, 0.22)'; g.fill();
    path(fA); g.strokeStyle = css('--muted'); g.lineWidth = 1.2; g.stroke();
    path(fB); g.strokeStyle = css('--accent'); g.lineWidth = 1.8; g.stroke();
  }

  // After − before per band, smoothed over time so it reads steadily.
  function change(canvas, sr, idle, key) {
    const { g, w, h } = setup(canvas), range = 24;
    const Y = (d) => h / 2 - (Math.max(-range, Math.min(range, d)) / range) * (h / 2 - 8);
    grid(g, w, h, [100, 1000, 10000].map((f) => fx(f, w)), [Y(12), Y(0), Y(-12)]);
    [100, 1000, 10000].forEach((f) => label(g, f >= 1000 ? f / 1000 + 'k' : String(f), fx(f, w) + 3, h - 4));
    label(g, '+24 dB', 3, 11); label(g, '0', 3, Y(0) - 3); label(g, '−24 dB', 3, h - 16);
    if (key !== smoothKey || !smooth) { smooth = new Float32Array(BANDS.length).fill(NaN); smoothKey = key; }
    if (idle) return;
    const bin = sr / (2 * fA.length);
    const bandDb = (arr, lo, hi) => {
      let s = 0, n = 0;
      for (let i = Math.max(1, Math.floor(lo / bin)); i <= Math.min(arr.length - 1, Math.ceil(hi / bin)); i++) { s += Math.pow(10, arr[i] / 10); n++; }
      return 10 * Math.log10(s / Math.max(1, n) + 1e-14);
    };
    const bw = w / BANDS.length;
    BANDS.forEach(([lo, hi], i) => {
      const a = bandDb(fA, lo, hi), b = bandDb(fB, lo, hi);
      if (a < -95 && b < -95) return; // nothing to compare here
      const d = Math.max(-range - 6, Math.min(range + 6, b - a));
      smooth[i] = Number.isNaN(smooth[i]) ? d : smooth[i] + 0.15 * (d - smooth[i]);
      const x = fx(Math.sqrt(lo * hi), w) - bw / 2, y0 = Y(0), y1 = Y(smooth[i]);
      g.fillStyle = smooth[i] >= 0 ? css('--accent') : css('--trace');
      g.fillRect(x + 1, Math.min(y0, y1), Math.max(1, bw - 2), Math.max(1, Math.abs(y1 - y0)));
    });
  }

  function idleText(g, w, h) {
    g.fillStyle = css('--muted'); g.font = '13px system-ui, sans-serif'; g.textAlign = 'center';
    g.fillText(I18N.t('gpCompareIdle'), w / 2, h / 2 + 4);
  }

  // Returns { before, after } levels in dB (or null when there is nothing to compare).
  function draw(canvases, A, B, sr, key) {
    if (!A || !B) {
      [['wave', wave], ['spec', (c, s, i) => spectrum(c, 48000, i)], ['diff', (c, s, i) => change(c, 48000, i, key)]].forEach(([k, f]) => onScreen(canvases[k]) && f(canvases[k], 48000, true));
      return null;
    }
    if (!fA || fA.length !== A.frequencyBinCount) { fA = new Float32Array(A.frequencyBinCount); fB = new Float32Array(B.frequencyBinCount); }
    A.getFloatTimeDomainData(tA); B.getFloatTimeDomainData(tB);
    A.getFloatFrequencyData(fA); B.getFloatFrequencyData(fB);
    const before = rmsDb(tA), after = rmsDb(tB);
    const idle = before < -70 && after < -70;
    if (onScreen(canvases.wave)) wave(canvases.wave, idle);
    if (onScreen(canvases.spec)) spectrum(canvases.spec, sr, idle);
    if (onScreen(canvases.diff)) change(canvases.diff, sr, idle, key);
    return idle ? null : { before, after };
  }

  return { draw };
})();
