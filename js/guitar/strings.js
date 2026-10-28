/*
 * Plucked-string instrument (Karplus–Strong): a short burst of noise circulating in a delay line
 * one period long, slightly low-pass filtered on every trip — exactly how a real string loses its
 * high harmonics first. A first-order all-pass sets the fractional part of the period so every
 * note is in tune (an integer-only delay would be up to ~10 cents off on high notes).
 */
const GPStrings = (() => {
  const cache = new Map();

  function pluck(midi, sr, kind = 'guitar') {
    const key = kind + ':' + midi + ':' + sr;
    if (cache.has(key)) return cache.get(key);
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const bass = kind === 'bass';
    const seconds = bass ? 4 : 3;
    const len = Math.floor(seconds * sr);
    const out = new Float32Array(len);

    // Smoothing on every trip: a weighted two-point average. A full 50/50 average (S = 0.5) is
    // right for low notes; high notes need less, or they die out far too fast (Jaffe & Smith).
    const S = Math.min(0.5, Math.max(0.12, 0.5 * Math.sqrt(220 / f)));
    // Loop delay = N (integer) + S (the average's delay) + all-pass fraction.
    const period = sr / f;
    let N = Math.floor(period - S);
    let frac = period - S - N;
    if (frac < 0.1) { N -= 1; frac += 1; } // keep the all-pass coefficient well inside (-1, 1)
    const c = (1 - frac) / (1 + frac);

    // Excitation: the string pulled into a triangle at the plucking point (strong fundamental,
    // harmonics falling as 1/n²), plus a little softened noise for the pick's "click".
    const line = new Float32Array(N);
    const pick = Math.max(1, Math.round(N * (bass ? 0.22 : 0.13)));
    const noise = bass ? 0.12 : 0.3;
    const soft = bass ? 0.6 : 0.3; // more = darker attack noise
    let lp = 0;
    for (let i = 0; i < N; i++) {
      const tri = i < pick ? i / pick : (N - i) / (N - pick);
      lp += (1 - soft) * ((Math.random() * 2 - 1) - lp);
      line[i] = tri + noise * lp;
    }
    let mean = 0;
    for (let i = 0; i < N; i++) mean += line[i];
    mean /= N;
    let peak = 1e-9;
    for (let i = 0; i < N; i++) { line[i] -= mean; peak = Math.max(peak, Math.abs(line[i])); }
    for (let i = 0; i < N; i++) line[i] /= peak;

    // Loss per trip, set so the fundamental fades by 60 dB in t60 seconds.
    const t60 = bass ? 3.4 : 2.8;
    const loss = Math.pow(0.001, 1 / (t60 * f));
    let idx = 0, prev = 0, apIn = 0, apOut = 0;
    for (let n = 0; n < len; n++) {
      const cur = line[idx];
      out[n] = cur;
      const avg = ((1 - S) * cur + S * prev) * loss;
      prev = cur;
      const y = c * avg + apIn - c * apOut; // first-order all-pass (fractional delay)
      apIn = avg; apOut = y;
      line[idx] = y;
      idx = idx + 1 === N ? 0 : idx + 1;
    }
    // Short fade at the end so the buffer never clicks.
    const fade = Math.floor(0.05 * sr);
    for (let i = 0; i < fade; i++) out[len - 1 - i] *= i / fade;
    const level = bass ? 0.55 : 0.45;
    for (let i = 0; i < len; i++) out[i] *= level;
    cache.set(key, out);
    return out;
  }

  return { pluck };
})();

if (typeof module !== 'undefined') module.exports = { GPStrings };
