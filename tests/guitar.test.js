const test = require('node:test');
const assert = require('node:assert');
const { GPStrings } = require('../js/guitar/strings.js');
const { GPPitch } = require('../js/guitar/pitch.js');
const { GP_CATEGORIES, GP_PEDALS, GP_AMP, GP_INSTRUMENTS, GP_PRESETS, GP_RIFFS, GP_TEXT, gpDefaults } = require('../js/guitar/catalog.js');
const { mooglabDSP } = require('../js/dsp.js');

mooglabDSP();
const SR = 48000;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const cents = (f, ref) => 1200 * Math.log2(f / ref);
const window = (buf, t, n = 4096) => buf.subarray(Math.floor(t * SR), Math.floor(t * SR) + n);

test('plucked guitar and bass strings are in tune (within 1 cent) across the neck', () => {
  for (const [kind, notes] of [['guitar', [40, 45, 50, 55, 59, 64, 69, 76]], ['bass', [28, 33, 38, 43, 48, 55]]]) {
    for (const m of notes) {
      const f = GPPitch.detect(window(GPStrings.pluck(m, SR, kind), 0.4), SR, 25, 1200);
      assert.ok(Math.abs(cents(f, hz(m))) < 1, `${kind} ${GPPitch.name(m)}: ${f} Hz`);
    }
  }
});

test('strings ring and then fade, like a real string', () => {
  const rms = (b) => Math.sqrt(b.reduce((s, x) => s + x * x, 0) / b.length);
  for (const [kind, m] of [['guitar', 40], ['guitar', 64], ['bass', 28]]) {
    const b = GPStrings.pluck(m, SR, kind);
    const early = rms(window(b, 0.3, 2048)), late = rms(window(b, 1.3, 2048));
    const drop = 20 * Math.log10(late / early);
    assert.ok(early > 0.01, `${kind} ${m} audible`);
    assert.ok(drop < -10 && drop > -45, `${kind} ${m} fades ${drop.toFixed(1)} dB in 1 s`);
    assert.ok(b.every((x) => Math.abs(x) <= 1), 'no clipping');
  }
});

test('tuner names notes and measures cents', () => {
  const tone = (f) => Float32Array.from({ length: 4096 }, (_, i) => 0.3 * Math.sin(2 * Math.PI * f * i / SR));
  assert.deepStrictEqual(GPPitch.note(440), { midi: 69, name: 'A', octave: 4, cents: 0 });
  const n = GPPitch.note(82.41 * Math.pow(2, 10 / 1200));
  assert.strictEqual(n.name + n.octave, 'E2');
  assert.strictEqual(n.cents, 10);
  assert.ok(Math.abs(cents(GPPitch.detect(tone(110), SR), 110)) < 1);
  assert.strictEqual(GPPitch.detect(new Float32Array(4096), SR), 0, 'silence gives no reading');
});

test('octaver adds a note exactly one octave down', () => {
  for (const [kind, m] of [['bass', 28], ['bass', 40], ['guitar', 45], ['guitar', 57]]) {
    const x = GPStrings.pluck(m, SR, kind);
    const out = new Float32Array(x.length);
    new globalThis.MooglabSubOctave(SR).process(x, out);
    const f = GPPitch.detect(window(out, 0.4, 8192), SR, 15, 1200);
    assert.ok(Math.abs(cents(f, hz(m) / 2)) < 5, `${GPPitch.name(m)} -> ${f.toFixed(1)} Hz`);
  }
});

test('envelope follower rises with playing and falls back in silence', () => {
  const env = new globalThis.MooglabEnvFollower(SR);
  const x = GPStrings.pluck(40, SR, 'guitar');
  const out = new Float32Array(x.length);
  env.process(x, out);
  const silent = new Float32Array(SR), tail = new Float32Array(SR);
  env.process(silent, tail);
  assert.ok(Math.max(...out.subarray(0, 4800)) > 0.3, 'opens on the attack');
  assert.ok(tail[tail.length - 1] < 0.01, 'closes in silence');
});

test('catalog: every pedal is complete and bilingual', () => {
  for (const [id, p] of Object.entries(GP_PEDALS)) {
    assert.ok(GP_CATEGORIES[p.cat], `${id} category`);
    assert.ok(p.name.en && p.name.fr && p.blurb.en && p.blurb.fr && /^#[0-9a-f]{6}$/i.test(p.color), `${id} texts/color`);
    for (const d of p.params) {
      assert.ok(d.labels.en && d.labels.fr, `${id}.${d.id} labels`);
      if (d.type === 'choice') assert.ok(d.def >= 0 && d.def < d.options.length);
      else assert.ok(d.min < d.max && d.def >= d.min && d.def <= d.max, `${id}.${d.id} range`);
    }
  }
  for (const d of GP_AMP.params) assert.ok(d.labels.en && d.labels.fr);
});

test('presets use real pedals and values in range', () => {
  for (const inst of Object.keys(GP_INSTRUMENTS)) {
    assert.ok(Object.keys(GP_PRESETS[inst]).length >= 4, `${inst} presets`);
    for (const [name, P] of Object.entries(GP_PRESETS[inst])) {
      for (const [type, params] of P.chain) {
        assert.ok(GP_PEDALS[type], `${name}: ${type}`);
        for (const [k, v] of Object.entries(params)) {
          const d = GP_PEDALS[type].params.find((x) => x.id === k);
          assert.ok(d, `${name}: ${type}.${k}`);
          assert.ok(d.type ? Number.isInteger(v) : v >= d.min && v <= d.max, `${name}: ${type}.${k}=${v}`);
        }
      }
      for (const [k, v] of Object.entries(P.amp)) {
        const d = GP_AMP.params.find((x) => x.id === k);
        assert.ok(d && (d.type ? Number.isInteger(v) : v >= d.min && v <= d.max), `${name}: amp.${k}=${v}`);
      }
    }
  }
  assert.deepStrictEqual(Object.keys(gpDefaults('amp')).sort(), GP_AMP.params.map((d) => d.id).sort());
});

test('riffs fit their loop and stay in the instrument range', () => {
  const range = { guitar: [40, 88], bass: [28, 60] };
  for (const inst of Object.keys(GP_RIFFS)) {
    for (const [name, r] of Object.entries(GP_RIFFS[inst])) {
      assert.ok(r.bpm > 40 && r.bpm < 200 && r.events.length > 0, name);
      for (const [beat, notes, len] of r.events) {
        assert.ok(beat >= 0 && beat < r.beats && len > 0, `${name} @${beat}`);
        for (const n of notes) assert.ok(n >= range[inst][0] && n <= range[inst][1], `${name}: note ${n}`);
      }
    }
  }
});

test('pedal section text exists in both languages with the same placeholders', () => {
  const vars = (s) => (Array.isArray(s) ? s.join(' ') : s).match(/\{\w+\}/g)?.sort().join() || '';
  for (const [k, en] of Object.entries(GP_TEXT.en)) {
    assert.ok(k in GP_TEXT.fr, `missing fr: ${k}`);
    assert.strictEqual(vars(GP_TEXT.fr[k]), vars(en), k);
  }
});
