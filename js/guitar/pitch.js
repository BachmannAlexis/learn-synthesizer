/*
 * Pitch detection for the tuner (YIN, de Cheveigné & Kawahara 2002) and note naming.
 */
const GPPitch = (() => {
  const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

  // Returns the fundamental in Hz, or 0 when there is no clear pitch (silence, noise, chords).
  function detect(buf, sr, minHz = 30, maxHz = 1200) {
    let rms = 0;
    for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
    if (Math.sqrt(rms / buf.length) < 0.002) return 0;
    const maxTau = Math.min(Math.floor(sr / minHz), Math.floor(buf.length / 2));
    const minTau = Math.max(2, Math.floor(sr / maxHz));
    const W = buf.length - maxTau;
    const d = new Float32Array(maxTau + 1);
    for (let tau = 1; tau <= maxTau; tau++) {
      let s = 0;
      for (let i = 0; i < W; i++) { const x = buf[i] - buf[i + tau]; s += x * x; }
      d[tau] = s;
    }
    // Cumulative mean normalised difference; take the first dip below the threshold.
    let sum = 0, tau = -1;
    const cmnd = new Float32Array(maxTau + 1);
    cmnd[0] = 1;
    for (let t = 1; t <= maxTau; t++) { sum += d[t]; cmnd[t] = d[t] * t / (sum || 1); }
    for (let t = minTau; t <= maxTau; t++) {
      if (cmnd[t] < 0.15) {
        while (t + 1 <= maxTau && cmnd[t + 1] < cmnd[t]) t++;
        tau = t;
        break;
      }
    }
    if (tau < 0) return 0;
    // Parabolic interpolation for sub-sample accuracy.
    const a = cmnd[tau - 1], b = cmnd[tau], c = tau + 1 <= maxTau ? cmnd[tau + 1] : b;
    const shift = (a - c) / (2 * (a - 2 * b + c) || 1);
    return sr / (tau + (Math.abs(shift) < 1 ? shift : 0));
  }

  // Nearest note and how far off it is, in cents.
  function note(freq) {
    const midi = 69 + 12 * Math.log2(freq / 440);
    const n = Math.round(midi);
    return { midi: n, name: NAMES[((n % 12) + 12) % 12], octave: Math.floor(n / 12) - 1, cents: Math.round((midi - n) * 100) };
  }

  const name = (midi) => NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);

  return { detect, note, name };
})();

if (typeof module !== 'undefined') module.exports = { GPPitch };
