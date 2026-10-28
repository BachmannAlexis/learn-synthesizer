/*
 * Effect pedals, built from Web Audio nodes and chained after the synth:
 *   synth -> Overdrive -> Chorus -> Echo -> Reverb -> limiter -> speakers
 * Each pedal has a true-bypass path; switching cross-fades to avoid clicks.
 */
function createPedalboard(ctx) {
  const T = 0.02; // smoothing time constant (s)
  const set = (param, v) => param.setTargetAtTime(v, ctx.currentTime, T);

  // `feed` is the effect's own input. It is only connected while the pedal is on, so a
  // switched-off effect (especially the reverb) costs no processing — important on phones.
  function pedal() {
    const input = ctx.createGain(), output = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain(), feed = ctx.createGain();
    input.connect(dry).connect(output);
    wet.connect(output);
    wet.gain.value = 0;
    return { input, output, dry, wet, feed, fed: false, timer: null };
  }
  function engage(pd, on) {
    clearTimeout(pd.timer);
    if (on && !pd.fed) { pd.input.connect(pd.feed); pd.fed = true; }
    if (!on && pd.fed) pd.timer = setTimeout(() => { pd.input.disconnect(pd.feed); pd.fed = false; }, 200); // after the fade
  }

  // --- Overdrive: gain -> tanh clipper -> tone filter -> level
  const drive = pedal();
  const pre = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(2048);
  for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh((i / (curve.length - 1)) * 2 - 1) / Math.tanh(1);
  shaper.curve = curve;
  shaper.oversample = '2x';
  const driveTone = ctx.createBiquadFilter();
  driveTone.type = 'lowpass';
  const driveLevel = ctx.createGain();
  drive.feed.connect(pre).connect(shaper).connect(driveTone).connect(driveLevel).connect(drive.wet);

  // --- Chorus: two modulated short delays panned left and right
  const chorus = pedal();
  const chorusLfo = ctx.createOscillator();
  chorusLfo.start();
  const sides = [-1, 1].map((pan) => {
    const d = ctx.createDelay(0.05);
    d.delayTime.value = 0.012;
    const depth = ctx.createGain();
    chorusLfo.connect(depth).connect(d.delayTime);
    if (pan > 0) { depth.inv = true; }
    const p = ctx.createStereoPanner();
    p.pan.value = pan * 0.8;
    chorus.feed.connect(d).connect(p).connect(chorus.wet);
    return depth;
  });

  // --- Echo: delay line with filtered feedback
  const echo = pedal();
  const delay = ctx.createDelay(2);
  const feedback = ctx.createGain();
  const echoTone = ctx.createBiquadFilter();
  echoTone.type = 'lowpass';
  echoTone.frequency.value = 4500;
  echo.feed.connect(delay).connect(echoTone).connect(feedback).connect(delay);
  echoTone.connect(echo.wet);

  // --- Reverb: convolution with a generated, exponentially decaying noise burst
  const reverb = pedal();
  const conv = ctx.createConvolver();
  const revTone = ctx.createBiquadFilter();
  revTone.type = 'lowpass';
  reverb.feed.connect(conv).connect(revTone).connect(reverb.wet);
  let irSize = 0;
  function buildIR(seconds) {
    const len = Math.max(1, Math.floor(seconds * ctx.sampleRate));
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    conv.buffer = buf;
    irSize = seconds;
  }
  let irTimer = null;

  // --- Output soft clipper keeps loud stacks (and long echoes) from clipping.
  // A waveshaper adds no delay (a DynamicsCompressor looks ahead ~6 ms).
  const limitIn = ctx.createGain();
  limitIn.gain.value = 0.5;
  const limiter = ctx.createWaveShaper();
  const lc = new Float32Array(4096);
  for (let i = 0; i < lc.length; i++) lc[i] = Math.tanh(4 * (i / (lc.length - 1)) - 2); // y = tanh(x), |x| <= 2
  limiter.curve = lc;
  limiter.oversample = 'none';
  limitIn.connect(limiter);

  drive.output.connect(chorus.input);
  chorus.output.connect(echo.input);
  echo.output.connect(reverb.input);
  reverb.output.connect(limitIn);

  function update(p) {
    engage(drive, !!p.fxDriveOn); engage(chorus, !!p.fxChorusOn); engage(echo, !!p.fxDelayOn); engage(reverb, !!p.fxReverbOn);
    // Overdrive replaces the dry signal; the others add their wet signal on top.
    set(drive.dry.gain, p.fxDriveOn ? 0 : 1);
    set(drive.wet.gain, p.fxDriveOn ? 1 : 0);
    set(pre.gain, p.fxDriveGain);
    set(driveTone.frequency, p.fxDriveTone);
    set(driveLevel.gain, p.fxDriveLevel * 1.4);

    set(chorus.wet.gain, p.fxChorusOn ? p.fxChorusMix : 0);
    set(chorus.dry.gain, p.fxChorusOn ? 1 - p.fxChorusMix * 0.4 : 1);
    set(chorusLfo.frequency, p.fxChorusRate);
    const depth = 0.0005 + p.fxChorusDepth * 0.006;
    sides.forEach((g) => set(g.gain, g.inv ? -depth : depth));

    set(echo.wet.gain, p.fxDelayOn ? p.fxDelayMix : 0);
    set(delay.delayTime, p.fxDelayTime);
    set(feedback.gain, p.fxDelayOn ? p.fxDelayFeedback : 0);

    set(reverb.wet.gain, p.fxReverbOn ? p.fxReverbMix * 1.6 : 0);
    set(reverb.dry.gain, p.fxReverbOn ? 1 - p.fxReverbMix * 0.5 : 1);
    set(revTone.frequency, p.fxReverbTone);
    if (Math.abs(p.fxReverbSize - irSize) > 0.01) {
      clearTimeout(irTimer);
      irTimer = setTimeout(() => buildIR(p.fxReverbSize), irSize ? 120 : 0);
    }
  }

  return { input: drive.input, output: limiter, update };
}
