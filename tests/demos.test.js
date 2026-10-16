const test = require('node:test');
const assert = require('node:assert');
const { DEMOS, demoLength } = require('../js/demos.js');
const { LEVELS } = require('../js/lessons.js');
const { LESSONS_FR } = require('../js/lessons-fr.js');
const { PARAMS, PRESETS, patchForLevel, defaultPatch } = require('../js/params.js');
const { mooglabDSP } = require('../js/dsp.js');

const IDS = new Set(PARAMS.map((d) => d.id));

test('every level has a short demo with captions in both languages', () => {
  for (const L of LEVELS) {
    const D = DEMOS[L.n];
    assert.ok(D, `demo for level ${L.n}`);
    const len = demoLength(L.n);
    assert.ok(len >= 12 && len <= 25, `level ${L.n} demo is ${len} s`);
    for (const s of D.steps) assert.ok(s.say.en && s.say.fr && s.dur > 0, `level ${L.n} step captions`);
  }
});

test('demos only use real controls, values in range and existing presets', () => {
  for (const [n, D] of Object.entries(DEMOS)) {
    for (const s of D.steps) {
      if (s.preset) assert.ok(PRESETS[s.preset], `preset ${s.preset}`);
      for (const [id, v] of Object.entries({ ...D.start, ...s.set, ...s.ramp })) {
        assert.ok(IDS.has(id), `level ${n}: unknown control ${id}`);
        const d = PARAMS.find((p) => p.id === id);
        if (d.type) assert.ok(Number.isInteger(v) && v >= 0 && v < d.options.length, `${id}=${v}`);
        else assert.ok(v >= d.min && v <= d.max, `level ${n}: ${id}=${v} out of range`);
      }
      for (const id of Object.keys(s.ramp || {})) assert.ok(!PARAMS.find((p) => p.id === id).type, `cannot ramp a switch: ${id}`);
    }
  }
});

test('every demo step makes sound', () => {
  mooglabDSP();
  const Engine = globalThis.MooglabEngine;
  for (const [n, D] of Object.entries(DEMOS)) {
    let p = { ...patchForLevel(+n), ...D.start };
    for (const s of D.steps) {
      if (s.preset) p = { ...defaultPatch(), ...PRESETS[s.preset] };
      p = { ...p, ...s.set, ...s.ramp };
      const e = new Engine(48000);
      e.p = { ...p };
      e.noteOn((s.notes || [60])[0]);
      const b = new Float32Array(128);
      let sum = 0, cnt = 0;
      for (let i = 0; i < 375; i++) { e.render(b); if (i > 20) for (const x of b) { sum += x * x; cnt++; } }
      assert.ok(Math.sqrt(sum / cnt) > 0.005, `level ${n} step "${s.say.en}" is silent`);
    }
  }
});

test('every lesson has a short summary in both languages', () => {
  for (const L of LEVELS) {
    assert.ok(L.summary.length >= 2 && L.summary.length <= 4, `level ${L.n}`);
    assert.strictEqual(LESSONS_FR[L.n].summary.length, L.summary.length, `level ${L.n} fr`);
  }
});
