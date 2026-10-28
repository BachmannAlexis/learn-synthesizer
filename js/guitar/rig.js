/*
 * Guitar/bass rig: sources -> input -> pedals (in board order) -> amp & cabinet -> output.
 * Every pedal is built from Web Audio nodes; the octaver and envelope filter use small
 * AudioWorklet helpers from dsp.js (with a ScriptProcessor fallback when worklets are blocked).
 */
function createGuitarRig(ctx, destination = ctx.destination) {
  const T = 0.015;
  const at = (param, v) => param.setTargetAtTime(v, ctx.currentTime, T);
  const db = (d) => Math.pow(10, d / 20);
  const shaper = (fn, n = 2048, os = '4x') => {
    const w = ctx.createWaveShaper();
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) c[i] = fn((i / (n - 1)) * 2 - 1);
    w.curve = c;
    w.oversample = os;
    return w;
  };
  const biquad = (type, freq, Q = 0.707, gain = 0) => {
    const b = ctx.createBiquadFilter();
    b.type = type; b.frequency.value = freq; b.Q.value = Q; b.gain.value = gain;
    return b;
  };
  const lfo = (type = 'sine') => { const o = ctx.createOscillator(); o.type = type; o.start(); return o; };

  // Worklet helper (octave down / envelope follower), or the same DSP on the main thread.
  function helper(name, Cls) {
    try { return new AudioWorkletNode(ctx, name, { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] }); } catch { /* fall back */ }
    if (!globalThis[Cls] && typeof mooglabDSP === 'function') mooglabDSP();
    const dsp = new globalThis[Cls](ctx.sampleRate);
    const sp = ctx.createScriptProcessor(512, 1, 1);
    sp.onaudioprocess = (e) => dsp.process(e.inputBuffer.getChannelData(0), e.outputBuffer.getChannelData(0));
    (createGuitarRig.keep ||= []).push(sp);
    return sp;
  }

  // ---------- pedal builders: each returns { input, output, update(p), stop() } ----------
  const BUILD = {
    compressor() {
      const input = ctx.createGain(), comp = ctx.createDynamicsCompressor(), out = ctx.createGain();
      comp.knee.value = 8; comp.release.value = 0.25;
      input.connect(comp).connect(out);
      return { input, output: out, update(p) {
        at(comp.threshold, -8 - 42 * p.sustain); at(comp.ratio, 2 + 10 * p.sustain); at(comp.attack, p.attack);
        at(out.gain, db(p.level + 4 * p.sustain));
      } };
    },
    wah() {
      const input = ctx.createGain(), bp = biquad('bandpass', 700, 6), wet = ctx.createGain(), dry = ctx.createGain(), out = ctx.createGain();
      const osc = lfo('triangle'), depth = ctx.createGain();
      osc.connect(depth).connect(bp.detune);
      input.connect(bp).connect(wet).connect(out);
      input.connect(dry).connect(out);
      dry.gain.value = 0.15;
      return { input, output: out, update(p) {
        at(bp.frequency, 380 * Math.pow(2, p.pedal * 2.5)); // ~380 Hz (heel) to ~2.1 kHz (toe)
        at(bp.Q, p.peak); at(wet.gain, 3 + p.peak * 0.8); // a real wah boosts its peak
        at(osc.frequency, Math.max(0.01, p.rate)); at(depth.gain, p.rate > 0.01 ? 1100 : 0);
      }, stop() { osc.stop(); } };
    },
    envfilter() {
      const input = ctx.createGain(), lp = biquad('lowpass', 220, 7), out = ctx.createGain(), env = helper('gp-env', 'MooglabEnvFollower'), amt = ctx.createGain();
      input.connect(lp).connect(out);
      input.connect(env); env.connect(amt).connect(lp.detune);
      return { input, output: out, update(p) {
        at(amt.gain, 1200 * p.range * (0.3 + p.sens * 1.4)); at(lp.Q, p.peak); at(out.gain, 0.9);
      } };
    },
    octaver() {
      const input = ctx.createGain(), out = ctx.createGain(), dry = ctx.createGain(), sub = ctx.createGain(), up = ctx.createGain();
      const subNode = helper('gp-sub', 'MooglabSubOctave');
      const rect = shaper((x) => Math.abs(x) * 2 - 0.5, 2048, '2x'), upHp = biquad('highpass', 120), upLp = biquad('lowpass', 3500);
      input.connect(dry).connect(out);
      input.connect(subNode); subNode.connect(sub).connect(out);
      input.connect(rect).connect(upHp).connect(upLp).connect(up).connect(out);
      return { input, output: out, update(p) { at(dry.gain, p.dry); at(sub.gain, p.sub * 0.8); at(up.gain, p.up * 0.8); } };
    },
    overdrive() {
      const input = ctx.createGain(), hp = biquad('highpass', 220, 0.6), pre = ctx.createGain(), clip = shaper((x) => Math.tanh(x * 3) / Math.tanh(3)), tone = biquad('lowpass', 3000), lvl = ctx.createGain();
      const low = biquad('lowpass', 220, 0.6), lowG = ctx.createGain(), out = ctx.createGain();
      input.connect(hp).connect(pre).connect(clip).connect(tone).connect(lvl).connect(out);
      input.connect(low).connect(lowG).connect(out); // a little clean low end, like the classic green pedals
      lowG.gain.value = 0.3;
      return { input, output: out, update(p) { at(pre.gain, p.drive / 3); at(tone.frequency, p.tone); at(lvl.gain, db(p.level) * 0.32); } };
    },
    distortion() {
      const input = ctx.createGain(), hp = biquad('highpass', 90), pre = ctx.createGain(), clip = shaper((x) => Math.max(-1, Math.min(1, 1.5 * x - 0.5 * x * x * x))), tone = biquad('lowpass', 3500, 0.9), lvl = ctx.createGain();
      input.connect(hp).connect(pre).connect(clip).connect(tone).connect(lvl);
      return { input, output: lvl, update(p) { at(pre.gain, p.drive / 4); at(tone.frequency, p.tone); at(lvl.gain, db(p.level) * 0.33); } };
    },
    fuzz() {
      const input = ctx.createGain(), dc = biquad('highpass', 40), g1 = ctx.createGain(), c1 = shaper((x) => (x > 0 ? Math.tanh(x * 2.5) : Math.tanh(x * 1.2) * 0.85)), g2 = ctx.createGain(), c2 = shaper((x) => Math.max(-0.9, Math.min(0.9, x * 3)) / 0.9);
      const lo = biquad('lowpass', 700), hi = biquad('highpass', 1600), loG = ctx.createGain(), hiG = ctx.createGain(), lvl = ctx.createGain(), post = biquad('highpass', 30);
      input.connect(dc).connect(g1).connect(c1).connect(g2).connect(c2);
      c2.connect(lo).connect(loG).connect(post); c2.connect(hi).connect(hiG).connect(post); post.connect(lvl);
      return { input, output: lvl, update(p) {
        at(g1.gain, Math.sqrt(p.drive)); at(g2.gain, Math.sqrt(p.drive) / 3);
        at(loG.gain, 1 - p.tone); at(hiG.gain, p.tone * 0.9); at(lvl.gain, db(p.level) * 0.6); // mid-scooped tone stack
      } };
    },
    bassdrive() {
      const input = ctx.createGain(), out = ctx.createGain(), low = biquad('lowpass', 180, 0.6), lowG = ctx.createGain();
      const hp = biquad('highpass', 180, 0.6), pre = ctx.createGain(), clip = shaper((x) => Math.tanh(x * 2.2)), tone = biquad('lowpass', 2200), lvl = ctx.createGain();
      input.connect(low).connect(lowG).connect(out);
      input.connect(hp).connect(pre).connect(clip).connect(tone).connect(lvl).connect(out);
      return { input, output: out, update(p) { at(lowG.gain, p.blend * 0.8); at(pre.gain, p.drive / 3); at(tone.frequency, p.tone); at(lvl.gain, db(p.level) * 0.3); } };
    },
    eq() {
      const input = ctx.createGain();
      const bands = [biquad('lowshelf', 80), biquad('peaking', 250, 1.1), biquad('peaking', 750, 1.1), biquad('peaking', 2200, 1.1), biquad('highshelf', 6000)];
      const lvl = ctx.createGain();
      bands.reduce((a, b) => a.connect(b), input).connect(lvl);
      return { input, output: lvl, update(p) { bands.forEach((b, i) => at(b.gain, p['b' + (i + 1)])); at(lvl.gain, db(p.level)); } };
    },
    chorus() {
      const input = ctx.createGain(), out = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain(), osc = lfo();
      input.connect(dry).connect(out);
      const sides = [-1, 1].map((pan) => {
        const d = ctx.createDelay(0.05), depth = ctx.createGain(), pn = ctx.createStereoPanner();
        d.delayTime.value = 0.014; pn.pan.value = pan * 0.7;
        osc.connect(depth).connect(d.delayTime);
        input.connect(d).connect(pn).connect(wet);
        return depth;
      });
      wet.connect(out);
      return { input, output: out, update(p) {
        at(osc.frequency, p.rate); const dep = 0.0005 + p.depth * 0.005;
        at(sides[0].gain, dep); at(sides[1].gain, -dep); at(wet.gain, p.mix); at(dry.gain, 1 - p.mix * 0.35);
      }, stop() { osc.stop(); } };
    },
    phaser() {
      const input = ctx.createGain(), out = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain(), osc = lfo(), depth = ctx.createGain();
      const stages = [...Array(6)].map(() => biquad('allpass', 800, 0.6));
      osc.connect(depth);
      stages.forEach((s) => depth.connect(s.detune));
      input.connect(dry).connect(out);
      stages.reduce((a, b) => a.connect(b), input).connect(wet).connect(out);
      return { input, output: out, update(p) { at(osc.frequency, p.rate); at(depth.gain, 400 + p.depth * 2000); at(wet.gain, p.mix); at(dry.gain, 1 - p.mix * 0.3); }, stop() { osc.stop(); } };
    },
    flanger() {
      const input = ctx.createGain(), out = ctx.createGain(), d = ctx.createDelay(0.03), fb = ctx.createGain(), wet = ctx.createGain(), osc = lfo('triangle'), depth = ctx.createGain();
      d.delayTime.value = 0.004;
      osc.connect(depth).connect(d.delayTime);
      input.connect(out);
      input.connect(d); d.connect(fb).connect(d); d.connect(wet).connect(out);
      wet.gain.value = 0.8;
      return { input, output: out, update(p) { at(osc.frequency, p.rate); at(depth.gain, 0.0003 + p.depth * 0.0033); at(fb.gain, p.regen); }, stop() { osc.stop(); } };
    },
    tremolo() {
      const input = ctx.createGain(), vca = ctx.createGain(), osc = lfo(), depth = ctx.createGain(), smooth = biquad('lowpass', 60);
      osc.connect(smooth).connect(depth).connect(vca.gain);
      input.connect(vca);
      return { input, output: vca, update(p) {
        osc.type = p.shape === 1 ? 'square' : 'sine';
        at(osc.frequency, p.rate); at(smooth.frequency, p.shape === 1 ? 30 + p.rate * 6 : 200);
        at(depth.gain, p.depth / 2); at(vca.gain, 1 - p.depth / 2);
      }, stop() { osc.stop(); } };
    },
    delay() {
      const input = ctx.createGain(), out = ctx.createGain(), d = ctx.createDelay(2), fb = ctx.createGain(), tone = biquad('lowpass', 3800), wet = ctx.createGain();
      input.connect(out);
      input.connect(d).connect(tone).connect(fb).connect(d);
      tone.connect(wet).connect(out);
      return { input, output: out, update(p) { at(d.delayTime, p.time); at(fb.gain, p.repeats); at(wet.gain, p.mix); } };
    },
    reverb() {
      const input = ctx.createGain(), out = ctx.createGain(), dry = ctx.createGain(), conv = ctx.createConvolver(), tone = biquad('lowpass', 5000), wet = ctx.createGain();
      input.connect(dry).connect(out);
      input.connect(conv).connect(tone).connect(wet).connect(out);
      let size = 0, timer = null;
      const build = (sec) => {
        const len = Math.max(1, Math.floor(sec * ctx.sampleRate)), buf = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let c = 0; c < 2; c++) { const x = buf.getChannelData(c); for (let i = 0; i < len; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
        conv.buffer = buf; size = sec;
      };
      return { input, output: out, update(p) {
        at(tone.frequency, p.tone); at(wet.gain, p.mix * 1.5); at(dry.gain, 1 - p.mix * 0.4);
        if (Math.abs(p.size - size) > 0.01) { clearTimeout(timer); timer = setTimeout(() => build(p.size), size ? 120 : 0); }
      } };
    },
  };

  // Footswitch: true bypass with a short cross-fade.
  function wrap(type) {
    const fx = BUILD[type]();
    const input = ctx.createGain(), output = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain();
    input.connect(dry).connect(output);
    fx.output.connect(wet).connect(output);
    wet.gain.value = 0;
    // The effect is only fed while it is on: a bypassed pedal costs no processing.
    let fed = false, timer = null;
    const engage = (on) => {
      clearTimeout(timer);
      if (on && !fed) { input.connect(fx.input); fed = true; }
      if (!on && fed) timer = setTimeout(() => { input.disconnect(fx.input); fed = false; }, 200);
    };
    return {
      input, output,
      update(p, on) { engage(on); fx.update(p); at(dry.gain, on ? 0 : 1); at(wet.gain, on ? 1 : 0); },
      dispose() { try { fx.stop && fx.stop(); } catch { /* already stopped */ } input.disconnect(); output.disconnect(); },
    };
  }

  // ---------- amp & cabinet ----------
  const amp = (() => {
    const input = ctx.createGain(), pre = ctx.createGain(), clip = shaper((x) => Math.tanh(x * 1.8) / Math.tanh(1.8), 2048, '2x');
    const bass = biquad('lowshelf', 120), mid = biquad('peaking', 700, 0.8), treble = biquad('highshelf', 3000), master = ctx.createGain();
    // Cabinets: 4x12 guitar speaker (no deep lows, presence peak, rolls off above ~5 kHz);
    // 8x10 bass cabinet (low bump, rolls off above ~3.5 kHz). "Off" = direct (DI).
    const cabIn = ctx.createGain(), cabOut = ctx.createGain(), direct = ctx.createGain(), cabbed = ctx.createGain();
    const cHp = biquad('highpass', 80, 0.7), cBump = biquad('peaking', 120, 1, 2), cPeak = biquad('peaking', 2500, 1.2, 3), cLp = biquad('lowpass', 5000, 0.8), cLp2 = biquad('lowpass', 5000, 0.8);
    input.connect(pre).connect(clip).connect(bass).connect(mid).connect(treble).connect(cabIn);
    cabIn.connect(direct).connect(cabOut);
    cabIn.connect(cHp).connect(cBump).connect(cPeak).connect(cLp).connect(cLp2).connect(cabbed).connect(cabOut);
    cabOut.connect(master);
    return {
      input, output: master,
      update(p) {
        at(pre.gain, p.gain * 0.5); at(bass.gain, p.bass); at(mid.gain, p.mid); at(treble.gain, p.treble);
        at(master.gain, db(p.master) * (1.6 / (1 + p.gain * 0.15)));
        const bassCab = p.cab === 2;
        at(direct.gain, p.cab === 0 ? 1 : 0); at(cabbed.gain, p.cab === 0 ? 0 : 1);
        at(cHp.frequency, bassCab ? 38 : 80); at(cBump.frequency, bassCab ? 90 : 120); at(cBump.gain, bassCab ? 3 : 1.5);
        at(cPeak.frequency, bassCab ? 1200 : 2500); at(cPeak.gain, bassCab ? 1 : 3);
        at(cLp.frequency, bassCab ? 3500 : 5200); at(cLp2.frequency, bassCab ? 3500 : 5200);
      },
    };
  })();

  // ---------- input, output, meters ----------
  const input = ctx.createGain();
  const analyserIn = ctx.createAnalyser(); analyserIn.fftSize = 4096;
  const analyserOut = ctx.createAnalyser(); analyserOut.fftSize = 8192; analyserOut.smoothingTimeConstant = 0.6;
  const limitIn = ctx.createGain(); limitIn.gain.value = 0.5;
  const limiter = shaper((x) => Math.tanh(2 * x), 4096, 'none');
  const out = ctx.createGain();
  input.connect(analyserIn);
  amp.output.connect(limitIn).connect(limiter).connect(out);
  out.connect(analyserOut);
  out.connect(destination);

  let pedals = []; // [{ uid, node }]
  function setChain(chain) {
    pedals.forEach((p) => p.node.dispose());
    input.disconnect(); input.connect(analyserIn);
    pedals = chain.map((c) => ({ uid: c.uid, node: wrap(c.type) }));
    let last = input;
    for (const p of pedals) { last.connect(p.node.input); last = p.node.output; }
    last.connect(amp.input);
    chain.forEach((c, i) => pedals[i].node.update(c.params, c.on));
  }
  function updatePedal(c) { const p = pedals.find((x) => x.uid === c.uid); if (p) p.node.update(c.params, c.on); }

  // ---------- sources ----------
  const strings = new Map(); // midi -> { src, g }
  const buffers = new Map();
  function pluck(midi, kind, when = ctx.currentTime, dur = null) {
    const key = kind + midi;
    let buf = buffers.get(key);
    if (!buf) {
      const data = GPStrings.pluck(midi, ctx.sampleRate, kind);
      buf = ctx.createBuffer(1, data.length, ctx.sampleRate);
      buf.copyToChannel(data, 0);
      buffers.set(key, buf);
    }
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buf;
    src.connect(g).connect(input);
    src.start(when);
    if (dur !== null) { g.gain.setValueAtTime(1, when + dur); g.gain.setTargetAtTime(0, when + dur, 0.02); src.stop(when + dur + 0.25); }
    return { src, g };
  }
  function noteOn(midi, kind) {
    noteOff(midi);
    strings.set(midi, pluck(midi, kind));
  }
  function noteOff(midi) {
    const s = strings.get(midi);
    if (!s) return;
    strings.delete(midi);
    const t = ctx.currentTime;
    s.g.gain.setTargetAtTime(0, t, 0.03); // fretting hand lifts: the string is damped
    s.src.stop(t + 0.3);
  }

  // Riff player (scheduled ahead on the audio clock, so timing stays tight).
  const riff = { timer: null, data: null, kind: 'guitar', start: 0, schedTo: 0, srcs: [] };
  // `player(notes, time, duration)` can replace the plucked strings (e.g. the Moog synth).
  function playRiff(data, kind, player = null) {
    stopRiff();
    Object.assign(riff, { data, kind, player, start: ctx.currentTime + 0.08 });
    riff.schedTo = riff.start;
    riff.timer = setInterval(tickRiff, 25);
    tickRiff();
  }
  function tickRiff() {
    const { data } = riff;
    const beat = 60 / data.bpm, loop = data.beats * beat, t1 = ctx.currentTime + 0.15;
    const k0 = Math.floor((riff.schedTo - riff.start) / loop), k1 = Math.floor((t1 - riff.start) / loop);
    for (let k = Math.max(0, k0); k <= k1; k++) {
      for (const [b, notes, len] of data.events) {
        const t = riff.start + k * loop + b * beat;
        if (t < riff.schedTo || t >= t1) continue;
        // A small spread between the strings of a chord, like a real strum.
        if (riff.player) { riff.player.play(notes, t, len * beat); continue; }
        notes.forEach((n, i) => riff.srcs.push({ ...pluck(n, riff.kind, t + i * 0.008, len * beat), end: t + len * beat + 0.4 }));
      }
    }
    riff.srcs = riff.srcs.filter((s) => s.end > ctx.currentTime);
    riff.schedTo = t1;
  }
  function stopRiff() {
    clearInterval(riff.timer); riff.timer = null;
    if (riff.player) { riff.player.stop(); riff.player = null; }
    const t = ctx.currentTime;
    riff.srcs.forEach((s) => { try { s.g.gain.cancelScheduledValues(t); s.g.gain.setTargetAtTime(0, t, 0.02); s.src.stop(t + 0.2); } catch { /* not started yet */ } });
    riff.srcs = [];
  }

  // Microphone or audio interface.
  let mic = null;
  async function enableMic() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    mic = { stream, node: ctx.createMediaStreamSource(stream) };
    mic.node.connect(input);
  }
  function disableMic() { if (!mic) return; mic.node.disconnect(); mic.stream.getTracks().forEach((t) => t.stop()); mic = null; }

  // Audio file, looped.
  let file = null;
  async function playFile(arrayBuffer) {
    stopFile();
    const buf = await ctx.decodeAudioData(arrayBuffer);
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true; src.connect(input); src.start();
    file = src;
  }
  function stopFile() { if (file) { try { file.stop(); } catch { /* stopped */ } file.disconnect(); file = null; } }

  return {
    input, analyserIn, analyserOut, setChain, updatePedal,
    setAmp: (p) => amp.update(p),
    setInputGain: (v) => at(input.gain, v),
    setMuted: (m) => at(out.gain, m ? 0 : 1),
    noteOn, noteOff, playRiff, stopRiff, get riffPlaying() { return !!riff.timer; },
    enableMic, disableMic, get micOn() { return !!mic; },
    playFile, stopFile, get filePlaying() { return !!file; },
    stopAll() { stopRiff(); stopFile(); [...strings.keys()].forEach(noteOff); },
  };
}
