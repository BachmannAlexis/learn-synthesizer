/* Visualizations: oscilloscope, spectrum, filter response (analytic ladder model), contours. */
const Viz = (() => {
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function setup(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    return { g, w, h };
  }

  function grid(g, w, h, xs, ys) {
    g.strokeStyle = css('--grid');
    g.lineWidth = 1;
    g.beginPath();
    for (const x of xs) { g.moveTo(Math.round(x) + 0.5, 0); g.lineTo(Math.round(x) + 0.5, h); }
    for (const y of ys) { g.moveTo(0, Math.round(y) + 0.5); g.lineTo(w, Math.round(y) + 0.5); }
    g.stroke();
  }

  function label(g, text, x, y, align = 'left') {
    g.fillStyle = css('--muted');
    g.font = '10px ui-monospace, Menlo, monospace';
    g.textAlign = align;
    g.fillText(text, x, y);
  }

  const timeBuf = new Float32Array(4096);
  function scope(canvas, analyser) {
    const { g, w, h } = setup(canvas);
    grid(g, w, h, [w / 4, w / 2, 3 * w / 4], [h / 4, h / 2, 3 * h / 4]);
    if (!analyser) return;
    analyser.getFloatTimeDomainData(timeBuf);
    // Trigger on a rising zero crossing so the wave stands still.
    let start = 0;
    for (let i = 1; i < 2048; i++) if (timeBuf[i - 1] < 0 && timeBuf[i] >= 0) { start = i; break; }
    const span = 1024;
    let peak = 0.05;
    for (let i = 0; i < span; i++) peak = Math.max(peak, Math.abs(timeBuf[start + i]));
    const scale = (h / 2 - 6) / Math.max(peak, 0.25);
    g.strokeStyle = css('--trace');
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i < span; i++) {
      const x = (i / (span - 1)) * w, y = h / 2 - timeBuf[start + i] * scale;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  }

  const fmin = 20, fmax = 20000;
  const fx = (f, w) => (Math.log(f / fmin) / Math.log(fmax / fmin)) * w;
  const freqTicks = [100, 1000, 10000];

  let freqBuf = null;
  function spectrum(canvas, analyser, sampleRate) {
    const { g, w, h } = setup(canvas);
    const dbMin = -100, dbMax = -10;
    const dy = (db) => h - ((db - dbMin) / (dbMax - dbMin)) * h;
    grid(g, w, h, freqTicks.map((f) => fx(f, w)), [-80, -60, -40, -20].map(dy));
    freqTicks.forEach((f) => label(g, f >= 1000 ? f / 1000 + 'k' : f, fx(f, w) + 3, h - 4));
    if (!analyser) return;
    if (!freqBuf || freqBuf.length !== analyser.frequencyBinCount) freqBuf = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(freqBuf);
    const binHz = sampleRate / analyser.fftSize;
    g.fillStyle = css('--trace-fill');
    g.strokeStyle = css('--trace');
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(0, h);
    let lastX = -1;
    for (let i = 1; i < freqBuf.length; i++) {
      const f = i * binHz;
      if (f < fmin) continue;
      if (f > fmax) break;
      const x = fx(f, w);
      if (x - lastX < 0.5) continue;
      lastX = x;
      g.lineTo(x, dy(Math.max(dbMin, freqBuf[i])));
    }
    g.lineTo(w, h);
    g.closePath();
    g.fill();
    g.stroke();
  }

  // Analytic 4-pole ladder: H(s) = 1 / ((1 + s/wc)^4 + k)
  function ladderMag(f, fc, k) {
    const b = f / fc, a = 1 - b * b;
    const re = a * a - 4 * b * b + k, im = 4 * b * a;
    return 1 / Math.sqrt(re * re + im * im);
  }

  function filter(canvas, p, liveFc) {
    const { g, w, h } = setup(canvas);
    const dbMin = -60, dbMax = 24;
    const dy = (db) => h - ((db - dbMin) / (dbMax - dbMin)) * h;
    grid(g, w, h, freqTicks.map((f) => fx(f, w)), [-48, -24, 0].map(dy));
    freqTicks.forEach((f) => label(g, f >= 1000 ? f / 1000 + 'k' : f, fx(f, w) + 3, h - 4));
    label(g, '0 dB', w - 4, dy(0) - 3, 'right');
    label(g, '−24 dB/oct', w - 4, 12, 'right');
    const k = p.resonance * 4 * 0.98; // keep the ideal curve finite at full emphasis
    const comp = 1 + p.resonance * 4 * 0.35;
    const curve = (fc, color, width, fill) => {
      g.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const f = fmin * Math.pow(fmax / fmin, x / w);
        const db = 20 * Math.log10(ladderMag(f, fc, k) * comp);
        const y = Math.max(-2, Math.min(h + 2, dy(db)));
        x ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      if (fill) { g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fillStyle = fill; g.fill(); }
      g.strokeStyle = color; g.lineWidth = width; g.stroke();
    };
    curve(p.cutoff, css('--accent-dim'), 1.5, css('--accent-fill'));
    if (liveFc && Math.abs(Math.log(liveFc / p.cutoff)) > 0.01) curve(liveFc, css('--trace'), 2);
    const x = fx(p.cutoff, w);
    g.strokeStyle = css('--accent');
    g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke();
    g.setLineDash([]);
  }

  // Contours: drawn for a 1.2 s key-hold, plus the release.
  function envelopes(canvas, p, tele) {
    const { g, w, h } = setup(canvas);
    grid(g, w, h, [], [h * 0.1, h * 0.55]);
    const hold = 1.2;
    const total = Math.min(24, hold + Math.max(p.aR, p.fR) * 1.2 + 0.1);
    const shape = (A, D, S, R, color, yTop, yBot) => {
      const tAtk = A, tDecEnd = hold;
      const pts = [];
      const N = 240;
      let lvlAtRelease = 0;
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * total;
        let v;
        if (t < Math.min(tAtk, hold)) v = t / tAtk;
        else if (t < tDecEnd) {
          const vStart = Math.min(1, hold / tAtk);
          v = S + (vStart - S) * Math.exp(-4 * (t - Math.min(tAtk, hold)) / D);
          lvlAtRelease = v;
        } else {
          if (!lvlAtRelease) lvlAtRelease = Math.min(1, hold / tAtk);
          v = lvlAtRelease * Math.exp(-4 * (t - hold) / R);
        }
        pts.push([(t / total) * w, yBot - v * (yBot - yTop)]);
      }
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.strokeStyle = color; g.lineWidth = 2; g.stroke();
    };
    const mid = h * 0.5;
    shape(p.aA, p.aD, p.aS, p.aR, css('--trace'), h * 0.1, mid - 6);
    shape(p.fA, p.fD, p.fS, p.fR, css('--accent'), mid + 14, h - 8);
    label(g, 'LOUDNESS', 4, 11);
    label(g, 'FILTER (' + p.filterEnvAmt.toFixed(1) + ' oct)', 4, mid + 12);
    const xr = (hold / total) * w;
    g.strokeStyle = css('--grid-strong');
    g.setLineDash([2, 4]);
    g.beginPath(); g.moveTo(xr, 0); g.lineTo(xr, h); g.stroke();
    g.setLineDash([]);
    label(g, 'key up', xr + 3, h - 2);
    if (tele && tele.stageA) {
      // live level meters on the right edge
      g.fillStyle = css('--trace');
      g.fillRect(w - 6, mid - 6 - tele.envA * (mid - 6 - h * 0.1), 5, 3);
      g.fillStyle = css('--accent');
      g.fillRect(w - 6, h - 8 - tele.envF * (h - 8 - mid - 14), 5, 3);
    }
  }

  return { scope, spectrum, filter, envelopes };
})();
