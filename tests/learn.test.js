const test = require('node:test');
const assert = require('node:assert');
const { GP_LEARN, GPMath } = require('../js/guitar/learn.js');
const { GP_PEDALS, GP_AMP, gpDefaults } = require('../js/guitar/catalog.js');
const { LEVELS } = require('../js/lessons.js');
const { LESSONS_FR } = require('../js/lessons-fr.js');

const PLOTS = ['transfer', 'response', 'compressor', 'octave', 'lfo', 'impulse'];

test('every pedal and the amp explain what they do, how, the maths and what to listen for, in both languages', () => {
  for (const type of [...Object.keys(GP_PEDALS), 'amp']) {
    const L = GP_LEARN[type];
    assert.ok(L, `learning content for ${type}`);
    for (const k of ['what', 'how', 'listen']) assert.ok(L[k].en && L[k].fr, `${type}.${k}`);
    assert.ok(/class="math"/.test(L.math) && L.math.length > 60, `${type} maths`);
    assert.ok(PLOTS.includes(L.plot), `${type} plot`);
    assert.ok(L.diagram.length >= 3 && L.diagram.every((d) => typeof d === 'string' || (d.en && d.fr)), `${type} diagram`);
  }
});

test('every synth lesson has a "how it is simulated" section in both languages', () => {
  for (const L of LEVELS) {
    assert.ok(/class="math"/.test(L.math), `level ${L.n} en`);
    assert.ok(/class="math"/.test(LESSONS_FR[L.n].math), `level ${L.n} fr`);
  }
});

test('filter maths match the textbook (RBJ biquads, as used by Web Audio)', () => {
  const dB = (c, f) => GPMath.db(GPMath.mag(c, f));
  // Web Audio low-pass Q is in dB: -3.01 dB = 0.707 -> -3 dB at the cutoff, 0 dB in the passband.
  assert.ok(Math.abs(dB(GPMath.biquad('lowpass', 1000, -3.0103), 1000) + 3.01) < 0.05);
  assert.ok(Math.abs(dB(GPMath.biquad('lowpass', 1000, -3.0103), 20)) < 0.05);
  assert.ok(Math.abs(dB(GPMath.biquad('highpass', 1000, -3.0103), 1000) + 3.01) < 0.05);
  // Peaking: exactly the gain at f0; band-pass: 0 dB at f0; all-pass: flat.
  assert.ok(Math.abs(dB(GPMath.biquad('peaking', 750, 1.1, 6), 750) - 6) < 0.01);
  assert.ok(Math.abs(dB(GPMath.biquad('bandpass', 700, 6), 700)) < 0.01);
  for (const f of [50, 500, 5000]) assert.ok(Math.abs(dB(GPMath.biquad('allpass', 800, 0.6), f)) < 1e-6);
  // Shelves: full gain far inside the shelf, none far outside.
  assert.ok(Math.abs(dB(GPMath.biquad('lowshelf', 80, 0.707, 9), 10) - 9) < 0.2);
  assert.ok(Math.abs(dB(GPMath.biquad('lowshelf', 80, 0.707, 9), 8000)) < 0.2);
  assert.ok(Math.abs(dB(GPMath.biquad('highshelf', 6000, 0.707, -6), 20000) + 6) < 0.6);
});

test('pedal graphs: EQ adds bands, clipping curves behave, compressor follows the ratio', () => {
  const eq = { ...gpDefaults('eq'), b3: 9 };
  assert.ok(Math.abs(GPMath.pedalDb('eq', eq, 750) - 9) < 0.5, 'EQ 750 Hz boost shows at 750 Hz');
  assert.ok(Math.abs(GPMath.pedalDb('eq', gpDefaults('eq'), 1000)) < 0.01, 'flat EQ is flat');
  const od = gpDefaults('overdrive');
  assert.ok(Math.abs(GPMath.transfer('overdrive', od, 0.5) + GPMath.transfer('overdrive', od, -0.5)) < 1e-9, 'overdrive is symmetric (odd harmonics)');
  const fz = gpDefaults('fuzz');
  assert.ok(Math.abs(GPMath.transfer('fuzz', { ...fz, drive: 2 }, 0.3) + GPMath.transfer('fuzz', { ...fz, drive: 2 }, -0.3)) > 0.01, 'fuzz is asymmetric (even harmonics)');
  for (const t of ['overdrive', 'distortion', 'fuzz', 'bassdrive']) {
    for (let x = -1; x <= 1; x += 0.05) assert.ok(Math.abs(GPMath.transfer(t, gpDefaults(t), x)) <= 1.0001, `${t} stays within ±1`);
  }
  const c = { sustain: 0.5, attack: 0.01, level: 0 };
  const T = -8 - 42 * 0.5, R = 2 + 10 * 0.5;
  assert.ok(Math.abs((GPMath.compress(c, T + 14) - GPMath.compress(c, T)) - 14 / R) < 1e-9, 'slope 1/R above the threshold');
  assert.ok(Math.abs((GPMath.compress(c, T - 10) - GPMath.compress(c, T - 20)) - 10) < 1e-9, 'unity slope below');
  assert.ok(Number.isFinite(GPMath.pedalDb('amp', gpDefaults('amp'), 1000, { cab: 1 })));
  assert.deepStrictEqual(Object.keys(gpDefaults('amp')).sort(), GP_AMP.params.map((p) => p.id).sort());
});
