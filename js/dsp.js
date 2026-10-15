/*
 * MoogLab DSP — a monophonic Minimoog-style voice.
 *
 * This whole function is stringified and loaded into the AudioWorkletGlobalScope
 * through a Blob URL, so the app also works when opened straight from disk
 * (file://) without a web server. It must therefore be fully self-contained.
 *
 * Signal path (like the Model D):
 *   3 x VCO + noise -> MIXER -> 4-pole transistor LADDER filter -> VCA -> out
 *   Filter contour + loudness contour (ADSR), LFO, glide, keyboard tracking.
 */
function mooglabDSP() {
  const TAU = Math.PI * 2;

  // PolyBLEP: removes the aliasing of hard edges in saw / pulse waves.
  function blep(t, dt) {
    if (t < dt) { t /= dt; return t + t - t * t - 1; }
    if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
    return 0;
  }

  // Wave indices: 0 sine, 1 triangle, 2 saw, 3 square, 4 wide pulse, 5 narrow pulse
  const PULSE_WIDTH = [0, 0, 0, 0.5, 0.25, 0.1];

  class Osc {
    constructor() { this.phase = Math.random(); }
    next(wave, dt) {
      const t = this.phase;
      let y;
      if (wave === 0) y = Math.sin(TAU * t);
      else if (wave === 1) y = 1 - 4 * Math.abs(t - 0.5);
      else if (wave === 2) y = 2 * t - 1 - blep(t, dt);
      else {
        const pw = PULSE_WIDTH[wave];
        y = (t < pw ? 1 : -1) + blep(t, dt) - blep((t + 1 - pw) % 1, dt);
        y -= 2 * pw - 1; // remove DC offset of asymmetric pulses
      }
      this.phase += dt;
      if (this.phase >= 1) this.phase -= 1;
      return y;
    }
  }

  // Analog-style RC envelope ("contour generator").
  class Env {
    constructor() { this.v = 0; this.stage = 0; } // 0 idle, 1 attack, 2 decay/sustain, 3 release
    gate(on) {
      if (on) this.stage = 1;
      else if (this.stage !== 0) this.stage = 3;
    }
    setTimes(a, d, s, r, sr) {
      // Attack charges toward 1.3 and stops at 1.0 (like a real RC contour).
      this.ca = 1 - Math.exp(-1.466 / (Math.max(a, 0.0005) * sr));
      this.cd = 1 - Math.exp(-4 / (Math.max(d, 0.001) * sr));
      this.cr = 1 - Math.exp(-4 / (Math.max(r, 0.001) * sr));
      this.s = s;
    }
    next() {
      switch (this.stage) {
        case 1:
          this.v += (1.3 - this.v) * this.ca;
          if (this.v >= 1) { this.v = 1; this.stage = 2; }
          break;
        case 2:
          this.v += (this.s - this.v) * this.cd;
          break;
        case 3:
          this.v -= this.v * this.cr;
          if (this.v < 1e-5) { this.v = 0; this.stage = 0; }
          break;
      }
      return this.v;
    }
  }

  // Moog transistor ladder: four one-pole stages with tanh saturation and
  // global negative feedback (resonance / "emphasis"), run 2x oversampled.
  class Ladder {
    constructor(sr) { this.fsOS = sr * 2; this.s1 = this.s2 = this.s3 = this.s4 = 0; this.xPrev = 0; }
    process(x, fc, k, drive) {
      const g = 1 - Math.exp(-TAU * fc / this.fsOS);
      for (let i = 0; i < 2; i++) {
        const inp = i === 0 ? 0.5 * (x + this.xPrev) : x;
        const u = Math.tanh(drive * inp - k * this.s4);
        const t1 = Math.tanh(this.s1), t2 = Math.tanh(this.s2), t3 = Math.tanh(this.s3), t4 = Math.tanh(this.s4);
        this.s1 += g * (u - t1);
        this.s2 += g * (t1 - t2);
        this.s3 += g * (t2 - t3);
        this.s4 += g * (t3 - t4);
      }
      this.xPrev = x;
      return this.s4;
    }
  }

  class Engine {
    constructor(sr) {
      this.sr = sr;
      this.p = {};
      this.osc = [new Osc(), new Osc(), new Osc()];
      this.envA = new Env();
      this.envF = new Env();
      this.filter = new Ladder(sr);
      this.notes = [];
      this.target = 60;
      this.cur = null;
      this.bend = 0;
      this.lfoPhase = 0;
      this.sh = 0;
      this.fc = 1000;
      this.lfo = 0;
    }
    noteOn(n) {
      const legato = this.notes.length > 0;
      this.notes = this.notes.filter((x) => x !== n);
      this.notes.push(n);
      this.target = n;
      if (this.cur === null) this.cur = n;
      // Single triggering like the Minimoog: legato notes don't restart the contours.
      if (!legato) { this.envA.gate(true); this.envF.gate(true); }
    }
    noteOff(n) {
      this.notes = this.notes.filter((x) => x !== n);
      if (this.notes.length) this.target = this.notes[this.notes.length - 1];
      else { this.envA.gate(false); this.envF.gate(false); }
    }
    allOff() { this.notes = []; this.envA.gate(false); this.envF.gate(false); }

    render(out) {
      const p = this.p, sr = this.sr, n = out.length;
      if (p.cutoff === undefined) { out.fill(0); return; }
      this.envA.setTimes(p.aA, p.aD, p.aS, p.aR, sr);
      this.envF.setTimes(p.fA, p.fD, p.fS, p.fR, sr);
      const glideCoef = p.glide > 0.001 ? 1 - Math.exp(-1 / (p.glide * 0.3 * sr)) : 1;
      const lfoInc = p.lfoRate / sr;
      const lfoWave = p.lfoWave | 0;
      const k = p.resonance * 4.2;
      const comp = 1 + k * 0.35;
      const lv = [p.osc1Level, p.osc2Level, p.osc3Level];
      const wv = [p.osc1Wave | 0, p.osc2Wave | 0, p.osc3Wave | 0];
      const tune = [
        p.osc1Range - 2,
        p.osc2Range - 2 + p.osc2Detune / 12,
        p.osc3Range - 2 + p.osc3Detune / 12,
      ];
      const lfoPitch = p.lfoPitch * p.modWheel;
      const lfoFilter = p.lfoFilter * p.modWheel;
      const nyq = Math.min(20000, sr * 0.45);
      if (this.cur === null) this.cur = this.target;

      for (let i = 0; i < n; i++) {
        // LFO
        this.lfoPhase += lfoInc;
        if (this.lfoPhase >= 1) { this.lfoPhase -= 1; this.sh = Math.random() * 2 - 1; }
        const ph = this.lfoPhase;
        let lfo;
        if (lfoWave === 0) lfo = Math.sin(TAU * ph);
        else if (lfoWave === 1) lfo = 1 - 4 * Math.abs(ph - 0.5);
        else if (lfoWave === 2) lfo = ph < 0.5 ? 1 : -1;
        else if (lfoWave === 3) lfo = 1 - 2 * ph;
        else lfo = this.sh;

        // Pitch (with glide / portamento)
        this.cur += (this.target - this.cur) * glideCoef;
        const pitch = this.cur + this.bend + lfo * lfoPitch;
        const base = 440 * Math.pow(2, (pitch - 69) / 12);

        // Oscillators + noise into the mixer
        let mix = 0;
        for (let o = 0; o < 3; o++) {
          if (lv[o] <= 0) continue;
          const f = base * Math.pow(2, tune[o]);
          mix += this.osc[o].next(wv[o], Math.min(f / sr, 0.49)) * lv[o];
        }
        if (p.noiseLevel > 0) mix += (Math.random() * 2 - 1) * p.noiseLevel;
        mix = mix * 0.6 + (Math.random() - 0.5) * 2e-3; // tiny analog noise floor seeds self-oscillation

        // Filter with contour, LFO and keyboard tracking
        const ef = this.envF.next();
        const octs = p.filterEnvAmt * ef + lfo * lfoFilter + p.keyTrack * (this.cur - 60) / 12;
        let fc = p.cutoff * Math.pow(2, octs);
        fc = fc < 20 ? 20 : fc > nyq ? nyq : fc;
        const y = this.filter.process(mix, fc, k, p.drive) * comp;

        // VCA
        const ea = this.envA.next();
        const s = y * ea * p.master;
        out[i] = Math.tanh(s * 1.4);

        if (i === n - 1) { this.fc = fc; this.lfo = lfo; }
      }
    }
  }

  // Exposed for unit tests (Node) — harmless in the worklet scope.
  if (typeof globalThis !== 'undefined') globalThis.MooglabEngine = Engine;

  if (typeof AudioWorkletProcessor !== 'undefined' && typeof registerProcessor === 'function') {
    class MoogProcessor extends AudioWorkletProcessor {
      constructor() {
        super();
        this.engine = new Engine(sampleRate);
        this.counter = 0;
        this.port.onmessage = (e) => {
          const m = e.data, en = this.engine;
          if (m.type === 'params') Object.assign(en.p, m.p);
          else if (m.type === 'noteOn') en.noteOn(m.note);
          else if (m.type === 'noteOff') en.noteOff(m.note);
          else if (m.type === 'bend') en.bend = m.value;
          else if (m.type === 'allOff') en.allOff();
        };
      }
      process(_inputs, outputs) {
        const out = outputs[0][0];
        this.engine.render(out);
        for (let c = 1; c < outputs[0].length; c++) outputs[0][c].set(out);
        this.counter += out.length;
        if (this.counter >= 1024) {
          this.counter = 0;
          const en = this.engine;
          this.port.postMessage({ envA: en.envA.v, envF: en.envF.v, stageA: en.envA.stage, fc: en.fc, lfo: en.lfo, note: en.cur });
        }
        return true;
      }
    }
    registerProcessor('moog-voice', MoogProcessor);
  }
}

if (typeof module !== 'undefined') module.exports = { mooglabDSP };
