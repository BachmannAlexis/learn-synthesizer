// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const { mooglabDSP } = require('../js/dsp.js');
const { patchForLevel, PRESETS, defaultPatch, toNorm, fromNorm, PARAMS } = require('../js/params.js');
const { LEVELS } = require('../js/lessons.js');

mooglabDSP();
const Engine = globalThis.MooglabEngine;
const SR = 48000;

function render(patch, seconds, { note = 60, release = null } = {}) {
  const e = new Engine(SR);
  e.p = { ...patch };
  e.noteOn(note);
  const total = Math.round(seconds * SR);
  const out = new Float32Array(total);
  const block = new Float32Array(128);
  for (let i = 0; i < total; i += 128) {
    if (release !== null && i >= release * SR && e.notes.length) e.noteOff(note);
    e.render(block);
    out.set(block.subarray(0, Math.min(128, total - i)), i);
  }
  return out;
}
const rms = (a, from = 0, to = a.length) => {
  let s = 0;
  for (let i = from; i < to; i++) s += a[i] * a[i];
  return Math.sqrt(s / (to - from));
};
// crude brightness: rms of first difference relative to rms
const brightness = (a) => {
  const d = new Float32Array(a.length - 1);
  for (let i = 1; i < a.length; i++) d[i - 1] = a[i] - a[i - 1];
  return rms(d) / rms(a);
};

test('every level patch and preset renders finite, audible, non-clipping audio', () => {
  const patches = [...[1, 2, 3, 4, 5, 6].map(patchForLevel), ...Object.values(PRESETS).map((p) => ({ ...defaultPatch(), ...p }))];
  for (const p of patches) {
    const out = render(p, 1.5);
    assert.ok(out.every(Number.isFinite), 'finite');
    const r = rms(out, 0.05 * SR, 0.5 * SR);
    assert.ok(r > 0.01, `audible (rms ${r})`);
    assert.ok(Math.max(...out.map(Math.abs)) <= 1, 'within [-1,1]');
  }
});

test('lowering the cutoff darkens the sound', () => {
  const p = patchForLevel(2);
  const open = brightness(render({ ...p, cutoff: 8000, resonance: 0 }, 0.5));
  const closed = brightness(render({ ...p, cutoff: 200, resonance: 0 }, 0.5));
  assert.ok(closed < open * 0.5, `closed ${closed} vs open ${open}`);
});

test('filter self-oscillates at full emphasis with no oscillators', () => {
  const p = { ...defaultPatch(), osc1Level: 0, cutoff: 500, resonance: 1 };
  const out = render(p, 2);
  assert.ok(rms(out, SR) > 0.05, `self-osc rms ${rms(out, SR)}`);
});

test('release fades to silence', () => {
  const p = patchForLevel(3);
  const out = render(p, 3, { release: 0.5 });
  assert.ok(rms(out, 0.1 * SR, 0.4 * SR) > 0.02);
  assert.ok(rms(out, 2.5 * SR) < 1e-3);
});

test('knob mapping round-trips', () => {
  for (const d of PARAMS.filter((d) => !d.type)) {
    for (const v of [d.min, d.def, d.max]) assert.ok(Math.abs(fromNorm(d, toNorm(d, v)) - v) < 1e-6 * Math.max(1, Math.abs(v)), d.id);
  }
});

test('lesson challenges reference valid levels and are not pre-solved by the level patch', () => {
  const stats = { legato: 0, bent: false, presets: new Set(), saved: false };
  for (const L of LEVELS) {
    const p = patchForLevel(L.n);
    for (const c of L.challenges) {
      if (c.id === 'l1-play') continue;
      assert.strictEqual(!!c.check(p, stats), false, `${c.id} already solved by starting patch`);
    }
  }
});

test('typed knob values are parsed in the units people use', () => {
  const { parseValue } = require('../js/params.js');
  const P = Object.fromEntries(PARAMS.map((d) => [d.id, d]));
  assert.strictEqual(parseValue(P.cutoff, '350'), 350);
  assert.strictEqual(parseValue(P.cutoff, '1.2k'), 1200);
  assert.strictEqual(parseValue(P.cutoff, '1,5 kHz'), 1500);
  assert.strictEqual(parseValue(P.cutoff, '99999'), 20000, 'clamped to range');
  assert.strictEqual(parseValue(P.resonance, '40%'), 0.4);
  assert.strictEqual(parseValue(P.resonance, '40'), 0.4);
  assert.strictEqual(parseValue(P.aA, '250 ms', 0.3), 0.25);
  assert.strictEqual(parseValue(P.aA, '250', 0.3), 0.25, 'no unit: same unit as shown (ms)');
  assert.strictEqual(parseValue(P.aA, '2', 1.5), 2, 'no unit: same unit as shown (s)');
  assert.strictEqual(parseValue(P.drive, '×2.5'), 2.5);
  assert.strictEqual(parseValue(P.osc2Detune, '-5'), -5);
  assert.strictEqual(parseValue(P.cutoff, 'abc'), null);
});

test('each filter type shapes the sound as its name says', () => {
  const { FILTER_TAPS } = require('../js/params.js');
  assert.deepStrictEqual(globalThis.MooglabFilterTaps, FILTER_TAPS, 'engine and plot use the same filter mixes');
  // A sine at 440 Hz (note 69) through each type, cutoff placed relative to it.
  const level = (filterType, cutoff) => {
    const p = { ...defaultPatch(), osc1Wave: 0, filterType, cutoff, resonance: 0, keyTrack: 0, drive: 0.5 };
    const out = render(p, 0.6, { note: 69 });
    return rms(out, 0.3 * SR, 0.6 * SR);
  };
  const ratio = (a, b) => 20 * Math.log10(a / b);
  // Low-pass: passes a tone well below the cutoff, cuts one well above it.
  assert.ok(ratio(level(0, 4000), level(0, 110)) > 30, 'LP 24');
  assert.ok(ratio(level(1, 4000), level(1, 110)) > 15, 'LP 12 (gentler)');
  // High-pass: the opposite.
  assert.ok(ratio(level(2, 110), level(2, 4000)) > 30, 'HP 24');
  assert.ok(ratio(level(3, 110), level(3, 4000)) > 15, 'HP 12');
  // Band-pass: loudest when the tone sits at the cutoff.
  assert.ok(ratio(level(4, 440), level(4, 5000)) > 12 && ratio(level(4, 440), level(4, 40)) > 12, 'BP');
  // Notch: removes the tone at the cutoff, passes it elsewhere.
  assert.ok(ratio(level(5, 4000), level(5, 440)) > 15, 'Notch');
});
